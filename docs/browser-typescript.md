# Browser and TypeScript

Rubikoslav's interactive cube is authored in strict TypeScript. The browser still receives normal JavaScript because browsers do not execute TypeScript directly.

## Source and runtime files

| Path | Role |
| --- | --- |
| `web/src/app.ts` | Handwritten browser application and interaction logic |
| `web/src/generated/cube-data.ts` | Typed move permutations generated from C++ |
| `web/dist/app.js` | Compiled browser module served by Python and Vercel |
| `web/dist/generated/cube-data.js` | Compiled generated data served to the browser |
| `web/index.html` | Visualizer markup |
| `web/styles.css` | Visualizer layout and presentation |

Edit the files under `web/src/`. Do not make behavioral changes directly in the compiled JavaScript under `web/dist/`.

## Why compiled JavaScript is committed

Rubikoslav distributes the visualizer inside Python wheels and serves the same files from its local HTTP server and Vercel function. Keeping the compiled ES modules in `web/dist/` means installed users do not need Node.js or TypeScript to run the application.

The source distribution includes both the TypeScript sources and the browser-ready output. The wheel contains the HTML, CSS, and runtime files under `web/dist/`.

## Type contracts

The browser source defines or imports types for:

- the six cube faces;
- all 18 legal move strings;
- the six sticker colors;
- route and playback state;
- required DOM elements;
- turn axes and slice coordinates;
- successful and failed solver responses.

The JSON returned by `/api/solve` is still external runtime data. `parseSolveResponse()` validates its shape before the application uses it, so TypeScript types are not treated as a substitute for runtime validation.

## Normal edit workflow

Install the pinned compiler once:

```bash
npm ci
```

After editing `web/src/app.ts`:

```bash
npm run check
npm run build
npm run verify
```

`npm run check` performs strict type checking. `npm run build` writes the browser modules under `web/`. `npm run verify` compiles into a temporary build directory and compares that result with the committed runtime files.

## Native move-data workflow

Cube movement remains owned by C++. When native turn logic or face layout changes:

```bash
cmake --build build/native --target generate-web-data
npm run build
npm run verify
ctest --test-dir build/native --output-on-failure
```

`WebDataGeneratorovich` writes `web/src/generated/cube-data.ts`. This preserves one physical move implementation while still giving the browser a fully typed data contract.

## Verification boundary

The project checks the browser layer at several levels:

1. TypeScript strict mode checks source-level contracts.
2. `npm run verify` detects stale compiled JavaScript.
3. CTest detects stale C++-generated TypeScript.
4. Python regression tests compare every visual face turn with native sticker movement.
5. Browser smoke tests confirm that modules load, controls render, and solving works without console errors.
