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

// palette and text size
await page.click('#rp-palettes [data-palette="colorblind"]');
await page.waitForTimeout(400);
await page.click('#rp-sizes [data-size="l"]');
await page.waitForTimeout(400);
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
