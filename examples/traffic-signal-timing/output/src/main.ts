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
import { overview } from './sections/overview.ts';
import { simulation } from './sections/simulation.ts';
import { stageSections } from './sections/stages.ts';
import { techniques } from './sections/techniques.ts';

mountShell({
  brand: 'Traffic Signal Timing',
  subtitle: 'one light to a whole city',
  brandIcon: 'bi-signpost-split',
  sections: [problem, overview, simulation, ...stageSections, techniques],
  proposedIds: ['stage-500']
});
