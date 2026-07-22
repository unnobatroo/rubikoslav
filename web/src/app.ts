// Browser output is compiled to web/dist/app.js; edit this TypeScript source instead.
import {
  solvedState,
  type Move,
  type Sticker,
} from './generated/cube-data.js';
import { requestSolution } from './backend-client.js';
import { setupCamera } from './camera-controller.js';
import { CubeRenderer } from './cube-renderer.js';
import {
  arraysEqual,
  errorMessage,
  requiredElement,
  setButtonContent,
} from './dom.js';
import {
  allMoves,
  applyMoveToState,
  inverse,
  parseRoute,
  randomScramble,
} from './move-utils.js';
import { TimelineView, type RouteKind } from './timeline-view.js';

let state: Sticker[] = [...solvedState];
let routeStart: Sticker[] = [...state];
let route: Move[] = [];
let routeIndex = 0;
let routeKind: RouteKind = null;
let positionMoves: Move[] = [];
let playTimer: number | null = null;
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
const cubeRenderer = new CubeRenderer(cube, playbackSpeed);
const timelineView = new TimelineView(timeline, timelineLabel, timelineCount);

function renderCube(): void {
  cubeRenderer.render(state);
  counter.textContent = route.length
    ? `Move ${routeIndex} of ${route.length}`
    : arraysEqual(state, solvedState) ? 'Solved position' : 'Free turn mode';

  updatePlayButton();
}

function renderTimeline(): void {
  timelineView.render(
    { route, positionMoves, routeKind, routeIndex },
    goTo,
  );
}

function commitMove(move: Move): void {
  state = applyMoveToState(state, move);
}

async function applyMove(move: Move, animate = true): Promise<boolean> {
  if (turning) return false;
  turning = true;
  cubeRenderer.setBusy(true);
  try {
    if (animate) await cubeRenderer.animateTurn(move);
    commitMove(move);
    renderCube();
    return true;
  } finally {
    turning = false;
    cubeRenderer.setBusy(false);
  }
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
    playTimer = window.setTimeout(
      playNext,
      Math.max(20, speed - cubeRenderer.turnDuration()),
    );
  };
  playTimer = window.setTimeout(playNext, 0);
  updatePlayButton();
  return true;
}

async function togglePlayback(): Promise<void> {
  if (solving || turning) return;
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

function showMessage(text: string, success = false): void {
  message.textContent = text;
  message.classList.toggle('success', success);
}

function buildMovePad(): void {
  const pad = requiredElement<HTMLDivElement>('#move-pad');
  allMoves.forEach((move) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'move-button';
    button.dataset.face = move[0];
    button.textContent = move;
    button.addEventListener('click', async () => {
      if (turning) return;
      clearRoute(true, route.length > 0);
      if (!await applyMove(move)) return;
      positionMoves.push(move);
      renderTimeline();
      showMessage('Position changed. Press Solve & play when it is ready.', true);
    });
    pad.append(button);
  });
}

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
  showMessage('Solving...');
  try {
    const payload = await requestSolution(capturedState, positionMoves);
    state = [...capturedState];
    route = payload.moves;
    routeKind = 'solution';
    routeStart = [...capturedState];
    routeIndex = 0;
    renderTimeline();
    const moveLabel = route.length === 1 ? 'move' : 'moves';
    showMessage(`Success! Solved in ${route.length} ${moveLabel}`, true);
    solved = true;
  } catch (error) {
    showMessage(errorMessage(error));
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

setupCamera(
  scene,
  cube,
  requiredElement<HTMLButtonElement>('#reset-view'),
);
buildMovePad();
renderCube();
renderTimeline();
