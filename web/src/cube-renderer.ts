import {
  faceLayouts,
  type Face,
  type Move,
  type Sticker,
} from './generated/cube-data.js';

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

const turnGeometry = {
  "U": { "coordinate": "y", "layer": -1, "axis": "Y", "direction": -1 },
  "D": { "coordinate": "y", "layer": 1, "axis": "Y", "direction": 1 },
  "L": { "coordinate": "x", "layer": -1, "axis": "X", "direction": -1 },
  "R": { "coordinate": "x", "layer": 1, "axis": "X", "direction": 1 },
  "F": { "coordinate": "z", "layer": 1, "axis": "Z", "direction": 1 },
  "B": { "coordinate": "z", "layer": -1, "axis": "Z", "direction": -1 }
} satisfies Record<Face, TurnGeometry>;

function faceCoordinates(face: Face, row: number, column: number): Coordinates {
  if (face === 'F') return { x: column - 1, y: row - 1, z: 1 };
  if (face === 'B') return { x: 1 - column, y: row - 1, z: -1 };
  if (face === 'R') return { x: 1, y: row - 1, z: 1 - column };
  if (face === 'L') return { x: -1, y: row - 1, z: column - 1 };
  if (face === 'U') return { x: column - 1, y: -1, z: row - 1 };
  return { x: column - 1, y: 1, z: 1 - row };
}

function visibleStickers(state: readonly Sticker[]): Map<string, Partial<Record<Face, Sticker>>> {
  const visible = new Map<string, Partial<Record<Face, Sticker>>>();
  faceLayouts.forEach((face) => {
    face.stickers.forEach((index, position) => {
      const coordinates = faceCoordinates(
        face.name,
        Math.floor(position / 3),
        position % 3,
      );
      const key = `${coordinates.x},${coordinates.y},${coordinates.z}`;
      const stickers = visible.get(key) ?? {};
      stickers[face.name] = index === null ? face.center : state[index]!;
      visible.set(key, stickers);
    });
  });
  return visible;
}

function createCubie(
  coordinates: Coordinates,
  stickers: Partial<Record<Face, Sticker>>,
): HTMLDivElement {
  const { x, y, z } = coordinates;
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
  return cubie;
}

function turnAngle(move: Move): number {
  const quarterTurns = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return turnGeometry[move[0] as Face].direction * quarterTurns * 90;
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

export class CubeRenderer {
  constructor(
    private readonly cube: HTMLDivElement,
    private readonly playbackSpeed: HTMLSelectElement,
  ) {}

  render(state: readonly Sticker[]): void {
    const visible = visibleStickers(state);
    const fragment = document.createDocumentFragment();
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          if (x === 0 && y === 0 && z === 0) continue;
          fragment.append(createCubie(
            { x, y, z },
            visible.get(`${x},${y},${z}`) ?? {},
          ));
        }
      }
    }
    this.cube.replaceChildren(fragment);
  }

  turnDuration(): number {
    const playbackDelay = Number(this.playbackSpeed.value);
    return Math.max(140, Math.min(360, playbackDelay * .58));
  }

  async animateTurn(move: Move): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const geometry = turnGeometry[move[0] as Face];
    const layer = document.createElement('div');
    layer.className = 'turn-layer';
    const cubies = [...this.cube.querySelectorAll<HTMLDivElement>('.cubie')]
      .filter((cubie) => (
        Number(cubie.dataset[geometry.coordinate]) === geometry.layer
      ));
    cubies.forEach((cubie) => layer.append(cubie));
    this.cube.append(layer);

    const duration = this.turnDuration();
    layer.style.transitionDuration = `${duration}ms`;
    await new Promise<void>((resolve) => (
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    ));
    layer.style.transform = `rotate${geometry.axis}(${turnAngle(move)}deg)`;
    await waitForTurn(layer, duration);
  }

  setBusy(busy: boolean): void {
    this.cube.toggleAttribute('aria-busy', busy);
  }
}
