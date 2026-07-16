// Browser output is compiled to web/dist/app.js; edit this TypeScript source instead.
import {
  faceLayouts,
  movePermutations,
  solvedState,
  type Face,
  type Move,
  type Sticker,
} from './generated/cube-data.js';

type RouteKind = 'custom' | 'solution' | null;
type Coordinate = 'x' | 'y' | 'z';

interface Coordinates {
  x: number;
  y: number;
  z: number;
}

interface TurnGeometry {
  coordinate: Coordinate;
  layer: -1 | 1;
  axis: 'X' | 'Y' | 'Z';
  direction: -1 | 1;
}

interface DragOrigin {
  x: number;
  y: number;
  rotationX: number;
  rotationY: number;
}

interface SolveSuccess {
  success: true;
  moves: Move[];
  elapsedMicroseconds: number;
  optimal: boolean;
}

interface SolveFailure {
  success: false;
  error: string;
}

type SolveResponse = SolveSuccess | SolveFailure;

function requiredElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMove(value: string): value is Move {
  return Object.hasOwn(movePermutations, value);
}

function parseSolveResponse(value: unknown): SolveResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The solver returned an invalid response.');
  }

  const payload = value as Record<string, unknown>;
  if (payload.success === false && typeof payload.error === 'string') {
    return { success: false, error: payload.error };
  }
  if (
    payload.success !== true
    || !Array.isArray(payload.moves)
    || !payload.moves.every((move) => typeof move === 'string' && isMove(move))
    || typeof payload.elapsedMicroseconds !== 'number'
    || typeof payload.optimal !== 'boolean'
  ) {
    throw new Error('The solver returned an invalid response.');
  }

  return {
    success: true,
    moves: payload.moves,
    elapsedMicroseconds: payload.elapsedMicroseconds,
    optimal: payload.optimal,
  };
}

const internalCodes = 'ABCDEFGHIJKLMNOPQR'.split('');
const facesByCode = ['U', 'L', 'F', 'B', 'R', 'D'] as const satisfies readonly Face[];
const suffixesByCode = ['', '2', "'"] as const;
const notationByCode = Object.fromEntries(internalCodes.map((code, index): [string, Move] => {
  const face = facesByCode[Math.floor(index / 3)]!;
  const suffix = suffixesByCode[index % 3]!;
  return [code, `${face}${suffix}`];
}));

let state: Sticker[] = [...solvedState];
let routeStart: Sticker[] = [...state];
let route: Move[] = [];
let routeIndex = 0;
let routeKind: RouteKind = null;
let positionMoves: Move[] = [];
let playTimer: number | null = null;
let rotationX = -14;
let rotationY = -36;
let dragging = false;
let dragOrigin: DragOrigin | null = null;
let solving = false;
let turning = false;

const cube = requiredElement<HTMLDivElement>('#cube');
const scene = requiredElement<HTMLDivElement>('#cube-scene');
const timeline = requiredElement<HTMLDivElement>('#timeline');
const timelineLabel = requiredElement<HTMLSpanElement>('#timeline-label');
const timelineCount = requiredElement<HTMLSpanElement>('#timeline-count');
const counter = requiredElement<HTMLSpanElement>('#move-counter');
const playButton = requiredElement<HTMLButtonElement>('#play-solution');
const message = requiredElement<HTMLParagraphElement>('#input-message');
const solutionInput = requiredElement<HTMLInputElement>('#solution-input');
const routeDialog = requiredElement<HTMLDialogElement>('#route-dialog');
const routeForm = requiredElement<HTMLFormElement>('#route-form');
const routeMessage = requiredElement<HTMLParagraphElement>('#route-message');
const playbackSpeed = requiredElement<HTMLSelectElement>('#playback-speed');
const cameraDragMedia = window.matchMedia('(min-width: 561px) and (pointer: fine)');

function setButtonContent(button: HTMLButtonElement, icon: string, label: string): void {
  if (button.dataset.icon === icon && button.dataset.label === label) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('button-icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${icon}`);
  svg.append(use);
  const text = document.createElement('span');
  text.textContent = label;
  button.replaceChildren(svg, text);
  button.dataset.icon = icon;
  button.dataset.label = label;
}

function faceCoordinates(face: Face, row: number, column: number): Coordinates {
  if (face === 'F') return { x: column - 1, y: row - 1, z: 1 };
  if (face === 'B') return { x: 1 - column, y: row - 1, z: -1 };
  if (face === 'R') return { x: 1, y: row - 1, z: 1 - column };
  if (face === 'L') return { x: -1, y: row - 1, z: column - 1 };
  if (face === 'U') return { x: column - 1, y: -1, z: row - 1 };
  return { x: column - 1, y: 1, z: 1 - row };
}

function buildCube(): void {
  const visibleStickers = new Map<string, Partial<Record<Face, Sticker>>>();
  faceLayouts.forEach((face) => {
    face.stickers.forEach((index, position) => {
      const row = Math.floor(position / 3);
      const column = position % 3;
      const coordinates = faceCoordinates(face.name, row, column);
      const key = `${coordinates.x},${coordinates.y},${coordinates.z}`;
      const stickers = visibleStickers.get(key) ?? {};
      stickers[face.name] = index === null ? face.center : state[index]!;
      visibleStickers.set(key, stickers);
    });
  });

  const fragment = document.createDocumentFragment();
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;
        const cubie = document.createElement('div');
        cubie.className = 'cubie';
        cubie.dataset.x = String(x);
        cubie.dataset.y = String(y);
        cubie.dataset.z = String(z);
        cubie.style.left = `${(x + 1) * 100 / 3}%`;
        cubie.style.top = `${(y + 1) * 100 / 3}%`;
        const depth = z < 0
          ? 'calc(0px - var(--cubie-size))'
          : z > 0 ? 'var(--cubie-size)' : '0px';
        cubie.style.transform = `translateZ(${depth})`;

        const stickers = visibleStickers.get(`${x},${y},${z}`) ?? {};
        (['U', 'L', 'F', 'D', 'R', 'B'] as const).forEach((face) => {
          const side = document.createElement('div');
          side.className = 'cubie-side';
          side.dataset.face = face;
          if (stickers[face] !== undefined) {
            const sticker = document.createElement('div');
            sticker.className = `sticker color-${stickers[face]}`;
            side.append(sticker);
          }
          cubie.append(side);
        });
        fragment.append(cubie);
      }
    }
  }
  cube.replaceChildren(fragment);
}

function renderCube(): void {
  buildCube();
  counter.textContent = route.length
    ? `Move ${routeIndex} of ${route.length}`
    : arraysEqual(state, solvedState) ? 'Solved position' : 'Free turn mode';

  updatePlayButton();
}

function renderTimeline(): void {
  timeline.replaceChildren();
  const showingRoute = route.length > 0;
  const moves = showingRoute ? route : positionMoves;
  timelineLabel.textContent = showingRoute
    ? routeKind === 'custom' ? 'Loaded route' : 'Solution'
    : 'Your moves';
  timelineCount.textContent = `${moves.length} move${moves.length === 1 ? '' : 's'}`;
  timeline.classList.toggle('position-history', !showingRoute);

  if (!moves.length) {
    const empty = document.createElement('span');
    empty.className = 'timeline-empty';
    empty.textContent = 'Face turns and scrambles appear here.';
    timeline.append(empty);
    return;
  }

  moves.forEach((move, index) => {
    const chip = document.createElement(showingRoute ? 'button' : 'span');
    chip.className = showingRoute ? 'move-chip' : 'history-chip';
    chip.dataset.face = move[0];

    const number = document.createElement('span');
    number.className = 'move-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const notation = document.createElement('strong');
    notation.textContent = move;
    chip.append(number, notation);

    if (showingRoute) {
      (chip as HTMLButtonElement).type = 'button';
      if (index < routeIndex) chip.classList.add('done');
      if (index === routeIndex) chip.classList.add('active');
      chip.title = `Go to move ${index + 1}`;
      chip.addEventListener('click', () => goTo(index));
    }
    timeline.append(chip);
  });
  const active = timeline.querySelector<HTMLElement>('.active');
  if (active) {
    const timelineBounds = timeline.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    const centeredTop = (
      timeline.scrollTop
      + activeBounds.top
      - timelineBounds.top
      - (timeline.clientHeight - activeBounds.height) / 2
    );
    timeline.scrollTo({ top: Math.max(0, centeredTop), behavior: 'smooth' });
  }
}

function commitMove(move: Move): void {
  const permutation = movePermutations[move];
  if (!permutation) throw new Error(`Unknown move: ${move}`);
  state = permutation.map((source) => state[source]!);
}

const turnGeometry = {
  "U": { "coordinate": "y", "layer": -1, "axis": "Y", "direction": -1 },
  "D": { "coordinate": "y", "layer": 1, "axis": "Y", "direction": 1 },
  "L": { "coordinate": "x", "layer": -1, "axis": "X", "direction": -1 },
  "R": { "coordinate": "x", "layer": 1, "axis": "X", "direction": 1 },
  "F": { "coordinate": "z", "layer": 1, "axis": "Z", "direction": 1 },
  "B": { "coordinate": "z", "layer": -1, "axis": "Z", "direction": -1 }
} satisfies Record<Face, TurnGeometry>;

function turnAngle(move: Move): number {
  const quarterTurns = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return turnGeometry[move[0] as Face].direction * quarterTurns * 90;
}

function turnDuration(): number {
  const playbackDelay = Number(playbackSpeed.value);
  return Math.max(140, Math.min(360, playbackDelay * .58));
}

function waitForTurn(layer: HTMLDivElement, duration: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    layer.addEventListener('transitionend', finish, { once: true });
    window.setTimeout(finish, duration + 80);
  });
}

async function animateTurn(move: Move): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const geometry = turnGeometry[move[0] as Face];
  const layer = document.createElement('div');
  layer.className = 'turn-layer';
  const cubies = [...cube.querySelectorAll<HTMLDivElement>('.cubie')].filter(
    (cubie) => Number(cubie.dataset[geometry.coordinate]) === geometry.layer,
  );
  cubies.forEach((cubie) => layer.append(cubie));
  cube.append(layer);

  const duration = turnDuration();
  layer.style.transitionDuration = `${duration}ms`;
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  layer.style.transform = `rotate${geometry.axis}(${turnAngle(move)}deg)`;
  await waitForTurn(layer, duration);
}

async function applyMove(move: Move, animate = true): Promise<boolean> {
  if (turning) return false;
  if (!movePermutations[move]) throw new Error(`Unknown move: ${move}`);
  turning = true;
  cube.setAttribute('aria-busy', 'true');
  try {
    if (animate) await animateTurn(move);
    commitMove(move);
    renderCube();
    return true;
  } finally {
    turning = false;
    cube.removeAttribute('aria-busy');
  }
}

function inverse(move: Move): Move {
  if (move.endsWith('2')) return move;
  return (move.endsWith("'") ? move[0] : `${move}'`) as Move;
}

function clearRoute(clearInput = false, clearPositionHistory = false): void {
  stopPlayback();
  route = [];
  routeIndex = 0;
  routeKind = null;
  routeStart = [...state];
  if (clearPositionHistory) positionMoves = [];
  if (clearInput) solutionInput.value = '';
  renderTimeline();
  renderCube();
}

function goTo(target: number): void {
  if (turning) return;
  stopPlayback();
  const bounded = Math.max(0, Math.min(target, route.length));
  state = [...routeStart];
  for (let index = 0; index < bounded; index += 1) commitMove(route[index]!);
  routeIndex = bounded;
  renderCube();
  renderTimeline();
}

async function next(): Promise<boolean> {
  if (turning || routeIndex >= route.length) return false;
  if (!await applyMove(route[routeIndex]!)) return false;
  routeIndex += 1;
  renderTimeline();
  renderCube();
  return true;
}

async function previous(): Promise<boolean> {
  if (turning || routeIndex <= 0) return false;
  routeIndex -= 1;
  if (!await applyMove(inverse(route[routeIndex]!))) {
    routeIndex += 1;
    return false;
  }
  renderTimeline();
  renderCube();
  return true;
}

function stopPlayback(): void {
  if (playTimer) window.clearTimeout(playTimer);
  playTimer = null;
  updatePlayButton();
}

function updatePlayButton(): void {
  if (solving) {
    setButtonContent(playButton, 'loader', 'Solving…');
    playButton.setAttribute('aria-label', 'Solving current position');
  } else if (playTimer) {
    setButtonContent(playButton, 'pause', 'Pause');
    playButton.setAttribute('aria-label', 'Pause solution');
  } else if (!route.length && !arraysEqual(state, solvedState)) {
    setButtonContent(playButton, 'play', 'Solve & play');
    playButton.setAttribute('aria-label', 'Solve and play current position');
  } else {
    setButtonContent(playButton, 'play', 'Play');
    playButton.setAttribute('aria-label', 'Play solution');
  }
}

function startPlayback(): boolean {
  if (!route.length) return false;
  if (routeIndex === route.length) goTo(0);
  const playNext = async () => {
    if (!playTimer) return;
    const moved = await next();
    if (!playTimer) return;
    if (!moved || routeIndex >= route.length) {
      stopPlayback();
      return;
    }
    const speed = Number(playbackSpeed.value);
    playTimer = window.setTimeout(playNext, Math.max(20, speed - turnDuration()));
  };
  playTimer = window.setTimeout(playNext, 0);
  updatePlayButton();
  return true;
}

async function togglePlayback(): Promise<void> {
  if (solving) return;
  if (playTimer) {
    stopPlayback();
    return;
  }
  if (!route.length) {
    await solveCurrentPosition(true);
    return;
  }
  startPlayback();
}

function parseRoute(raw: string): Move[] {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new Error('Enter at least one move.');
  return tokens.map((token) => {
    const standard = token.toUpperCase().replace('3', "'");
    const normalized = isMove(standard) ? standard : notationByCode[token.toUpperCase()];
    if (!normalized || !isMove(normalized)) throw new Error(`“${token}” is not a valid move.`);
    return normalized;
  });
}

function randomScramble(length = 20): Move[] {
  const all = Object.keys(movePermutations) as Move[];
  const result: Move[] = [];
  let previousFace = '';
  while (result.length < length) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const candidate = all[values[0]! % all.length]!;
    const candidateFace = candidate[0] as Face;
    if (candidateFace === previousFace) continue;
    result.push(candidate);
    previousFace = candidateFace;
  }
  return result;
}

function showMessage(text: string, success = false): void {
  message.textContent = text;
  message.classList.toggle('success', success);
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildMovePad(): void {
  const pad = requiredElement<HTMLDivElement>('#move-pad');
  (Object.keys(movePermutations) as Move[]).forEach((move) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'move-button';
    button.dataset.face = move[0];
    button.textContent = move;
    button.addEventListener('click', async () => {
      if (turning) return;
      clearRoute(true, route.length > 0);
      positionMoves.push(move);
      await applyMove(move);
      renderTimeline();
      showMessage('Position changed. Press Solve & play when it is ready.', true);
    });
    pad.append(button);
  });
}

function updateCamera(): void {
  cube.style.transform = `translateY(var(--cube-lift)) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
}

scene.addEventListener('pointerdown', (event) => {
  if (!cameraDragMedia.matches) return;
  dragging = true;
  dragOrigin = { x: event.clientX, y: event.clientY, rotationX, rotationY };
  scene.setPointerCapture(event.pointerId);
});
scene.addEventListener('pointermove', (event) => {
  if (!dragging || !dragOrigin) return;
  rotationY = dragOrigin.rotationY + (event.clientX - dragOrigin.x) * .45;
  rotationX = Math.max(-85, Math.min(85, dragOrigin.rotationX - (event.clientY - dragOrigin.y) * .35));
  updateCamera();
});
function stopCameraDrag(event?: PointerEvent): void {
  dragging = false;
  dragOrigin = null;
  if (event && scene.hasPointerCapture(event.pointerId)) {
    scene.releasePointerCapture(event.pointerId);
  }
}

scene.addEventListener('pointerup', stopCameraDrag);
scene.addEventListener('pointercancel', stopCameraDrag);
cameraDragMedia.addEventListener('change', () => stopCameraDrag());

requiredElement<HTMLButtonElement>('#reset-view').addEventListener('click', () => {
  rotationX = -14;
  rotationY = -36;
  updateCamera();
});
requiredElement<HTMLButtonElement>('#reset-position').addEventListener('click', () => {
  if (turning) return;
  stopPlayback();
  state = [...solvedState];
  routeStart = [...state];
  route = [];
  routeIndex = 0;
  routeKind = null;
  positionMoves = [];
  solutionInput.value = '';
  renderCube();
  renderTimeline();
  showMessage('Position and move history reset.', true);
});
requiredElement<HTMLButtonElement>('#scramble').addEventListener('click', () => {
  if (turning) return;
  state = [...solvedState];
  const scramble = randomScramble();
  scramble.forEach(commitMove);
  routeStart = [...state];
  route = [];
  routeIndex = 0;
  routeKind = null;
  positionMoves = [...scramble];
  solutionInput.value = '';
  renderCube();
  renderTimeline();
  showMessage('20-move position ready. Press Solve & play to run it automatically.', true);
});

function setSolvingControls(disabled: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('#move-pad button, #scramble, #open-route, #reset-position, #load-solution, #previous-move, #next-move')
    .forEach((control) => { control.disabled = disabled; });
  playButton.disabled = disabled;
}

async function solveCurrentPosition(autoplay = false): Promise<boolean> {
  if (solving) return false;
  if (arraysEqual(state, solvedState)) {
    showMessage('The cube is already solved.', true);
    return false;
  }

  const capturedState = [...state];
  let solved = false;
  stopPlayback();
  route = [];
  routeIndex = 0;
  routeStart = [...capturedState];
  solving = true;
  setSolvingControls(true);
  renderTimeline();
  renderCube();
  showMessage('Searching for the shortest route. Deep positions switch to a fast verified route automatically.');
  try {
    const response = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: capturedState, history: positionMoves }),
    });
    const payload = parseSolveResponse(await response.json());
    if (!payload.success) throw new Error(payload.error);
    if (!response.ok) throw new Error('The solver request failed.');
    state = [...capturedState];
    route = payload.moves;
    routeKind = 'solution';
    routeStart = [...capturedState];
    routeIndex = 0;
    renderTimeline();
    const milliseconds = Math.round(payload.elapsedMicroseconds / 1000);
    const resultKind = payload.optimal ? 'Shortest route proven' : 'Fast route';
    showMessage(`${resultKind} and native-verified in ${milliseconds} ms with ${route.length} moves.`, true);
    solved = true;
  } catch (error) {
    showMessage(`${errorMessage(error)} Start the visualizer with “uv run rubikoslav” to enable solving.`);
  } finally {
    solving = false;
    setSolvingControls(false);
    renderCube();
  }
  if (solved && autoplay) startPlayback();
  return solved;
}

requiredElement<HTMLButtonElement>('#open-route').addEventListener('click', () => {
  routeMessage.textContent = '';
  routeDialog.showModal();
  requestAnimationFrame(() => solutionInput.focus());
});

function closeRouteDialog(): void {
  routeDialog.close();
}

routeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    route = parseRoute(solutionInput.value);
    routeKind = 'custom';
    routeStart = [...state];
    routeIndex = 0;
    stopPlayback();
    renderTimeline();
    renderCube();
    showMessage(`Loaded ${route.length} move${route.length === 1 ? '' : 's'}.`, true);
    closeRouteDialog();
  } catch (error) {
    routeMessage.textContent = errorMessage(error);
  }
});
requiredElement<HTMLButtonElement>('#cancel-route').addEventListener('click', closeRouteDialog);
requiredElement<HTMLButtonElement>('#cancel-route-top').addEventListener('click', closeRouteDialog);
requiredElement<HTMLButtonElement>('#next-move').addEventListener('click', () => { void next(); });
requiredElement<HTMLButtonElement>('#previous-move').addEventListener('click', () => { void previous(); });
playButton.addEventListener('click', () => { void togglePlayback(); });
playbackSpeed.addEventListener('change', () => {
  if (playTimer) { stopPlayback(); startPlayback(); }
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof Element && event.target.matches('select, input')) return;
  if (event.key === 'ArrowRight') void next();
  if (event.key === 'ArrowLeft') void previous();
  if (event.key === ' ') { event.preventDefault(); void togglePlayback(); }
});

buildMovePad();
renderCube();
renderTimeline();
