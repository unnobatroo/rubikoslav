# Rubikoslav

[![Python package](https://img.shields.io/badge/Python-package-3776AB?logo=python&logoColor=white)](#install-the-package)
[![Live visualizer](https://img.shields.io/badge/visualizer-live-C5FF2E?logo=vercel&logoColor=111519)](https://rubikoslav.vercel.app)
[![Wiki](https://img.shields.io/badge/docs-wiki-2878EB?logo=materialformkdocs&logoColor=white)](https://unnobatroo.github.io/rubikoslav/)
[![CI](https://github.com/unnobatroo/rubikoslav/actions/workflows/ci.yml/badge.svg)](https://github.com/unnobatroo/rubikoslav/actions/workflows/ci.yml)
[![GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-E5483F)](LICENSE)

Rubikoslav is a reusable 3×3 Rubik's Cube solver. It combines a C++20 cube engine, a Python API and CLI, and an animated browser visualizer. Every returned solution is replayed through the native cube before it is accepted.

## Install the package

Install the current package directly from GitHub:

```bash
pip install "rubikoslav @ git+https://github.com/unnobatroo/rubikoslav.git"
```

Tagged releases are prepared for the usual PyPI command:

```bash
pip install rubikoslav
```

The first PyPI release is waiting for the one-time trusted-publisher setup described in the [publishing guide](https://unnobatroo.github.io/rubikoslav/publishing/). Until then, the GitHub command above installs the same package from source.

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

## Documentation

| Guide | What it covers |
| --- | --- |
| [Getting started](https://unnobatroo.github.io/rubikoslav/getting-started/) | Installation, CLI commands, and first solve |
| [Visualizer](https://unnobatroo.github.io/rubikoslav/visualizer/) | Making positions, playback, routes, and controls |
| [Python API](https://unnobatroo.github.io/rubikoslav/python-api/) | `solve_scramble()`, results, and raw states |
| [C++ API](https://unnobatroo.github.io/rubikoslav/cpp-api/) | Namespaces, CMake, and native integration |
| [Architecture](https://unnobatroo.github.io/rubikoslav/architecture/) | Solver flow, native verification, and browser data |
| [Development](https://unnobatroo.github.io/rubikoslav/development/) | Building, testing, docs, and deployment |
| [Troubleshooting](https://unnobatroo.github.io/rubikoslav/troubleshooting/) | First-run cache, compilers, ports, and web solving |

Created by [Jaloliddin Ismailov](https://jalols.page). Licensed under [GPL-3.0](LICENSE).
