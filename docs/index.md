# Rubikoslav

Rubikoslav solves 3×3 Rubik's Cubes from Python, the command line, or an interactive browser visualizer. A C++20 engine sits underneath each interface.

Every route is limited to 20 moves in the half-turn metric. Before Rubikoslav returns it, the cube engine replays the moves and checks that they really solve the position.

<div class="rubikoslav-actions" markdown="1">

[:material-cube-outline: Open the visualizer](https://rubikoslav.vercel.app){ .md-button .md-button--primary }

[:material-download: Install the package](getting-started.md){ .md-button }

[:fontawesome-brands-github: View the source](https://github.com/unnobatroo/rubikoslav){ .md-button }

</div>

## Install

Install it from PyPI:

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

The first solve prepares the search tables in your local cache. Later solves reuse them.
