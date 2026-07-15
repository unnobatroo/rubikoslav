# Getting started

## Install the package

Use a virtual environment in real projects:

=== "Current GitHub package"

    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
    pip install "rubikoslav @ git+https://github.com/unnobatroo/rubikoslav.git"
    ```

=== "Current GitHub package with uv"

    ```bash
    uv init
    uv add "rubikoslav @ git+https://github.com/unnobatroo/rubikoslav.git"
    ```

=== "PyPI release"

    ```bash
    pip install rubikoslav
    ```

The PyPI command becomes available after the first tagged release. Until then, install the same package directly from GitHub. A source install needs the platform's normal compiler tools; published wheels will include the compiled native extension.

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

Rubikoslav uses standard face letters: `U`, `D`, `L`, `R`, `F`, and `B`.

- `R` means one quarter turn.
- `R2` means a half turn.
- `R'` means the reverse quarter turn.

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
