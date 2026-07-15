import { faceLayouts, movePermutations, solvedState } from './generated/cube-data.js';
const internalCodes = 'ABCDEFGHIJKLMNOPQR'.split('');
const notationByCode = Object.fromEntries(internalCodes.map((code, index) => {
  const face = ['U', 'L', 'F', 'B', 'R', 'D'][Math.floor(index / 3)];
  const suffix = ['', '2', "'"][index % 3];
  return [code, face + suffix];
}));

let state = [...solvedState];
let routeStart = [...state];
let route = [];
let routeIndex = 0;
let routeKind = null;
let positionMoves = [];
let playTimer = null;
let rotationX = -14;
let rotationY = -36;
let dragging = false;
let dragOrigin = null;
let solving = false;
let turning = false;

const cube = document.querySelector('#cube');
const scene = document.querySelector('#cube-scene');
const timeline = document.querySelector('#timeline');
const timelineLabel = document.querySelector('#timeline-label');
const timelineCount = document.querySelector('#timeline-count');
const counter = document.querySelector('#move-counter');
const playButton = document.querySelector('#play-solution');
const message = document.querySelector('#input-message');
const solutionInput = document.querySelector('#solution-input');
const routeDialog = document.querySelector('#route-dialog');
const routeForm = document.querySelector('#route-form');
const routeMessage = document.querySelector('#route-message');

function setButtonContent(button, icon, label) {
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

function faceCoordinates(face, row, column) {
  if (face === 'F') return { x: column - 1, y: row - 1, z: 1 };
  if (face === 'B') return { x: 1 - column, y: row - 1, z: -1 };
  if (face === 'R') return { x: 1, y: row - 1, z: 1 - column };
  if (face === 'L') return { x: -1, y: row - 1, z: column - 1 };
  if (face === 'U') return { x: column - 1, y: -1, z: row - 1 };
  return { x: column - 1, y: 1, z: 1 - row };
}

function buildCube() {
  const visibleStickers = new Map();
  faceLayouts.forEach((face) => {
    face.stickers.forEach((index, position) => {
      const row = Math.floor(position / 3);
      const column = position % 3;
      const coordinates = faceCoordinates(face.name, row, column);
      const key = `${coordinates.x},${coordinates.y},${coordinates.z}`;
      const stickers = visibleStickers.get(key) ?? {};
      stickers[face.name] = index === null ? face.center : state[index];
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
        ['U', 'L', 'F', 'D', 'R', 'B'].forEach((face) => {
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

function renderCube() {
  buildCube();
  counter.textContent = route.length
    ? `Move ${routeIndex} of ${route.length}`
    : arraysEqual(state, solvedState) ? 'Solved position' : 'Free turn mode';

  updatePlayButton();
}

function renderTimeline() {
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
      chip.type = 'button';
      if (index < routeIndex) chip.classList.add('done');
      if (index === routeIndex) chip.classList.add('active');
      chip.title = `Go to move ${index + 1}`;
      chip.addEventListener('click', () => goTo(index));
    }
    timeline.append(chip);
  });
  timeline.querySelector('.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function commitMove(move) {
  const permutation = movePermutations[move];
  if (!permutation) throw new Error(`Unknown move: ${move}`);
  state = permutation.map((source) => state[source]);
}

const turnGeometry = {
  "U": { "coordinate": "y", "layer": -1, "axis": "Y", "direction": -1 },
  "D": { "coordinate": "y", "layer": 1, "axis": "Y", "direction": 1 },
  "L": { "coordinate": "x", "layer": -1, "axis": "X", "direction": -1 },
  "R": { "coordinate": "x", "layer": 1, "axis": "X", "direction": 1 },
  "F": { "coordinate": "z", "layer": 1, "axis": "Z", "direction": 1 },
  "B": { "coordinate": "z", "layer": -1, "axis": "Z", "direction": -1 }
};

function turnAngle(move) {
  const quarterTurns = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return turnGeometry[move[0]].direction * quarterTurns * 90;
}

function turnDuration() {
  const playbackDelay = Number(document.querySelector('#playback-speed').value);
  return Math.max(140, Math.min(360, playbackDelay * .58));
}

function waitForTurn(layer, duration) {
  return new Promise((resolve) => {
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

async function animateTurn(move) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const geometry = turnGeometry[move[0]];
  const layer = document.createElement('div');
  layer.className = 'turn-layer';
  const cubies = [...cube.querySelectorAll('.cubie')].filter(
    (cubie) => Number(cubie.dataset[geometry.coordinate]) === geometry.layer,
  );
  cubies.forEach((cubie) => layer.append(cubie));
  cube.append(layer);

  const duration = turnDuration();
  layer.style.transitionDuration = `${duration}ms`;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  layer.style.transform = `rotate${geometry.axis}(${turnAngle(move)}deg)`;
  await waitForTurn(layer, duration);
}

async function applyMove(move, animate = true) {
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

function inverse(move) {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? move[0] : `${move}'`;
}

function clearRoute(clearInput = false, clearPositionHistory = false) {
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

function goTo(target) {
  if (turning) return;
  stopPlayback();
  const bounded = Math.max(0, Math.min(target, route.length));
  state = [...routeStart];
  for (let index = 0; index < bounded; index += 1) commitMove(route[index]);
  routeIndex = bounded;
  renderCube();
  renderTimeline();
}

async function next() {
  if (turning || routeIndex >= route.length) return false;
  if (!await applyMove(route[routeIndex])) return false;
  routeIndex += 1;
  renderTimeline();
  renderCube();
  return true;
}

async function previous() {
  if (turning || routeIndex <= 0) return false;
  routeIndex -= 1;
  if (!await applyMove(inverse(route[routeIndex]))) {
    routeIndex += 1;
    return false;
  }
  renderTimeline();
  renderCube();
  return true;
}

function stopPlayback() {
  if (playTimer) window.clearTimeout(playTimer);
  playTimer = null;
  updatePlayButton();
}

function updatePlayButton() {
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

function startPlayback() {
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
    const speed = Number(document.querySelector('#playback-speed').value);
    playTimer = window.setTimeout(playNext, Math.max(20, speed - turnDuration()));
  };
  playTimer = window.setTimeout(playNext, 0);
  updatePlayButton();
  return true;
}

async function togglePlayback() {
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

function parseRoute(raw) {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new Error('Enter at least one move.');
  return tokens.map((token) => {
    const standard = token.toUpperCase().replace('3', "'");
    const normalized = movePermutations[standard] ? standard : notationByCode[token.toUpperCase()];
    if (!movePermutations[normalized]) throw new Error(`“${token}” is not a valid move.`);
    return normalized;
  });
}

function randomScramble(length = 20) {
  const all = Object.keys(movePermutations);
  const result = [];
  let previousFace = '';
  while (result.length < length) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const candidate = all[values[0] % all.length];
    if (candidate[0] === previousFace) continue;
    result.push(candidate);
    previousFace = candidate[0];
  }
  return result;
}

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle('success', success);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildMovePad() {
  const pad = document.querySelector('#move-pad');
  Object.keys(movePermutations).forEach((move) => {
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

function updateCamera() {
  cube.style.transform = `translateY(var(--cube-lift)) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
}

scene.addEventListener('pointerdown', (event) => {
  dragging = true;
  dragOrigin = { x: event.clientX, y: event.clientY, rotationX, rotationY };
  scene.setPointerCapture(event.pointerId);
});
scene.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  rotationY = dragOrigin.rotationY + (event.clientX - dragOrigin.x) * .45;
  rotationX = Math.max(-85, Math.min(85, dragOrigin.rotationX - (event.clientY - dragOrigin.y) * .35));
  updateCamera();
});
scene.addEventListener('pointerup', () => { dragging = false; });

document.querySelector('#reset-view').addEventListener('click', () => {
  rotationX = -14;
  rotationY = -36;
  updateCamera();
});
document.querySelector('#reset-position').addEventListener('click', () => {
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
document.querySelector('#scramble').addEventListener('click', () => {
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

function setSolvingControls(disabled) {
  document.querySelectorAll('#move-pad button, #scramble, #open-route, #reset-position, #load-solution, #previous-move, #next-move')
    .forEach((control) => { control.disabled = disabled; });
  playButton.disabled = disabled;
}

async function solveCurrentPosition(autoplay = false) {
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
  showMessage('Preparing the optimal solver. The first solve may take a few seconds.');
  try {
    const response = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: capturedState }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || 'The solver request failed.');
    state = [...capturedState];
    route = payload.moves;
    routeKind = 'solution';
    routeStart = [...capturedState];
    routeIndex = 0;
    renderTimeline();
    const milliseconds = Math.round(payload.elapsedMicroseconds / 1000);
    showMessage(`Solved and native-verified in ${milliseconds} ms with ${route.length} moves.`, true);
    solved = true;
  } catch (error) {
    showMessage(`${error.message} Start the visualizer with “uv run rubikoslav” to enable solving.`);
  } finally {
    solving = false;
    setSolvingControls(false);
    renderCube();
  }
  if (solved && autoplay) startPlayback();
  return solved;
}

document.querySelector('#open-route').addEventListener('click', () => {
  routeMessage.textContent = '';
  routeDialog.showModal();
  requestAnimationFrame(() => solutionInput.focus());
});

function closeRouteDialog() {
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
    routeMessage.textContent = error.message;
  }
});
document.querySelector('#cancel-route').addEventListener('click', closeRouteDialog);
document.querySelector('#cancel-route-top').addEventListener('click', closeRouteDialog);
document.querySelector('#next-move').addEventListener('click', () => { void next(); });
document.querySelector('#previous-move').addEventListener('click', () => { void previous(); });
playButton.addEventListener('click', () => { void togglePlayback(); });
document.querySelector('#playback-speed').addEventListener('change', () => {
  if (playTimer) { stopPlayback(); startPlayback(); }
});

window.addEventListener('keydown', (event) => {
  if (event.target.matches('select, input')) return;
  if (event.key === 'ArrowRight') void next();
  if (event.key === 'ArrowLeft') void previous();
  if (event.key === ' ') { event.preventDefault(); void togglePlayback(); }
});

buildMovePad();
renderCube();
renderTimeline();
