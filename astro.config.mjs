// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Routes that are still "coming soon" stubs. They ship as noindex and are
// kept out of the sitemap until they carry real content.
const stubRoutes = new Set(
  JSON.parse(readFileSync(new URL('./src/data/stub-routes.json', import.meta.url), 'utf-8'))
);

// https://astro.build/config
export default defineConfig({
  site: 'https://helthvibe.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      filter: (page) => !stubRoutes.has(new URL(page).pathname),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@data': '/src/data',
        '@styles': '/src/styles',
      },
    },
  },
});
