// Moves the rendered videos between this repository and a GitHub release.
// The videos are not in git. The deploy workflow downloads them from the release
// named in release.json, so it does not need to render them.
//
//   node video/release.mjs pack <tag>   pack each app's rendered video into release/<app>-video.tar.gz
//                                       and write release.json (archive hashes and source hashes)
//   node video/release.mjs check        fail if a storyboard, scene or lexicon changed after the pack
//   node video/release.mjs fetch        download the archives of release.json, check them, unpack them
//
// See "Videos" in ../README.md for the full steps.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const MANIFEST = join(HERE, 'release.json');
const OUT = join(REPO, 'release');
// The files a video is made from. A change to any of them needs a new render.
const SOURCES = ['storyboard.md', 'scenes.js', 'scenes.py', 'lexicon.json'];

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed`);
  }
};

/** The apps that have a storyboard. */
const apps = () =>
  readdirSync(join(REPO, 'examples')).filter((app) => existsSync(join(REPO, 'examples', app, 'video', 'storyboard.md'))).sort();

/** One hash over the source files of an app's video, with their names, in a fixed order. */
const sourceHash = (app) => {
  const dir = join(REPO, 'examples', app, 'video');
  const parts = SOURCES.filter((f) => existsSync(join(dir, f))).map((f) => `${f}\n${sha256(readFileSync(join(dir, f)))}`);
  return sha256(parts.join('\n'));
};

const videoDir = (app) => join(REPO, 'examples', app, 'output', 'public', 'video');

function pack(tag) {
  if (!tag) {
    throw new Error('usage: node video/release.mjs pack <tag>, for example videos-v2');
  }
  mkdirSync(OUT, { recursive: true });
  const manifest = { repo: 'ravikiranj/webapp-explainer', tag, apps: {} };
  for (const app of apps()) {
    if (!existsSync(join(videoDir(app), 'video.json'))) {
      throw new Error(`${app} has no rendered video. Run: node video/render.mjs build examples/${app}`);
    }
    const archive = `${app}-video.tar.gz`;
    run('tar', ['-czf', join(OUT, archive), '-C', videoDir(app), '.']);
    manifest.apps[app] = { archive, sha256: sha256(readFileSync(join(OUT, archive))), source: sourceHash(app) };
    console.log(`packed release/${archive}`);
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote video/release.json for ${tag}. Upload release/*.tar.gz to that release, then commit release.json.`);
}

function check() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const problems = [];
  for (const app of apps()) {
    const entry = manifest.apps[app];
    if (!entry) {
      problems.push(`${app} has a storyboard, but ${manifest.tag} has no video for it`);
    } else if (entry.source !== sourceHash(app)) {
      problems.push(`${app}: the storyboard, scenes or lexicon changed after ${manifest.tag} was made`);
    }
  }
  if (problems.length) {
    throw new Error(`${problems.join('\n')}\nRender again and publish a new release. See "Videos" in README.md.`);
  }
  console.log(`the videos of ${manifest.tag} match the sources of ${apps().join(', ')}`);
}

function fetchAll() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const tmp = join(OUT, 'download');
  mkdirSync(tmp, { recursive: true });
  for (const [app, entry] of Object.entries(manifest.apps)) {
    const url = `https://github.com/${manifest.repo}/releases/download/${manifest.tag}/${entry.archive}`;
    const file = join(tmp, entry.archive);
    run('curl', ['-sSL', '--fail', '--retry', '3', '-o', file, url]);
    if (sha256(readFileSync(file)) !== entry.sha256) {
      throw new Error(`${entry.archive} from ${manifest.tag} does not have the SHA-256 in release.json`);
    }
    rmSync(videoDir(app), { recursive: true, force: true });
    mkdirSync(videoDir(app), { recursive: true });
    run('tar', ['-xzf', file, '-C', videoDir(app)]);
    console.log(`unpacked ${entry.archive} into examples/${app}/output/public/video/`);
  }
  rmSync(tmp, { recursive: true, force: true });
}

const [mode, arg] = process.argv.slice(2);
const modes = { pack: () => pack(arg), check, fetch: fetchAll };
if (!modes[mode]) {
  console.error('usage: node video/release.mjs pack <tag> | check | fetch');
  process.exit(2);
}
try {
  modes[mode]();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
