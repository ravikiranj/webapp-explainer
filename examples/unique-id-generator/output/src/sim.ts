// A live, legible unique-ID simulation. The view has two clear parts:
//
// 1. Node lanes on the left: a small, fixed number of nodes, each a labelled
//    row. Every tick, each node issues one ID chip that shows its value.
// 2. A time-order track on the right: each issued ID is one dot, time on the
//    x axis and ID value on the y axis. A rising cloud means the IDs sort by
//    time; a flat scatter means they do not.
//
// The scheme decides the behaviour:
// - in-memory-counter: all nodes issue the SAME next value, so the chips in a
//   column match and the simulation marks a collision in bold red.
// - random-uuid: values never match (no collision) but land at random heights
//   (no time order).
// - snowflake: values never match and climb with time (time order kept).

import { cssVar } from './theme.ts';

export type Scheme = 'in-memory-counter' | 'random-uuid' | 'snowflake';

export interface IdParams {
  nodes: number;
  rate: number; // issue rounds per second (model)
  scheme: Scheme;
}

interface OrderDot {
  t: number;
  value: number;
  collided: boolean;
}

export interface IdHandle {
  readonly params: IdParams;
  play(): void;
  pause(): void;
  reset(): void;
  isRunning(): boolean;
  dispose(): void;
  onReadout(cb: (r: { issued: number; collisions: number; ordered: boolean; running: boolean }) => void): void;
}

/** The last ID value each lane issued, for the chip display. */
interface LaneChip {
  text: string;
  collided: boolean;
}

/** Create and mount the live ID simulation on the host element. */
export function createIdSim(host: HTMLElement, initial: IdParams): IdHandle {
  const params: IdParams = { ...initial };
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '320px';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;

  let issued = 0;
  let collisions = 0;
  let round = 0;
  let timer: number | undefined;
  let lastChips: LaneChip[] = [];
  const orderDots: OrderDot[] = [];
  let readoutCb: ((r: { issued: number; collisions: number; ordered: boolean; running: boolean }) => void) | undefined;

  // At most sixteen lanes are drawn so each stays readable. The height adapts
  // so the slider visibly adds lanes. When the true node count is higher than
  // what fits, an overflow row names the rest, so the slider always shows an
  // effect. The readout still counts every node.
  function shownNodes(): number {
    return Math.min(params.nodes, 16);
  }

  function size(): { w: number; h: number } {
    const ratio = globalThis.devicePixelRatio || 1;
    const w = host.clientWidth || 600;
    const h = 320;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w, h };
  }

  function issueRound(): void {
    const lanes = shownNodes();
    const chips: LaneChip[] = [];
    round++;

    if (params.scheme === 'in-memory-counter') {
      // Every node issues the same next counter value this round. Count the
      // collisions over ALL nodes, not only the drawn lanes.
      const value = round;
      issued += params.nodes;
      collisions += Math.max(0, params.nodes - 1);
      for (let n = 0; n < lanes; n++) {
        chips.push({ text: '#' + value, collided: n > 0 });
      }
      orderDots.push({ t: round, value: value % 24, collided: true });
    } else if (params.scheme === 'random-uuid') {
      issued += params.nodes;
      for (let n = 0; n < lanes; n++) {
        const v = Math.floor(Math.random() * 0xffff);
        chips.push({ text: v.toString(16).padStart(4, '0'), collided: false });
        orderDots.push({ t: round, value: Math.floor(Math.random() * 24), collided: false });
      }
    } else {
      // snowflake: time high bits, then node, then sequence. Values climb.
      issued += params.nodes;
      for (let n = 0; n < lanes; n++) {
        chips.push({ text: `${round}-${n}`, collided: false });
        orderDots.push({ t: round, value: (round % 24), collided: false });
      }
    }
    lastChips = chips;
    while (orderDots.length > 160) {
      orderDots.shift();
    }
  }

  function draw(): void {
    const { w, h } = size();
    ctx.clearRect(0, 0, w, h);
    const laneAreaW = Math.min(300, w * 0.42);
    const trackX = laneAreaW + 20;
    const trackW = w - trackX - 16;
    const lanes = shownNodes();
    const hasOverflow = params.nodes > lanes;

    // --- Node lanes ---
    const laneTop = 40;
    const bannerSpace = params.scheme === 'in-memory-counter' && params.nodes > 1 ? 18 : 0;
    const rows = lanes + (hasOverflow ? 1 : 0);
    const laneH = (h - laneTop - 20 - bannerSpace) / Math.max(1, rows);
    const chipH = Math.max(12, Math.min(26, laneH - 4));
    const fontPx = Math.max(9, Math.min(13, Math.round(chipH * 0.5)));
    ctx.fillStyle = cssVar('--ink-dim');
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`nodes issue IDs (${params.nodes} total)`, 8, 22);
    for (let n = 0; n < lanes; n++) {
      const y = laneTop + laneH * n + laneH / 2;
      ctx.fillStyle = cssVar('--ink-dim');
      ctx.font = Math.max(9, fontPx - 1) + 'px system-ui, sans-serif';
      ctx.fillText('node ' + (n + 1), 8, y + 4);
      // The chip this node issued this round.
      const chip = lastChips[n];
      if (chip) {
        const chipX = 66;
        const chipW = Math.min(120, laneAreaW - 76);
        ctx.fillStyle = chip.collided ? cssVar('--bad') : (params.scheme === 'snowflake' ? cssVar('--good') : cssVar('--accent'));
        ctx.globalAlpha = 0.9;
        roundRect(ctx, chipX, y - chipH / 2, chipW, chipH, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#06111f';
        ctx.font = fontPx + 'px system-ui, sans-serif';
        ctx.fillText(chip.text, chipX + 9, y + fontPx * 0.35);
      }
    }

    // Overflow row: name the nodes that are not drawn, so the slider shows an
    // effect even past the drawn lane limit.
    if (hasOverflow) {
      const y = laneTop + laneH * lanes + laneH / 2;
      ctx.fillStyle = cssVar('--ink-dim');
      ctx.font = Math.max(10, fontPx) + 'px system-ui, sans-serif';
      ctx.fillText(`+ ${params.nodes - lanes} more nodes, same behaviour`, 8, y + 4);
    }

    // Collision banner.
    if (params.scheme === 'in-memory-counter' && params.nodes > 1) {
      ctx.fillStyle = cssVar('--bad');
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('same value on every node = collision', 66, h - 24);
    }

    // --- Time-order track ---
    ctx.strokeStyle = cssVar('--line');
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX, laneTop, trackW, h - laneTop - 20);
    ctx.fillStyle = cssVar('--ink-dim');
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('time order: value (y) against time (x)', trackX, 22);
    ctx.fillText('time →', trackX + trackW - 48, h - 6);

    const minT = orderDots.length ? orderDots[0].t : 0;
    const maxT = orderDots.length ? orderDots[orderDots.length - 1].t : 1;
    const span = Math.max(1, maxT - minT);
    for (const d of orderDots) {
      const px = trackX + ((d.t - minT) / span) * (trackW - 10) + 5;
      const py = laneTop + (1 - d.value / 24) * (h - laneTop - 30) + 10;
      if (d.collided) {
        ctx.fillStyle = cssVar('--bad');
        ctx.fillRect(px - 2.5, py - 2.5, 6, 6);
      } else {
        ctx.fillStyle = params.scheme === 'snowflake' ? cssVar('--good') : cssVar('--accent');
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function tick(): void {
    issueRound();
    draw();
    const ordered = params.scheme !== 'random-uuid';
    readoutCb?.({ issued, collisions, ordered, running: timer !== undefined });
  }

  size();
  draw();
  const onResize = () => {
    size();
    draw();
  };
  globalThis.addEventListener('resize', onResize);

  return {
    params,
    play() {
      if (timer === undefined) {
        const interval = Math.max(300, 1000 / Math.max(1, params.rate / 20));
        timer = globalThis.setInterval(tick, interval) as unknown as number;
      }
    },
    pause() {
      if (timer !== undefined) {
        globalThis.clearInterval(timer);
        timer = undefined;
      }
    },
    reset() {
      issued = 0;
      collisions = 0;
      round = 0;
      lastChips = [];
      orderDots.length = 0;
      draw();
    },
    isRunning() {
      return timer !== undefined;
    },
    dispose() {
      if (timer !== undefined) {
        globalThis.clearInterval(timer);
      }
      globalThis.removeEventListener('resize', onResize);
      host.innerHTML = '';
    },
    onReadout(cb) {
      readoutCb = cb;
    }
  };
}
