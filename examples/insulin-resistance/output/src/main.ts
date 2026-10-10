import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Import the Bootstrap JavaScript one time. Without this import, the
// interactive Bootstrap parts do not work.
import 'bootstrap';
import '../../../../shared/app.css';
import { mountShell } from '../../../../shared/shell.ts';

import { problem } from './sections/problem.ts';
import { normalMechanism } from './sections/normalMechanism.ts';
import { resistanceDevelops } from './sections/resistanceDevelops.ts';
import { cutoffs } from './sections/cutoffs.ts';
import { diseaseRisk } from './sections/diseaseRisk.ts';
import { openQuestions } from './sections/openQuestions.ts';

mountShell({
  brand: 'Insulin Resistance',
  subtitle: 'and higher South Asian risk',
  brandIcon: 'bi-heart-pulse',
  sections: [problem, normalMechanism, resistanceDevelops, cutoffs, diseaseRisk, openQuestions]
});
