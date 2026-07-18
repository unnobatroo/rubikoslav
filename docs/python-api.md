# Python API

## Solve normal notation

`solve_scramble()` is the normal entry point for another application:

```python
from rubikoslav import Rubikoslav

solver = Rubikoslav()
result = solver.solve_scramble("R U F2")
```

It also accepts a sequence:

```python
result = solver.solve_scramble(["R", "U", "F2"])
```

## Read the result

`SolveResult` uses the same shape for success and failure:

| Field | Meaning |
| --- | --- |
| `success` | Whether a verified route was found |
| `moves` | At most 20 half-turn-metric moves, such as `F2 U' R'` |
| `error` | Failure explanation, otherwise empty |
| `search_depth` | Number of moves in the result |
| `elapsed_microseconds` | Total solve time |
| `backend` | Solver path that produced the route |
| `optimal` | Whether the shortest route was proven |

```python
if not result.success:
    raise RuntimeError(result.error)

print(" ".join(result.moves))
print(f"Solved in {result.elapsed_microseconds / 1_000:.1f} ms")
```

## Solve an existing state

Use `solve()` when an integration already tracks Rubikoslav's 48 movable stickers:

```python
result = solver.solve(state)
```

The state must contain 48 integers from `0` through `5`, with eight stickers of each color. Native validation rejects impossible color counts, mirrored pieces, twists, flips, and unreachable permutations.

## Manipulate the native cube

`CuboslavWrapper` exposes the small pybind11 bridge:

```python
from rubikoslav import CuboslavWrapper

cube = CuboslavWrapper()
cube.move("R")
cube.move("U2")
state = cube.getCube()
```

Most applications should prefer `solve_scramble()` and let the package own this state.

## The 20-move boundary

Direct Python calls search without a time limit by default and reject `max_depth` values above 20. The HTTP endpoint has a short optimal-search budget. It may return a verified inverse of the supplied movement history only when that route is also 20 moves or fewer; otherwise it reports that the bounded search timed out.

The visualizer calls the same HTTP endpoint. TypeScript only submits the state and animates the result; Python searches for the route, and C++ validates the state and replays the answer before it is returned.
