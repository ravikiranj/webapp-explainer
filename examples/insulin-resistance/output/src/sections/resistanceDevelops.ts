import type { Section } from '../section.ts';
import { breakFix, h } from '../dom.ts';
import { drawMechanism } from '../viz/mechanism.ts';
import { mountStepper } from '../../../../../shared/stepper.ts';
import { resistanceFlow } from '../flows.ts';

export const resistanceDevelops: Section = {
  id: 'resistance-develops',
  group: 'Mechanism',
  title: 'Resistance develops',
  icon: 'bi-door-closed',
  badge: 'how it works',
  caption:
    'In insulin resistance, cells respond less to insulin. The gate stays ' +
    'mostly shut. The body makes more insulin to force it open.',
  render(el) {
    const flowHost = h('div', { class: 'mb-3' });
    el.append(flowHost);
    mountStepper(flowHost, resistanceFlow);

    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'Fat around the organs and inside muscle makes cells respond less to insulin. ' +
            'The same amount of insulin now opens the gate only a little.'
        ]),
        h('p', {}, [
          'The pancreas senses the high blood glucose and makes more insulin. ' +
            'For a time, the extra insulin keeps blood glucose near normal. This hides the problem.'
        ]),
        h('p', {}, [
          'Over time, the pancreas cannot keep up. Blood glucose rises and stays high. ' +
            'This is the path to type 2 diabetes.'
        ])
      ])
    );

    el.append(
      breakFix(
        [
          'Cells respond less to insulin.',
          'Glucose stays in the blood.',
          'The pancreas works harder and makes more insulin.'
        ],
        [
          'Lower fat around the organs helps cells respond again.',
          'Less insulin is then needed for the same effect.',
          'Early action can slow or delay the rise in blood glucose.'
        ]
      )
    );

    const panel = h('div', { class: 'viz' }, [h('h2', {}, ['Resistant: the gate stays mostly shut and glucose stays in the blood'])]);
    const host = h('div', { class: 'chart short' });
    panel.append(host);
    el.append(panel);

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawMechanism(host, { state: 'resistant' });
    });
    return () => dispose?.();
  }
};
