# Launch runbook — helthvibe.com

Everything that still needs a browser action is listed here in order. Each step lists
the exact command or click path, and how to verify it worked.

---

## 0. Prerequisites (one-time)

| Tool | Status |
| --- | --- |
| Node 22 | installed (`node -v`) |
| GitHub CLI | installed, **token expired** — run `gh auth login -h github.com` |
| Cloudflare CLI | installed, **not authenticated** — run `npx wrangler login` (optional) |
| Cloudflare API token | **not created** — see below |

---

## 1. GitHub

```powershell
gh auth login -h github.com
gh auth status                # must say "The token in default is valid"
```

The repository already exists locally with a clean single-commit history on `main`
(122 files, no legacy sandbox artefacts, no `.env`).

Create the remote repository and push:

```powershell
gh repo create Syedny2022/helthvibe --public --source=. --remote=origin `
  --description "Free, privacy-first health calculator suite (BMI, BMR, TDEE, body fat) - Astro + Cloudflare Pages"
git push -u origin main
```

Then set repository metadata (optional, via the GitHub UI):

- **Description** and **website** → `https://helthvibe.com`
- **Topics** → `astro`, `cloudflare-pages`, `seo`, `health`, `bmi`, `static-site`, `privacy`
- **Settings → Pages** → leave *Source* on *Deploy from a branch* (Cloudflare owns the deploy)
- **Settings → Branches → Add rule** → protect `main`, require status check `build`
- **Settings → General → Features** → disable Wiki and Projects

---

## 2. Cloudflare API token

<https://dash.cloudflare.com/profile/api-tokens> → **Create Token** → **Custom Token**

| Permission | Scope |
| --- | --- |
| Account → Cloudflare Pages | Edit |
| Zone → DNS | Edit |
| Zone → Zone | Read |

Zone resources → include `helthvibe.com`.

```powershell
$env:CLOUDFLARE_API_TOKEN = "<token>"
npm run cf:status      # prints account id, zone id, current DNS + Pages projects
```

---

## 3. Cloudflare Pages + domain (one command)

```powershell
npm run cf:setup
```

The script is idempotent and performs:

1. creates the Pages project `helthvibe` (build command `npm run build`, output `dist`, production branch `main`);
2. attaches the custom domains `helthvibe.com` and `www.helthvibe.com`;
3. creates the `CNAME` records to `helthvibe.pages.dev` (proxied) if they are missing;
4. enables **Cloudflare Web Analytics** for the apex domain.

Verify:

```powershell
npm run cf:status
```

Expected: the project exists, both domains are listed, and two CNAME records point at
`helthvibe.pages.dev`.

> The domain was purchased at Cloudflare, so the nameservers are already correct — no
> registrar or nameserver change is needed.

---

## 4. Connect GitHub → Pages (auto-deploy)

1. Dashboard → **Workers & Pages** → `helthvibe` → **Settings** → **Git** → **Connect to Git**
2. Choose **Syedny2022/helthvibe**, production branch **main**
3. **Build settings** → build command `npm run build`, output directory `dist`, root `/`
4. **Environment variables** → add `NODE_VERSION` = `22`
   (add `PUBLIC_GA_ID` later, when the GA4 property exists)
5. **Save and Deploy** — the first build runs immediately

Every later `git push origin main` now rebuilds and publishes automatically.

---

## 5. Google Search Console

1. <https://search.google.com/search-console> → **Add property** → **Domain** → `helthvibe.com`
   (a Domain property covers `www`, `http` and `https` in one shot)
2. Google shows a TXT token → publish it:

   ```powershell
   node scripts/cf-setup-dns.mjs --name google-site-verification --content <token>
   ```

3. Click **Verify** (usually under a minute, occasionally a few hours)
4. **Sitemaps** → submit `https://helthvibe.com/sitemap-index.xml`
5. **URL Inspection** → request indexing for `/`, `/calculators/bmi/`, `/calculators/tdee/`,
   `/calculators/ideal-weight/` and one article

---

## 6. Bing Webmaster Tools

1. <https://www.bing.com/webmasters> → **Import from Google Search Console** (fastest —
   verification is inherited), or **Add site** and verify manually
2. Manual fallback: Bing gives you a token → publish it the same way as the GSC record:

   ```powershell
   node scripts/cf-setup-dns.mjs --name msvalidate.01 --content <token>
   ```

3. **Sitemaps** → submit `https://helthvibe.com/sitemap-index.xml`

---

## 7. Google Analytics 4 (optional — off until you add the ID)

1. <https://analytics.google.com> → **Admin** → **Create property** → **Web**
   → URL `https://helthvibe.com` → copy the `G-XXXXXXXXXX` measurement ID
2. Add it in **two** places:
   - Cloudflare Pages → project → **Settings** → **Environment variables** → `PUBLIC_GA_ID`
     (Production **and** Preview) → redeploy
   - your local `.env` → `PUBLIC_GA_ID=G-XXXXXXXXXX` → `npm run build` locally
3. The site then loads `public/ga4.js`, which applies **Consent Mode v2** (everything denied
   until the visitor accepts) and the consent banner appears.

Until step 2 is done the site ships **zero third-party scripts and no cookies**.

---

## 8. Post-launch checks

```powershell
npm run build
npm run check
npm run links:check
```

Live checks:

| Check | Expected |
| --- | --- |
| `https://helthvibe.com/` | 200 |
| `https://www.helthvibe.com/` | 301 → apex |
| `https://helthvibe.com/sitemap-index.xml` | 200 (79 pages, stubs excluded) |
| `https://helthvibe.com/robots.txt` | 200, points at the sitemap |
| `https://helthvibe.com/og-default.png` | 200 (real PNG, not SVG) |
| `https://helthvibe.com/logo.png` | 200 (used by JSON-LD) |
| A deleted URL | custom 404 page |
| Cloudflare Pages → Metrics → Web Analytics | data within ~30 min |

---

## 9. Optional later

- **Email Routing** (free at the Registrar): route `support@` and `partners@` to a real inbox.
- **Newsletter ESP** (Mailchimp / Beehiiv / ConvertKit): replace the `mailto:` opt-in in
  `src/data/site.ts` with the provider URL, or swap `requestNewsletterSignup()` in
  `src/lib/newsletter.ts` for a POST to a Pages Function.
- **IndexNow**: needs a Worker/Function that pushes URLs on publish.
- **AdSense / affiliate programmes**: only after Search Console shows stable impressions.
