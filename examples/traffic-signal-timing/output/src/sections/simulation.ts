import type { Section } from '../section.ts';
import { WAIT_LIMIT_SECONDS } from '../domain.ts';
import { h, num } from '../dom.ts';
import { createTrafficSim } from '../sim.ts';

export const simulation: Section = {
  id: 'simulation',
  group: 'Start here',
  title: 'Live simulation',
  icon: '🎛️',
  badge: 'interactive',
  caption:
    'Run the road live. Cars flow through the lights. Turn coordination on ' +
    'and off and watch the mean wait change.',
  render(el) {
    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'Each dot is a signal: green lets cars pass, red holds them. A car turns ' +
            'amber when it waits at a red. Turn coordination off and the phases clash, ' +
            'so cars stop again and again and the mean wait climbs. Turn it on for a green ' +
            `wave and most cars roll straight through, under the ${WAIT_LIMIT_SECONDS} s rule.`
        ])
      ])
    );

    const waitOut = h('span', { class: 'big ok' }, ['0 s']);
    const stateOut = h('span', {}, ['paused']);
    el.append(
      h('div', { class: 'sim-readout' }, [
        h('span', {}, ['Mean wait: ', waitOut]),
        h('span', {}, ['Rule: ', h('span', { class: 'big' }, [WAIT_LIMIT_SECONDS + ' s'])]),
        h('span', {}, ['State: ', stateOut])
      ])
    );

    const playBtn = h('button', { class: 'sim-btn' }, ['▶ Play']) as HTMLButtonElement;
    const resetBtn = h('button', { class: 'sim-btn secondary' }, ['Reset']) as HTMLButtonElement;
    const coordBtn = h('button', { class: 'sim-btn secondary' }, ['Coordination: off']) as HTMLButtonElement;

    const interOut = h('output', {}, ['6']);
    const inter = h('input', { type: 'range', min: '2', max: '8', value: '6', step: '1' }) as HTMLInputElement;
    const rateOut = h('output', {}, ['90']);
    const rate = h('input', { type: 'range', min: '20', max: '180', value: '90', step: '10' }) as HTMLInputElement;

    const controls = h('div', { class: 'sim-controls' }, [
      h('div', { class: 'ctrl' }, [playBtn]),
      h('div', { class: 'ctrl' }, [resetBtn]),
      h('div', { class: 'ctrl' }, [coordBtn]),
      h('div', { class: 'ctrl' }, [h('label', {}, ['Intersections: ', interOut]), inter]),
      h('div', { class: 'ctrl' }, [h('label', {}, ['Cars per minute: ', rateOut]), rate])
    ]);
    el.append(controls);

    const host = h('div', {});
    el.append(h('div', { class: 'viz' }, [h('h2', {}, ['Cars flowing through the lights']), host]));

    let sim: ReturnType<typeof createTrafficSim> | undefined;
    requestAnimationFrame(() => {
      sim = createTrafficSim(host, { intersections: 6, carsPerMin: 90, coordinated: false });
      sim.onReadout((r) => {
        waitOut.textContent = r.meanWait.toFixed(1) + ' s';
        waitOut.className = 'big ' + (r.meanWait > WAIT_LIMIT_SECONDS ? 'over' : 'ok');
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
      coordBtn.addEventListener('click', () => {
        sim!.params.coordinated = !sim!.params.coordinated;
        coordBtn.textContent = 'Coordination: ' + (sim!.params.coordinated ? 'on' : 'off');
      });
      inter.addEventListener('input', () => {
        sim!.params.intersections = Number(inter.value);
        interOut.textContent = inter.value;
      });
      rate.addEventListener('input', () => {
        sim!.params.carsPerMin = Number(rate.value);
        rateOut.textContent = num(Number(rate.value));
      });
      sim.play();
      playBtn.textContent = '⏸ Pause';
    });

    return () => sim?.dispose();
  }
};
