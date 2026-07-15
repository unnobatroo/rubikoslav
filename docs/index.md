# Rubikoslav

Rubikoslav is a reusable 3×3 Rubik's Cube solver with a Python API, a C++20 cube engine, a command-line interface, and an interactive browser visualizer.

Every returned route is replayed through the native engine before it is accepted.

<div class="rubikoslav-actions" markdown="1">

[:material-cube-outline: Open the visualizer](https://rubikoslav.vercel.app){ .md-button .md-button--primary }

[:material-download: Install the package](getting-started.md){ .md-button }

[:fontawesome-brands-github: View the source](https://github.com/unnobatroo/rubikoslav){ .md-button }

</div>

## Install

Install the published package from PyPI:

```bash
pip install rubikoslav
```

## Solve a scramble

```python
from rubikoslav import Rubikoslav

result = Rubikoslav().solve_scramble("R U F2")

if result.success:
    print(result.moves)
else:
    raise RuntimeError(result.error)
```

The first solve generates or loads the optimal search tables in the local cache. Later runs reuse them.
