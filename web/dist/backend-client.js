import { movePermutations, } from './generated/cube-data.js';
const maxSolutionMoves = 20;
function isMove(value) {
    return Object.hasOwn(movePermutations, value);
}
function parseSolveResponse(value) {
    if (!value || typeof value !== 'object') {
        throw new Error('The Python solver returned an invalid response.');
    }
    const payload = value;
    if (payload.success === false && typeof payload.error === 'string') {
        return { success: false, error: payload.error };
    }
    if (payload.success !== true
        || !Array.isArray(payload.moves)
        || !payload.moves.every((move) => typeof move === 'string' && isMove(move))
        || payload.moves.length > maxSolutionMoves
        || typeof payload.elapsedMicroseconds !== 'number'
        || typeof payload.optimal !== 'boolean') {
        throw new Error('The Python solver returned an invalid response.');
    }
    return {
        success: true,
        moves: payload.moves,
        elapsedMicroseconds: payload.elapsedMicroseconds,
        optimal: payload.optimal,
    };
}
export async function requestSolution(state, history) {
    const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, history }),
    });
    const payload = parseSolveResponse(await response.json());
    if (!payload.success)
        throw new Error(payload.error);
    if (!response.ok)
        throw new Error('The Python solver request failed.');
    return payload;
}
