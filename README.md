# Rubikoslav

[![PyPI](https://img.shields.io/pypi/v/rubikoslav?label=PyPI)](https://pypi.org/project/rubikoslav/)
[![Wiki](https://img.shields.io/badge/docs-wiki-2878EB?logo=materialformkdocs&logoColor=white)](https://unnobatroo.github.io/rubikoslav/)

Rubikoslav is a reusable 3×3 Rubik's Cube solver. It combines a C++20 cube engine, a Python API and CLI, and an animated browser visualizer. Every returned solution is replayed through the native cube before it is accepted.

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

## Run the visualizer

```bash
uv run rubikoslav
```

Or use the hosted version at [rubikoslav.vercel.app](https://rubikoslav.vercel.app).
