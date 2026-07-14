from __future__ import annotations

import unittest

from rubik_solver import Cube

from rubikoslav import (
    Rubikoslav,
    CuboslavWrapper,
    SOLVED_STATE,
    solve_payload,
    state_to_facelets,
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
                standard = Cube().move(move)
                self.assertEqual(
                    state_to_facelets(native.getCube()), standard.as_string(), move
                )

    def test_all_faces_scramble_solves_and_replays(self) -> None:
        cube = CuboslavWrapper()
        for move in ("R", "U", "B'", "L2", "D", "F2", "R2", "U'", "B", "D2"):
            cube.move(move)

        result = Rubikoslav().solve(cube.getCube())
        self.assertTrue(result.success, result.error)
        self.assertGreater(len(result.moves), 0)

        for move in result.moves:
            cube.move(move)
        self.assertEqual(tuple(cube.getCube()), SOLVED_STATE)

    def test_every_single_turn_gets_the_exact_one_move_solution(self) -> None:
        for face in "ULFBRD":
            for suffix, inverse in (("", "'"), ("2", "2"), ("'", "")):
                cube = CuboslavWrapper()
                cube.move(face + suffix)
                result = Rubikoslav().solve(cube.getCube())
                self.assertTrue(result.success, result.error)
                self.assertEqual(result.moves, [face + inverse])
                self.assertEqual(result.backend, "exact-short-search")

    def test_nearby_positions_use_a_provably_shortest_route(self) -> None:
        cube = CuboslavWrapper()
        cube.move("R")
        cube.move("U")
        result = Rubikoslav().solve(cube.getCube())

        self.assertTrue(result.success, result.error)
        self.assertEqual(len(result.moves), 2)
        self.assertEqual(result.backend, "exact-short-search")

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
        status, payload = solve_payload({"state": cube.getCube(), "maxDepth": 22})

        self.assertEqual(status, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["backend"], "exact-short-search")

    def test_web_payload_rejects_unbounded_depth(self) -> None:
        with self.assertRaisesRegex(ValueError, "between 0 and 30"):
            solve_payload({"state": list(SOLVED_STATE), "maxDepth": 31})


if __name__ == "__main__":
    unittest.main()
