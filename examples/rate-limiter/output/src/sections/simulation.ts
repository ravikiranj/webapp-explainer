import type { Section } from '../section.ts';
import { TECHNIQUE_LABEL, type Technique } from '../domain.ts';
import { h, num, tps } from '../dom.ts';
import { createRateSim } from '../sim.ts';

const TECHNIQUES: Technique[] = [
  'in-memory-counter',
  'central-counter',
  'regional-quota',
  'local-bucket-sync'
];

export const simulation: Section = {
  id: 'simulation',
  group: 'Start here',
  title: 'Live simulation',
  icon: 'bi-sliders',
  badge: 'interactive',
  caption:
    'Run the limiter live. Change the node count, the arrival rate, and the ' +
    'technique while it runs. Watch the admitted rate against the limit.',
  render(el) {
    const perKeyLimit = 1000;

    // Lead text that frames what to do and what to watch.
    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'The green area is the admitted rate. The dashed blue line is the ' +
            `wanted limit of ${tps(perKeyLimit)}. The red bars are rejected requests. ` +
            'With the in-memory counter, add nodes and watch the admitted rate climb above the limit. ' +
            'Then switch the technique and watch it return to the limit.'
        ])
      ])
    );

    // Readout.
    const readoutAdmitted = h('span', { class: 'big ok' }, ['0']);
    const readoutState = h('span', {}, ['paused']);
    el.append(
      h('div', { class: 'sim-readout' }, [
        h('span', {}, ['Admitted now: ', readoutAdmitted]),
        h('span', {}, ['Limit: ', h('span', { class: 'big' }, [num(perKeyLimit)])]),
        h('span', {}, ['State: ', readoutState])
      ])
    );

    // Controls.
    const playBtn = h('button', { class: 'sim-btn' }, ['▶ Play']) as HTMLButtonElement;
    const resetBtn = h('button', { class: 'sim-btn secondary' }, ['Reset']) as HTMLButtonElement;

    const nodesOut = h('output', {}, ['1']);
    const nodes = h('input', { type: 'range', min: '1', max: '50', value: '1', step: '1' }) as HTMLInputElement;
    const rateOut = h('output', {}, [num(3000)]);
    const rate = h('input', { type: 'range', min: '500', max: '60000', value: '3000', step: '500' }) as HTMLInputElement;

    const techSelect = h('select', {}, TECHNIQUES.map((tech) =>
      h('option', { value: tech }, [TECHNIQUE_LABEL[tech]])
    )) as HTMLSelectElement;

    const controls = h('div', { class: 'sim-controls' }, [
      h('div', { class: 'ctrl' }, [playBtn]),
      h('div', { class: 'ctrl' }, [resetBtn]),
      h('div', { class: 'ctrl' }, [
        h('label', {}, ['Nodes: ', nodesOut]),
        nodes
      ]),
      h('div', { class: 'ctrl' }, [
        h('label', {}, ['Arrival rate (TPS): ', rateOut]),
        rate
      ]),
      h('div', { class: 'ctrl' }, [
        h('label', {}, ['Technique']),
        techSelect
      ])
    ]);
    el.append(controls);

    const host = h('div', { class: 'chart' });
    el.append(h('div', { class: 'viz' }, [h('h2', {}, ['Admitted and rejected over time']), host]));

    let sim: ReturnType<typeof createRateSim> | undefined;
    requestAnimationFrame(() => {
      sim = createRateSim(host, {
        perKeyLimit,
        nodes: 1,
        arrivalRate: 3000,
        technique: 'in-memory-counter'
      });
      sim.onReadout((r) => {
        readoutAdmitted.textContent = num(r.admitted);
        const over = r.admitted > r.limit * 1.1;
        readoutAdmitted.className = 'big ' + (over ? 'over' : 'ok');
        readoutState.textContent = r.running ? 'running' : 'paused';
      });

      playBtn.addEventListener('click', () => {
        if (sim!.isRunning()) {
          sim!.pause();
          playBtn.textContent = '▶ Play';
        } else {
          sim!.play();
          playBtn.textContent = '⏸ Pause';
        }
      });
      resetBtn.addEventListener('click', () => sim!.reset());
      nodes.addEventListener('input', () => {
        sim!.params.nodes = Number(nodes.value);
        nodesOut.textContent = nodes.value;
      });
      rate.addEventListener('input', () => {
        sim!.params.arrivalRate = Number(rate.value);
        rateOut.textContent = num(Number(rate.value));
      });
      techSelect.addEventListener('change', () => {
        sim!.params.technique = techSelect.value as Technique;
      });
      // Start running so the section feels alive at once.
      sim.play();
      playBtn.textContent = '⏸ Pause';
    });

    return () => sim?.dispose();
  }
};
