# Getting started

## Install the package

For a project, start with a virtual environment:

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

Published wheels already include the native extension. On a supported platform, a normal install does not need CMake or a C++ compiler.

## Open the visualizer

```bash
rubikoslav
```

This starts the local solver and opens the cube in your browser. To start the server without opening a tab:

```bash
rubikoslav --no-open
```

## Solve from the terminal

```bash
rubikoslav solve "R U R' U'"
```

## Common commands

| Command | What it does |
| --- | --- |
| `rubikoslav` | Opens the local visualizer. |
| `rubikoslav --no-open` | Starts the app without opening a browser. |
| `rubikoslav --port 8080` | Uses another local port. |
| `rubikoslav solve "R U F2"` | Solves a scramble from the terminal. |
| `rubikoslav doctor` | Checks the native module, solver, and web files. |
| `rubikoslav doctor --strict` | Performs and replays a real solve. |

## Move notation

Moves use the standard face letters: `U`, `D`, `L`, `R`, `F`, and `B`.

- `R` means one quarter turn.
- `R2` means a half turn.
- `R'` means the reverse quarter turn.

Each token counts as one move in the half-turn metric, including `R2`. Rubikoslav will not accept a solution longer than 20 moves.

## Check the installation

```bash
rubikoslav doctor --strict
```

The strict check loads the native module, finds the packaged web files, runs a real solve, and asks C++ to replay the answer.

## First-solve cache

The optimal search relies on generated transition and pruning tables. Rubikoslav keeps them in your operating system's normal cache location. To put them somewhere else:

```bash
export RUBIKOSLAV_CACHE_DIR=/absolute/path/to/cache
rubikoslav doctor --strict
```
