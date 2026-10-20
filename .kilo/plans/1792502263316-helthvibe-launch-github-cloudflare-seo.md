# Helthvibe — End-to-End Launch Plan (GitHub → Cloudflare Pages → helthvibe.com → Analytics → SEO)

## 1. Status snapshot (verified against the working tree, 2026-10-20)

**What exists**
- Astro 5 static site in `C:\helthvibe` — 100+ routes (`src/pages/calculators/*`, `articles/*`, `local/*`, `tools/*`, legal/FAQ pages), `src/components/BMICalculator.astro`, `src/components/IdealWeightCalculator.astro`, `src/lib/bmi.ts`, `src/lib/health.ts` (pure, client-side formulas).
- `astro.config.mjs`: `site: https://helthvibe.com`, `output: 'static'`, `@astrojs/cloudflare` adapter, `@astrojs/sitemap`.
- Last successful build in `dist/` (2026-09-29) with `sitemap-index.xml` + `sitemap-0.xml`, `robots.txt`, `404.html`, `_worker.js`, `_routes.json`.
- SEO baseline is decent: unique titles/meta descriptions, canonical + OG/Twitter tags in `src/layouts/Layout.astro`, JSON-LD on most pages, `public/robots.txt` pointing at the sitemap.
- `wrangler` 4.59.2 is present in `node_modules` (transitive), `sharp` is installed, `gh` CLI is installed.

**Blockers / defects found**
| # | Issue | Evidence |
|---|---|---|
| B1 | **The entire Astro site is untracked.** Only 4 junk commits (UUID names) exist; `src/`, `astro.config.mjs`, `README.md`, `package-lock.json` are untracked. Nothing deployable is in version control. | `git status --short` |
| B2 | **No git remote**, and `gh` token is invalid → `gh auth login` required. | `gh auth status` |
| B3 | Legacy Next.js scaffold still tracked: `src/app/`, `src/components/ui/` (45 shadcn files), `src/hooks/`, `src/lib/db.ts`, `next.config.ts`, `components.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` (points at uninstalled `eslint-config-next`), `examples/`, `prisma/`, `db/custom.db`, `mini-services/`, `.zscripts/*.sh`, `tests/*.sh`, `Caddyfile`, `worklog.md`, `bun.lock` + `package-lock.json` both present. | `git ls-files`; `src/styles/global.css` has no Tailwind directives and nothing imports `components/ui`, `hooks/`, `lib/db` → all safe to delete |
| B4 | Two copies of the **old black/orange static site** shipped inside the new one: `download/helthvibe/` + `public/helthvibe/` + `public/helthvibe.zip` + `download/helthvibe.zip`. Competing content in the production domain. | `git ls-files` |
| B5 | `.env` is **tracked** and contains a dead Linux path (`DATABASE_URL=file:/home/z/my-project/db/custom.db`). | `git ls-files`, `.env` |
| B6 | No `wrangler.toml`/`wrangler.jsonc`, no `wrangler` in devDependencies → `npm run deploy` cannot resolve a project or build dir. | `package.json` |
| B7 | **Fabricated `aggregateRating` (4.8 / 1240 ratings) in homepage JSON-LD** → Google's fake-reviews structured-data policy violation, rich-result risk. | `src/pages/index.astro:35-39` |
| B8 | `SearchAction` targets `https://helthvibe.com/search?q=` — **no /search route exists**. | `src/pages/index.astro:16` |
| B9 | JSON-LD `url` values use no trailing slash (`/calculators/bmi`) while canonicals use trailing slash (`/calculators/bmi/`) → two URL identities. | 30+ files |
| B10 | `https://helthvibe.com/logo.png` referenced by `ArticleLayout.astro:63` + 8 compare pages, but only `public/logo.svg` exists → broken publisher logo in structured data. | grep |
| B11 | **`og:image` is an SVG** (`/og-default.svg`) — Facebook/LinkedIn/X do not render SVG OG images → no social preview. | `Layout.astro:19,45,53` |
| B12 | **`https://mail.helthvibe` is not a valid domain** (`.helthvibe` TLD does not exist) — broken link in footer, about, faq, contact, privacy. | grep, 5 occurrences |
| B13 | 17 "coming soon" stub routes are thin but fully indexable (keyword-stuffed local titles like "Free BMI Calculator for Bethesda, MD"). Dooray-page risk. | `StubPage.astro` usage |
| B14 | No `noindex` support in `Layout.astro`; no robots meta anywhere. | `Layout.astro` |
| B15 | Google Fonts loaded from a third party (render-blocking, GDPR/privacy mismatch with the "privacy-first" claim). | `Layout.astro:55-60` |
| B16 | No `public/_headers` (security headers, cache policy), no `public/_redirects` (www→apex). | `public/` |
| B17 | No analytics at all (only a commented-out Cloudflare beacon placeholder); `privacy.astro` mentions only CF Web Analytics. | `Layout.astro:74-75` |
| B18 | Contact form is a fake stub that `alert()`s "wire to Cloudflare Worker before deploy". | `src/pages/contact.astro:59,120-125` |
| B19 | No CI, no LICENSE, no repo metadata, no `.env.example`. | repo root |

## 2. Decisions locked (from user)

| Decision | Choice |
|---|---|
| GitHub repo | Public `Syedny2022/helthvibe` (personal account) |
| Cloudflare Worker | **Pages-only for now** (no separate Worker project) |
| Deploy trigger | Cloudflare Pages **Git integration (auto-build on push to main)** + `wrangler pages deploy` manual fallback |
| Analytics | Cloudflare Web Analytics live now; **GA4 + Search Console + Bing Webmaster** wired up but activated later (no Google account access yet) |
| Legacy artifacts | **Delete all** (Next.js scaffold, sandbox scripts, duplicate old site + zips) |
| Stub pages | `noindex` + excluded from sitemap until real content exists |

**Browser answer:** I cannot open or drive a browser. Every Cloudflare/Google/Bing step that requires the dashboard is a one-time manual action for the user (exact steps below). Everything else is done in code or via the Cloudflare REST API (Node scripts) once a scoped API token exists.

## 3. Prerequisites — manual actions only the user can do (do these in parallel with Phase A)

1. `gh auth login` (GitHub CLI re-auth; current token is invalid).
2. Create a Cloudflare API token → dashboard → **Profile → API Tokens → Create Token → Custom**:
   - Account → **Cloudflare Pages: Edit**
   - Zone → **DNS: Edit**, Zone → **Zone: Read** (scoped to `helthvibe.com`)
   - Account → **Workers Scripts: Edit** (only if a Worker is added later)
   - Copy the token and set it locally (never commit): `$env:CLOUDFLARE_API_TOKEN="..."` in the shell, and `CLOUDFLARE_ACCOUNT_ID` from `node scripts/cf-status.mjs` output.
   - Fallback if token creation is unwanted: `npx wrangler login` (one browser click, OAuth) — supports Pages commands but **not** DNS writes.
3. Cloudflare Web Analytics: after the Pages project exists → project → **Metrics → Web Analytics → Enable** (one click; Cloudflare injects the beacon on the next deploy).

## 4. Phase A — Repo hygiene & foundation (no deploy yet)

**A1. Delete legacy artifacts** (verified unreferenced):
```
git rm -r --cached .  # reset index first (see A7), then remove:
src/app src/components/ui src/hooks src/lib/db.ts examples
prisma db mini-services .zscripts tests Caddyfile worklog.md
next.config.ts components.json tailwind.config.ts postcss.config.mjs eslint.config.mjs
bun.lock download public/helthvibe public/helthvibe.zip
```
Keep: `src/components/{BMICalculator,IdealWeightCalculator,Header,Footer,StubPage}.astro`, `src/layouts/`, `src/lib/{bmi,health,utils}.ts`, `src/styles/global.css`, `src/pages/**`, `public/{robots.txt,favicon.svg,og-default.svg,logo.svg}`, `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`, `.gitignore`, `.kilo/`.

**A2. Env files**: `git rm --cached .env`; create `.env.example`:
```
# GA4 measurement ID — leave empty to disable GA4 entirely (no script, no banner)
PUBLIC_GA_ID=
# Local-only tooling (never commit values)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

**A3. `package.json`**
- deps: remove `@astrojs/cloudflare` (pure static → no `_worker.js` in `dist`, which keeps **Pages Functions (`functions/`) available later** for the contact form; `_worker.js` advanced mode disables them).
- devDeps: add `wrangler@^4.59.2`; keep `@astrojs/check`, `typescript`.
- scripts:
  `dev`, `build`, `preview`, `check: astro check`, `smoke: node --experimental-strip-types bmi-smoke.mjs`, `deploy: npm run build && wrangler pages deploy dist --project-name helthvibe --branch main`, `cf:status: node scripts/cf-status.mjs`, `cf:dns: node scripts/cf-setup-dns.mjs`, `og:generate: node scripts/generate-og.mjs`.

**A4. `astro.config.mjs`**
- drop the `adapter` block and the `@astrojs/cloudflare` import;
- add `trailingSlash: 'always'` so canonicals, sitemap and Pages redirects agree;
- sitemap `filter` that drops stub routes (list read from `src/data/stub-routes.json` via `fs.readFileSync` in the config; the same JSON is imported by TS pages);
- keep `site: 'https://helthvibe.com'`.

**A5. `src/data/site.ts`** — single source of truth for `siteUrl`, `supportEmail`, `partnersEmail`, `newsletterUrl` (placeholder `https://example.com/newsletter` until a real provider exists), `socials`. Import it in `Footer.astro`, `about.astro`, `faq.astro`, `contact.astro`, `privacy.astro` → fixes the broken `mail.helthvibe` link (B12) everywhere.

**A6. `public/_headers`** (Pages-native headers; **do not** set `no-transform` on HTML or the CF beacon cannot be injected):
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
plus `/_astro/*` → `Cache-Control: public, max-age=31536000, immutable`.

**A7. `public/_redirects`**
```
https://www.helthvibe.com/*  https://helthvibe.com/:splat  301
```

**A8. Scripts folder (`scripts/`, plain ESM + global `fetch`, Node 22)**
- `cf-status.mjs` — resolves the account + `helthvibe.com` zone ID, lists Pages projects and current DNS records; prints `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ZONE_ID`. Idempotent, read-only.
- `cf-setup-dns.mjs` — creates/updates a TXT record idempotently: `node scripts/cf-setup-dns.mjs --name google-site-verification --content <token>` (same shape for `msvalidate.01` / Bing CNAME). Prints the record id and the Cloudflare API response.
- `generate-og.mjs` — uses `sharp` to rasterize `public/og-default.svg` → `public/og-default.png` (1200×630) and `public/logo.svg` → `public/logo.png` (512×512).

**A9. Rewrite `src/layouts/Layout.astro`**
- props: add `robots?: string` (e.g. `noindex, follow`) and `ogImage` default → `https://helthvibe.com/og-default.png`; render `<meta name="robots">` when provided; add `og:image:width` `og:image:height` `og:image:alt`; keep canonical/OG/Twitter as-is.
- remove the commented Cloudflare beacon placeholder (B17) — CF injects it.
- fonts: replace the Google Fonts `<link>`s with self-hosted `@fontsource-variable/inter` (`import '@fontsource-variable/inter'` + `font-family` in `src/styles/global.css`) — removes a third-party render-blocking request and the GDPR mismatch (B15).
- add site-wide JSON-LD: `Organization` (name, url, `logo` → `https://helthvibe.com/logo.png`) and `WebSite`; add `BreadcrumbList` for non-home routes.
- GA4 block: render **only** when `import.meta.env.PUBLIC_GA_ID` is set — `gtag('consent','default',{analytics_storage:'denied',...})` before the gtag snippet (Consent Mode v2), plus `<CookieConsent />` component that is also rendered only when the ID exists. With no ID set today, the site stays cookie-free and banner-free.

**A10. Schema fixes** (B7–B10)
- `src/pages/index.astro`: delete the `aggregateRating` block; replace `SearchAction` with a valid `WebSite`/`SearchAction` target only if a `/search` route is added — otherwise remove `potentialAction`.
- Normalise every JSON-LD `url` to the trailing-slash form (single helper `absoluteUrl(path)` in `src/data/site.ts`).
- Point all publisher logos at `/logo.png`.

**A11. Stub handling** (B13/B14)
- `src/data/stub-routes.json` — list of the 17 stub paths.
- `Layout.astro` gains `robots`; `StubPage.astro` passes `robots="noindex, follow"` (Layout must own the `<head>` tag → pass the prop from each stub page, or have `StubPage` set a flag consumed by its callers).
- Sitemap filter in A4 removes those routes; `src/pages/404.astro` gets `noindex, follow`.

**A12. Contact form** (B18): replace the `alert()` stub with a working `mailto:` submit (builds a `mailto:support@helthvibe.com?subject=…&body=…` link from the fields, shows the address if JS is off). Note in code that a Pages Function + Resend can replace it later (requires `functions/api/contact.ts`; only possible once the Cloudflare adapter is removed per A3).

**A13. README rewrite** — product intro, local dev, build/deploy runbook, Cloudflare Pages settings table, token/activation checklist (GA4 ID, GSC DNS TXT, Bing import), repo structure, SEO notes.

**A14. CI**: `.github/workflows/ci.yml` — Node 22 (`node-version-file: .nvmrc`), `npm ci`, `npm run check`, `npm run build` on push + PR. Add `.github/dependabot.yml` (npm weekly) and a `LICENSE` (MIT).

## 5. Phase B — GitHub

- B1. User runs `gh auth login` (Prereq 1).
- B2. Clean history: the repo has 4 UUID-named junk commits and the site was never deployed → create a single clean root commit:
  `git checkout --orphan main` → `git add -A` → `git commit -m "feat: launch Helthvibe — Astro static site with health calculator suite"` → `git branch -D old-main`.
- B3. `gh repo create Syedny2022/helthvibe --public --source=. --remote=origin --description "Free, privacy-first health calculator suite (BMI, BMR, TDEE, body fat) — Astro + Cloudflare Pages" --push`
- B4. Repo settings: homepage `https://helthvibe.com`, topics (`astro`, `cloudflare-pages`, `seo`, `health`, `bmi`, `static-site`, `privacy`), enable Issues, disable Wiki/Projects, branch protection on `main` (require CI status check).
- B5. Verify the Astro source is tracked: `git ls-files src | measure` → non-zero; `git ls-files` must contain **no** `src/app`, `src/components/ui`, `prisma/`, `bun.lock`, `.env`.

## 6. Phase C — Cloudflare Pages + domain

- C1. `node scripts/cf-status.mjs` → confirms account, zone `helthvibe.com` and its zone ID. (Domain was purchased at Cloudflare, so NS are already Cloudflare; if the zone shows no records, that is expected and Pages will create them.)
- C2. Create the project: `npx wrangler pages project create helthvibe --production-branch main` (or dashboard → Workers & Pages → Create → Pages → Connect to Git).
- C3. Connect GitHub: dashboard → project → **Settings → Git → Connect to Git** → `Syedny2022/helthvibe` → Production branch `main`. Build settings: build command `npm run build`, output directory `dist`, root `/`, env `NODE_VERSION=22`, `PUBLIC_GA_ID` (empty for now).
- C4. Custom domains: project → **Custom domains → Add `helthvibe.com`**, then add `www.helthvibe.com`. Cloudflare auto-creates the CNAMEs to `<project>.pages.dev` and auto-redirects www→apex; `public/_redirects` (A7) is the belt-and-braces 301. Verify both resolve and that the apex returns 200.
- C5. Web Analytics: project → **Metrics → Web Analytics → Enable** (Prereq 3). Re-deploy if the beacon does not appear.
- C6. Email Routing (free, at the Registrar): route `support@` and `partners@` → a real inbox; `mail.helthvibe` still needs an actual newsletter provider (Mailchimp/Beehiiv/ConvertKit) — until then `site.newsletterUrl` stays a placeholder and the link must not point at `https://mail.helthvibe`.
- C7. Optional hardening: Cloudflare → Settings → Always Use HTTPS, min TLS 1.2, DNSSEC, WAF managed rules, and a `Cache-Control` of `public, max-age=0, must-revalidate` for HTML (never `no-transform`).

## 7. Phase D — Analytics

- D1. **Cloudflare Web Analytics** — live via C5. Cookieless, no consent needed, already consistent with `privacy.astro`.
- D2. **GA4 (dormant but wired)** — code ships in A9; activation is one step: user creates a GA4 property (analytics.google.com → Admin → Create property → Web → `https://helthvibe.com` → copy `G-XXXXXXXXXX`) → set `PUBLIC_GA_ID` in **Pages → Settings → Environment variables (Production + Preview)** → redeploy → the consent banner appears and GA4 starts collecting with Consent Mode v2 (default denied until the visitor accepts).
- D3. **privacy.astro** must be updated to describe the actual stack: Cloudflare Web Analytics (cookieless), optional GA4 behind consent, no health data ever leaves the browser, and the current `mail.helthvibe` claim removed.

## 8. Phase E — SEO hardening (code)

- E1. Trailing-slash consistency (A4 + rewrite all internal `href`s in `Header.astro`, `Footer.astro`, `index.astro`, hub pages to end with `/`) → no internal 301s, one URL identity.
- E2. `noindex` for the 17 stubs + 404; stubs removed from `sitemap-0.xml`.
- E3. Real OG image (`og-default.png`, 1200×630) + `logo.png`; absolute `og:image` URLs; per-page OG images optional later.
- E4. Structured data: remove the fake rating, fix `SearchAction`, trailing-slash URLs, working publisher logo, `Organization` + `WebSite` + `BreadcrumbList` sitewide, `FAQPage`/`SoftwareApplication`/`MedicalWebPage` retained, `Article` with `datePublished`/`dateModified` retained.
- E5. Performance/CWV: self-hosted font, inline CSS (`inlineStylesheets: 'auto'` already), no render-blocking third-party scripts, explicit `width`/`height` on any image (the Astro site is currently text-only), `preload` the hero font subset.
- E6. `public/site.webmanifest` + `192/512` icons (from `logo.png`), `apple-touch-icon`, `favicon.svg` retained.
- E7. Keep `public/robots.txt` (Allow all + `Sitemap: https://helthvibe.com/sitemap-index.xml`); do **not** block the AI crawlers the old static site allowed — no change needed.
- E8. Internal-link sweep: every hub page links to its children, every article links back to its calculator (crawl depth ≤ 3).

## 9. Phase F — Webmaster tools (user browser steps, script-assisted DNS)

- F1. **Google Search Console** — add **Domain** property (`helthvibe.com`, covers www + http/https). GSC shows a TXT token → run `node scripts/cf-setup-dns.mjs --name google-site-verification --content <token>` → click **Verify** (usually minutes). Then **Sitemaps →** submit `https://helthvibe.com/sitemap-index.xml`.
- F2. **Bing Webmaster Tools** — primary path: **Import from Google Search Console** (one click, inherits verification). Fallback: add the site manually and verify by DNS (script writes the `msvalidate.01` TXT or the Bing CNAME), then submit the sitemap.
- F3. After indexing starts: **URL Inspection → Request indexing** for `/`, `/calculators/bmi/`, `/calculators/tdee/`, `/articles/how-to-calculate-bmi-2026/`.
- F4. Optional later: IndexNow (needs a Worker/Function to push URLs on publish) and Google Ads — **out of scope** for this pass.

## 10. Validation (acceptance criteria)

Local:
1. `npm ci && npm run check` → 0 errors; `npm run smoke` → BMI/ideal-weight maths prints expected values.
2. `npm run build` → `dist/` contains `index.html`, `404.html`, `robots.txt`, `sitemap-index.xml`, `sitemap-0.xml`, `og-default.png`, `logo.png`, and **no** `_worker.js`/`_routes.json`.
3. `dist/sitemap-0.xml` contains **none** of the 17 stub paths; `dist/**` contains **no** `mail.helthvibe`, **no** `aggregateRating`, **no** `logo.png` 404 reference; stub pages contain `<meta name="robots" content="noindex, follow">`.
4. Every internal link resolves to a built file (script `scripts/check-links.mjs` over `dist/`).

Live:
5. `https://helthvibe.com/` → 200; `https://www.helthvibe.com/` → 301 → apex; `/sitemap-index.xml`, `/robots.txt`, `/og-default.png`, `/logo.png` → 200; a deleted URL → custom 404.
6. Cloudflare Pages build log shows a successful Git build on push to `main`; `wrangler pages deployment list` shows the production deployment.
7. Cloudflare Web Analytics → data appears within ~30 min in the project Metrics tab.
8. GSC: property verified, sitemap submitted, no "Alternate page with proper canonical" or "Blocked by robots.txt" for the home/calculator/article pages. Bing: site imported, sitemap submitted.
9. PageSpeed Insights (mobile) on `/`, `/calculators/bmi/`, one article: LCP < 2.5 s, CLS < 0.1, INP < 200 ms, Performance ≥ 90.

## 11. Risks / notes

- Removing the Cloudflare adapter changes `dist` (no `_worker.js`); the site was never deployed, so there is **no** live redirect risk. It is a prerequisite for Pages Functions later.
- Deleting `public/helthvibe.zip` removes a public download of the old site — confirmed to be referenced only by the deleted `src/app/page.tsx`.
- `trailingSlash: 'always'` changes URL shape vs. the old build; the domain has never been indexed, so no 301 map is needed.
- Pages free-plan ceilings: 500 builds/month, 20 000 files/deploy — `dist/` is ~100 files, comfortable.
- Cloudflare Pages Git integration requires the repo to be public (it is) or the app installed for a private repo.
- Windows local builds vs. Linux CI: pin Node 22 via `.nvmrc` **and** the `NODE_VERSION` Pages env var.

## 12. Out of scope (explicitly)

Writing real content for the 17 stub pages; creating the GA4/GSC/Bing properties (needs the user's accounts); choosing and wiring a newsletter/email provider; AdSense/affiliate monetisation; IndexNow; hreflang/i18n; a standalone Cloudflare Worker project.

## 13. Implementation status (2026-10-20)

**Done in-repo** (all committed on `main`, clean single-commit history, 122 files):

| Plan item | Status | Notes |
| --- | --- | --- |
| A1 legacy artefacts removed | Done | Next.js scaffold, shadcn components, prisma, `.zscripts`, `tests`, `bun.lock`, duplicate old site + zips all deleted |
| A2 env files | Done | `.env` untracked, `.env.example` added |
| A3 package.json | Done | `wrangler` + `@fontsource-variable/inter` added, `@astrojs/cloudflare` removed, deploy/check/links/og/cf scripts wired |
| A4 astro.config | Done | adapter removed (pure static → Pages Functions still possible), `trailingSlash: 'always'`, sitemap filter for stubs |
| A5 site config | Done | `src/data/site.ts` is the single source of truth; broken `mail.helthvibe` links replaced |
| A6/A7 headers + redirects | Done | `public/_headers` (CSP, HSTS, nosniff, referrer policy) and `public/_redirects` (www → apex 301) |
| A8 scripts | Done | `cf-status.mjs`, `cf-setup-dns.mjs`, `setup-cloudflare.mjs`, `generate-og.mjs`, `check-links.mjs` |
| A9 Layout rewrite | Done | `robots` prop, PNG OG image, `Organization`/`WebSite`/`BreadcrumbList` JSON-LD, self-hosted font, GA4 behind `PUBLIC_GA_ID` |
| A10 schema fixes | Done | fake `aggregateRating` removed, `SearchAction` removed, JSON-LD URLs normalised to trailing slash, `logo.png` now exists |
| A11 stub handling | Done | 19 stub routes `noindex, follow` + excluded from the sitemap (`src/data/stub-routes.json`) |
| A12 contact form | Done | real `mailto:` flow; the newsletter opt-in no longer fakes a confirmation email |
| A13/A14 docs + CI | Done | README rewrite, `docs/LAUNCH.md` runbook, GitHub Actions CI, dependabot, MIT licence |
| E SEO hardening | Done | 79 pages, 0 broken internal links, 0 redirecting links, sitemap clean, no third-party font requests |
| Validation | Done | `npm run build` ✅ · `npm run check` 0 errors ✅ · `npm run links:check` ✅ · `npm run smoke` ✅ · calculator verified in-browser (175 cm / 70 kg → BMI 22.9) |

**Blocked on the user (browser-only steps)** — see `docs/LAUNCH.md`:

1. `gh auth login` → `gh repo create Syedny2022/helthvibe --public --source=. --remote=origin` → `git push -u origin main` (the `gh` token is expired, so the push could not be performed here).
2. Create a Cloudflare API token → `npm run cf:setup` (creates the Pages project, attaches `helthvibe.com` + `www`, creates the CNAMEs, enables Web Analytics).
3. Connect the GitHub repo in the Pages dashboard (Settings → Git) with `npm run build` → `dist` and `NODE_VERSION=22`.
4. Google Search Console: Domain property → publish the TXT record with `npm run cf:dns` → submit the sitemap.
5. Bing Webmaster Tools: import from GSC (or publish the verification record) → submit the sitemap.
6. GA4: create the property and set `PUBLIC_GA_ID` in Pages → the consent banner and GA4 activate.

