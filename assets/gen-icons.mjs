import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

const svg = readFileSync(new URL('./icon-master.svg', import.meta.url));
mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
const out = (f) => new URL('../icons/' + f, import.meta.url).pathname;

const sizes = [
  ['icon-32.png', 32],
  ['icon-180.png', 180],   // apple-touch-icon
  ['icon-192.png', 192],   // PWA
  ['icon-512.png', 512],   // PWA
  ['icon-1024.png', 1024], // store master
];

for (const [name, size] of sizes) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(name));
  console.log('wrote', name);
}

// Maskable variants: same art shrunk to ~78% on a solid green bleed so the OS
// circle/squircle crop never clips the flag (safe-zone compliant).
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.80);
  const pad = Math.round((size - inner) / 2);
  const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#1f6e40' },
  })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toFile(out(`maskable-${size}.png`));
  console.log('wrote', `maskable-${size}.png`);
}
console.log('done');
