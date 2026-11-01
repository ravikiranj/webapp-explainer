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
import { chapterStarts, loadVideoInfo, videoSection } from '../../../../shared/video-player.ts';

import { problem } from './sections/problem.ts';
import { overview } from './sections/overview.ts';
import { simulation } from './sections/simulation.ts';
import { stageSections } from './sections/stages.ts';
import { techniques } from './sections/techniques.ts';

// The video files come from video/render.mjs (see video-design.md).
const videoInfo = loadVideoInfo('./video/');

mountShell({
  brand: 'Unique ID Generator',
  subtitle: 'one node to many regions',
  brandIcon: 'bi-123',
  sections: [problem, videoSection(videoInfo), overview, simulation, ...stageSections, techniques],
  video: { sectionId: 'video', chapterStarts: chapterStarts(videoInfo) },
  proposedIds: ['stage-100']
});
