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

`python3 -m http.server` can serve the visual files, but it does not provide `POST /api/solve`. Start the complete local application with `rubikoslav` or `uv run rubikoslav`.

## Run the full health check

```bash
uv sync --locked
uv run rubikoslav doctor --strict
uv run python -m unittest discover -s python/tests -v
```
