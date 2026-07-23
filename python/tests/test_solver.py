from __future__ import annotations

import unittest

from cube_solver import Cube

from rubikoslav import (
    MAX_SOLUTION_MOVES,
    Rubikoslav,
    CuboslavWrapper,
    SOLVED_STATE,
    solve_payload,
    simplify_moves,
    state_to_facelets,
    state_to_optimal_repr,
    verify_route,
    verified_history_route,
)


class SolverTests(unittest.TestCase):
    def test_solved_facelet_translation(self) -> None:
        self.assertEqual(
            state_to_facelets(SOLVED_STATE),
            "U" * 9 + "R" * 9 + "F" * 9 + "D" * 9 + "L" * 9 + "B" * 9,
        )

    def test_every_native_turn_matches_standard_facelets(self) -> None:
        for face in "URFDLB":
            for suffix in ("", "2", "'"):
                move = face + suffix
                native = CuboslavWrapper()
                native.move(move)
                standard = Cube(move)
                self.assertEqual(
                    state_to_optimal_repr(native.getCube()), repr(standard), move
                )

    def test_all_faces_scramble_solves_and_replays(self) -> None:
        cube = CuboslavWrapper()
        for move in ("R", "U", "B'", "L2", "D", "F2", "R2", "U'", "B", "D2"):
            cube.move(move)

        result = Rubikoslav().solve(cube.getCube())
        self.assertTrue(result.success, result.error)
        self.assertGreater(len(result.moves), 0)
        self.assertLessEqual(len(result.moves), MAX_SOLUTION_MOVES)

        for move in result.moves:
            cube.move(move)
        self.assertEqual(tuple(cube.getCube()), SOLVED_STATE)

    def test_public_api_solves_standard_scramble_notation(self) -> None:
        result = Rubikoslav().solve_scramble("R U F2")
        self.assertTrue(result.success, result.error)
        self.assertLessEqual(len(result.moves), 3)

        cube = CuboslavWrapper()
        for move in ("R", "U", "F2", *result.moves):
            cube.move(move)
        self.assertEqual(tuple(cube.getCube()), SOLVED_STATE)

    def test_public_api_reports_invalid_scramble_notation(self) -> None:
        result = Rubikoslav().solve_scramble("R nope")
        self.assertFalse(result.success)
        self.assertTrue(result.error)

    def test_every_single_turn_gets_the_exact_one_move_solution(self) -> None:
        for face in "ULFBRD":
            for suffix, inverse in (("", "'"), ("2", "2"), ("'", "")):
                cube = CuboslavWrapper()
                cube.move(face + suffix)
                result = Rubikoslav().solve(cube.getCube())
                self.assertTrue(result.success, result.error)
                self.assertEqual(result.moves, [face + inverse])
                self.assertEqual(result.backend, "optimal-ida-star")

    def test_five_move_positions_never_return_longer_routes(self) -> None:
        faces = "ULFBRD"
        suffixes = ("", "2", "'")
        solver = Rubikoslav()

        for offset in range(len(faces) * len(suffixes)):
            cube = CuboslavWrapper()
            scramble = []
            for step in range(5):
                face = faces[(offset + step) % len(faces)]
                move = face + suffixes[(offset + step * 2) % len(suffixes)]
                cube.move(move)
                scramble.append(move)

            state = cube.getCube()
            result = solver.solve(state)
            self.assertTrue(result.success, msg=f"{' '.join(scramble)}: {result.error}")
            self.assertLessEqual(len(result.moves), 5, msg=" ".join(scramble))
            verify_route(state, result.moves)
        self.assertEqual(result.backend, "optimal-ida-star")

    def test_web_verified_histories_do_not_launch_a_long_search(self) -> None:
        histories = [
            [
                "F2",
                "D",
                "B",
                "F2",
                "L'",
                "B2",
                "F'",
                "F",
                "U",
                "B",
                "D",
                "R2",
                "F2",
                "B2",
                "L2",
                "L",
                "L'",
                "B'",
                "D'",
                "D2",
                "F2",
                "B2",
                "U2",
                "R2",
                "R",
                "L2",
                "U2",
                "F2",
                "D2",
            ],
            [
                "U'",
                "U",
                "B'",
                "D2",
                "R2",
                "B2",
                "U",
                "L'",
                "R'",
                "F'",
                "B2",
                "F2",
                "U2",
                "L",
                "B",
                "F2",
                "R2",
                "D'",
                "L2",
                "U2",
                "L'",
                "B",
                "F2",
                "R",
                "R'",
                "B",
                "F2",
                "F'",
                "B",
                "B2",
                "D2",
            ],
            [
                "L",
                "D",
                "F'",
                "D2",
                "R",
                "U",
                "B",
                "R",
                "D",
                "L'",
                "R2",
                "B2",
                "L2",
                "R",
                "B'",
                "F2",
                "U'",
                "B2",
                "D'",
                "L2",
                "F'",
                "U",
                "F",
                "R",
                "D2",
                "B2",
                "L",
                "U'",
                "U2",
                "R2",
                "B",
                "F2",
            ],
        ]
        solver = Rubikoslav(
            optimal_timeout_seconds=0,
            allow_long_history_route=True,
        )

        for history in histories:
            cube = CuboslavWrapper()
            for move in history:
                cube.move(move)

            status, payload = solve_payload(
                {"state": cube.getCube(), "history": history},
                solver,
            )

            self.assertEqual(status, 200, payload)
            self.assertTrue(payload["success"], payload)
            self.assertEqual(payload["backend"], "verified-history-route")
            self.assertEqual(
                payload["moves"],
                verified_history_route(cube.getCube(), history),
            )
            verify_route(cube.getCube(), payload["moves"])

        self.assertGreater(len(payload["moves"]), MAX_SOLUTION_MOVES)

    def test_twenty_move_history_is_an_accepted_bounded_fallback(self) -> None:
        history = [
            "R",
            "U",
            "F2",
            "L'",
            "D",
            "B2",
            "R2",
            "U'",
            "F",
            "D2",
            "L",
            "B'",
            "U2",
            "R'",
            "F'",
            "L2",
            "D'",
            "B",
            "R2",
            "U",
        ]
        cube = CuboslavWrapper()
        for move in history:
            cube.move(move)

        status, payload = solve_payload(
            {"state": cube.getCube(), "history": history},
            Rubikoslav(optimal_timeout_seconds=0),
        )

        self.assertEqual(status, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["backend"], "verified-history-route")
        self.assertLessEqual(len(payload["moves"]), MAX_SOLUTION_MOVES)
        verify_route(cube.getCube(), payload["moves"])

    def test_history_simplification_is_state_preserving(self) -> None:
        history = ["R", "L", "R'", "U", "U2", "U'"]
        cube = CuboslavWrapper()
        for move in history:
            cube.move(move)

        simplified = simplify_moves(history)
        rebuilt = CuboslavWrapper()
        for move in simplified:
            rebuilt.move(move)
        self.assertEqual(rebuilt.getCube(), cube.getCube())
        verify_route(cube.getCube(), verified_history_route(cube.getCube(), history))

    def test_compact_codes_replay(self) -> None:
        cube = CuboslavWrapper()
        for move in ("F", "R", "U", "R'", "U'", "F'"):
            cube.move(move)

        codes = Rubikoslav().solve_codes(cube.getCube())
        self.assertGreater(len(codes), 0)
        for code in codes:
            cube.move_code(code)
        self.assertEqual(tuple(cube.getCube()), SOLVED_STATE)

    def test_invalid_state_is_structured_failure(self) -> None:
        result = Rubikoslav().solve([0] * 48)
        self.assertFalse(result.success)
        self.assertIn("every color", result.error)

    def test_web_payload_uses_the_native_verified_solver(self) -> None:
        cube = CuboslavWrapper()
        cube.move("R")
        status, payload = solve_payload({"state": cube.getCube()})

        self.assertEqual(status, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["backend"], "optimal-ida-star")
        self.assertTrue(payload["optimal"])

    def test_web_payload_rejects_excessive_optional_depth(self) -> None:
        with self.assertRaisesRegex(ValueError, "between 0 and 20"):
            solve_payload({"state": list(SOLVED_STATE), "maxDepth": 21})


if __name__ == "__main__":
    unittest.main()
