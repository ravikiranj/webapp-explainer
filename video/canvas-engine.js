// The canvas renderer of the video maker. See ../video-design.md, section 5.
//
// A small deterministic animation engine. Every visible value is a Prop: a start
// value plus tweens on an absolute timeline. So render(t) draws the same frame for
// the same t, in any order, and a preview frame equals the same frame of the video.
//
// The timeline comes from the storyboard (storyboard.mjs). A subject's scenes.js
// gives one animation function for each beat; see Movie.run().
(() => {
  const W = 1920;
  const H = 1080;
  // render.html loads these fonts from the bundled @fontsource packages.
  const SANS = '"Inter", sans-serif';
  const MONO = '"JetBrains Mono", monospace';

  // One meaning for each colour. Keep yellow for "look here".
  const C = {
    bg: '#15171c',
    text: '#e6edf3',
    sub: '#9ba3ad',
    faint: '#3a404b',
    blue: '#58a6ff',
    green: '#3fb950',
    orange: '#f0883e',
    purple: '#a371f7',
    grey: '#8b949e',
    yellow: '#f2cc60',
    red: '#f85149',
    teal: '#39c5bb',
  };

  // The timing numbers come from storyboard.mjs, through render.html.
  const TIMING = () => window.TIMING;

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const E = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    lin: (t) => t,
  };

  const hex = (h) => {
    const s = h.replace('#', '');
    const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const norm = (v) => (typeof v === 'string' && v[0] === '#' ? hex(v) : v);
  const lerp = (a, b, u) => {
    if (typeof a === 'number') {
      return a + (b - a) * u;
    }
    if (Array.isArray(a)) {
      return a.map((v, i) => lerp(v, b[i], u));
    }
    return u < 0.5 ? a : b;
  };
  const rgba = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const mix = (a, b, u) => lerp(a, b, clamp(u));

  class Prop {
    constructor(v) {
      this.v0 = norm(v);
      this.segs = [];
    }

    to(v, t0, dur = 0, ease = E.inOut) {
      this.segs.push({ t0, t1: t0 + Math.max(dur, 1e-6), to: norm(v), ease });
      this.segs.sort((a, b) => a.t0 - b.t0);
      return t0 + dur;
    }

    at(t) {
      let v = this.v0;
      for (const s of this.segs) {
        if (t < s.t0) {
          break;
        }
        v = t >= s.t1 ? s.to : lerp(v, s.to, s.ease((t - s.t0) / (s.t1 - s.t0)));
      }
      return v;
    }
  }

  const DEFAULTS = {
    box: {
      x: 0, y: 0, w: 200, h: 90, r: 16, color: C.grey, opacity: 1, draw: 0, hl: 0, scale: 1,
      label: '', sub: '', label2: '', sub2: '', swap: 0, size: 28, subSize: 20, fillA: 1, dash: 0, err: 0,
    },
    text: { x: 0, y: 0, text: '', size: 30, color: C.text, opacity: 1, write: 0, scale: 1, hl: 0 },
    line: { color: C.grey, width: 3, opacity: 1, draw: 0, dash: 0 },
    dot: { u: 0, opacity: 0, color: C.yellow, r: 11 },
  };

  class El {
    constructor(kind, o) {
      this.kind = kind;
      this.o = o;
      this.P = {};
      const props = { ...DEFAULTS[kind], ...o };
      for (const k of Object.keys(DEFAULTS[kind])) {
        this.P[k] = new Prop(props[k]);
      }
    }

    v(k, t) {
      return this.P[k].at(t);
    }
  }

  // Per character reveal: a soft wave four characters wide moves left to right.
  const drawWrite = (ctx, str, x, y, align, w) => {
    if (w <= 0 || str === '') {
      return;
    }
    if (w >= 1) {
      ctx.textAlign = align;
      ctx.fillText(str, x, y);
      return;
    }
    const total = ctx.measureText(str).width;
    let x0 = x;
    if (align === 'center') {
      x0 = x - total / 2;
    } else if (align === 'right') {
      x0 = x - total;
    }
    ctx.textAlign = 'left';
    const n = str.length;
    const base = ctx.globalAlpha;
    for (let i = 0; i < n; i++) {
      const a = clamp((w * (n + 4) - i) / 4);
      if (a <= 0) {
        break;
      }
      ctx.globalAlpha = base * a;
      ctx.fillText(str[i], x0 + ctx.measureText(str.slice(0, i)).width, y);
    }
    ctx.globalAlpha = base;
  };

  const polyLen = (pts) => {
    const seg = [];
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d);
      L += d;
    }
    return { seg, L };
  };
  const pointAt = (pts, u) => {
    const { seg, L } = polyLen(pts);
    let d = clamp(u) * L;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const k = seg[i] === 0 ? 0 : clamp(d / seg[i]);
        const a = pts[i];
        const b = pts[i + 1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
      }
      d -= seg[i];
    }
    return [pts[0][0], pts[0][1], 0];
  };

  function drawBox(ctx, b, t) {
    const op = b.v('opacity', t);
    const draw = b.v('draw', t);
    if (op <= 0 || draw <= 0) {
      return;
    }
    const x = b.v('x', t);
    const y = b.v('y', t);
    const w = b.v('w', t);
    const h = b.v('h', t);
    const r = Math.min(b.v('r', t), w / 2, h / 2);
    const s = b.v('scale', t);
    const hl = b.v('hl', t);
    const err = b.v('err', t);
    let col = mix(b.v('color', t), hex(C.yellow), hl);
    col = mix(col, hex(C.red), err);
    ctx.save();
    ctx.globalAlpha = op;
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
    const fa = clamp((draw - 0.35) / 0.65) * b.v('fillA', t);
    ctx.fillStyle = rgba(col, (0.13 + 0.08 * hl) * fa);
    ctx.fill();
    const P = 2 * (w + h) - (8 - 2 * Math.PI) * r;
    if (b.v('dash', t) > 0.5) {
      ctx.setLineDash([12, 10]);
    } else if (draw < 1) {
      ctx.setLineDash([P * draw, P + 2]);
    }
    if (hl > 0) {
      ctx.shadowColor = rgba(hex(C.yellow), 0.55 * hl);
      ctx.shadowBlur = 28 * hl;
    }
    ctx.lineWidth = 3 + 1.5 * hl;
    ctx.strokeStyle = rgba(col, 1);
    ctx.stroke();
    ctx.restore();

    const lw = clamp((draw - 0.45) / 0.55);
    if (lw <= 0) {
      return;
    }
    const swap = b.v('swap', t);
    const pairs = [[b.v('label', t), b.v('sub', t), 1 - swap], [b.v('label2', t), b.v('sub2', t), swap]];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.textBaseline = 'middle';
    for (const [k, [label, sub, a]] of pairs.entries()) {
      if (a <= 0.001 || (!label && !sub)) {
        continue;
      }
      const size = b.v('size', t);
      const subSize = b.v('subSize', t);
      const both = label && sub;
      ctx.globalAlpha = op * a;
      ctx.fillStyle = C.text;
      const isMono = k === 1 && b.o.mono2 !== undefined ? b.o.mono2 : b.o.mono;
      ctx.font = `600 ${size}px ${isMono ? MONO : SANS}`;
      drawWrite(ctx, label, 0, both ? -subSize * 0.62 : 0, 'center', lw);
      if (sub) {
        ctx.fillStyle = C.sub;
        ctx.font = `${subSize}px ${b.o.subMono ? MONO : SANS}`;
        drawWrite(ctx, sub, 0, both ? size * 0.62 : 0, 'center', lw);
      }
    }
    ctx.restore();
  }

  function drawText(ctx, e, t) {
    const op = e.v('opacity', t);
    const w = e.v('write', t);
    if (op <= 0 || w <= 0) {
      return;
    }
    const s = e.v('scale', t);
    const hl = e.v('hl', t);
    ctx.save();
    ctx.globalAlpha = op;
    ctx.translate(e.v('x', t), e.v('y', t));
    ctx.scale(s, s);
    ctx.textBaseline = 'middle';
    ctx.font = `${e.o.weight || 400} ${e.v('size', t)}px ${e.o.mono ? MONO : SANS}`;
    ctx.fillStyle = rgba(mix(e.v('color', t), hex(C.yellow), hl), 1);
    drawWrite(ctx, e.v('text', t), 0, 0, e.o.align || 'center', w);
    ctx.restore();
  }

  function drawLine(ctx, l, t) {
    const op = l.v('opacity', t);
    const d = l.v('draw', t);
    if (op <= 0 || d <= 0) {
      return;
    }
    const pts = l.o.pts;
    const { L } = polyLen(pts);
    ctx.save();
    ctx.globalAlpha = op;
    ctx.strokeStyle = rgba(l.v('color', t), 1);
    ctx.lineWidth = l.v('width', t);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (l.v('dash', t) > 0.5) {
      ctx.setLineDash([10, 10]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    let left = d * L;
    let tip = [pts[0][0], pts[0][1], 0];
    for (let i = 1; i < pts.length && left > 0; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.min(1, left / len);
      tip = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
      ctx.lineTo(tip[0], tip[1]);
      left -= len;
    }
    ctx.stroke();
    if (l.o.head !== false) {
      ctx.setLineDash([]);
      const hs = 15;
      ctx.translate(tip[0], tip[1]);
      ctx.rotate(tip[2]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.globalAlpha = op * clamp(d * 4);
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(-hs, -hs * 0.55);
      ctx.lineTo(-hs, hs * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDot(ctx, e, t) {
    const op = e.v('opacity', t);
    if (op <= 0) {
      return;
    }
    const u = e.v('u', t);
    const col = e.v('color', t);
    const r = e.v('r', t);
    ctx.save();
    for (let k = 7; k >= 1; k--) {
      const p = pointAt(e.o.pts, u - k * 0.012);
      ctx.globalAlpha = op * 0.06 * (8 - k);
      ctx.fillStyle = rgba(col, 1);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * (1 - k * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    const p = pointAt(e.o.pts, u);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3.2);
    g.addColorStop(0, rgba(col, 0.45 * op));
    g.addColorStop(1, rgba(col, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = op;
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const DRAW = { box: drawBox, text: drawText, line: drawLine, dot: drawDot };

  // Breaks a caption into at most two lines that fit the width.
  const wrap = (ctx, text, max) => {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width > max && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) {
      lines.push(cur);
    }
    return lines;
  };

  class Movie {
    constructor() {
      this.els = [];
      this.cues = [];
      this.chapters = [];
      this.t = 0;
      this.scope = [];
      this.beats = [];
      this.cam = { cx: new Prop(W / 2), cy: new Prop(H / 2), zoom: new Prop(1) };
    }

    add(kind, o) {
      const e = new El(kind, o);
      this.els.push(e);
      if (!o.keep) {
        this.scope.push(e);
      }
      return e;
    }

    box(o) { return this.add('box', o); }
    text(o) { return this.add('text', o); }
    line(o) { return this.add('line', o); }
    dot(o) { return this.add('dot', o); }

    // Starts a chapter: records its time and writes its number and title at the top left.
    chapter(n, title, section) {
      this.chapters.push({ t: this.t, title, section, n });
      const label = this.text({ x: 70, y: 62, text: `${n} · ${title}`, size: 26, color: C.sub, align: 'left', fixed: true });
      label.P.write.to(1, this.t + 0.2, 1.0, E.out);
      return label;
    }

    // Fades out every element added since the last clear.
    clear(d = 0.8) {
      for (const e of this.scope) {
        e.P.opacity.to(0, this.t, d);
      }
      this.scope = [];
      this.t += d + 0.2;
    }

    // One storyboard beat: one subtitle line and the animation that goes with it.
    // The length follows video-design.md section 7.2, with the numbers in TIMING.
    beat(text, fn, opt = {}) {
      const T = TIMING();
      const t0 = this.t;
      const end = fn ? fn(t0) ?? t0 : t0;
      const read = text ? Math.max(T.minRead, text.length / T.readCps) : 0;
      const voice = opt.audio ? opt.audio + T.audioPad : 0;
      const dur = Math.max(read, voice, end - t0) + (opt.hold ?? T.pause);
      if (text) {
        this.cues.push({ start: +(t0 + T.cueLead).toFixed(3), end: +(t0 + dur - T.cueTail).toFixed(3), text });
      }
      this.beats.push({ start: +t0.toFixed(3), end: +(t0 + dur).toFixed(3), audio: opt.audioFile ?? null });
      this.t = t0 + dur;
      return t0;
    }

    // Plays the whole storyboard. scenes has one function for each chapter. Each
    // one gets the kit and returns one animation function for each beat, in order.
    run(story, scenes, kit) {
      if (scenes.length !== story.chapters.length) {
        throw new Error(`storyboard has ${story.chapters.length} chapters, scenes.js has ${scenes.length}`);
      }
      story.chapters.forEach((ch, i) => {
        this.chapter(ch.n, ch.title, ch.section);
        const fns = scenes[i](kit);
        if (fns.length !== ch.beats.length) {
          throw new Error(`chapter ${ch.n}: storyboard has ${ch.beats.length} beats, scenes.js has ${fns.length}`);
        }
        ch.beats.forEach((b, j) => this.beat(b.text, fns[j], b));
        this.clear();
      });
    }

    wait(d) {
      this.t += d;
    }

    get duration() {
      return this.t;
    }

    render(ctx, t, opt = {}) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const z = this.cam.zoom.at(t);
      const cx = this.cam.cx.at(t);
      const cy = this.cam.cy.at(t);
      for (const e of this.els) {
        if (e.o.fixed) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
        }
        DRAW[e.kind](ctx, e, t);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (opt.captions) {
        this.drawCaption(ctx, t);
      }
    }

    drawCaption(ctx, t) {
      const cue = this.cues.find((c) => t >= c.start && t < c.end);
      if (!cue) {
        return;
      }
      const a = clamp(Math.min((t - cue.start) / 0.2, (cue.end - t) / 0.2));
      ctx.save();
      ctx.font = `40px ${SANS}`;
      const lines = wrap(ctx, cue.text, 1500);
      const lh = 52;
      const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56;
      const height = lines.length * lh + 26;
      const y = H - 48 - height;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - width / 2, y, width, height, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 13 + lh / 2 + i * lh));
      ctx.restore();
    }
  }

  // Animation helpers. Each returns the time the animation ends.
  const A = {
    create: (e, t, d = 1) => e.P[e.kind === 'text' ? 'write' : 'draw'].to(1, t, d, e.kind === 'text' ? E.lin : E.inOut),
    uncreate: (e, t, d = 0.6) => e.P.opacity.to(0, t, d),
    fade: (e, t, to, d = 0.6) => e.P.opacity.to(to, t, d),
    set: (e, t, k, v, d = 0.8, ease = E.inOut) => e.P[k].to(v, t, d, ease),
    move: (e, t, o, d = 1) => Math.max(...Object.entries(o).map(([k, v]) => e.P[k].to(v, t, d))),
    hl: (e, t, on = 1, d = 0.5) => e.P.hl.to(on, t, d),
    travel: (dot, t, d = 1.2) => {
      dot.P.opacity.to(1, t, 0.15);
      dot.P.u.to(0, t, 0);
      dot.P.u.to(1, t, d, E.inOut);
      dot.P.opacity.to(0, t + d, 0.25);
      return t + d + 0.25;
    },
    cam: (m, t, o, d = 1.4) => Math.max(...Object.entries(o).map(([k, v]) => m.cam[k].to(v, t, d))),
    pop: (e, t, d = 0.5) => {
      e.P.scale.to(1.12, t, d / 2, E.out);
      return e.P.scale.to(1, t + d / 2, d / 2, E.inOut);
    },
  };

  // What a chapter function in scenes.js gets: short makers with good defaults.
  const kit = (m) => ({
    m, C, E, A, W, H,
    box: (o) => m.box({ h: 96, size: 28, subSize: 20, ...o }),
    text: (o) => m.text(o),
    label: (o) => m.text({ size: 22, color: C.sub, ...o }),
    mono: (o) => m.text({ mono: true, size: 28, align: 'left', ...o }),
    line: (o) => m.line(o),
    dot: (pts, color = C.yellow) => m.dot({ pts, color }),
    // Runs fn for each element, step seconds apart, and returns the last end time.
    stagger: (els, t, step, fn) => Math.max(t, ...els.map((e, i) => fn(e, t + i * step))),
  });

  window.VIDEO = { W, H, C, E, A, Movie, SANS, MONO, clamp, kit };
})();
