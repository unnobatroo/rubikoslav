# Troubleshooting

## `pip install` starts compiling C++

Your interpreter or platform does not match a published wheel. Confirm that before installing:

```bash
python -m pip install --only-binary=:all: rubikoslav
```

Current wheels cover CPython 3.10-3.14 on Linux x86-64 with glibc, macOS arm64, and Windows amd64. Alpine/musl, macOS Intel, 32-bit Python, and other architectures require a source build unless a future release adds wheels.

For a source build, install CMake, a C++20 compiler, Python development headers, and your platform's normal build toolchain.

## The native module fails to import

Check that the active interpreter is the one where the package was installed:

```bash
python -c "import sys, rubikoslav; print(sys.executable); print(rubikoslav.__version__)"
rubikoslav doctor
```

If a virtual environment moved between machines or Python versions, recreate it instead of reusing the compiled extension.

## `solve_scramble()` is fast but `optimal` is false

That is expected. `solve_scramble()` knows the move history and normally returns a native-verified, simplified inverse route. It does not spend time proving that route is shortest.

To request optimal search for the resulting position, pass only the state:

```python
cube = CuboslavWrapper()
for move in ("R", "U", "F2"):
    cube.move(move)

result = Rubikoslav().solve(cube.getCube())
```

## The first arbitrary-state solve is slow

The optimal backend is generating or loading transition and pruning tables. Warm it during startup:

```python
Rubikoslav.initialize()
```

Set a persistent writable cache location in containers:

```bash
export RUBIKOSLAV_CACHE_DIR=/var/cache/rubikoslav
```

Deleting the cache is safe; the next optimal solve regenerates it.

## A solve returns `success=False`

Inspect the structured result:

```python
result = solver.solve_scramble(scramble)
if not result.success:
    print(result.error)
```

Common causes include invalid notation, an impossible raw state, a `max_depth` that is too small, or a timeout that found no bounded fallback. Do not ignore `success` and assume `moves` is usable.

## Requests do not run in parallel

Searches in one process are serialized intentionally because the backends share process-global state. Threads keep callers safe, but they do not provide parallel search throughput.

Use multiple worker processes for parallelism. In async code, `asyncio.to_thread()` prevents event-loop blocking but does not remove backend serialization.

## Cache creation fails in a container

Point `RUBIKOSLAV_CACHE_DIR` at a writable directory. A read-only home directory works only for paths that never initialize arbitrary-state optimal search.

## Port 4173 is busy

```bash
rubikoslav --port 4174
```

## The visualizer renders but cannot solve

A static file server can draw the cube but does not implement `POST /api/solve`. Run the packaged app:

```bash
rubikoslav --no-open
```

## Browser changes do not appear

The app serves `web/dist/`, not `web/src/`:

```bash
npm run build
npm run verify
```

Commit the generated `web/dist/*.js` files with their TypeScript sources.

## Generated cube data is stale

```bash
cmake --build build/native --target generate-web-data
npm run build
ctest --test-dir build/native --output-on-failure
```

## Run the complete local check

```bash
npm ci
npm run verify
uv sync --locked
uv run python -m unittest discover -s python/tests -v
uv run rubikoslav doctor --strict
uv run --only-group docs mkdocs build --strict
uv build
```
