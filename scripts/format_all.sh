#!/usr/bin/env bash

set -euo pipefail

FORMAT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$FORMAT_ROOT"

format_workflows=true
if (($# > 1)); then
  printf 'Usage: %s [--exclude-workflows]\n' "$0" >&2
  exit 2
fi
if (($# == 1)); then
  if [[ "$1" != "--exclude-workflows" ]]; then
    printf 'Unknown option: %s\n' "$1" >&2
    printf 'Usage: %s [--exclude-workflows]\n' "$0" >&2
    exit 2
  fi
  format_workflows=false
fi

say() {
  printf '\n%s\n' "$1"
}

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required formatter: %s\n' "$1" >&2
    exit 1
  fi
}

cpp_files=()
while IFS= read -r -d '' file; do
  cpp_files+=("$file")
done < <(
  find cpp \
    -type f \
    \( -name '*.c' -o -name '*.cc' -o -name '*.cpp' -o -name '*.h' -o -name '*.hh' -o -name '*.hpp' \) \
    -print0
)

python_files=()
while IFS= read -r -d '' file; do
  python_files+=("$file")
done < <(
  find api python scripts \
    -type f \
    -name '*.py' \
    -print0
)

prettier_roots=(web/src web/styles docs)
if [[ "$format_workflows" == true ]]; then
  prettier_roots+=(.github)
fi

web_files=()
while IFS= read -r -d '' file; do
  web_files+=("$file")
done < <(
  find "${prettier_roots[@]}" \
    -type f \
    \( -name '*.ts' -o -name '*.css' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' \) \
    ! -path 'web/src/generated/*' \
    -print0
)
web_files+=(
  "web/index.html"
  "scripts/check_web_build.ts"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "vercel.json"
  "README.md"
  "mkdocs.yml"
)

svg_files=()
while IFS= read -r -d '' file; do
  svg_files+=("$file")
done < <(
  find web docs \
    -type f \
    -name '*.svg' \
    -print0
)

cmake_files=()
while IFS= read -r -d '' file; do
  cmake_files+=("$file")
done < <(
  find . \
    -type f \
    \( -name 'CMakeLists.txt' -o -name '*.cmake' -o -name '*.cmake.in' \) \
    ! -path './build/*' \
    ! -path './.venv/*' \
    ! -path './.git/*' \
    -print0
)

shell_files=()
while IFS= read -r -d '' file; do
  shell_files+=("$file")
done < <(
  find . \
    -type f \
    \( -name '*.sh' -o -name '*.bash' \) \
    ! -path './build/*' \
    ! -path './.venv/*' \
    ! -path './.git/*' \
    -print0
)

if ((${#cpp_files[@]})); then
  say "Formatting C and C++ with clang-format..."
  require uv
  uvx --from clang-format==22.1.3 clang-format -i "${cpp_files[@]}"
fi

if ((${#python_files[@]})); then
  require uv
  say "Formatting Python with Ruff..."
  uvx ruff==0.15.22 format "${python_files[@]}"
fi

if ((${#web_files[@]})); then
  require npx
  say "Formatting TypeScript, HTML, CSS, JSON, Markdown, and YAML with Prettier..."
  npx --yes prettier@3.6.2 --write "${web_files[@]}"

  if [[ ! -x node_modules/.bin/tsc ]]; then
    printf 'TypeScript dependencies are missing; run npm ci first.\n' >&2
    exit 1
  fi
  say "Rebuilding browser JavaScript from formatted TypeScript..."
  npm run build
fi

if ((${#svg_files[@]})); then
  require npx
  say "Formatting SVG with Prettier..."
  npx --yes prettier@3.6.2 --parser html --write "${svg_files[@]}"
fi

if ((${#cmake_files[@]})); then
  require uv
  say "Formatting CMake with cmake-format..."
  uvx --from cmakelang==0.6.13 cmake-format -i "${cmake_files[@]}"
fi

if [[ -f pyproject.toml ]]; then
  require npx
  say "Formatting TOML with Taplo..."
  npx --yes @taplo/cli@0.7.0 format pyproject.toml
fi

if ((${#shell_files[@]})); then
  say "Formatting shell scripts with shfmt..."
  if command -v shfmt >/dev/null 2>&1; then
    shfmt -w -i 2 -ci "${shell_files[@]}"
  else
    require uv
    uvx --from shfmt-py shfmt -w -i 2 -ci "${shell_files[@]}"
  fi
fi

say "Formatting complete."
