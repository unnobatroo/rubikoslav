# Rubikoslav

Rubikoslav is a synchronous Python library for solving 3×3 Rubik's Cube positions. It accepts standard move notation or the engine's 48-sticker state, returns a structured result, and native-replays every accepted route before exposing it to your code.

<div class="rubikoslav-actions" markdown="1">

[:material-package-variant: View on PyPI](https://pypi.org/project/rubikoslav/){ .md-button .md-button--primary }

[:material-rocket-launch: Install and run](getting-started.md){ .md-button }

[:fontawesome-brands-github: View the source](https://github.com/unnobatroo/rubikoslav){ .md-button }

</div>

## The short version

```bash
python -m pip install rubikoslav
```

```python
from rubikoslav import Rubikoslav

result = Rubikoslav().solve_scramble("R U F2")
if not result.success:
    raise RuntimeError(result.error)

print(result.moves)    # ["F2", "U'", "R'"]
print(result.backend)  # "verified-history-route"
```

`solve_scramble()` is the practical entry point when your application knows how the position was created. For ordinary short scrambles, Rubikoslav verifies and simplifies the inverse route instead of starting an expensive optimal search.

If your application receives an arbitrary cube state and needs the shortest route, build or load the state with `CuboslavWrapper` and call `solve(state)`. That path uses the optimal IDA* backend and may initialize a local search cache on first use.

## Contract

- Python 3.10 or newer.
- Standard notation: `U D L R F B`, with optional `2` or `'` suffixes.
- Every returned solution is at most 20 moves in the half-turn metric.
- `R2` counts as one move, just like `R` and `R'`.
- Expected solve failures are returned as `SolveResult(success=False, error=...)`.
- Accepted routes are replayed through the native C++ cube before `success=True` is returned.
- Solving is synchronous and CPU-bound. Searches in one process are serialized.

## Choose your path

| You have | Use | Typical backend |
| --- | --- | --- |
| A scramble such as `"R U F2"` | `solve_scramble()` | Verified inverse history |
| A state created with `CuboslavWrapper` | `solve(state)` | Optimal IDA* |
| A latency limit | `Rubikoslav(optimal_timeout_seconds=...)` | Optimal search, then bounded two-phase fallback |
| A terminal or local demo | `rubikoslav solve ...` or `rubikoslav` | Same Python/native package |

Continue with [installation and quickstart](getting-started.md), then use the [Python API reference](python-api.md) for the exact behavior and result fields.
