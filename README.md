# Rubikoslav

[![PyPI](https://img.shields.io/pypi/v/rubikoslav.svg?label=PyPI)](https://pypi.org/project/rubikoslav/)
[![Wiki](https://img.shields.io/badge/docs-wiki-2878EB?logo=materialformkdocs&logoColor=white)](https://unnobatroo.github.io/rubikoslav/)

Rubikoslav is a reusable 3×3 Rubik's Cube solver. It combines a C++20 cube engine, a Python API and CLI, and an animated browser visualiser. Every returned solution is limited to 20 moves in the half-turn metric and replayed through the cube engine before it is accepted.

## Install the package

Install the published package from PyPI:

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

The visualiser sends the current position to the Python solver; C++ validates the state and replays the returned route before the browser animates it. `R2` counts as one move, just like `R` and `R'`.

Or use the hosted version at [rubikoslav.vercel.app](https://rubikoslav.vercel.app).
