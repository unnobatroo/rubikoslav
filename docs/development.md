# Development

## Requirements

- [uv](https://docs.astral.sh/uv/)
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

## Browser movement data

After changing native face-turn logic:

```bash
cmake --build build/native --target generate-web-data
ctest --test-dir build/native --output-on-failure
```

`WebDataGeneratorovichIsCurrent` compares the committed browser data with fresh output from the C++ engine.

## Documentation

```bash
uv sync --locked --only-group docs --no-install-project
uv run --no-sync mkdocs serve
```

Open <http://127.0.0.1:8000>. A strict production build uses:

```bash
uv run --no-sync mkdocs build --strict
```
