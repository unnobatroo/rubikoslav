# Getting started

## Install the library

Use a virtual environment in real projects:

=== "pip"

    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
    pip install rubikoslav
    ```

=== "uv"

    ```bash
    uv init
    uv add rubikoslav
    ```

The published wheels include the compiled native extension. A normal install should not require CMake or a C++ compiler.

## Open the visualizer

```bash
rubikoslav
```

The command starts the local solver and opens the visual cube. To keep the browser closed:

```bash
rubikoslav --no-open
```

## Solve from the terminal

```bash
rubikoslav solve "R U R' U'"
```

## Check the installation

```bash
rubikoslav doctor --strict
```

The strict check loads the native module, finds the packaged web files, performs a real solve, and replays the answer through C++.

## First-solve cache

Optimal search uses generated transition and pruning tables. Rubikoslav stores them under the operating system's normal cache location. Override it when needed:

```bash
export RUBIKOSLAV_CACHE_DIR=/absolute/path/to/cache
rubikoslav doctor --strict
```
