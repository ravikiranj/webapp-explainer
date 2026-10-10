// Real, cited data for the insulin resistance explainer.
//
// This file holds no mock numbers. Every number carries a named source. The
// SOURCES map lists the full reference for each source id. The data arrays
// attach a source id to each value, so the page can show the source next to
// the number.
//
// The problem (see examples/insulin-resistance/problem.md): explain the
// normal insulin mechanism, how resistance develops, why standard risk
// cutoffs understate risk for South Asians, the downstream disease risk, and
// the open questions.

/** A named source. */
export interface Source {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly url: string;
}

export const SOURCES: Record<string, Source> = {
  who2004: {
    id: 'who2004',
    label: 'WHO expert consultation, 2004',
    detail:
      'WHO expert consultation. Appropriate body-mass index for Asian ' +
      'populations and its implications for policy and intervention ' +
      'strategies. The Lancet, 2004; 363:157-163.',
    url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(03)15268-3/fulltext'
  },
  idf2006: {
    id: 'idf2006',
    label: 'IDF, 2006',
    detail:
      'International Diabetes Federation. The IDF consensus worldwide ' +
      'definition of the metabolic syndrome, 2006. Ethnic-specific waist ' +
      'circumference thresholds.',
    url: 'https://www.idf.org/e-library/consensus-statements/60-idfconsensus-worldwide-definitionof-the-metabolic-syndrome.html'
  },
  ntuk2014: {
    id: 'ntuk2014',
    label: 'Ntuk et al., Diabetes Care, 2014',
    detail:
      'Ntuk UE, et al. Ethnic-Specific Obesity Cutoffs for Diabetes Risk: ' +
      'Cross-sectional Study of 490,288 UK Biobank Participants. Diabetes ' +
      'Care, 2014; 37(9):2500-2507.',
    url: 'https://diabetesjournals.org/care/article/37/9/2500/29021'
  },
  caleyachetty2021: {
    id: 'caleyachetty2021',
    label: 'Caleyachetty et al., Lancet Diab. Endo., 2021',
    detail:
      'Caleyachetty R, et al. Ethnicity-specific BMI cutoffs for obesity ' +
      'based on type 2 diabetes risk in England: a population-based cohort ' +
      'study. Lancet Diabetes & Endocrinology, 2021; 9(7):419-426.',
    url: 'https://www.thelancet.com/journals/landia/article/PIIS2213-8587(21)00088-7/fulltext'
  }
};

/** A number with a source id attached. */
export interface Cited {
  readonly value: number;
  readonly sourceId: string;
  readonly note?: string;
}

/**
 * BMI cutoffs for obesity, white European compared to South Asian, from two
 * independent cohort studies. The white cutoff is the standard 30 kg/m2.
 */
export interface BmiEquivalence {
  readonly label: string;
  readonly whiteBmi: number;
  readonly southAsianBmi: Cited;
}

export const BMI_EQUIVALENCE: readonly BmiEquivalence[] = [
  {
    label: 'Diabetes prevalence equal to white BMI 30 (UK Biobank)',
    whiteBmi: 30,
    southAsianBmi: { value: 22.0, sourceId: 'ntuk2014' }
  },
  {
    label: 'Diabetes incidence equal to white BMI 30 (England cohort)',
    whiteBmi: 30,
    southAsianBmi: { value: 23.9, sourceId: 'caleyachetty2021' }
  },
  {
    label: 'Overweight cutoff equal to white BMI 25 (England cohort)',
    whiteBmi: 25,
    southAsianBmi: { value: 19.2, sourceId: 'caleyachetty2021' }
  }
];

/** WHO action points for Asian populations, on the BMI continuum. */
export const WHO_ASIAN_ACTION_POINTS: readonly Cited[] = [
  { value: 23.0, sourceId: 'who2004', note: 'increased risk' },
  { value: 27.5, sourceId: 'who2004', note: 'high risk; NICE obesity cutoff for South Asians' }
];

/** Standard WHO BMI classes for the general population, for reference. */
export const STANDARD_BMI_CLASSES = [
  { label: 'Healthy', from: 18.5, to: 25 },
  { label: 'Overweight', from: 25, to: 30 },
  { label: 'Obese', from: 30, to: 40 }
] as const;

/** IDF waist circumference thresholds for central obesity, in centimetres. */
export interface WaistThreshold {
  readonly group: string;
  readonly men: Cited;
  readonly women: Cited;
}

export const WAIST_THRESHOLDS: readonly WaistThreshold[] = [
  {
    group: 'Europid',
    men: { value: 94, sourceId: 'idf2006' },
    women: { value: 80, sourceId: 'idf2006' }
  },
  {
    group: 'South Asian',
    men: { value: 90, sourceId: 'idf2006' },
    women: { value: 80, sourceId: 'idf2006' }
  }
];

/**
 * Equivalent-risk BMI for several groups, at the diabetes risk of white BMI
 * 30, from the England cohort. This shows the pattern is not unique to South
 * Asians, but is strongest for them.
 */
export const GROUP_EQUIVALENT_BMI: readonly { group: string; bmi: Cited }[] = [
  { group: 'White', bmi: { value: 30.0, sourceId: 'caleyachetty2021' } },
  { group: 'Arab', bmi: { value: 26.6, sourceId: 'caleyachetty2021' } },
  { group: 'Chinese', bmi: { value: 26.9, sourceId: 'caleyachetty2021' } },
  { group: 'Black', bmi: { value: 28.1, sourceId: 'caleyachetty2021' } },
  { group: 'South Asian', bmi: { value: 23.9, sourceId: 'caleyachetty2021' } }
];

/**
 * The relative likelihood of diabetes in non-white groups, as reported by the
 * UK Biobank study. The study reports a two to four times higher likelihood.
 */
export const DIABETES_LIKELIHOOD = {
  low: { value: 2, sourceId: 'ntuk2014' },
  high: { value: 4, sourceId: 'ntuk2014' }
} as const;

/** Look up the full source for a cited value. */
export function sourceOf(cited: Cited): Source {
  return SOURCES[cited.sourceId];
}
