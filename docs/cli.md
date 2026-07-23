# CLI and visualizer

Installing the package adds a `rubikoslav` command.

## Solve a scramble

```bash
rubikoslav solve "R U R' U'"
```

Example output:

```text
Scramble: R U R' U'
Solution (4 moves): U R U' R'
Verified by native replay in 0.1 ms
```

Limit the accepted route depth:

```bash
rubikoslav solve "R U F2" --max-depth 10
```

The limit must be from 0 through 20 inclusive.

## Check an installation

```bash
rubikoslav doctor
rubikoslav doctor --strict
```

The normal check validates imports and packaged assets. The strict check also runs optimal search and native replay, so it is suitable for an image-build or deployment smoke test.

## Run the local visualizer

```bash
rubikoslav
```

The command starts a local HTTP server at <http://127.0.0.1:4173> and opens the browser. Useful options:

```bash
rubikoslav --no-open
rubikoslav --port 8080
rubikoslav --host 0.0.0.0 --port 8080 --no-open
```

| Command                      | Behavior                             |
| ---------------------------- | ------------------------------------ |
| `rubikoslav`                 | Start the local app and open it.     |
| `rubikoslav --no-open`       | Start without opening a tab.         |
| `rubikoslav --port 8080`     | Bind another port.                   |
| `rubikoslav solve "..."`     | Solve standard notation.             |
| `rubikoslav doctor`          | Check native and web package assets. |
| `rubikoslav doctor --strict` | Include a real optimal solve.        |
| `rubikoslav --version`       | Print the installed version.         |

## What runs where

The visualizer is not a browser-only solver. TypeScript renders the cube and sends its state and move history to the local Python endpoint. Python chooses a bounded route, and the native engine validates and replays it before the browser animates it.

Serving `web/` with `python -m http.server` is therefore incomplete: the page renders, but `POST /api/solve` does not exist. Use the packaged `rubikoslav` command for a functional local app.

The hosted visualizer is available at [rubikoslav.vercel.app](https://rubikoslav.vercel.app). For application integration, prefer the Python API over treating the visualizer's internal endpoint as a public service contract.
