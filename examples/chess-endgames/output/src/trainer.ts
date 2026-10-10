// The trainer for one concept. It shows a position, lets the learner move,
// then uses the bundled engine to judge the move and to reply as the
// defender. A puzzle counts as solved when the learner reaches a clearly won
// state (a promotion to queen with a big lead, or a mate). Progress saves to
// the local store, per profile.

import { Chess } from 'chess.js';
import type { ChessEngine } from './engine.ts';
import type { Concept, Puzzle } from './puzzles.ts';
import { createBoard, type BoardHandle } from './board.ts';
import { markSolved, loadState, saveState, solvedMap } from './store.ts';

/** A running trainer bound to one concept and one board element. */
export class Trainer {
  private concept: Concept;
  private engine: ChessEngine;
  private chess = new Chess();
  private board: BoardHandle;
  private statusEl: HTMLElement;
  private puzzleIndex = 0;
  private busy = false;
  private onProgress: () => void;
  /** Engine value of the current position, from the learner's point of view, in centipawns. */
  private valueBefore = 0;

  constructor(
    concept: Concept,
    engine: ChessEngine,
    host: HTMLElement,
    statusEl: HTMLElement,
    onProgress: () => void
  ) {
    this.concept = concept;
    this.engine = engine;
    this.statusEl = statusEl;
    this.onProgress = onProgress;
    this.board = createBoard(this.chess, (m) => this.onLearnerMove(m), false);
    host.append(this.board.el);
    this.engine.setElo(Math.min(1800, concept.elo));
    this.loadPuzzle(this.firstUnsolvedIndex());
  }

  private firstUnsolvedIndex(): number {
    const solved = solvedMap(loadState());
    const idx = this.concept.puzzles.findIndex((p) => !solved[this.puzzleKey(p)]);
    return idx === -1 ? 0 : idx;
  }

  private puzzleKey(puzzle: Puzzle): string {
    return `${this.concept.id}:${puzzle.id}`;
  }

  private current(): Puzzle {
    return this.concept.puzzles[this.puzzleIndex];
  }

  private setStatus(text: string, tone: '' | 'good' | 'bad' | 'warn' = ''): void {
    this.statusEl.className = 'trainer-status ' + tone;
    this.statusEl.textContent = text;
  }

  /**
   * Turn an engine score into a single number of centipawns, from the point of
   * view of the side to move. A mate is mapped to a very large value so that it
   * always ranks above any material score. The sign of a mate follows the UCI
   * convention: a positive mate is for the side to move.
   */
  private toCentipawns(score: { cp?: number; mate?: number }): number {
    if (score.mate !== undefined) {
      const magnitude = 100000 - Math.abs(score.mate) * 100;
      return score.mate > 0 ? magnitude : -magnitude;
    }
    return score.cp ?? 0;
  }

  /** Read the position value from the learner's point of view, in centipawns. */
  private async learnerValue(): Promise<number> {
    const score = await this.engine.evaluate(this.chess.fen(), 500);
    const sideToMove = this.chess.turn(); // 'w' or 'b'
    const fromSideToMove = this.toCentipawns(score);
    // Convert to the learner's point of view.
    return sideToMove === this.current().sideToWin ? fromSideToMove : -fromSideToMove;
  }

  loadPuzzle(index: number): void {
    this.puzzleIndex = Math.max(0, Math.min(this.concept.puzzles.length - 1, index));
    const puzzle = this.current();
    this.chess.load(puzzle.fen);
    this.board.setPosition(puzzle.fen);
    this.board.setInteractive(false);
    const solved = solvedMap(loadState())[this.puzzleKey(puzzle)];
    this.setStatus(
      `Position ${this.puzzleIndex + 1} of ${this.concept.puzzles.length}. Reading the position... ` +
        puzzle.hint,
      solved ? 'good' : ''
    );
    // Measure the starting value so later moves can be judged against it.
    this.busy = true;
    this.learnerValue()
      .then((value) => {
        this.valueBefore = value;
        this.board.setInteractive(true);
        this.busy = false;
        this.setStatus(
          `Position ${this.puzzleIndex + 1} of ${this.concept.puzzles.length}. ` +
            (solved ? 'Solved already. Your move. ' : 'Your move. ') +
            puzzle.hint,
          solved ? 'good' : ''
        );
      })
      .catch(() => {
        // If the engine is slow, still let the learner move.
        this.valueBefore = 0;
        this.board.setInteractive(true);
        this.busy = false;
      });
  }

  next(): void {
    this.loadPuzzle((this.puzzleIndex + 1) % this.concept.puzzles.length);
  }

  /** Reload the current puzzle from the start. */
  resetCurrent(): void {
    this.loadPuzzle(this.puzzleIndex);
  }

  previous(): void {
    this.loadPuzzle((this.puzzleIndex - 1 + this.concept.puzzles.length) % this.concept.puzzles.length);
  }

  private async onLearnerMove(moveStr: string): Promise<void> {
    if (this.busy) {
      return;
    }
    const from = moveStr.slice(0, 2);
    const to = moveStr.slice(2, 4);
    const promo = moveStr.length > 4 ? moveStr[4] : undefined;
    let result;
    try {
      result = this.chess.move({ from, to, promotion: promo as 'q' | undefined });
    } catch {
      result = null;
    }
    if (!result) {
      this.setStatus('That move is not legal here. Try another.', 'warn');
      return;
    }
    this.board.setPosition(this.chess.fen());
    this.board.setInteractive(false);
    this.busy = true;

    // Checkmate delivered by the learner: solved at once.
    if (this.chess.isCheckmate()) {
      this.solveCurrent('Checkmate. Well done.');
      this.busy = false;
      return;
    }
    if (this.chess.isStalemate() || this.chess.isDraw()) {
      this.setStatus('That ends in a draw and throws away the win. Taking the move back so you can try again.', 'bad');
      await this.undoAfterDelay();
      return;
    }

    // Judge the move by comparing the value after it against the value before.
    // A good move keeps the learner's value about the same or better. We allow
    // a small drop, because the engine search is shallow and endgame play can
    // shuffle without losing the win.
    this.setStatus('Checking your move with the engine...', '');
    const valueAfter = await this.learnerValue();
    const TOLERANCE = 120; // centipawns
    const STILL_WINNING = 150; // a win needs a clear edge

    const keptValue = valueAfter >= this.valueBefore - TOLERANCE;
    const stillWinning = valueAfter >= STILL_WINNING;

    if (keptValue && stillWinning) {
      // A forced mate or a decisive material lead with the right piece: solved.
      const promotedToWin = this.chess
        .fen()
        .split(' ')[0]
        .includes(this.current().sideToWin === 'w' ? 'Q' : 'q');
      if (valueAfter >= 90000 || (promotedToWin && valueAfter >= 500)) {
        this.solveCurrent('That wins. The position is now clearly winning.');
        this.busy = false;
        return;
      }
      // Otherwise the defender replies and the learner keeps going.
      await this.engineReply();
      // Re-measure the value for the next move.
      this.valueBefore = await this.learnerValue();
      this.setStatus('Good move. The win is kept. Play on toward mate or promotion.', 'good');
      this.board.setInteractive(true);
      this.busy = false;
      return;
    }

    const why = !stillWinning
      ? 'That move lets the position slip toward a draw.'
      : 'That move gives away a large part of the advantage.';
    this.setStatus(why + ' Taking it back so you can try a different move.', 'bad');
    await this.undoAfterDelay();
  }

  /**
   * Play the engine's best moves from the current position for both sides, so
   * the learner can watch the winning method. It runs a short line, then marks
   * the puzzle solved.
   */
  async showSolution(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.board.setInteractive(false);
    this.setStatus('Playing the engine solution. Watch the method.', '');
    for (let ply = 0; ply < 12; ply++) {
      if (this.chess.isGameOver()) {
        break;
      }
      const reply = await this.engine.bestMove(this.chess.fen(), 500);
      if (!reply.bestMove || reply.bestMove === '(none)') {
        break;
      }
      const from = reply.bestMove.slice(0, 2);
      const to = reply.bestMove.slice(2, 4);
      const promo = reply.bestMove.length > 4 ? reply.bestMove[4] : undefined;
      try {
        this.chess.move({ from, to, promotion: promo as 'q' | undefined });
      } catch {
        break;
      }
      this.board.setPosition(this.chess.fen());
      await new Promise((r) => setTimeout(r, 650));
      if (this.chess.isCheckmate()) {
        break;
      }
    }
    this.solveCurrent('That is the winning method. Study the king and piece moves.');
    this.busy = false;
  }

  private async engineReply(): Promise<void> {
    const reply = await this.engine.bestMove(this.chess.fen(), 400);
    if (!reply.bestMove || reply.bestMove === '(none)') {
      return;
    }
    const from = reply.bestMove.slice(0, 2);
    const to = reply.bestMove.slice(2, 4);
    const promo = reply.bestMove.length > 4 ? reply.bestMove[4] : undefined;
    try {
      this.chess.move({ from, to, promotion: promo as 'q' | undefined });
      this.board.setPosition(this.chess.fen());
    } catch {
      // If the engine move does not parse, leave the position as is.
    }
  }

  private solveCurrent(message: string): void {
    const key = this.puzzleKey(this.current());
    const next = markSolved(loadState(), key);
    saveState(next);
    this.setStatus(message + ' Press Next for the following position.', 'good');
    this.board.setInteractive(false);
    this.onProgress();
  }

  private async undoAfterDelay(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1400));
    // Take back only the learner's last move, so the position retraces to the
    // move before the mistake rather than resetting to the start.
    this.chess.undo();
    this.board.setPosition(this.chess.fen());
    this.board.setInteractive(true);
    const puzzle = this.current();
    this.setStatus(
      `Position ${this.puzzleIndex + 1} of ${this.concept.puzzles.length}. Your move again. ` + puzzle.hint,
      ''
    );
    this.busy = false;
  }

  dispose(): void {
    this.board.dispose();
  }
}
