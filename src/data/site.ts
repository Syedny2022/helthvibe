// ============================================================
// Helthvibe — site-wide configuration
// Single source of truth for canonical URLs and contact details.
// ============================================================

export const SITE = {
  name: 'Helthvibe',
  url: 'https://helthvibe.com',
  tagline: 'Free, privacy-first health calculators',
  supportEmail: 'support@helthvibe.com',
  partnersEmail: 'partners@helthvibe.com',
  /**
   * Newsletter signup destination.
   * Currently a mailto: request so the link always resolves.
   * Swap for a real ESP URL (Mailchimp / Beehiiv / ConvertKit) when set up.
   */
  newsletterUrl: 'mailto:support@helthvibe.com?subject=Newsletter%20signup',
  /** Social preview image (1200x630 PNG — SVG is not rendered by social platforms). */
  ogImage: '/og-default.png',
  /** Publisher logo used in JSON-LD (PNG — Google requires a raster image). */
  logo: '/logo.png',
  /** Set once a Twitter/X account exists. */
  twitterHandle: '',
} as const;

/**
 * Build an absolute URL for a site-relative path.
 * Page paths always get a trailing slash so canonicals, the sitemap
 * and Cloudflare Pages redirects all agree on one URL identity.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean === '/') return `${SITE.url}/`;
  if (/\.[a-z0-9]{2,5}$/i.test(clean)) return new URL(clean, SITE.url).toString();
  return new URL(`${clean.replace(/\/+$/, '')}/`, SITE.url).toString();
}

/** Normalise a site-relative path to the trailing-slash form used by the site. */
export function withTrailingSlash(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean === '/' || /\.[a-z0-9]{2,5}$/i.test(clean)) return clean;
  return `${clean.replace(/\/+$/, '')}/`;
}
