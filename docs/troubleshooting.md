# Troubleshooting

## The first solve is slow

The solver is generating or loading its transition and pruning tables. Later runs reuse the local cache.

Move the cache when needed:

```bash
export RUBIKOSLAV_CACHE_DIR=/absolute/path/to/cache
rubikoslav doctor --strict
```

It is safe to delete the cache; the next solve will simply generate the tables again.

## The C++ extension does not compile

Install your platform's normal compiler tools, then rebuild the package:

```bash
uv sync --reinstall-package rubikoslav
```

On supported platforms, the official PyPI wheels avoid this compiler step during a normal install.

## Port 4173 is busy

Choose another port:

```bash
rubikoslav --port 4174
```

## The cube moves but solving fails on a static server

TypeScript only draws the cube. Solving still needs the Python/C++ endpoint, and `python3 -m http.server` does not provide `POST /api/solve`. Start the full local app with `rubikoslav` or `uv run rubikoslav` instead.

## TypeScript changes do not appear in the browser

The app serves compiled files from `web/dist/`, not the TypeScript under `web/src/`. Rebuild and verify the browser output:

```bash
npm run build
npm run verify
```

If `npm run verify` reports stale browser JavaScript, compile it again and commit the updated files under `web/dist/` with the TypeScript change.

## Generated cube data is stale

If CTest says `web/src/generated/cube-data.ts` is stale, rebuild the native generator and regenerate the data before compiling TypeScript:

```bash
cmake --build build/native --target generate-web-data
npm run build
ctest --test-dir build/native --output-on-failure
```

## Run the full health check

```bash
npm ci
npm run verify
uv sync --locked
uv run rubikoslav doctor --strict
uv run python -m unittest discover -s python/tests -v
```
