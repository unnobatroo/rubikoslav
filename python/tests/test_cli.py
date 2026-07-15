from __future__ import annotations

import json
import re
import unittest

from rubikoslav.cli import (
    parser,
    run_doctor,
    solve_scramble,
    web_directory,
)


class CliTests(unittest.TestCase):
    def test_default_command_is_web(self) -> None:
        arguments = parser().parse_args([])
        self.assertEqual(arguments.command, "web")
        self.assertEqual(arguments.port, 4173)
        self.assertFalse(arguments.no_open)

    def test_packaged_visualizer_exists(self) -> None:
        self.assertTrue((web_directory() / "index.html").is_file())
        self.assertTrue((web_directory() / "generated" / "cube-data.js").is_file())

    def test_visualizer_auto_solves_on_play_and_keeps_typed_routes(self) -> None:
        html = (web_directory() / "index.html").read_text(encoding="utf-8")
        script = (web_directory() / "app.js").read_text(encoding="utf-8")
        styles = (web_directory() / "styles.css").read_text(encoding="utf-8")

        self.assertNotIn('id="state-output"', html)
        self.assertNotIn("<textarea", html)
        self.assertNotIn('id="solve-position"', html)
        self.assertNotIn('id="clear-solution"', html)
        self.assertNotIn("Solve or load a route", html)
        self.assertEqual(html.count('class="control-section'), 1)
        self.assertNotIn('id="state-dialog"', html)
        self.assertNotIn('id="edit-state"', html)
        self.assertNotIn('class="hero"', html)
        self.assertNotIn('class="engine-metrics"', html)
        self.assertNotIn('class="auto-capture"', html)
        self.assertNotIn('class="engine-explainer"', html)
        self.assertNotIn("ENGINE VISUALIZER", html)
        self.assertNotIn("Read the engine", html)
        self.assertNotIn('id="position-status"', html)
        self.assertNotIn('<header', html)
        self.assertNotIn('id="solver-status"', html)
        self.assertIn('id="open-route"', html)
        self.assertIn('id="reset-position"', html)
        self.assertIn('id="route-dialog"', html)
        self.assertIn('id="solution-input"', html)
        self.assertIn('id="load-solution"', html)
        self.assertGreater(html.index('id="timeline"'), html.index('id="move-pad"'))
        self.assertGreater(html.index('class="playback"'), html.index('id="timeline"'))
        self.assertIn('id="timeline-label"', html)
        self.assertIn('id="timeline-count"', html)
        self.assertGreater(
            html.index('id="reset-position"'),
            html.index('class="move-feed-heading"'),
        )
        self.assertLess(html.index('id="reset-position"'), html.index('id="timeline"'))
        section_actions = html[
            html.index('class="section-actions"'):html.index('id="move-pad"')
        ]
        self.assertNotIn('id="reset-position"', section_actions)
        self.assertIn('id="icon-shuffle"', html)
        self.assertIn('id="icon-route"', html)
        self.assertIn('id="icon-play"', html)
        self.assertIn("setButtonContent(playButton, 'pause', 'Pause')", script)
        self.assertIn('bottom: 22px', styles)
        self.assertIn('width: min(54vw, 560px)', styles)
        self.assertIn('grid-template-rows: auto minmax(456px, 1fr)', styles)
        self.assertNotIn('  height: 456px;', styles)
        self.assertIn("let positionMoves = []", script)
        self.assertIn("positionMoves.push(move)", script)
        self.assertIn("showMessage('Position and move history reset.'", script)
        self.assertIn("routeKind = 'solution'", script)
        self.assertIn("movePermutations[standard] ? standard", script)
        self.assertIn("await solveCurrentPosition(true)", script)
        self.assertIn("const capturedState = [...state]", script)

    def test_browser_face_layout_uses_physical_rows_and_columns(self) -> None:
        generated = (web_directory() / "generated" / "cube-data.js").read_text(
            encoding="utf-8"
        )
        script = (web_directory() / "app.js").read_text(encoding="utf-8")

        def exported(name: str):
            match = re.search(
                rf"export const {name} = (.*?);\n", generated, flags=re.DOTALL
            )
            self.assertIsNotNone(match, name)
            return json.loads(match.group(1))

        layouts = {face["name"]: face["stickers"] for face in exported("faceLayouts")}
        solved = exported("solvedState")
        permutations = exported("movePermutations")

        expected_lines = {
            "U": {face: ({0, 1, 2} if face in "LFRB" else set()) for face in "ULFDRB"},
            "L": {
                "U": {0, 3, 6}, "L": set(), "F": {0, 3, 6},
                "D": {0, 3, 6}, "R": set(), "B": {2, 5, 8},
            },
            "F": {
                "U": {6, 7, 8}, "L": {2, 5, 8}, "F": set(),
                "D": {0, 1, 2}, "R": {0, 3, 6}, "B": set(),
            },
            "B": {
                "U": {0, 1, 2}, "L": {0, 3, 6}, "F": set(),
                "D": {6, 7, 8}, "R": {2, 5, 8}, "B": set(),
            },
            "R": {
                "U": {2, 5, 8}, "L": set(), "F": {2, 5, 8},
                "D": {2, 5, 8}, "R": set(), "B": {0, 3, 6},
            },
            "D": {face: ({6, 7, 8} if face in "LFRB" else set()) for face in "ULFDRB"},
        }

        for face, expected in expected_lines.items():
            for suffix in ("", "2", "'"):
                move = face + suffix
                moved = [solved[source] for source in permutations[move]]
                changed = {
                    name: {
                        position
                        for position, index in enumerate(stickers)
                        if index is not None and moved[index] != solved[index]
                    }
                    for name, stickers in layouts.items()
                }
                self.assertEqual(changed, expected, move)

        geometry_match = re.search(
            r"const turnGeometry = (\{.*?\n\});", script, flags=re.DOTALL
        )
        self.assertIsNotNone(geometry_match)
        geometry = json.loads(geometry_match.group(1))
        coordinate_index = {"x": 0, "y": 1, "z": 2}
        normals = {
            "U": (0, -1, 0), "D": (0, 1, 0),
            "L": (-1, 0, 0), "R": (1, 0, 0),
            "F": (0, 0, 1), "B": (0, 0, -1),
        }

        def coordinates(face: str, row: int, column: int) -> tuple[int, int, int]:
            if face == "F": return column - 1, row - 1, 1
            if face == "B": return 1 - column, row - 1, -1
            if face == "R": return 1, row - 1, 1 - column
            if face == "L": return -1, row - 1, column - 1
            if face == "U": return column - 1, -1, row - 1
            return column - 1, 1, 1 - row

        sticker_positions = {}
        for face, stickers in layouts.items():
            for position, index in enumerate(stickers):
                if index is not None:
                    sticker_positions[index] = (
                        coordinates(face, position // 3, position % 3), normals[face]
                    )

        def rotate(vector, axis: str, quarter_turns: int):
            x, y, z = vector
            for _ in range(quarter_turns % 4):
                if axis == "X": x, y, z = x, -z, y
                elif axis == "Y": x, y, z = z, y, -x
                else: x, y, z = -y, x, z
            return x, y, z

        for move, permutation in permutations.items():
            turn = geometry[move[0]]
            amount = 2 if move.endswith("2") else -1 if move.endswith("'") else 1
            quarter_turns = turn["direction"] * amount
            old_to_new = {source: target for target, source in enumerate(permutation)}
            for old_index, (old_coordinates, old_normal) in sticker_positions.items():
                expected = sticker_positions[old_to_new[old_index]]
                is_moving = (
                    old_coordinates[coordinate_index[turn["coordinate"]]] == turn["layer"]
                )
                animated = (
                    rotate(old_coordinates, turn["axis"], quarter_turns),
                    rotate(old_normal, turn["axis"], quarter_turns),
                ) if is_moving else (old_coordinates, old_normal)
                self.assertEqual(animated, expected, (move, old_index))

    def test_solve_command_accepts_a_scramble(self) -> None:
        arguments = parser().parse_args(["solve", "R U R' U'"])
        self.assertEqual(arguments.command, "solve")
        self.assertEqual(arguments.scramble, "R U R' U'")

    def test_doctor_needs_no_external_data(self) -> None:
        self.assertEqual(run_doctor(strict=False), 0)

    def test_cli_solves_without_external_data(self) -> None:
        self.assertEqual(solve_scramble("R U B' D2 L F2", None, False), 0)


if __name__ == "__main__":
    unittest.main()
