// Bundles the static web app into dist/ — used as Capacitor's webDir so the
// native iOS/Android shells ship the UI locally (works offline, passes review).
// Supabase calls still go to the network at runtime.
import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';

const root = new URL('../', import.meta.url).pathname;
const dist = root + 'dist';

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const assets = [
  'index.html',
  'manifest.json',
  'sw.js',
  'privacy.html',
  'terms.html',
  'icons',
  'assets',
];

for (const a of assets) {
  if (existsSync(root + a)) {
    cpSync(root + a, dist + '/' + a, { recursive: true });
  }
}

console.log('Built dist/ with:', assets.filter((a) => existsSync(dist + '/' + a)).join(', '));
