// ============================================================
// Generate the raster social/publisher images from their SVG
// sources. Social platforms do not render SVG og:image files,
// and Google requires a raster publisher logo in JSON-LD.
//
// Usage: npm run og:generate
// ============================================================

import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = path.join(root, 'public');

const jobs = [
  { src: 'og-default.svg', out: 'og-default.png', width: 1200, height: 630, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  { src: 'logo.svg', out: 'logo.png', width: 512, height: 512, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  { src: 'favicon.svg', out: 'apple-touch-icon.png', width: 180, height: 180, background: { r: 255, g: 255, b: 255, alpha: 1 } },
];

for (const job of jobs) {
  const src = path.join(publicDir, job.src);

  if (!existsSync(src)) {
    console.warn(`skip ${job.out} — ${job.src} not found`);
    continue;
  }

  await sharp(src, { density: 384 })
    .resize(job.width, job.height, { fit: 'contain', background: job.background })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, job.out));

  console.log(`generated ${job.out} (${job.width}x${job.height})`);
}
