# Python API

## Solve normal notation

For most applications, start with `solve_scramble()`:

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

`SolveResult` has the same fields whether the solve succeeds or fails:

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

Use `solve()` if your application already tracks Rubikoslav's 48 movable stickers:

```python
result = solver.solve(state)
```

The state needs 48 integers from `0` through `5`, with eight stickers of each color. Native validation rejects impossible color counts, mirrored pieces, twists, flips, and unreachable permutations.

## Manipulate the native cube

`CuboslavWrapper` is the small pybind11 bridge to the native cube:

```python
from rubikoslav import CuboslavWrapper

cube = CuboslavWrapper()
cube.move("R")
cube.move("U2")
state = cube.getCube()
```

Most applications can stick with `solve_scramble()` and let Rubikoslav manage the state.

## The 20-move boundary

Direct Python calls have no time limit by default, but they reject `max_depth` values above 20. The HTTP endpoint returns a verified inverse history immediately when it fits that limit. Longer histories use a bounded local two-phase search instead. Neither route may exceed 20 moves.

The visualizer uses that same HTTP endpoint. TypeScript sends the state and animates the result. Python finds the route, while C++ validates the state and replays the answer before anything comes back.
