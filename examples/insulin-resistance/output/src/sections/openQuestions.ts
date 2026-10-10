import type { Section } from '../section.ts';
import { h } from '../dom.ts';

export const openQuestions: Section = {
  id: 'open-questions',
  group: 'Open questions',
  title: 'Open questions',
  icon: 'bi-question-circle',
  badge: 'proposed',
  caption:
    'Some causes are not settled. The items below are open questions, not ' +
    'firm conclusions. They are marked proposed.',
  render(el) {
    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'The cutoffs and the risk patterns in this app come from named studies. ',
          'The causes behind the pattern are still under study. The points below are open questions.'
        ])
      ])
    );

    const items: [string, string][] = [
      ['Genes or lifestyle', 'How much of the higher risk comes from genes, and how much from diet, activity, and early-life factors? The split is not settled.'],
      ['One cutoff for all South Asians', 'South Asia is not one group. A single BMI or waist cutoff may not fit every sub-group equally. More local data is needed.'],
      ['Thin-fat cause', 'Why do South Asians carry more fat around the organs and less muscle at a given weight? The mechanism is not fully known.'],
      ['Best screening measure', 'BMI, waist size, waist-to-height ratio, or a direct body-fat measure: which best predicts risk for this group is still debated.']
    ];

    const grid = h('div', { class: 'cards' }, []);
    for (const [title, body] of items) {
      grid.append(
        h('div', { class: 'card' }, [
          h('div', { class: 'section-head' }, [
            h('div', { class: 'k' }, [title]),
            h('span', { class: 'tag proposed' }, ['proposed'])
          ]),
          h('p', { class: 'sub' }, [body])
        ])
      );
    }
    el.append(grid);

    el.append(
      h('div', { class: 'note' }, [
        'The main data in this app is from WHO 2004, IDF 2006, Ntuk et al. 2014, and Caleyachetty et al. 2021. ' +
          'See the Sources list in the data sections. The open questions above are not firm conclusions.'
      ])
    );
  }
};
