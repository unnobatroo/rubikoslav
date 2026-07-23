# Python API

The recommended public surface is `Rubikoslav`, `SolveResult`, and `CuboslavWrapper`.

```python
from rubikoslav import CuboslavWrapper, Rubikoslav, SolveResult
```

!!! note "Typing"
The Python source uses type annotations, but the distribution does not currently declare itself as a PEP 561 typed package. Strict type checkers may treat imports as untyped unless your project supplies local stubs.

## `Rubikoslav`

```python
Rubikoslav(
    optimal_timeout_seconds: int | None = None,
    allow_long_history_route: bool = False,
)
```

`optimal_timeout_seconds=None` means arbitrary-state optimal search has no timeout. Set a timeout when bounded response time matters; if optimal search times out, Rubikoslav tries the local two-phase backend and still rejects routes above 20 moves.

`allow_long_history_route=True` is intended for an interactive visualizer that already knows every move used to create the submitted state. When no explicit `max_depth` is supplied, Rubikoslav may return the native-verified, simplified inverse history even when it exceeds 20 moves. This avoids launching a potentially long search merely to shorten a route that is already known to solve the cube.

### `solve_scramble()`

```python
solve_scramble(
    scramble: str | Sequence[str],
    max_depth: int | None = None,
) -> SolveResult
```

Use this when you have standard move notation:

```python
solver = Rubikoslav()
result = solver.solve_scramble("R U F2", max_depth=10)
```

The method builds the state with the native cube and passes the move history to the solver. If the verified, simplified inverse route is within `max_depth`, it returns without running optimal search.

`max_depth` defaults to 20 and must be between 0 and 20 inclusive. A smaller value is an acceptance limit, not a hint: if no route is found within it, `success` is false.

### `solve()`

```python
solve(
    state: Sequence[int],
    max_depth: int | None = None,
    history: Sequence[str] | None = None,
) -> SolveResult
```

Use this when your application already has the native 48-sticker state:

```python
cube = CuboslavWrapper()
cube.move("R")
cube.move("U")

state = cube.getCube()
result = Rubikoslav().solve(state)
```

With no `history`, the default backend is optimal IDA\*. With a matching history, the solver can return its verified inverse or use the bounded fallback when a timeout is configured.

Do not invent the 48 integers manually unless you also implement Rubikoslav's sticker ordering. Prefer `CuboslavWrapper.getCube()` or persist a state previously returned by that method. Native validation rejects malformed and physically impossible states.

### `initialize()`

```python
Rubikoslav.initialize(verbose: bool = False) -> None
```

Generate or load the process-global optimal-search tables before the first arbitrary-state request:

```python
from rubikoslav import Rubikoslav

Rubikoslav.initialize()
solver = Rubikoslav()
```

You do not need to call this for short `solve_scramble()` requests that can return a verified history route.

### `solve_codes()`

```python
solve_codes(state: Sequence[int]) -> list[str]
```

This compatibility method returns the engine's compact one-character move codes and raises `RuntimeError` on failure. New Python applications should normally use `solve()` and standard notation from `result.moves`.

## `SolveResult`

Every solve attempt returns the same dataclass:

```python
@dataclass(slots=True)
class SolveResult:
    success: bool
    moves: list[str]
    error: str
    search_depth: int
    elapsed_microseconds: int
    backend: str
    optimal: bool
```

| Field                  | Contract                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `success`              | `True` only after native route replay reaches the solved state.                                   |
| `moves`                | Standard notation, never more than 20 HTM moves. Empty on failure or for an already solved state. |
| `error`                | Human-readable failure detail; empty on success.                                                  |
| `search_depth`         | Number of moves accepted from the selected backend.                                               |
| `elapsed_microseconds` | End-to-end time spent inside the solve call.                                                      |
| `backend`              | `verified-history-route`, `optimal-ida-star`, or `two-phase-fallback`.                            |
| `optimal`              | Whether the shortest route was proven, not merely whether the solve succeeded.                    |

```python
result = Rubikoslav().solve_scramble("R U F2")
if not result.success:
    raise RuntimeError(result.error)

print({
    "moves": result.moves,
    "backend": result.backend,
    "optimal": result.optimal,
    "elapsed_ms": result.elapsed_microseconds / 1_000,
})
```

For JSON-friendly serialization:

```python
from dataclasses import asdict

payload = asdict(result)
```

## Backend semantics

### `verified-history-route`

The submitted history is replayed to confirm it produces the state. Rubikoslav reverses and safely simplifies it, then native-replays the answer. This is normally the fastest path and does not claim optimality. With `allow_long_history_route=True` and no explicit `max_depth`, this route may exceed 20 moves.

### `optimal-ida-star`

The solver receives an arbitrary state, initializes or loads its pruning tables, and searches with a maximum depth of 20 HTM. `optimal=True` means it proved the shortest accepted route.

### `two-phase-fallback`

Used when a configured optimal timeout expires. It is local to the Python process, remains capped at 20 moves, and does not claim optimality.

## `CuboslavWrapper`

`CuboslavWrapper` is the pybind11 bridge to the native cube model:

```python
cube = CuboslavWrapper()
cube.move("R")
cube.move("U2")

state = cube.getCube()
cube.set_cube(state)
```

| Method            | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `move(notation)`  | Apply `U D L R F B` with optional `2` or `'`. |
| `getCube()`       | Return the current 48-sticker state.          |
| `set_cube(state)` | Validate and load a 48-sticker state.         |
| `move_code(code)` | Apply one compact engine move code.           |

The camel-case `getCube()` name is retained by the native binding for compatibility.

## Verification helpers

Advanced integrations can import:

```python
from rubikoslav import SOLVED_STATE, state_to_facelets, verify_route
```

- `verify_route(state, moves)` native-replays a proposed route and raises `RuntimeError` if it does not solve the state.
- `state_to_facelets(state)` validates a native state and returns a standard 54-character `URFDLB` facelet string.
- `SOLVED_STATE` is the native solved-state tuple.
- `MAX_SOLUTION_MOVES` is `20`.

These helpers raise on invalid input. The high-level `solve()` and `solve_scramble()` methods instead report expected failures through `SolveResult`.

## Synchronous and process-wide behavior

Solving is synchronous. The optimal and fallback backends share process-global initialization state and serialize searches with a lock. Reusing a solver instance avoids needless application-level setup, but it does not make searches concurrent.

In an async application, move the call off the event-loop thread:

```python
import asyncio

solver = Rubikoslav(optimal_timeout_seconds=2)
result = await asyncio.to_thread(solver.solve_scramble, "R U F2")
```

This keeps the event loop responsive; it does not bypass in-process search serialization. Use multiple worker processes when actual parallel solve throughput is required.
