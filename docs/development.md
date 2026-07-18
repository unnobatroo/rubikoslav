# Development

## Requirements

- [uv](https://docs.astral.sh/uv/)
- Node.js 24 or newer
- CMake 3.26 or newer
- A C++20 compiler
- Normal platform development tools

## Python package

```bash
uv sync --locked
uv run python -m unittest discover -s python/tests -v
uv run rubikoslav doctor --strict
uv build
```

## Native library

```bash
cmake -S . -B build/native \
  -DRUBIKOSLAV_BUILD_PYTHON=OFF \
  -DRUBIKOSLAV_WARNINGS_AS_ERRORS=ON
cmake --build build/native --parallel
ctest --test-dir build/native --output-on-failure
```

## Browser TypeScript

The handwritten browser code lives under `web/src/`. TypeScript compiles it into the browser-ready modules in `web/dist/` that ship in wheels and on Vercel.

Install the pinned compiler, then check both the strict types and the committed browser output:

```bash
npm ci
npm run verify
```

After changing native face-turn logic, regenerate the typed cube data before compiling the browser files:

```bash
cmake --build build/native --target generate-web-data
npm run build
ctest --test-dir build/native --output-on-failure
```

`WebDataGeneratorovichIsCurrent` compares `web/src/generated/cube-data.ts` with fresh output from the C++ engine. `npm run verify` separately catches stale JavaScript under `web/dist/`.

## Documentation

```bash
uv sync --locked --only-group docs --no-install-project
uv run --no-sync mkdocs serve
```

Open <http://127.0.0.1:8000>. For the same strict build used in production:

```bash
uv run --no-sync mkdocs build --strict
```

## Production deployment

Pushes to `main` run the tests and deploy through `.github/workflows/deploy.yml`. The repository needs a `VERCEL_TOKEN` Actions secret.

For a manual deployment:

```bash
vercel --prod
```

Vercel keeps generated search tables under `/tmp` for each warm function instance. A cold instance has to initialize them again.

Documentation changes go through `.github/workflows/docs.yml`, which publishes `docs/` to GitHub Pages.
