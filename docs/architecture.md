# Architecture

Rubikoslav keeps one physical cube model at the center of every interface.

```mermaid
flowchart LR
    User[Browser, CLI, or Python project] --> Python[Python API]
    Python --> Native[C++20 Cuboslav]
    Native --> Validation[Physical-state validation]
    Validation --> Adapter[48 stickers to solver net]
    Adapter --> Search[Optimal IDA* search]
    Tables[(Generated pruning tables)] --> Search
    Search --> Replay[Native route replay]
    Replay --> User

    Native -. build time .-> Generator[WebDataGeneratorovich]
    Generator -. typed move permutations .-> TypeScript[Strict TypeScript browser source]
    TypeScript -. compile .-> Browser[3D browser cube]
```

## Native engine

`rubikoslav::Cuboslav` owns the 48 movable stickers and implements all 18 face turns. It checks color counts, piece identity, orientation invariants, and permutation reachability before accepting an external state.

## Python solver

`Rubikoslav` translates the native state into the color net expected by the search dependency. The solver uses increasing cost bounds and admissible pruning tables. A route is returned only after the C++ engine replays it to the solved state.

## Browser

The browser application is written in strict TypeScript under `web/src/`. The browser-ready ES modules under `web/dist/` are compiled artifacts retained for Python wheels and Vercel.

The browser does not maintain a second handwritten set of cube rules. `WebDataGeneratorovich` derives typed sticker permutations from the C++ engine. CTest fails if that generated TypeScript becomes stale, and the npm verification step fails if its compiled JavaScript is stale.

Each animated face turn rotates the correct nine cubies, commits the generated permutation, and then starts the next turn.

See [Browser and TypeScript](browser-typescript.md) for the source/runtime boundary, type contracts, and edit workflow.

## Hosted endpoint

The local server and Vercel function share the same payload validation and solving function. Hosted requests receive a short optimal-search budget. When a deep search times out, the server can verify, reverse, and simplify the actual button history.
