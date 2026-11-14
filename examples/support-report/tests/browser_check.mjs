// Headless browser check of the report. Usage:
//   PLAYWRIGHT=<path to playwright> CHROME=<chrome binary> node tests/browser_check.mjs http://127.0.0.1:8200/
// Start a static server for output/dist first, for example: python3 -m http.server 8200 --bind 127.0.0.1 --directory output/dist
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const url = process.argv[2] || 'http://127.0.0.1:8200/';
let failed = false;
const fail = (msg) => { console.log('FAIL', msg); failed = true; };

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
const errors = [], external = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => { if (!r.url().startsWith(new URL(url).origin)) external.push(r.url()); });
await page.goto(url);
await page.waitForSelector('#side-nav button');

// every slide draws a chart or a table
for (const id of ['volume', 'issues', 'causes', 'resolve']) {
  await page.evaluate((i) => { location.hash = '#' + i; }, id);
  await page.waitForTimeout(500);
  const ok = await page.evaluate(() => !!document.querySelector('.rp-chart canvas, .rp-table'));
  console.log(ok ? 'ok  ' : 'FAIL', id);
  if (!ok) failed = true;
  // a slide opens with a selected item and a filled list, without a click
  const open = await page.evaluate(() => ({ open: document.querySelector('.rp-drawer').open, rows: document.querySelectorAll('.rp-list tbody tr').length }));
  console.log(open.rows && open.open ? 'ok  ' : 'FAIL', id, 'default list', open.rows);
  if (!open.rows || !open.open) fail(id + ' opens with an empty list');
}

// a click lists the tickets and does not scroll the page
await page.evaluate(() => { location.hash = '#issues'; });
await page.waitForTimeout(500);
const before = await page.evaluate(() => [window.scrollY, document.scrollingElement.scrollTop]);
await page.click('.rp-table tbody tr:first-child');
await page.waitForTimeout(300);
const after = await page.evaluate(() => [window.scrollY, document.scrollingElement.scrollTop]);
const rows = await page.evaluate(() => document.querySelectorAll('.rp-list tbody tr').length);
console.log('click', before, after, 'rows', rows);
if (before[0] !== after[0] || !rows) fail('click lists rows without scrolling');

// the columns sort, and the column chooser changes and moves columns
await page.evaluate(() => { location.hash = '#volume'; });
await page.waitForTimeout(500);
const col = (i) => page.evaluate((n) => [...document.querySelectorAll('.rp-list tbody tr')].map((r) => r.children[n].textContent), i);
const heads = () => page.evaluate(() => [...document.querySelectorAll('.rp-list th')].map((t) => t.textContent.replace(/[\u25B2\u25BC]/g, '').trim()));
await page.click('.rp-list th[data-key="title"]');
const asc = await col(1);
await page.click('.rp-list th[data-key="title"]');
const desc = await col(1);
const sorted = asc.every((v, i) => !i || asc[i - 1].localeCompare(v, undefined, { numeric: true }) <= 0);
console.log('sort', asc[0], '|', desc[0]);
if (!sorted || asc[0] === desc[0]) fail('column sort');
await page.click('.rp-colbtn');
await page.waitForSelector('#app-settings[open]');
if (!(await page.isVisible('#rp-colpane'))) fail('the Columns button opens the column pane');
await page.check('#rp-colpane input[data-col="region"]');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.getElementById('app-settings').open);
const h1 = await heads();
// drag the Region header onto the Ticket header: Region becomes the first column
await page.dragAndDrop('.rp-list th[data-key="region"]', '.rp-list th[data-key="id"]');
const h2 = await heads();
console.log('columns', h1.join(','), '->', h2.join(','));
if (!h1.includes('Region') || h2[0] !== 'Region') fail('drag a column');
await page.focus('.rp-list th[data-key="region"]');
await page.keyboard.press('Alt+ArrowRight');
const h3 = await heads();
if (h3[1] !== 'Region') fail('move a column with Alt + arrow');
await page.click('#app-settings-button');
await page.waitForSelector('#app-settings[open]');
await page.click('.set-nav [data-pane="columns"]');
await page.uncheck('#rp-colpane input[data-col="region"]');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.getElementById('app-settings').open);
if ((await heads()).includes('Region')) fail('hide a column in the settings');

// a drag of the right edge of a header resizes that column, and does not sort or move it
const wOf = (k) => page.evaluate((x) => document.querySelector(`.rp-list th[data-key="${x}"]`).getBoundingClientRect().width, k);
const sortBefore = await page.evaluate(() => location.hash.match(/sort=[^&]+/)?.[0]);
const wt0 = await wOf('title'), wi0 = await wOf('id');
const gb = await (await page.$('.rp-list th[data-key="title"] .rp-grip')).boundingBox();
await page.mouse.move(gb.x + 3, gb.y + gb.height / 2);
await page.mouse.down();
await page.mouse.move(gb.x + 103, gb.y + gb.height / 2, { steps: 5 });
await page.mouse.up();
const wt1 = await wOf('title'), wi1 = await wOf('id');
const sortAfter = await page.evaluate(() => location.hash.match(/sort=[^&]+/)?.[0]);
console.log('column resize title', Math.round(wt0), '->', Math.round(wt1), 'ticket', Math.round(wi0), '->', Math.round(wi1));
if (!(wt1 > wt0 + 60) || Math.abs(wi1 - wi0) > 2 || sortBefore !== sortAfter) fail('column resize');
if (!(await page.evaluate(() => location.hash.includes('widths=')))) fail('column widths in the link');

// the left panel resizes with a drag and with the keyboard
const sbw = () => page.evaluate(() => document.getElementById('side-nav').getBoundingClientRect().width);
const w0 = await sbw();
const hb = await (await page.$('.sb-resizer')).boundingBox();
await page.mouse.move(hb.x + 3, hb.y + 200);
await page.mouse.down();
await page.mouse.move(hb.x + 123, hb.y + 200, { steps: 5 });
await page.mouse.up();
const w1 = await sbw();
await page.focus('.sb-resizer');
await page.keyboard.press('ArrowLeft');
const w2 = await sbw();
console.log('sidebar width', w0, w1, w2);
if (!(w1 > w0 + 80) || !(w2 < w1)) fail('sidebar resize');

// filters change the count and the link
await page.evaluate(() => { location.hash = '#volume'; });
await page.waitForTimeout(500);
const total = () => page.evaluate(() => Number(document.querySelector('.rp-card .v').textContent));
const all = await total();
await page.click('.rp-controls button:nth-of-type(3)');
await page.waitForTimeout(300);
const narrowed = await total();
const hash = await page.evaluate(() => location.hash);
console.log('severity filter', all, '->', narrowed, hash);
if (!(narrowed < all) || !hash.includes('sev=')) fail('severity filter');

// week view: one point for each week, and the tooltip shows the rate
await page.click('.rp-seg[aria-label="Period"] button:nth-of-type(2)');
await page.waitForTimeout(500);
const box = await (await page.$('.rp-chart')).boundingBox();
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.waitForTimeout(500);
const tip = await page.evaluate(() => (document.querySelector('.rp-chart > div:last-child')?.innerText ?? ''));
console.log('week tooltip', tip.replace(/\n/g, ' / ').slice(0, 120));
if (!/per day/.test(tip) || !/of incoming/.test(tip)) fail('week tooltip rate');

// palette and text size, in the settings modal that the top right button opens
await page.click('#app-settings-button');
await page.waitForSelector('#app-settings[open]');
await page.click('.set-nav [data-pane="colors"]');
await page.click('#rp-palettes [data-palette="colorblind"]');
await page.waitForTimeout(400);
await page.click('.set-nav [data-pane="appearance"]');
for (let i = 0; i < 3; i++) await page.click('#app-settings [data-step="1"]'); // 15 px to 18 px
await page.waitForTimeout(400);
// the dialog drags by its header and resizes by its corner
const d0 = await page.evaluate(() => { const r = document.getElementById('app-settings').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
const hd = await (await page.$('#app-settings .set-head')).boundingBox();
await page.mouse.move(hd.x + 150, hd.y + 10);
await page.mouse.down();
await page.mouse.move(hd.x + 350, hd.y + 110, { steps: 5 });
await page.mouse.up();
const d1 = await page.evaluate(() => { const r = document.getElementById('app-settings').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
console.log('settings drag', d0.map(Math.round), d1.map(Math.round));
if (!(d1[0] > d0[0] + 100) || !(d1[1] > d0[1] + 60)) fail('settings drag');
await page.mouse.move(d1[0] + d1[2] - 6, d1[1] + d1[3] - 6);
await page.mouse.down();
await page.mouse.move(d1[0] + d1[2] + 80, d1[1] + d1[3] + 60, { steps: 5 });
await page.mouse.up();
const d2 = await page.evaluate(() => { const r = document.getElementById('app-settings').getBoundingClientRect(); return [r.width, r.height]; });
console.log('settings resize', d1.slice(2).map(Math.round), d2.map(Math.round));
if (!(d2[0] > d1[2] + 40)) fail('settings resize');
await page.screenshot({ path: process.env.SHOT || '/tmp/rp-settings.png' });
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.getElementById('app-settings').open);
const look = await page.evaluate(() => ({ accent: document.documentElement.style.getPropertyValue('--accent'), font: getComputedStyle(document.body).fontSize, hash: location.hash }));
console.log('look', look);
if (look.accent !== '#0072B2' || look.font !== '18px' || !look.hash.includes('palette=colorblind')) fail('palette and size');

// the content uses the width of a wide window
const width = await page.evaluate(() => document.getElementById('content').getBoundingClientRect().width);
if (width < 1500) fail('content width ' + width);
if (external.length) fail('external requests ' + external);
if (errors.length) fail('errors ' + errors.join(' | '));
await browser.close();
process.exit(failed ? 1 : 0);
