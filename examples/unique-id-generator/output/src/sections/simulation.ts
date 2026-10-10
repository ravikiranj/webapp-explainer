import type { Section } from '../section.ts';
import { SCHEME_LABEL, type Scheme } from '../domain.ts';
import { h, num } from '../dom.ts';
import { createIdSim } from '../sim.ts';

const SCHEMES: Scheme[] = ['in-memory-counter', 'random-uuid', 'snowflake'];

export const simulation: Section = {
  id: 'simulation',
  group: 'Start here',
  title: 'Live simulation',
  icon: 'bi-sliders',
  badge: 'interactive',
  caption:
    'Run the generator live. Each dot is an issued ID. Change the scheme and ' +
    'watch collisions and time order change.',
  render(el) {
    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'The left side shows a few nodes. Each round, every node issues one ID chip. ' +
            'The right side plots each ID: time on the x axis, value on the y axis. ' +
            'With the in-memory counter, every node issues the same value, so the chips match and turn red: a collision. ' +
            'With a random UUID, chips never match, but the dots scatter, so there is no time order. ' +
            'With Snowflake, chips never match and the dots climb with time, so the order is kept.'
        ])
      ])
    );

    const issuedOut = h('span', { class: 'big' }, ['0']);
    const collOut = h('span', { class: 'big ok' }, ['0']);
    const orderOut = h('span', {}, ['—']);
    const stateOut = h('span', {}, ['paused']);
    el.append(
      h('div', { class: 'sim-readout' }, [
        h('span', {}, ['Issued: ', issuedOut]),
        h('span', {}, ['Collisions: ', collOut]),
        h('span', {}, ['Time order: ', orderOut]),
        h('span', {}, ['State: ', stateOut])
      ])
    );

    const playBtn = h('button', { class: 'sim-btn' }, ['▶ Play']) as HTMLButtonElement;
    const resetBtn = h('button', { class: 'sim-btn secondary' }, ['Reset']) as HTMLButtonElement;

    const nodesOut = h('output', {}, ['10']);
    const nodes = h('input', { type: 'range', min: '1', max: '100', value: '10', step: '1' }) as HTMLInputElement;
    const rateOut = h('output', {}, ['40']);
    const rate = h('input', { type: 'range', min: '10', max: '200', value: '40', step: '10' }) as HTMLInputElement;
    const schemeSelect = h('select', {}, SCHEMES.map((s) => h('option', { value: s }, [SCHEME_LABEL[s]]))) as HTMLSelectElement;

    const controls = h('div', { class: 'sim-controls' }, [
      h('div', { class: 'ctrl' }, [playBtn]),
      h('div', { class: 'ctrl' }, [resetBtn]),
      h('div', { class: 'ctrl' }, [h('label', {}, ['Nodes: ', nodesOut]), nodes]),
      h('div', { class: 'ctrl' }, [h('label', {}, ['Rate (IDs/s): ', rateOut]), rate]),
      h('div', { class: 'ctrl' }, [h('label', {}, ['Scheme']), schemeSelect])
    ]);
    el.append(controls);

    const host = h('div', {});
    el.append(h('div', { class: 'viz' }, [h('h2', {}, ['IDs issued over time']), host]));

    let sim: ReturnType<typeof createIdSim> | undefined;
    requestAnimationFrame(() => {
      sim = createIdSim(host, { nodes: 10, rate: 40, scheme: 'in-memory-counter' });
      sim.onReadout((r) => {
        issuedOut.textContent = num(r.issued);
        collOut.textContent = num(r.collisions);
        collOut.className = 'big ' + (r.collisions > 0 ? 'over' : 'ok');
        orderOut.textContent = r.ordered ? 'kept' : 'lost';
        stateOut.textContent = r.running ? 'running' : 'paused';
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
        sim!.params.rate = Number(rate.value);
        rateOut.textContent = num(Number(rate.value));
        // Apply the new speed at once if the simulation is running.
        if (sim!.isRunning()) {
          sim!.pause();
          sim!.play();
        }
      });
      schemeSelect.addEventListener('change', () => {
        sim!.params.scheme = schemeSelect.value as Scheme;
        sim!.reset();
      });
      sim.play();
      playBtn.textContent = '⏸ Pause';
    });

    return () => sim?.dispose();
  }
};
