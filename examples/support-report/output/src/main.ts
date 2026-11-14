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
import './report.css';
import { mountShell } from '../../../../shared/shell.ts';
import { loadData } from './data.ts';
import { applyLook, reportPanes, textSize } from './controls.ts';
import { brief } from './sections/brief.ts';
import { volume } from './sections/volume.ts';
import { issues } from './sections/issues.ts';
import { causes } from './sections/causes.ts';
import { resolve } from './sections/resolve.ts';

async function main(): Promise<void> {
  await loadData();
  applyLook();
  mountShell({
    brand: 'Support Queue Report',
    subtitle: 'support tickets, last 12 months',
    brandIcon: 'bi-bar-chart-line',
    sections: [brief, volume, issues, causes, resolve],
    settings: { panes: reportPanes, textSize }
  });
}

void main();
