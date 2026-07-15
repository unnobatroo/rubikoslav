# Rubikoslav

Rubikoslav is a reusable 3×3 Rubik's Cube solver with a Python API, a C++20 cube engine, a command-line interface, and an interactive browser visualizer.

Every returned route is replayed through the native engine before it is accepted.

<div class="rubikoslav-actions" markdown="1">

[Open the visualizer](https://rubikoslav.vercel.app){ .md-button .md-button--primary }

[View the source](https://github.com/unnobatroo/rubikoslav){ .md-button }

</div>

## Install

```bash
pip install rubikoslav
```

Or add it to a uv project:

```bash
uv add rubikoslav
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

## Choose a route

| I want to… | Read this |
| --- | --- |
| Install the app or use the CLI | [Getting started](getting-started.md) |
| Call Rubikoslav from Python | [Python API](python-api.md) |
| Link the native C++ library | [C++ API](cpp-api.md) |
| Understand the solver and browser | [Architecture](architecture.md) |
| Build or test the repository | [Development](development.md) |
| Create an official package release | [Publishing](publishing.md) |
