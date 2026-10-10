import type { Section } from '../section.ts';
import { DIABETES_LIKELIHOOD, GROUP_EQUIVALENT_BMI } from '../domain.ts';
import { card, h } from '../dom.ts';
import { cite, references } from '../sources.ts';
import { drawGroupBmi } from '../viz/charts.ts';

export const diseaseRisk: Section = {
  id: 'disease-risk',
  group: 'Risk cutoffs',
  title: 'Downstream risk',
  icon: 'bi-heart-pulse',
  badge: 'real data',
  caption:
    'Insulin resistance raises the risk of type 2 diabetes, high blood ' +
    'pressure, and heart disease. The risk comes at a lower body size for South Asians.',
  render(el) {
    el.append(
      h('div', { class: 'cards' }, [
        card('Diabetes likelihood', `${DIABETES_LIKELIHOOD.low.value}–${DIABETES_LIKELIHOOD.high.value}×`, 'bad', 'higher in non-white groups'),
        card('South Asian equal-risk BMI', '23.9', 'bad', 'at white obesity risk'),
        card('Diseases driven', '3', 'warn', 'diabetes, hypertension, heart disease')
      ])
    );

    el.append(
      h('div', { class: 'prose' }, [
        h('p', {}, [
          'The UK Biobank study of 490,288 people found the likelihood of diabetes was two to four times higher ',
          'in non-white groups at the same body size. ',
          cite(DIABETES_LIKELIHOOD.low.sourceId)
        ]),
        h('p', {}, [
          'South Asians often carry more fat around the organs and less muscle at a given weight. ',
          'This pattern is sometimes called the thin-fat body type. It raises the risk of diabetes, ',
          'high blood pressure, and heart disease, often at a younger age and a lower weight.'
        ])
      ])
    );

    const panel = h('div', { class: 'viz' }, [h('h2', {}, ['BMI with the same diabetes risk as white BMI 30, by group'])]);
    const host = h('div', { class: 'chart' });
    panel.append(host);
    panel.append(h('div', { class: 'note' }, ['Source: ', cite(GROUP_EQUIVALENT_BMI[0].bmi.sourceId)]));
    el.append(panel);

    el.append(references([GROUP_EQUIVALENT_BMI[0].bmi.sourceId, DIABETES_LIKELIHOOD.low.sourceId]));

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawGroupBmi(
        host,
        GROUP_EQUIVALENT_BMI.map((g) => g.group),
        GROUP_EQUIVALENT_BMI.map((g) => g.bmi.value)
      );
    });
    return () => dispose?.();
  }
};
