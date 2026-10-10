import type { Section } from '../section.ts';
import {
  BMI_EQUIVALENCE,
  WAIST_THRESHOLDS,
  WHO_ASIAN_ACTION_POINTS
} from '../domain.ts';
import { card, h } from '../dom.ts';
import { cite, references } from '../sources.ts';
import { drawBmiEquivalence, drawWaist } from '../viz/charts.ts';

export const cutoffs: Section = {
  id: 'cutoffs',
  group: 'Risk cutoffs',
  title: 'Standard vs South Asian',
  icon: 'bi-rulers',
  badge: 'real data',
  caption:
    'Standard cutoffs came from mostly European study groups. South Asians ' +
    'reach the same risk at a lower body mass index and a lower waist size.',
  render(el) {
    // Key numbers as cards, each with an inline source.
    const biobank = BMI_EQUIVALENCE[0];
    const england = BMI_EQUIVALENCE[1];
    const cardRow = h('div', { class: 'cards' }, [
      card('Standard obesity BMI', '30', '', 'white European cutoff'),
      card('South Asian equal risk (UK Biobank)', String(biobank.southAsianBmi.value), 'bad', 'same diabetes prevalence'),
      card('South Asian equal risk (England)', String(england.southAsianBmi.value), 'bad', 'same diabetes incidence'),
      card('WHO Asian high-risk point', '27.5', 'warn', 'obesity cutoff for South Asians')
    ]);
    el.append(cardRow);

    // Inline source tags under the cards.
    el.append(
      h('div', { class: 'note' }, [
        'BMI equivalence sources: ',
        cite(biobank.southAsianBmi.sourceId),
        ' ',
        cite(england.southAsianBmi.sourceId),
        '  WHO action points: ',
        cite(WHO_ASIAN_ACTION_POINTS[0].sourceId)
      ])
    );

    const bmiPanel = h('div', { class: 'viz' }, [h('h2', {}, ['BMI at equal diabetes risk: white cutoff against South Asian equivalent'])]);
    const bmiHost = h('div', { class: 'chart' });
    bmiPanel.append(bmiHost);
    el.append(bmiPanel);

    const waistPanel = h('div', { class: 'viz' }, [h('h2', {}, ['IDF waist thresholds for central obesity (cm)'])]);
    const waistHost = h('div', { class: 'chart short' });
    waistPanel.append(waistHost);
    waistPanel.append(h('div', { class: 'note' }, ['Source: ', cite(WAIST_THRESHOLDS[0].men.sourceId)]));
    el.append(waistPanel);

    el.append(
      references([
        BMI_EQUIVALENCE[0].southAsianBmi.sourceId,
        BMI_EQUIVALENCE[1].southAsianBmi.sourceId,
        WHO_ASIAN_ACTION_POINTS[0].sourceId,
        WAIST_THRESHOLDS[0].men.sourceId
      ])
    );

    let d1: (() => void) | undefined;
    let d2: (() => void) | undefined;
    requestAnimationFrame(() => {
      d1 = drawBmiEquivalence(
        bmiHost,
        BMI_EQUIVALENCE.map((e) => e.label),
        BMI_EQUIVALENCE.map((e) => e.whiteBmi),
        BMI_EQUIVALENCE.map((e) => e.southAsianBmi.value)
      );
      d2 = drawWaist(
        waistHost,
        WAIST_THRESHOLDS.map((w) => w.group),
        WAIST_THRESHOLDS.map((w) => w.men.value),
        WAIST_THRESHOLDS.map((w) => w.women.value)
      );
    });
    return () => {
      d1?.();
      d2?.();
    };
  }
};
