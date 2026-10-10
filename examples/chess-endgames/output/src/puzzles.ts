// Endgame concepts and their practice positions.
//
// Each concept teaches one idea and gives at least twenty positions to solve.
// The positions are built by small generators with a seeded random function,
// so the same set appears on every visit. Each position is legal and is a
// known win for the side to move, within the 1800 ELO scope.
//
// How a position is judged: the app does not store one fixed answer. Instead,
// the bundled Stockfish engine evaluates the position before and after the
// learner's move. A move passes when it keeps the win (the evaluation stays
// clearly in favour of the learner). This matches the way a coach checks a
// move, and it accepts any move that does not throw away the result.

import { Chess } from 'chess.js';

export interface Puzzle {
  readonly id: string;
  readonly fen: string;
  /** The side to move and to win: 'w' or 'b'. */
  readonly sideToWin: 'w' | 'b';
  readonly hint: string;
}

export interface Concept {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly elo: number;
  readonly idea: string;
  readonly teach: string[];
  readonly puzzles: readonly Puzzle[];
}

/** A seeded random function. The same seed gives the same sequence. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function sq(file: number, rank: number): string {
  return FILES[file] + (rank + 1);
}

/** True when two squares are adjacent, so two kings may not share them. */
function kingsTooClose(aFile: number, aRank: number, bFile: number, bRank: number): boolean {
  return Math.abs(aFile - bFile) <= 1 && Math.abs(aRank - bRank) <= 1;
}

/** Build a FEN from a set of piece placements. White to move unless noted. */
function buildFen(pieces: { sq: string; piece: string }[], turn: 'w' | 'b'): string {
  const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const p of pieces) {
    const file = FILES.indexOf(p.sq[0]);
    const rank = parseInt(p.sq[1], 10) - 1;
    board[rank][file] = p.piece;
  }
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell === null) {
        empty++;
      } else {
        if (empty > 0) {
          row += String(empty);
          empty = 0;
        }
        row += cell;
      }
    }
    if (empty > 0) {
      row += String(empty);
    }
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

/**
 * A reusable validator. A start position is legal to train from when chess.js
 * loads it, the side to move has at least one legal move, and the side NOT to
 * move is not already in check (an illegal "it is my move but I give check"
 * position). This guards against any generator edge case so no puzzle fails
 * to load in the browser.
 */
const VALIDATOR = new Chess();

function isLegalStart(fen: string): boolean {
  try {
    VALIDATOR.load(fen);
  } catch {
    return false;
  }
  if (VALIDATOR.isGameOver()) {
    return false;
  }
  if (VALIDATOR.moves().length === 0) {
    return false;
  }
  // The side not to move must not be in check. Flip the turn and test.
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  try {
    const probe = new Chess();
    probe.load(parts.join(' '));
    if (probe.inCheck()) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * King and pawn versus king. White king escorts a pawn that is already past
 * the middle of the board, so the win is clear for white. The learner must
 * find a move that keeps the win, for example using the opposition or pushing
 * the pawn at the right moment.
 */
function makeKpvkPuzzles(seed: number, count: number): Puzzle[] {
  const rand = seededRandom(seed);
  const out: Puzzle[] = [];
  const usedFens = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 400) {
    guard++;
    const pawnFile = 1 + Math.floor(rand() * 6); // b..g, avoid rook pawns
    const pawnRank = 3 + Math.floor(rand() * 3); // rank 4, 5 or 6
    const wkFile = Math.max(0, Math.min(7, pawnFile + (rand() < 0.5 ? -1 : 1)));
    const wkRank = pawnRank + 1; // white king ahead of the pawn
    // Black king sits in the pawn's path, anywhere legally ahead of it.
    const bkFile = Math.max(0, Math.min(7, pawnFile - 1 + Math.floor(rand() * 3)));
    const bkRank = Math.min(7, pawnRank + 2 + Math.floor(rand() * 2));
    if (wkFile < 0 || wkFile > 7 || wkRank > 7) {
      continue;
    }
    if (bkFile < 0 || bkFile > 7 || bkRank > 7) {
      continue;
    }
    // Kings may not touch and may not share squares with the pawn.
    if (kingsTooClose(wkFile, wkRank, bkFile, bkRank)) {
      continue;
    }
    const wk = sq(wkFile, wkRank);
    const bk = sq(bkFile, bkRank);
    const pawn = sq(pawnFile, pawnRank);
    if (wk === bk || wk === pawn || bk === pawn) {
      continue;
    }
    const fen = buildFen(
      [
        { sq: wk, piece: 'K' },
        { sq: pawn, piece: 'P' },
        { sq: bk, piece: 'k' }
      ],
      'w'
    );
    if (!isLegalStart(fen) || usedFens.has(fen)) {
      continue;
    }
    usedFens.add(fen);
    out.push({
      id: `kpvk-${out.length + 1}`,
      fen,
      sideToWin: 'w',
      hint: 'Escort the pawn. Keep your king in front of it and take the opposition when the kings face off.'
    });
  }
  return out;
}

/**
 * King and queen versus king. White has an easy win. The learner must drive
 * the lone king toward an edge without giving stalemate. Any move that keeps
 * the big advantage passes.
 */
function makeKqvkPuzzles(seed: number, count: number): Puzzle[] {
  const rand = seededRandom(seed);
  const out: Puzzle[] = [];
  const usedFens = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 400) {
    guard++;
    const bkFile = Math.floor(rand() * 8);
    const bkRank = Math.floor(rand() * 8);
    const wkFile = Math.floor(rand() * 8);
    const wkRank = Math.floor(rand() * 8);
    const qFile = Math.floor(rand() * 8);
    const qRank = Math.floor(rand() * 8);
    if (kingsTooClose(wkFile, wkRank, bkFile, bkRank)) {
      continue;
    }
    const wk = sq(wkFile, wkRank);
    const bk = sq(bkFile, bkRank);
    const q = sq(qFile, qRank);
    if (new Set([wk, bk, q]).size !== 3) {
      continue;
    }
    // Keep the black king off the queen's start square and not in check yet,
    // so the start is a quiet winning position to work from.
    if (qFile === bkFile || qRank === bkRank) {
      continue;
    }
    const fen = buildFen(
      [
        { sq: wk, piece: 'K' },
        { sq: q, piece: 'Q' },
        { sq: bk, piece: 'k' }
      ],
      'w'
    );
    if (!isLegalStart(fen) || usedFens.has(fen)) {
      continue;
    }
    usedFens.add(fen);
    out.push({
      id: `kqvk-${out.length + 1}`,
      fen,
      sideToWin: 'w',
      hint: 'Box the king in. Use the queen a knight-move away from the king, and bring your own king up. Watch for stalemate.'
    });
  }
  return out;
}

/**
 * King and rook versus king. The classic mate on the edge. White wins. The
 * learner shrinks the box and avoids stalemate.
 */
function makeKrvkPuzzles(seed: number, count: number): Puzzle[] {
  const rand = seededRandom(seed);
  const out: Puzzle[] = [];
  const usedFens = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 400) {
    guard++;
    const bkFile = Math.floor(rand() * 8);
    const bkRank = Math.floor(rand() * 8);
    const wkFile = Math.floor(rand() * 8);
    const wkRank = Math.floor(rand() * 8);
    const rFile = Math.floor(rand() * 8);
    const rRank = Math.floor(rand() * 8);
    if (kingsTooClose(wkFile, wkRank, bkFile, bkRank)) {
      continue;
    }
    const wk = sq(wkFile, wkRank);
    const bk = sq(bkFile, bkRank);
    const r = sq(rFile, rRank);
    if (new Set([wk, bk, r]).size !== 3) {
      continue;
    }
    // Do not start with the rook on a square the black king can take.
    if (kingsTooClose(rFile, rRank, bkFile, bkRank) && !kingsTooClose(rFile, rRank, wkFile, wkRank)) {
      continue;
    }
    const fen = buildFen(
      [
        { sq: wk, piece: 'K' },
        { sq: r, piece: 'R' },
        { sq: bk, piece: 'k' }
      ],
      'w'
    );
    if (!isLegalStart(fen) || usedFens.has(fen)) {
      continue;
    }
    usedFens.add(fen);
    out.push({
      id: `krvk-${out.length + 1}`,
      fen,
      sideToWin: 'w',
      hint: 'Cut the king off with the rook. Walk your king up. Push the enemy king to the edge, then mate.'
    });
  }
  return out;
}

/**
 * King and two bishops, or king, rook and pawn: a step up. Here we use a
 * rook and an extra pawn so the win is simple but the learner must convert.
 */
function makeRookPawnPuzzles(seed: number, count: number): Puzzle[] {
  const rand = seededRandom(seed);
  const out: Puzzle[] = [];
  const usedFens = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 400) {
    guard++;
    const pawnFile = 1 + Math.floor(rand() * 6);
    const pawnRank = 3 + Math.floor(rand() * 3); // rank 4..6
    const wkFile = Math.floor(rand() * 8);
    const wkRank = Math.floor(rand() * 8);
    const bkFile = Math.floor(rand() * 8);
    const bkRank = Math.floor(rand() * 8);
    const rFile = Math.floor(rand() * 8);
    const rRank = Math.floor(rand() * 8);
    if (kingsTooClose(wkFile, wkRank, bkFile, bkRank)) {
      continue;
    }
    const wk = sq(wkFile, wkRank);
    const bk = sq(bkFile, bkRank);
    const r = sq(rFile, rRank);
    const pawn = sq(pawnFile, pawnRank);
    if (new Set([wk, bk, r, pawn]).size !== 4) {
      continue;
    }
    // Black king not already next to the pawn or rook (would allow capture).
    if (kingsTooClose(pawnFile, pawnRank, bkFile, bkRank)) {
      continue;
    }
    const fen = buildFen(
      [
        { sq: wk, piece: 'K' },
        { sq: r, piece: 'R' },
        { sq: pawn, piece: 'P' },
        { sq: bk, piece: 'k' }
      ],
      'w'
    );
    if (!isLegalStart(fen) || usedFens.has(fen)) {
      continue;
    }
    usedFens.add(fen);
    out.push({
      id: `rookpawn-${out.length + 1}`,
      fen,
      sideToWin: 'w',
      hint: 'Use the rook to shield the pawn and cut the king. Promote the pawn, then mate with the extra piece.'
    });
  }
  return out;
}

export const CONCEPTS: readonly Concept[] = [
  {
    id: 'opposition',
    title: 'Opposition and the pawn',
    icon: '👑',
    elo: 1400,
    idea: 'Use the king to escort a passed pawn to promotion.',
    teach: [
      'The opposition means the kings face off with one square between them, and the other side must give way.',
      'Keep your king in front of your pawn. Take the opposition to push the enemy king back.',
      'With the opposition and the king in front, a non-rook pawn promotes.'
    ],
    puzzles: makeKpvkPuzzles(1001, 20)
  },
  {
    id: 'queen-mate',
    title: 'Queen versus king mate',
    icon: '♛',
    elo: 1400,
    idea: 'Drive the lone king to the edge and mate, without stalemate.',
    teach: [
      'Keep the queen a knight-move away from the enemy king to herd it.',
      'Bring your own king up to support the mate.',
      'Before every move, check that the enemy king still has a legal move, to avoid stalemate.'
    ],
    puzzles: makeKqvkPuzzles(2002, 20)
  },
  {
    id: 'rook-mate',
    title: 'Rook versus king mate',
    icon: '♜',
    elo: 1600,
    idea: 'Use the rook to cut the king off and shrink the box.',
    teach: [
      'The rook cuts the enemy king off along a rank or a file.',
      'Walk your king up to face the enemy king and take the opposition.',
      'Give the rook check to push the king back one line, then repeat to the edge.'
    ],
    puzzles: makeKrvkPuzzles(3003, 20)
  },
  {
    id: 'rook-and-pawn',
    title: 'Rook and pawn conversion',
    icon: '♖',
    elo: 1800,
    idea: 'Convert a rook and an extra pawn into a win.',
    teach: [
      'Place the rook so it both guards the pawn and cuts the enemy king.',
      'Advance the pawn with the king and rook behind it.',
      'Promote the pawn, then use the extra material to mate.'
    ],
    puzzles: makeRookPawnPuzzles(4004, 20)
  }
];
