// ============================================================
// Internal link audit for the built site.
//
// Scans dist/**/*.html for root-relative href/src attributes and
// verifies each one resolves to a file in the build output.
// Run after `npm run build`.
//
// Usage: npm run links:check
// ============================================================

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(root, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }

  return files;
}

function resolves(target) {
  const clean = target.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return existsSync(path.join(distDir, 'index.html'));

  const base = path.join(distDir, clean);
  if (existsSync(base)) {
    return statSync(base).isDirectory() ? existsSync(path.join(base, 'index.html')) : true;
  }

  return (
    existsSync(`${base}.html`) ||
    existsSync(path.join(base, 'index.html')) ||
    existsSync(path.join(base, 'index.htm'))
  );
}

const htmlFiles = walk(distDir);
const broken = [];
const redirects = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf-8');
  const matches = html.matchAll(/(?:href|src)="([^"]+)"/g);

  for (const [, target] of matches) {
    if (!target.startsWith('/')) continue;
    if (target.startsWith('//')) continue;

    checked += 1;
    if (!resolves(target)) {
      broken.push(`${path.relative(distDir, file).replace(/\\/g, '/')} -> ${target}`);
      continue;
    }

    // A page path without a trailing slash resolves to a directory index and
    // would 301 on Cloudflare Pages — the site uses trailingSlash: 'always'.
    const clean = target.split('#')[0].split('?')[0];
    const isPage = !/\.[a-z0-9]{2,5}$/i.test(clean);
    if (isPage && clean !== '/' && !clean.endsWith('/') && existsSync(path.join(distDir, clean, 'index.html'))) {
      redirects.push(`${path.relative(distDir, file).replace(/\\/g, '/')} -> ${target}`);
    }
  }
}

console.log(`checked ${checked} root-relative links across ${htmlFiles.length} pages`);

if (broken.length) {
  console.log(`\n${broken.length} broken link(s):`);
  for (const item of broken) console.log(`  ${item}`);
}

if (redirects.length) {
  console.log(`\n${redirects.length} link(s) that would 301 (missing trailing slash):`);
  for (const item of redirects) console.log(`  ${item}`);
}

if (broken.length || redirects.length) {
  process.exit(1);
}

console.log('no broken or redirecting internal links found');
