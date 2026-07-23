import {
  movePermutations,
  type Move,
  type Sticker,
} from './generated/cube-data.js';

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

function isMove(value: string): value is Move {
  return Object.hasOwn(movePermutations, value);
}

function parseSolveResponse(value: unknown): SolveResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The Python solver returned an invalid response.');
  }

  const payload = value as Record<string, unknown>;
  if (payload.success === false && typeof payload.error === 'string') {
    return { success: false, error: payload.error };
  }
  if (
    payload.success !== true ||
    !Array.isArray(payload.moves) ||
    !payload.moves.every((move) => typeof move === 'string' && isMove(move)) ||
    typeof payload.elapsedMicroseconds !== 'number' ||
    typeof payload.optimal !== 'boolean'
  ) {
    throw new Error('The Python solver returned an invalid response.');
  }

  return {
    success: true,
    moves: payload.moves,
    elapsedMicroseconds: payload.elapsedMicroseconds,
    optimal: payload.optimal,
  };
}

export async function requestSolution(
  state: readonly Sticker[],
  history: readonly Move[],
): Promise<SolveSuccess> {
  const response = await fetch('/api/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, history }),
  });
  const payload = parseSolveResponse(await response.json());
  if (!payload.success) throw new Error(payload.error);
  if (!response.ok) throw new Error('The Python solver request failed.');
  return payload;
}
