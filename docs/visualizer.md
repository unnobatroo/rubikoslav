# Visualizer

The browser gives the engine a physical, animated control surface. Use the [hosted visualizer](https://rubikoslav.vercel.app) or start the same app locally with `rubikoslav`.

## Make and solve a position

Imagine you want to study the position made by `R U F2`.

1. Press `R`, `U`, and `F2`. **Your moves** records each turn in real time.
2. Press **Solve & play**. The app freezes the current cube state and asks the solver for a route.
3. The move row changes from your input to the verified solution.
4. Use the arrows, move tokens, play button, and speed control to inspect the route.
5. Press **Reset** inside **Your moves** to solve the display and clear its history.

## Other controls

- **Scramble** creates a clean 20-move position and records it in the move row.
- **Load route** accepts normal notation such as `R U R' U'` and compact internal `A`–`R` codes where they do not conflict with face letters.
- The circular arrow above the cube resets only the camera.
- Drag the stage to rotate the view without changing the cube state.

## What Play sends

Play sends the 48 movable stickers and the button history to the shared solve endpoint. The raw sticker array never needs to be typed manually.

The server validates the position, searches for a solution, replays the answer through the native C++ cube, and returns the route. Deep hosted searches use the verified button history as a bounded fallback instead of leaving the page stuck indefinitely.
