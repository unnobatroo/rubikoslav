"""Deterministic two-phase solving for the native 48-sticker cube model."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from time import perf_counter_ns
from typing import Any, Mapping, Sequence

from rubik_solver import Cube, init_solver, solve as solve_two_phase

from .CuboslavWrapper import CuboslavWrapper

SOLVED_STATE = (0,) * 8 + (1,) * 8 + (2,) * 8 + (5,) * 8 + (4,) * 8 + (3,) * 8

# The native model stores the eight non-center stickers for each color face in
# its historical layout. These indices translate that layout into the standard
# URFDLB row-major facelet string used by two-phase solvers. None is the fixed
# center sticker, which is not present in the native 48-sticker representation.
_FACELET_INDICES: dict[str, tuple[int | None, ...]] = {
    "U": (0, 1, 2, 3, None, 4, 5, 6, 7),
    "R": (37, 35, 32, 38, None, 33, 39, 36, 34),
    "F": (16, 17, 18, 19, None, 20, 21, 22, 23),
    "D": (24, 25, 26, 27, None, 28, 29, 30, 31),
    "L": (10, 12, 15, 9, None, 14, 8, 11, 13),
    "B": (47, 46, 45, 44, None, 43, 42, 41, 40),
}
_COLOR_TO_FACE = {0: "U", 1: "L", 2: "F", 3: "B", 4: "R", 5: "D"}
_NOTATION_TO_CODE = {
    face + suffix: chr(ord("A") + face_index * 3 + turn_index)
    for face_index, face in enumerate("ULFBRD")
    for turn_index, suffix in enumerate(("", "2", "'"))
}
_MOVES = tuple(
    face + suffix for face in "ULFBRD" for suffix in ("", "2", "'")
)
_INVERSE_MOVE = {
    move: move if move.endswith("2") else move[0] if move.endswith("'") else move + "'"
    for move in _MOVES
}
_OPPOSITE_FACE = {"U": "D", "D": "U", "L": "R", "R": "L", "F": "B", "B": "F"}
_FACE_ORDER = {face: index for index, face in enumerate("ULFBRD")}
_EXACT_SEARCH_DEPTH = 4
_INITIALIZE_LOCK = Lock()
_SOLVE_LOCK = Lock()
_INITIALIZED = False


@dataclass(slots=True)
class SolveResult:
    """A stable result object shared by successful and failed solve attempts."""

    success: bool = False
    moves: list[str] = field(default_factory=list)
    error: str = ""
    search_depth: int = 0
    elapsed_microseconds: int = 0
    backend: str = "two-phase"


def state_to_facelets(state: Sequence[int]) -> str:
    """Validate and translate a native state into standard URFDLB facelets."""

    values = [int(value) for value in state]
    validator = CuboslavWrapper()
    validator.set_cube(values)

    return "".join(
        face if index is None else _COLOR_TO_FACE[values[index]]
        for face in "URFDLB"
        for index in _FACELET_INDICES[face]
    )


def verify_route(state: Sequence[int], moves: Sequence[str]) -> None:
    """Replay a proposed route through the native engine and reject bad output."""

    cube = CuboslavWrapper()
    cube.set_cube([int(value) for value in state])
    for move in moves:
        cube.move(move)
    if tuple(cube.getCube()) != SOLVED_STATE:
        raise RuntimeError("The solver returned a route that failed native replay")


def _shortest_nearby_route(state: Sequence[int], max_depth: int) -> list[str] | None:
    """Return a provably shortest route for positions at most four turns away."""

    depth_limit = min(max_depth, _EXACT_SEARCH_DEPTH)
    if depth_limit < 1:
        return None

    cube = CuboslavWrapper()
    cube.set_cube([int(value) for value in state])
    path: list[str] = []

    def search(remaining: int, previous_face: str = "") -> bool:
        if remaining == 0:
            return False
        for move in _MOVES:
            face = move[0]
            if face == previous_face:
                continue
            # Opposite faces commute. Keep only one of the two equivalent
            # orders so the exact search does not repeat the same position.
            if (
                previous_face
                and face == _OPPOSITE_FACE[previous_face]
                and _FACE_ORDER[face] < _FACE_ORDER[previous_face]
            ):
                continue

            cube.move(move)
            path.append(move)
            if tuple(cube.getCube()) == SOLVED_STATE:
                return True
            if search(remaining - 1, face):
                return True
            path.pop()
            cube.move(_INVERSE_MOVE[move])
        return False

    for depth in range(1, depth_limit + 1):
        if search(depth):
            return path.copy()
    return None


class Rubikoslav:
    """Public solver backed by deterministic, locally cached two-phase tables."""

    @staticmethod
    def initialize(verbose: bool = False) -> None:
        """Generate or load the compact two-phase tables."""

        global _INITIALIZED
        if _INITIALIZED:
            return
        with _INITIALIZE_LOCK:
            if not _INITIALIZED:
                init_solver(verbose=verbose)
                _INITIALIZED = True

    def solve(
        self,
        state: Sequence[int],
        max_depth: int = 22,
    ) -> SolveResult:
        """Solve a validated native cube state and verify the returned route."""

        started = perf_counter_ns()
        result = SolveResult()
        try:
            if max_depth < 0:
                raise ValueError("max_depth must be zero or greater")

            values = [int(value) for value in state]
            facelets = state_to_facelets(values)
            if tuple(values) == SOLVED_STATE:
                result.success = True
                return result

            route = _shortest_nearby_route(values, max_depth)
            if route is not None:
                result.moves = route
                verify_route(values, result.moves)
                result.success = True
                result.search_depth = len(result.moves)
                result.backend = "exact-short-search"
                return result

            self.initialize()
            cube = Cube.from_string(facelets)
            validation = cube.verify()
            if validation is not True:
                raise ValueError(f"Two-phase facelet validation failed: {validation}")

            # The web server is threaded. The dependency's global coordinate
            # tables are read-only after initialization, but serializing its
            # search also prevents concurrent requests from multiplying CPU use.
            with _SOLVE_LOCK:
                route = solve_two_phase(cube, max_depth=max_depth)
            if route is None:
                raise RuntimeError(f"No solution was found within {max_depth} moves")

            result.moves = route.split() if route else []
            verify_route(values, result.moves)
            result.success = True
            result.search_depth = len(result.moves)
        except Exception as error:  # Public API reports failures as structured data.
            result.error = str(error)
        finally:
            result.elapsed_microseconds = (perf_counter_ns() - started) // 1_000
        return result

    def solve_codes(self, state: Sequence[int]) -> list[str]:
        """Solve and return the engine's compact single-character move codes."""

        result = self.solve(state)
        if not result.success:
            raise RuntimeError(result.error)
        return [_NOTATION_TO_CODE[move] for move in result.moves]


def solve_payload(
    payload: Mapping[str, Any], solver: Rubikoslav | None = None
) -> tuple[int, dict[str, object]]:
    """Validate a web request and return its HTTP status and JSON body."""

    state = payload.get("state")
    if not isinstance(state, list):
        raise ValueError("Solve request must include a state array")
    max_depth = int(payload.get("maxDepth", 22))
    if not 0 <= max_depth <= 30:
        raise ValueError("maxDepth must be between 0 and 30")

    result = (solver or Rubikoslav()).solve(state, max_depth=max_depth)
    return (
        200 if result.success else 422,
        {
            "success": result.success,
            "moves": result.moves,
            "error": result.error,
            "elapsedMicroseconds": result.elapsed_microseconds,
            "backend": result.backend,
        },
    )
