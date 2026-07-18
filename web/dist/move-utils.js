import { movePermutations, } from './generated/cube-data.js';
const internalCodes = 'ABCDEFGHIJKLMNOPQR'.split('');
const facesByCode = ['U', 'L', 'F', 'B', 'R', 'D'];
const suffixesByCode = ['', '2', "'"];
const notationByCode = Object.fromEntries(internalCodes.map((code, index) => {
    const face = facesByCode[Math.floor(index / 3)];
    return [code, `${face}${suffixesByCode[index % 3]}`];
}));
export const allMoves = Object.keys(movePermutations);
export function isMove(value) {
    return Object.hasOwn(movePermutations, value);
}
export function applyMoveToState(state, move) {
    return movePermutations[move].map((source) => state[source]);
}
export function inverse(move) {
    if (move.endsWith('2'))
        return move;
    return (move.endsWith("'") ? move[0] : `${move}'`);
}
export function parseRoute(raw) {
    const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
    if (!tokens.length)
        throw new Error('Enter at least one move.');
    return tokens.map((token) => {
        const standard = token.toUpperCase().replace('3', "'");
        const normalized = isMove(standard)
            ? standard
            : notationByCode[token.toUpperCase()];
        if (!normalized || !isMove(normalized)) {
            throw new Error(`“${token}” is not a valid move.`);
        }
        return normalized;
    });
}
export function randomScramble(length = 20) {
    const result = [];
    let previousFace = '';
    while (result.length < length) {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        const candidate = allMoves[values[0] % allMoves.length];
        if (candidate[0] === previousFace)
            continue;
        result.push(candidate);
        previousFace = candidate[0];
    }
    return result;
}
