// ============================================================
// Newsletter opt-in.
//
// There is no marketing platform connected yet, so the opt-in is handled
// as an email request: the visitor's mail client opens with a pre-filled
// signup request addressed to support@helthvibe.com.
//
// To switch to a real ESP (Mailchimp / Beehiiv / ConvertKit) or a
// Cloudflare Pages Function, replace requestNewsletterSignup() with a
// POST to your endpoint — the rest of the flow stays the same.
// ============================================================

import { SITE } from '@data/site';

export function requestNewsletterSignup(email: string): void {
  const subject = 'Newsletter signup — Helthvibe';
  const body = `Please add this address to the Helthvibe newsletter:\n\n${email}\n\n(unsubscribe any time)`;

  const recipient = SITE.newsletterUrl.startsWith('mailto:')
    ? SITE.newsletterUrl.slice('mailto:'.length).split('?')[0]
    : SITE.supportEmail;

  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
