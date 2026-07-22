# Installation and quickstart

## Requirements

Rubikoslav requires CPython 3.10 or newer. Release wheels are currently built for:

- Linux x86-64 using glibc;
- macOS arm64;
- Windows amd64;
- CPython 3.10 through 3.14.

On those targets, installation uses a prebuilt native extension and does not compile C++. Other targets may fall back to a source build and therefore need CMake, a C++20 compiler, and normal platform development tools.

## Install in a project

=== "pip"

    ```bash
    python -m venv .venv
    source .venv/bin/activate
    python -m pip install rubikoslav
    ```

    On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1`.

=== "uv"

    ```bash
    uv init
    uv add rubikoslav
    ```

=== "No source builds"

    ```bash
    python -m pip install --only-binary=:all: rubikoslav
    ```

    Use this in CI when an unsupported platform should fail clearly instead of attempting a C++ build.

## Verify the installation

```bash
rubikoslav doctor
```

This checks that Python can import the native cube module and find the packaged visualizer. To perform an actual optimal search and native replay as well:

```bash
rubikoslav doctor --strict
```

The strict check can be slower on a fresh machine because it initializes the optimal-search cache.

## Solve from Python

```python
from rubikoslav import Rubikoslav

solver = Rubikoslav()
result = solver.solve_scramble("R U R' U'")

if not result.success:
    raise RuntimeError(result.error)

print(" ".join(result.moves))
```

`solve_scramble()` also accepts a sequence of tokens:

```python
result = solver.solve_scramble(["R", "U", "R'", "U'"])
```

## Handle failure explicitly

Solver failures are data, not control-flow exceptions:

```python
result = solver.solve_scramble("R not-a-move")

if result.success:
    route = result.moves
else:
    logger.warning("Cube solve failed: %s", result.error)
```

Do not branch on the exact error text; messages are intended for humans and may become more specific in later versions.

## Understand the two common solve modes

### Known scramble or move history

`solve_scramble()` knows how the position was created. If the simplified inverse fits the requested limit, it is returned immediately after native verification. This is fast and deterministic, but it does not claim to be the shortest route.

### Arbitrary state

`solve(state)` receives only the position. It uses the optimal backend by default:

```python
from rubikoslav import CuboslavWrapper, Rubikoslav

cube = CuboslavWrapper()
for move in ("R", "U", "F2"):
    cube.move(move)

result = Rubikoslav().solve(cube.getCube())
```

This path may generate or load pruning tables on first use. See [production usage](production.md) before putting arbitrary-state solving on a request path.

## Next steps

- [Python API](python-api.md): signatures, result fields, raw states, verification, and backends.
- [CLI and visualizer](cli.md): terminal commands and the local web app.
- [Production usage](production.md): cache placement, latency, concurrency, and deployment.
