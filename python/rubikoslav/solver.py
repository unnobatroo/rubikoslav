"""Optimal IDA* solving for the native 48-sticker cube model."""

from __future__ import annotations

from dataclasses import dataclass, field
import os
from pathlib import Path
from threading import Lock
from time import perf_counter_ns
from typing import Any, Mapping, Sequence

from cube_solver import Cube as OptimalCube
from cube_solver import Korf
from rubik_solver import Cube as TwoPhaseCube
from rubik_solver import init_solver as init_two_phase_solver
from rubik_solver import solve as solve_two_phase

from .CuboslavWrapper import CuboslavWrapper

SOLVED_STATE = (0,) * 8 + (1,) * 8 + (2,) * 8 + (5,) * 8 + (4,) * 8 + (3,) * 8
MAX_SOLUTION_MOVES = 20

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
_OPTIMAL_COLOR = {"U": "W", "L": "O", "F": "G", "R": "R", "B": "B", "D": "Y"}
_OPPOSITE_FACE = {"U": "D", "D": "U", "L": "R", "R": "L", "F": "B", "B": "F"}
_SUFFIX_TO_TURNS = {"": 1, "2": 2, "'": 3}
_TURNS_TO_SUFFIX = {1: "", 2: "2", 3: "'"}
_INITIALIZE_LOCK = Lock()
_TWO_PHASE_INITIALIZE_LOCK = Lock()
_SOLVE_LOCK = Lock()
_OPTIMAL_SOLVER: Korf | None = None
_TWO_PHASE_INITIALIZED = False


@dataclass(slots=True)
class SolveResult:
    """A stable result object shared by successful and failed solve attempts."""

    success: bool = False
    moves: list[str] = field(default_factory=list)
    error: str = ""
    search_depth: int = 0
    elapsed_microseconds: int = 0
    backend: str = "optimal-ida-star"
    optimal: bool = False


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


def state_to_optimal_repr(state: Sequence[int]) -> str:
    """Translate a native state to the optimal solver's ULFRBD color net."""

    facelets = state_to_facelets(state)
    blocks = {
        face: facelets[index * 9 : (index + 1) * 9]
        for index, face in enumerate("URFDLB")
    }
    return "".join(
        _OPTIMAL_COLOR[sticker] for face in "ULFRBD" for sticker in blocks[face]
    )


def verify_route(state: Sequence[int], moves: Sequence[str]) -> None:
    """Replay a proposed route through the native engine and reject bad output."""

    cube = CuboslavWrapper()
    cube.set_cube([int(value) for value in state])
    for move in moves:
        cube.move(move)
    if tuple(cube.getCube()) != SOLVED_STATE:
        raise RuntimeError("The solver returned a route that failed native replay")


def simplify_moves(moves: Sequence[str]) -> list[str]:
    """Combine same-face turns, commuting across only the opposite face."""

    simplified: list[tuple[str, int]] = []
    for move in moves:
        if move not in _NOTATION_TO_CODE:
            raise ValueError(f"Invalid move in route history: {move}")
        face, turns = move[0], _SUFFIX_TO_TURNS[move[1:]]
        index = len(simplified)
        while index > 0 and simplified[index - 1][0] == _OPPOSITE_FACE[face]:
            index -= 1
        if index > 0 and simplified[index - 1][0] == face:
            combined = (simplified[index - 1][1] + turns) % 4
            simplified.pop(index - 1)
            if combined:
                simplified.insert(index - 1, (face, combined))
        else:
            simplified.insert(index, (face, turns))
    return [face + _TURNS_TO_SUFFIX[turns] for face, turns in simplified]


def verified_history_route(state: Sequence[int], history: Sequence[str]) -> list[str]:
    """Build and verify a return route from the moves that made the position."""

    if len(history) > 200:
        raise ValueError("Route history cannot contain more than 200 moves")
    history_cube = CuboslavWrapper()
    for move in history:
        history_cube.move(move)
    values = tuple(int(value) for value in state)
    if tuple(history_cube.getCube()) != values:
        raise ValueError("Route history does not produce the submitted cube state")

    inverse = [
        move[0] + {"": "'", "2": "2", "'": ""}[move[1:]] for move in reversed(history)
    ]
    route = simplify_moves(inverse)
    verify_route(values, route)
    return route


class Rubikoslav:
    """Public solver that accepts only verified routes within 20 HTM moves."""

    def __init__(self, optimal_timeout_seconds: int | None = None) -> None:
        self.optimal_timeout_seconds = optimal_timeout_seconds

    @staticmethod
    def initialize(verbose: bool = False) -> None:
        """Generate or load transition and admissible pruning tables."""

        global _OPTIMAL_SOLVER
        if _OPTIMAL_SOLVER is not None:
            return
        with _INITIALIZE_LOCK:
            if _OPTIMAL_SOLVER is not None:
                return
            configured = os.environ.get("RUBIKOSLAV_CACHE_DIR")
            if configured:
                cache_directory = Path(configured).expanduser()
            elif os.environ.get("VERCEL"):
                cache_directory = Path("/tmp/rubikoslav-optimal")
            else:
                cache_home = Path(
                    os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")
                )
                cache_directory = cache_home / "rubikoslav" / "optimal"
            cache_directory.mkdir(parents=True, exist_ok=True)

            previous_directory = Path.cwd()
            try:
                os.chdir(cache_directory)
                _OPTIMAL_SOLVER = Korf()
            finally:
                os.chdir(previous_directory)

    @staticmethod
    def _initialize_two_phase() -> None:
        """Initialize the fast bounded fallback once per process."""

        global _TWO_PHASE_INITIALIZED
        if _TWO_PHASE_INITIALIZED:
            return
        with _TWO_PHASE_INITIALIZE_LOCK:
            if not _TWO_PHASE_INITIALIZED:
                init_two_phase_solver()
                _TWO_PHASE_INITIALIZED = True

    def _solve_two_phase(
        self,
        values: Sequence[int],
        search_limit: int,
    ) -> list[str] | None:
        """Find a bounded route with the local two-phase solver."""

        self._initialize_two_phase()
        fallback_cube = TwoPhaseCube.from_string(state_to_facelets(values))
        validation = fallback_cube.verify()
        if validation is not True:
            raise ValueError(f"Two-phase facelet validation failed: {validation}")
        with _SOLVE_LOCK:
            fallback = solve_two_phase(fallback_cube, max_depth=search_limit)
        return fallback.split() if fallback else None

    def solve(
        self,
        state: Sequence[int],
        max_depth: int | None = None,
        history: Sequence[str] | None = None,
    ) -> SolveResult:
        """Solve a validated native cube state and verify the returned route."""

        started = perf_counter_ns()
        result = SolveResult()
        try:
            if max_depth is not None and max_depth < 0:
                raise ValueError("max_depth must be zero or greater")
            if max_depth is not None and max_depth > MAX_SOLUTION_MOVES:
                raise ValueError(
                    f"max_depth cannot exceed {MAX_SOLUTION_MOVES} moves in half-turn metric"
                )
            search_limit = MAX_SOLUTION_MOVES if max_depth is None else max_depth

            values = [int(value) for value in state]
            optimal_repr = state_to_optimal_repr(values)
            history_route = verified_history_route(values, history) if history else None
            if tuple(values) == SOLVED_STATE:
                result.success = True
                result.optimal = True
                return result

            if history_route is not None and len(history_route) <= search_limit:
                result.moves = history_route
                result.backend = "verified-history-route"
                result.success = True
                result.search_depth = len(result.moves)
                return result

            if history_route is not None and self.optimal_timeout_seconds is not None:
                fallback = self._solve_two_phase(values, search_limit)
                if fallback is None:
                    raise RuntimeError(
                        f"No solution was found within {search_limit} moves"
                    )
                result.moves = fallback
                verify_route(values, result.moves)
                result.backend = "two-phase-fallback"
                result.success = True
                result.search_depth = len(result.moves)
                return result

            self.initialize()
            cube = OptimalCube(repr=optimal_repr)
            if cube.permutation_parity is None:
                raise ValueError("Optimal solver rejected the translated cube state")

            # The web server is threaded. Serialize the stateful search object
            # and prevent concurrent optimal searches from multiplying CPU use.
            with _SOLVE_LOCK:
                solver = _OPTIMAL_SOLVER
                if solver is None:  # Defensive: initialize() must set it.
                    raise RuntimeError("Optimal solver did not initialize")
                solution = solver.solve(
                    cube,
                    max_length=search_limit,
                    timeout=self.optimal_timeout_seconds,
                )
            if solution is None:
                if self.optimal_timeout_seconds is not None:
                    fallback = self._solve_two_phase(values, search_limit)
                    if fallback is not None:
                        result.moves = fallback
                        verify_route(values, result.moves)
                        result.backend = "two-phase-fallback"
                        result.success = True
                        result.search_depth = len(result.moves)
                        return result
                    raise RuntimeError(
                        f"Search timed out before finding a route within {search_limit} moves"
                    )
                raise RuntimeError(f"No solution was found within {search_limit} moves")

            result.moves = str(solution).split() if solution else []
            if len(result.moves) > search_limit:
                raise RuntimeError(
                    f"The solver exceeded the {search_limit}-move acceptance limit"
                )
            verify_route(values, result.moves)
            result.success = True
            result.optimal = True
            result.search_depth = len(result.moves)
        except Exception as error:
            result.error = str(error)
        finally:
            result.elapsed_microseconds = (perf_counter_ns() - started) // 1_000
        return result

    def solve_scramble(
        self,
        scramble: str | Sequence[str],
        max_depth: int | None = None,
    ) -> SolveResult:
        """Solve standard cube notation without exposing the sticker array."""

        moves = scramble.split() if isinstance(scramble, str) else list(scramble)
        cube = CuboslavWrapper()
        try:
            for move in moves:
                cube.move(move)
        except Exception as error:
            return SolveResult(error=str(error))
        return self.solve(cube.getCube(), max_depth=max_depth, history=moves)

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
    requested_depth = payload.get("maxDepth")
    max_depth = None if requested_depth is None else int(requested_depth)
    if max_depth is not None and not 0 <= max_depth <= MAX_SOLUTION_MOVES:
        raise ValueError(
            f"maxDepth must be between 0 and {MAX_SOLUTION_MOVES} when provided"
        )

    history = payload.get("history")
    if history is not None and (
        not isinstance(history, list)
        or not all(isinstance(move, str) for move in history)
    ):
        raise ValueError("history must be an array of move strings when provided")

    result = (solver or Rubikoslav()).solve(
        state,
        max_depth=max_depth,
        history=history,
    )
    return (
        200 if result.success else 422,
        {
            "success": result.success,
            "moves": result.moves,
            "error": result.error,
            "elapsedMicroseconds": result.elapsed_microseconds,
            "backend": result.backend,
            "optimal": result.optimal,
        },
    )
