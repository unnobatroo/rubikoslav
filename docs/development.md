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

The handwritten browser application lives in `web/src/app.ts`. TypeScript compiles it to the browser-ready `web/dist/app.js` shipped in wheels and on Vercel.

Install the pinned compiler and verify both strict types and committed browser output:

```bash
npm ci
npm run verify
```

After changing native face-turn logic, regenerate the typed cube data and compile it:

```bash
cmake --build build/native --target generate-web-data
npm run build
ctest --test-dir build/native --output-on-failure
```

`WebDataGeneratorovichIsCurrent` compares `web/src/generated/cube-data.ts` with fresh output from the C++ engine. `npm run verify` also fails if the compiled JavaScript under `web/dist/` is stale.

The complete file map and verification boundary are documented in [Browser and TypeScript](browser-typescript.md).

## Documentation

```bash
uv sync --locked --only-group docs --no-install-project
uv run --no-sync mkdocs serve
```

Open <http://127.0.0.1:8000>. A strict production build uses:

```bash
uv run --no-sync mkdocs build --strict
```

## Production deployment

Pushes to `main` run the test suite and deploy the application through `.github/workflows/deploy.yml`. The repository needs the `VERCEL_TOKEN` Actions secret.

For a manual deployment:

```bash
vercel --prod
```

Vercel stores generated search tables under `/tmp` for each warm function instance. A cold instance initializes them again.

Documentation changes run `.github/workflows/docs.yml` and publish `docs/` to GitHub Pages.
