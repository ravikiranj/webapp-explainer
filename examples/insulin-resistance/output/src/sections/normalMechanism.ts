import type { Section } from '../section.ts';
import { h } from '../dom.ts';
import { drawMechanism } from '../viz/mechanism.ts';
import { mountStepper } from '../../../../../shared/stepper.ts';
import { normalFlow } from '../flows.ts';

export const normalMechanism: Section = {
  id: 'normal-mechanism',
  group: 'Mechanism',
  title: 'Normal insulin',
  icon: 'bi-key',
  badge: 'how it works',
  caption:
    'Insulin acts like a key. It lets cells take in glucose from the blood. ' +
    'Blood glucose then stays in a safe range.',
  render(el) {
    const flowHost = h('div', { class: 'mb-3' });
    el.append(flowHost);
    mountStepper(flowHost, normalFlow);

    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'After a meal, blood glucose rises. The pancreas releases insulin. ' +
            'Insulin binds to muscle and fat cells. The cells open a gate and take in glucose.'
        ]),
        h('p', {}, [
          'The glucose leaves the blood and enters the cells. Blood glucose returns to a safe range. ' +
            'A small amount of insulin is enough to do this.'
        ])
      ])
    );

    const panel = h('div', { class: 'viz' }, [h('h2', {}, ['Normal: the gate opens and glucose enters the cell'])]);
    const host = h('div', { class: 'chart short' });
    panel.append(host);
    el.append(panel);

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawMechanism(host, { state: 'normal' });
    });
    return () => dispose?.();
  }
};
