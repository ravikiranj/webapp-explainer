// A live, animated traffic simulation. Cars flow left to right through a line
// of intersections. Each intersection runs a signal cycle. When coordination
// is on, the signals form a green wave, so a car meets green at each stop.
// When it is off, the signals clash, so cars queue and the mean wait grows.
// Controls change the intersection count, the arrival rate, and coordination
// while the simulation runs.

import { cssVar } from './theme.ts';

export interface TrafficParams {
  intersections: number;
  carsPerMin: number;
  coordinated: boolean;
}

interface Car {
  x: number; // pixels
  speed: number;
  waited: number; // seconds waited so far
  done: boolean;
  color: string;
}

export interface TrafficHandle {
  readonly params: TrafficParams;
  play(): void;
  pause(): void;
  reset(): void;
  isRunning(): boolean;
  dispose(): void;
  onReadout(cb: (r: { meanWait: number; running: boolean; cars: number }) => void): void;
}

/** Create and mount the live traffic simulation on the host canvas element. */
export function createTrafficSim(host: HTMLElement, initial: TrafficParams): TrafficHandle {
  const params: TrafficParams = { ...initial };
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '260px';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;

  let cars: Car[] = [];
  let timer: number | undefined;
  let phase = 0; // seconds of model time
  let spawnAcc = 0;
  const completedWaits: number[] = [];
  let readoutCb: ((r: { meanWait: number; running: boolean; cars: number }) => void) | undefined;

  function size(): { w: number; h: number } {
    const ratio = globalThis.devicePixelRatio || 1;
    const w = host.clientWidth || 600;
    const h = 260;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w, h };
  }

  /** The x positions of the intersections across the road. */
  function intersectionXs(w: number): number[] {
    const shown = Math.min(params.intersections, 8);
    const xs: number[] = [];
    const margin = 60;
    const gap = (w - margin * 2) / Math.max(1, shown);
    for (let i = 0; i < shown; i++) {
      xs.push(margin + gap * (i + 0.5));
    }
    return xs;
  }

  /** Is the signal at the given index green at the current phase? */
  function isGreen(index: number): boolean {
    const cycle = 6; // seconds
    const offset = params.coordinated ? index * 0.8 : (index % 2) * (cycle / 2);
    return ((phase - offset) % cycle + cycle) % cycle < cycle / 2;
  }

  function tick(): void {
    const { w, h } = size();
    phase += 0.1;
    const xs = intersectionXs(w);
    const roadY = h / 2;

    // Spawn cars at the model arrival rate.
    spawnAcc += (params.carsPerMin / 60) * 0.1;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      cars.push({ x: 0, speed: 60, waited: 0, done: false, color: cssVar('--accent') });
    }

    // Move cars. A car stops just before a red signal.
    for (const car of cars) {
      if (car.done) {
        continue;
      }
      let blocked = false;
      for (let i = 0; i < xs.length; i++) {
        const stopLine = xs[i] - 14;
        if (car.x < stopLine && car.x > stopLine - 40 && !isGreen(i)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        car.waited += 0.1;
      } else {
        car.x += car.speed * 0.1;
      }
      if (car.x > w) {
        car.done = true;
        completedWaits.push(car.waited);
        if (completedWaits.length > 200) {
          completedWaits.shift();
        }
      }
    }
    cars = cars.filter((c) => !c.done).slice(-60);

    draw(w, h, xs, roadY);

    const meanWait =
      completedWaits.length > 0
        ? completedWaits.reduce((a, b) => a + b, 0) / completedWaits.length
        : 0;
    readoutCb?.({ meanWait, running: timer !== undefined, cars: cars.length });
  }

  function draw(w: number, h: number, xs: number[], roadY: number): void {
    ctx.clearRect(0, 0, w, h);
    // Road.
    ctx.strokeStyle = cssVar('--line');
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(w, roadY);
    ctx.stroke();

    // Signals.
    for (let i = 0; i < xs.length; i++) {
      ctx.fillStyle = isGreen(i) ? cssVar('--good') : cssVar('--bad');
      ctx.beginPath();
      ctx.arc(xs[i], roadY - 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cars.
    for (const car of cars) {
      ctx.fillStyle = car.waited > 0.5 ? cssVar('--warn') : cssVar('--accent');
      ctx.fillRect(car.x - 10, roadY - 6, 16, 12);
    }

    // Label.
    ctx.fillStyle = cssVar('--ink-dim');
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      params.coordinated ? 'coordinated (green wave)' : 'each light alone (clashing phases)',
      14,
      20
    );
  }

  size();
  draw(host.clientWidth || 600, 260, intersectionXs(host.clientWidth || 600), 130);

  const onResize = () => size();
  globalThis.addEventListener('resize', onResize);

  return {
    params,
    play() {
      if (timer === undefined) {
        timer = globalThis.setInterval(tick, 100) as unknown as number;
      }
    },
    pause() {
      if (timer !== undefined) {
        globalThis.clearInterval(timer);
        timer = undefined;
      }
    },
    reset() {
      cars = [];
      completedWaits.length = 0;
      phase = 0;
      spawnAcc = 0;
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
