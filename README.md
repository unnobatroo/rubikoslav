# Rubikoslav

[![PyPI](https://img.shields.io/pypi/v/rubikoslav?label=PyPI)](https://pypi.org/project/rubikoslav/)
[![Wiki](https://img.shields.io/badge/docs-wiki-2878EB?logo=materialformkdocs&logoColor=white)](https://unnobatroo.github.io/rubikoslav/)

Rubikoslav solves 3×3 Rubik's Cubes through a Python API, a CLI, and an animated browser visualiser, all backed by a C++20 cube engine. Arbitrary-state and depth-limited solutions are capped at 20 moves in the half-turn metric; the visualiser can instead replay a longer native-verified undo route for positions created through its own controls.

## Install the package

Install it from PyPI:

```bash
pip install rubikoslav
```

## Use it in Python

```python
from rubikoslav import Rubikoslav

result = Rubikoslav().solve_scramble("R U F2")

if result.success:
    print(result.moves)
```

## Run the visualiser

```bash
uv run rubikoslav
```

The visualiser sends the current position to Python. C++ checks the state and replays the route before the browser animates anything. `R2` counts as one move, just like `R` and `R'`.

Or use the hosted version at [rubikoslav.vercel.app](https://rubikoslav.vercel.app).
