/**
 * Generate SoundLab PWA icons from public/soundlab.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'soundlab.svg');
const outDir = join(root, 'public', 'icons');

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const sizes = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

function render(size, { maskable = false } = {}) {
  const padding = maskable ? Math.round(size * 0.12) : 0;
  const inner = size - padding * 2;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: inner },
    background: '#212121',
  });
  const rendered = resvg.render();
  const png = rendered.asPng();

  if (!maskable) return png;

  // Compose onto larger canvas with safe-zone padding for maskable icons
  // Use a second pass: wrap SVG in a padded viewport
  const paddedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#212121"/>
  <image href="data:image/png;base64,${Buffer.from(png).toString('base64')}"
         x="${padding}" y="${padding}" width="${inner}" height="${inner}" />
</svg>`;
  const composed = new Resvg(paddedSvg, {
    fitTo: { mode: 'width', value: size },
  });
  return composed.render().asPng();
}

for (const size of sizes) {
  const buf = render(size);
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, buf);
  console.log('wrote', file);
}

for (const size of [192, 512]) {
  const buf = render(size, { maskable: true });
  const file = join(outDir, `maskable-${size}.png`);
  writeFileSync(file, buf);
  console.log('wrote', file);
}

// Apple touch icon alias
writeFileSync(join(outDir, 'apple-touch-icon.png'), render(180));
console.log('done');
