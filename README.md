# Helthvibe

Free, privacy-first health calculator suite — **BMI, ideal weight, BMR, TDEE, body fat, waist ratios and more**.

Every calculation runs **100% in the visitor's browser**. No signup, no accounts, no health data ever leaves the device.

- Live site: <https://helthvibe.com>
- Stack: **Astro 5** (static output) → **Cloudflare Pages**
- License: MIT

---

## Quick start

```bash
npm install
npm run dev      # local dev server at http://localhost:4321
npm run build    # static build → ./dist
npm run preview  # serve the production build locally
```

Node 22 is required (see `.nvmrc`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Astro dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | `astro check` — type + template diagnostics |
| `npm run smoke` | Quick maths sanity check for the BMI/ideal-weight library |
| `npm run links:check` | Internal link audit of the built site (run after `build`) |
| `npm run og:generate` | Regenerate `og-default.png`, `logo.png`, `apple-touch-icon.png` from their SVGs |
| `npm run deploy` | Build + `wrangler pages deploy dist --project-name helthvibe --branch main` |
| `npm run deploy:preview` | Same, on the `preview` branch (separate Pages preview environment) |
| `npm run cf:status` | Read-only Cloudflare report: account, zone, DNS records, Pages projects |
| `npm run cf:setup` | One-command Cloudflare setup (Pages project, custom domains, DNS, Web Analytics) |
| `npm run cf:dns` | Idempotent DNS record creation (used for webmaster verification) |

## Project structure

```
src/
├── components/         # Header, Footer, calculators, CookieConsent banner
├── data/
│   ├── site.ts         # canonical URLs, contact details, helpers
│   └── stub-routes.json# routes that are noindexed until they carry real content
├── layouts/            # Layout.astro (head/meta/JSON-LD), ArticleLayout.astro
├── lib/                # bmi.ts + health.ts — pure, client-side formula library
├── pages/              # routes: /, /calculators/*, /articles/*, /local/*, /tools/*
└── styles/global.css   # design tokens + base styles
public/                 # static assets, _headers, _redirects, ga4.js, images
scripts/                # Cloudflare + image + link tooling
```

## Deployment (Cloudflare Pages)

Production deploys are driven by the **Cloudflare Pages Git integration** — every push to `main` builds and publishes.

**Pages project settings**

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repository root) |
| Environment variable | `NODE_VERSION=22` |
| Environment variable | `PUBLIC_GA_ID` *(optional — enables GA4, see below)* |

**Custom domain**

1. Pages project → **Custom domains → Add** `helthvibe.com`, then `www.helthvibe.com`.
2. Cloudflare creates the DNS records automatically and redirects `www` → apex.
3. `public/_redirects` carries an explicit `301` for `www` → apex as a safety net.

**Manual deploy (fallback)**

```bash
npm run deploy
```

Requires a Cloudflare API token in the environment:

```powershell
$env:CLOUDFLARE_API_TOKEN="<token>"
npm run cf:status   # prints account id + zone id
npm run deploy
```

> There is deliberately **no Cloudflare adapter** in `astro.config.mjs`. The site is pure static output, which keeps
> Pages Functions (`functions/`) available for a future contact-form API without a separate Worker project.

## Cloudflare API token (local tooling only)

Create at <https://dash.cloudflare.com/profile/api-tokens> → *Create Token* → *Custom Token*:

- Account → **Cloudflare Pages: Edit**
- Zone → **DNS: Edit**
- Zone → **Zone: Read**
- Zone resources → `helthvibe.com`

Store it in `.env` (see `.env.example`) or as a shell environment variable. **Never commit it.**

## Analytics

| Tool | Status | How it works |
| --- | --- | --- |
| Cloudflare Web Analytics | Enabled on the Pages project | Cookie-less beacon injected by Cloudflare on the next deploy. No code. |
| Google Analytics 4 | Wired, **disabled by default** | The build injects `PUBLIC_GA_ID`; `public/ga4.js` then loads gtag with **Consent Mode v2** (everything denied until the visitor accepts). A consent banner appears only when GA4 is enabled. |

**Enabling GA4**

1. <https://analytics.google.com> → Admin → *Create property* → Web → `https://helthvibe.com` → copy the `G-XXXXXXXXXX` measurement ID.
2. Add it to the Pages project as the environment variable `PUBLIC_GA_ID` (Production + Preview) and to your local `.env`.
3. Redeploy. The consent banner appears and GA4 starts collecting after consent.

## Webmaster tools

**Google Search Console** — add a **Domain** property for `helthvibe.com`, then publish the TXT record Google shows you:

```bash
node scripts/cf-setup-dns.mjs --name google-site-verification --content <token>
```

Then submit the sitemap: `https://helthvibe.com/sitemap-index.xml`.

**Bing Webmaster Tools** — add the site and *import from Google Search Console* (fastest), or verify with DNS:

```bash
node scripts/cf-setup-dns.mjs --name msvalidate.01 --content <token>
```

Then submit the same sitemap.

## SEO notes

- **One URL identity.** The site uses `trailingSlash: 'always'`. Internal links, canonicals, the sitemap and Pages all agree on `https://helthvibe.com/page/`.
- **Sitemap** is generated by `@astrojs/sitemap` (`sitemap-index.xml` + `sitemap-0.xml`) and referenced from `public/robots.txt`.
- **Stub routes** (listed in `src/data/stub-routes.json`) are `noindex, follow` and excluded from the sitemap until they carry real content. When one ships, remove it from that file and drop the `robots` prop from its page.
- **Structured data**: `Organization` + `WebSite` + `BreadcrumbList` site-wide, plus `SoftwareApplication`, `FAQPage`, `Article` and `MedicalWebPage` where relevant. Only real, verifiable data — never invented ratings.
- **Social images** are raster PNGs (`og-default.png`, 1200×630) because social platforms do not render SVG.
- **Fonts are self-hosted** (`@fontsource-variable/inter`) — no third-party font requests, no render-blocking CDN.
- **Security headers** live in `public/_headers` (CSP, HSTS, nosniff, referrer policy).

## Launch

`scripts/launch.ps1` runs the whole end-to-end launch for you — it authenticates with
GitHub, creates the public repo and pushes `main`, runs the Cloudflare setup, then prints
the remaining manual steps. Copy `.env.example` to `.env`, paste your `GITHUB_TOKEN` and
`CLOUDFLARE_API_TOKEN`, and run:

```powershell
.\scripts\launch.ps1
```

The full step-by-step runbook (including the browser-only steps) lives in `docs/LAUNCH.md`.

## Contributing

```bash
npm run check        # types + templates
npm run build        # production build
npm run links:check  # internal link audit
```

Keep new routes out of `src/data/stub-routes.json` unless they are placeholders — a page that is ready should be indexable.

## License

MIT © Helthvibe. Not medical advice.
