// A small wrapper around the bundled Stockfish engine. The engine runs as a
// Web Worker from this app's own origin (./engine/stockfish.js). It never
// calls a third party over the network. The wrapper speaks the UCI protocol.
//
// The engine strength is capped. UCI_LimitStrength with UCI_Elo holds the
// engine near a target rating, so the trainer stays at or under 1800 ELO.

export interface EngineReply {
  readonly bestMove: string;
  readonly ponder?: string;
}

/** Resolve the URL of the bundled engine worker, relative to this page. */
function engineUrl(): string {
  // import.meta.env.BASE_URL is '/.../' at runtime because base is './'.
  // Build the path to the worker that Vite copied from public/engine.
  return new URL('engine/stockfish.js', document.baseURI).href;
}

/** A UCI engine client backed by a Web Worker. */
export class ChessEngine {
  private worker: Worker;
  private ready: Promise<void>;
  private lineHandlers: ((line: string) => void)[] = [];

  constructor() {
    this.worker = new Worker(engineUrl());
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      for (const handler of this.lineHandlers) {
        handler(line);
      }
    };
    this.ready = this.handshake();
  }

  private send(command: string): void {
    this.worker.postMessage(command);
  }

  private onLine(handler: (line: string) => void): () => void {
    this.lineHandlers.push(handler);
    return () => {
      this.lineHandlers = this.lineHandlers.filter((h) => h !== handler);
    };
  }

  private handshake(): Promise<void> {
    return new Promise((resolve) => {
      const off = this.onLine((line) => {
        if (line.includes('uciok')) {
          off();
          resolve();
        }
      });
      this.send('uci');
    });
  }

  /** Set the engine strength to a target ELO (capped by the caller). */
  async setElo(elo: number): Promise<void> {
    await this.ready;
    this.send('setoption name UCI_LimitStrength value true');
    this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(1800, Math.round(elo)))}`);
  }

  /** Wait until the engine reports it is ready. */
  async isReady(): Promise<void> {
    await this.ready;
    return new Promise((resolve) => {
      const off = this.onLine((line) => {
        if (line.includes('readyok')) {
          off();
          resolve();
        }
      });
      this.send('isready');
    });
  }

  /**
   * Ask for the best move from a position. The search is capped by movetime
   * so a reply arrives quickly. Returns the move in long algebraic form,
   * for example e2e4 or e7e8q.
   */
  async bestMove(fen: string, movetimeMs = 600): Promise<EngineReply> {
    await this.isReady();
    this.send('position fen ' + fen);
    return new Promise((resolve) => {
      const off = this.onLine((line) => {
        if (line.startsWith('bestmove')) {
          off();
          const parts = line.split(/\s+/);
          resolve({ bestMove: parts[1], ponder: parts[3] });
        }
      });
      this.send(`go movetime ${movetimeMs}`);
    });
  }

  /**
   * Evaluate a position. Returns the score in centipawns from the side to
   * move's view, or a mate distance. Used to judge whether the learner's move
   * kept or threw away the win.
   */
  async evaluate(fen: string, movetimeMs = 500): Promise<{ cp?: number; mate?: number }> {
    await this.isReady();
    this.send('position fen ' + fen);
    return new Promise((resolve) => {
      let lastCp: number | undefined;
      let lastMate: number | undefined;
      const off = this.onLine((line) => {
        if (line.startsWith('info')) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (cpMatch) {
            lastCp = parseInt(cpMatch[1], 10);
            lastMate = undefined;
          }
          if (mateMatch) {
            lastMate = parseInt(mateMatch[1], 10);
          }
        }
        if (line.startsWith('bestmove')) {
          off();
          resolve({ cp: lastCp, mate: lastMate });
        }
      });
      this.send(`go movetime ${movetimeMs}`);
    });
  }

  dispose(): void {
    this.send('quit');
    this.worker.terminate();
    this.lineHandlers = [];
  }
}
