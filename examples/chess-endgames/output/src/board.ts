// A light chessboard built with DOM elements. It uses chess.js for the rules.
// The learner clicks a piece, then a target square. Legal moves are shown.
// The board calls onMove with the move in long algebraic form, for example
// e2e4 or e7e8q.

import { Chess, type Square } from 'chess.js';

// Each piece is drawn with a proper SVG image. The SVG files are bundled in
// public/pieces and served from this app's own origin, so there is no network
// call to a third party and the pieces look clean at any size.
function pieceSrc(code: string): string {
  return new URL(`pieces/${code}.svg`, document.baseURI).href;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export interface BoardHandle {
  readonly el: HTMLElement;
  setPosition(fen: string): void;
  setInteractive(on: boolean): void;
  dispose(): void;
}

/** Create a board. flip=true shows the board from black's side. */
export function createBoard(
  chess: Chess,
  onMove: (move: string) => void,
  flip: boolean
): BoardHandle {
  const el = document.createElement('div');
  el.className = 'board';
  let selected: Square | null = null;
  let interactive = true;
  let legalTargets: Square[] = [];

  const ranks = flip ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  function squareName(file: number, rank: number): Square {
    return (FILES[file] + (rank + 1)) as Square;
  }

  function clearSelection(): void {
    selected = null;
    legalTargets = [];
  }

  function handleClick(square: Square): void {
    if (!interactive) {
      return;
    }
    const piece = chess.get(square);
    if (selected && legalTargets.includes(square)) {
      // Build a move. Promote to queen by default for simplicity.
      const from = selected;
      const movingPiece = chess.get(from);
      let move = from + square;
      if (movingPiece && movingPiece.type === 'p' && (square[1] === '8' || square[1] === '1')) {
        move += 'q';
      }
      clearSelection();
      onMove(move);
      return;
    }
    if (piece && piece.color === chess.turn()) {
      selected = square;
      legalTargets = chess
        .moves({ square, verbose: true })
        .map((m) => m.to as Square);
    } else {
      clearSelection();
    }
    draw();
  }

  function draw(): void {
    el.innerHTML = '';
    for (const rank of ranks) {
      for (const file of files) {
        const square = squareName(file, rank);
        const cell = document.createElement('button');
        const dark = (file + rank) % 2 === 0;
        cell.className = 'sq ' + (dark ? 'dark' : 'light');
        if (selected === square) {
          cell.classList.add('selected');
        }
        if (legalTargets.includes(square)) {
          cell.classList.add('target');
        }
        const piece = chess.get(square);
        if (piece) {
          const code = piece.color + piece.type.toUpperCase();
          const img = document.createElement('img');
          img.className = 'piece';
          img.src = pieceSrc(code);
          img.alt = code;
          img.draggable = false;
          cell.append(img);
        }
        cell.addEventListener('click', () => handleClick(square));
        el.append(cell);
      }
    }
  }

  draw();

  return {
    el,
    setPosition(fen: string) {
      chess.load(fen);
      clearSelection();
      draw();
    },
    setInteractive(on: boolean) {
      interactive = on;
      if (!on) {
        clearSelection();
      }
      draw();
    },
    dispose() {
      el.innerHTML = '';
    }
  };
}
