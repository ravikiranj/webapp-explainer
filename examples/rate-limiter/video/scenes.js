// Scenes for storyboard.md, drawn by video/canvas-engine.js.
// SCENES has one function for each chapter. Each one returns one function for each
// beat, in storyboard order. A beat function gets its start time t, starts its
// animations, and returns the time they end.
window.SCENES = [
  // 1. One key, one limit
  ({ C, A, box, label, line, dot, stagger }) => {
    const client = box({ x: 330, y: 520, w: 260, color: C.blue, label: 'Client', sub: 'key = abc' });
    const limiter = box({ x: 960, y: 520, w: 300, color: C.yellow, label: 'Rate limiter', sub: '20 requests / s' });
    const api = box({ x: 1590, y: 520, w: 260, color: C.green, label: 'API' });
    const e1 = line({ pts: [[460, 520], [806, 520]] });
    const e2 = line({ pts: [[1110, 520], [1456, 520]] });
    const ok = Array.from({ length: 5 }, () => dot([[330, 520], [1590, 520]], C.green));
    const no = Array.from({ length: 3 }, () => dot([[330, 520], [905, 520]], C.red));
    const rejected = label({ x: 960, y: 650, text: 'rejected: over the limit', color: C.red, size: 24 });
    return [
      (t) => {
        stagger([client, limiter, api], t, 0.3, (e, s) => A.create(e, s, 0.9));
        A.create(e1, t + 1.0, 0.5);
        A.create(e2, t + 1.2, 0.5);
        return stagger(ok, t + 1.8, 0.35, (d, s) => A.travel(d, s, 1.4));
      },
      (t) => {
        A.hl(limiter, t, 1);
        stagger(no, t + 0.4, 0.3, (d, s) => A.travel(d, s, 0.9));
        A.create(rejected, t + 1.0, 0.9);
        return A.hl(limiter, t + 2.6, 0);
      },
    ];
  },

  // 2. One node
  ({ C, A, box, text, label, dot }) => {
    const server = box({ x: 760, y: 520, w: 560, h: 420, r: 22, color: C.green, fillA: 0.4 });
    const name = label({ x: 760, y: 345, text: 'one server', size: 24 });
    const bucket = box({ x: 760, y: 560, w: 220, h: 200, r: 14, color: C.yellow });
    const tokens = text({ x: 760, y: 545, text: '20', size: 64, weight: 700 });
    const unit = label({ x: 760, y: 610, text: 'tokens', size: 22 });
    const refill = label({ x: 760, y: 697, text: '+20 tokens each second', color: C.yellow, size: 22 });
    const reqs = Array.from({ length: 6 }, () => dot([[200, 560], [650, 560]], C.blue));
    const bounce = dot([[200, 560], [640, 560], [420, 700]], C.red);
    const held = label({ x: 760, y: 840, text: 'limit holds: 20 / s', color: C.green, size: 26 });
    return [
      (t) => {
        A.create(server, t, 1.0);
        return A.create(name, t + 0.6, 0.8);
      },
      (t) => {
        A.create(bucket, t, 0.9);
        A.create(tokens, t + 0.6, 0.4);
        A.create(unit, t + 0.7, 0.4);
        A.create(refill, t + 1.0, 0.9);
        reqs.forEach((d, i) => {
          A.travel(d, t + 1.6 + i * 0.35, 0.8);
          tokens.P.text.to(String(20 - (i + 1) * 3), t + 2.4 + i * 0.35, 0.01);
        });
        return t + 4.2;
      },
      (t) => {
        tokens.P.text.to('0', t, 0.01);
        A.set(bucket, t, 'err', 1, 0.4);
        A.travel(bounce, t + 0.3, 1.3);
        A.set(bucket, t + 1.8, 'err', 0, 0.4);
        return A.create(held, t + 1.8, 0.9);
      },
    ];
  },

  // 3. Ten nodes
  ({ C, A, box, text, label, line, stagger }) => {
    const lb = box({ x: 960, y: 230, w: 360, h: 80, color: C.grey, label: 'Load balancer' });
    const xs = Array.from({ length: 10 }, (_, i) => 230 + i * 162);
    const servers = xs.map((x, i) => box({ x, y: 470, w: 130, h: 80, r: 12, color: C.green, label: `s${i + 1}`, size: 24, mono: true }));
    const links = xs.map((x) => line({ pts: [[960, 270], [960, 340], [x, 340], [x, 428]], width: 2 }));
    const counts = xs.map((x) => label({ x, y: 548, text: '200 / s', size: 20, color: C.green }));
    const total = text({ x: 960, y: 690, text: '10 x 200 = 2,000 admitted each second', size: 40, weight: 700, color: C.red });
    const times = label({ x: 960, y: 750, text: 'ten times the limit of 200', size: 26, color: C.red });
    const store = box({ x: 960, y: 820, w: 420, h: 90, color: C.orange, label: 'Shared store', sub: 'one counter for the key' });
    const toStore = xs.map((x) => line({ pts: [[x, 512], [x, 640], [960, 640], [960, 772]], color: C.orange, width: 2 }));
    return [
      (t) => {
        A.create(lb, t, 0.8);
        stagger(links, t + 0.5, 0.06, (e, s) => A.create(e, s, 0.6));
        return stagger(servers, t + 0.8, 0.12, (e, s) => A.create(e, s, 0.7));
      },
      (t) => stagger(counts, t, 0.15, (e, s) => A.create(e, s, 0.6)),
      (t) => {
        A.create(total, t + 0.2, 1.4);
        A.create(times, t + 1.4, 1.0);
        return stagger(servers, t + 0.2, 0.05, (e, s) => A.set(e, s, 'err', 1, 0.4));
      },
      (t) => {
        [total, times, ...counts].forEach((e) => A.fade(e, t, 0, 0.5));
        servers.forEach((e) => A.set(e, t, 'err', 0, 0.4));
        A.create(store, t + 0.5, 1.0);
        return stagger(toStore, t + 1.0, 0.06, (e, s) => A.create(e, s, 0.7));
      },
    ];
  },

  // 4. Fifty nodes, three regions
  ({ C, A, box, label, line, stagger }) => {
    const regions = [400, 960, 1520].map((x, i) => box({ x, y: 420, w: 480, h: 360, r: 20, color: C.purple, dash: 1, fillA: 0 }));
    const rnames = ['region 1', 'region 2', 'region 3'].map((n, i) => label({ x: 400 + i * 560, y: 220, text: n, size: 24 }));
    const counts = [17, 17, 16];
    const servers = [];
    regions.forEach((r, i) => {
      for (let k = 0; k < 6; k++) {
        servers.push(box({ x: 270 + i * 560 + (k % 3) * 130, y: 340 + Math.floor(k / 3) * 120, w: 110, h: 70, r: 10, color: C.green }));
      }
    });
    const nums = counts.map((n, i) => label({ x: 400 + i * 560, y: 560, text: `${n} servers`, size: 22, color: C.green }));
    const store = box({ x: 400, y: 740, w: 360, h: 90, color: C.orange, label: 'Shared store', sub: 'in region 1' });
    const far = [960, 1520].map((x) => line({ pts: [[x, 600], [x, 740], [580, 740]], color: C.red, width: 4 }));
    const hot = label({ x: 960, y: 830, text: 'hot spot · cross-region delay on every check', color: C.red, size: 26 });
    const quotas = servers.map((s) => label({ x: s.o.x, y: s.o.y + 4, text: '100', size: 22, color: C.text }));
    const sum = label({ x: 1240, y: 740, text: '50 quotas x 100 = 5,000 each second', size: 30, color: C.green });
    return [
      (t) => {
        stagger(regions, t, 0.3, (e, s) => A.create(e, s, 1.0));
        stagger(rnames, t + 0.4, 0.3, (e, s) => A.create(e, s, 0.7));
        stagger(servers, t + 0.9, 0.05, (e, s) => A.create(e, s, 0.5));
        return stagger(nums, t + 1.8, 0.2, (e, s) => A.create(e, s, 0.6));
      },
      (t) => {
        A.create(store, t, 1.0);
        stagger(far, t + 0.8, 0.3, (e, s) => A.create(e, s, 1.0));
        A.set(store, t + 1.8, 'err', 1, 0.5);
        return A.create(hot, t + 2.0, 1.0);
      },
      (t) => {
        far.forEach((e) => A.fade(e, t, 0, 0.6));
        A.fade(hot, t, 0, 0.5);
        A.fade(store, t, 0.25, 0.6);
        A.set(store, t, 'err', 0, 0.4);
        nums.forEach((e) => A.fade(e, t, 0, 0.4));
        stagger(quotas, t + 0.6, 0.04, (e, s) => A.create(e, s, 0.4));
        return A.create(sum, t + 1.6, 1.2);
      },
    ];
  },

  // 5. Full scale, proposed
  ({ C, A, box, label, line, dot, stagger }) => {
    const loads = [0.45, 0.3, 1.6, 0.5, 0.35, 0.8, 0.4];
    const base = 760;
    const quota = 220;
    const bars = loads.map((v, i) => box({ x: 330 + i * 210, y: base - (v * quota) / 2, w: 120, h: v * quota, r: 8, color: v > 1 ? C.red : C.blue }));
    const qline = line({ pts: [[230, base - quota], [1630, base - quota]], color: C.yellow, width: 3, dash: 1, head: false });
    const qlabel = label({ x: 1660, y: base - quota, text: 'fixed quota', align: 'left', size: 22, color: C.yellow });
    const proposed = label({ x: 1720, y: 62, text: 'proposed', size: 24, color: C.orange });
    const waste = label({ x: 960, y: 860, text: 'quiet servers leave tokens unused · the busy one rejects', size: 24, color: C.sub });
    const coord = box({ x: 960, y: 170, w: 380, h: 80, color: C.purple, label: 'Background sync' });
    const syncs = loads.map((v, i) => line({ pts: [[330 + i * 210, Math.min(base - v * quota, base - quota) - 18], [960, 212]], color: C.purple, width: 2, dash: 1, head: false }));
    const lend = [1, 4].map((i) => dot([[330 + i * 210, base - 80], [330 + i * 210, 330], [750, 330], [750, base - 320]], C.yellow));
    const holds = label({ x: 960, y: 860, text: 'the sum of all buckets stays at 100,000 each second', size: 26, color: C.green });
    return [
      (t) => {
        A.create(proposed, t, 0.6);
        A.create(qline, t + 0.2, 1.0);
        A.create(qlabel, t + 0.8, 0.6);
        return stagger(bars, t + 0.4, 0.15, (e, s) => A.create(e, s, 0.8));
      },
      (t) => {
        A.hl(bars[2], t, 1, 0.5);
        A.create(waste, t + 0.4, 1.2);
        return A.hl(bars[2], t + 2.4, 0, 0.5);
      },
      (t) => {
        A.fade(waste, t, 0, 0.4);
        A.create(coord, t + 0.3, 0.9);
        return stagger(syncs, t + 0.8, 0.12, (e, s) => A.create(e, s, 0.7));
      },
      (t) => {
        stagger(lend, t + 0.2, 0.5, (d, s) => A.travel(d, s, 1.6));
        A.set(bars[2], t + 2.0, 'color', C.green, 0.6);
        return A.create(holds, t + 2.2, 1.2);
      },
    ];
  },

  // 6. Trade-offs
  ({ C, A, box, text, label, mono, stagger }) => {
    const rows = [
      ['In-memory counter', 'one node only', C.green],
      ['Central shared counter', 'exact, but a remote check on each request', C.orange],
      ['Regional quota split', 'no remote check, wastes budget on uneven load', C.blue],
      ['Local bucket with sync', 'fast and fair, a short window of drift (proposed)', C.purple],
    ];
    const items = rows.map(([name, note, color], i) => ({
      chip: box({ x: 520, y: 330 + i * 130, w: 520, h: 84, r: 12, color, label: name, size: 26 }),
      note: label({ x: 830, y: 330 + i * 130, text: note, size: 24, align: 'left', color: C.text }),
    }));
    const end = text({ x: 960, y: 860, text: 'Simple first. Add coordination only when the size needs it.', size: 30, color: C.yellow });
    return [
      (t) => stagger(items, t, 0.5, (r, s) => {
        A.create(r.chip, s, 0.8);
        return A.create(r.note, s + 0.4, 1.0);
      }),
      (t) => {
        stagger(items, t, 0.5, (r, s) => {
          A.hl(r.chip, s, 1, 0.3);
          return A.hl(r.chip, s + 0.6, 0, 0.3);
        });
        return A.create(end, t + 2.4, 1.4);
      },
    ];
  },
];
