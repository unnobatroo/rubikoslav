# Troubleshooting

## The first solve is slow

The optimal solver is generating or loading its transition and pruning tables. Later runs reuse the local cache.

Move the cache when needed:

```bash
export RUBIKOSLAV_CACHE_DIR=/absolute/path/to/cache
rubikoslav doctor --strict
```

Deleting the cache is safe, but the next solve has to generate the tables again.

## The C++ extension does not compile

Install the platform's normal compiler tools, then rebuild the package:

```bash
uv sync --reinstall-package rubikoslav
```

Official PyPI wheels are intended to remove this compiler requirement for normal installs.

## Port 4173 is busy

Choose another port:

```bash
rubikoslav --port 4174
```

## The cube moves but solving fails on a static server

TypeScript only visualizes the cube; solving requires the Python/C++ endpoint. `python3 -m http.server` does not provide `POST /api/solve`. Start the complete local application with `rubikoslav` or `uv run rubikoslav`.

## TypeScript changes do not appear in the browser

The application serves compiled files from `web/dist/`, not the source files under `web/src/`. Rebuild and verify them:

```bash
npm run build
npm run verify
```

If `npm run verify` reports stale browser JavaScript, commit the newly compiled `web/dist/app.js` and `web/dist/generated/cube-data.js` with the TypeScript change.

## Generated cube data is stale

When CTest reports that `web/src/generated/cube-data.ts` is stale, rebuild the native generator and regenerate the data before compiling TypeScript:

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
