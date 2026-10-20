// ============================================================
// One-command Cloudflare setup for helthvibe.com.
//
// Creates the Pages project, attaches the custom domains, creates the
// DNS records if they are missing and turns on Web Analytics.
//
// Idempotent — safe to re-run.
//
// Requires CLOUDFLARE_API_TOKEN (Account -> Cloudflare Pages: Edit,
// Zone -> DNS: Edit, Zone -> Zone: Read).
// Optionally set CLOUDFLARE_ZONE_ID / CLOUDFLARE_ACCOUNT_ID to skip lookup.
//
// Usage: npm run cf:setup
// ============================================================

const API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = process.env.CLOUDFLARE_ZONE || 'helthvibe.com';
const PROJECT = process.env.CLOUDFLARE_PAGES_PROJECT || 'helthvibe';
const DOMAINS = [ZONE_NAME, `www.${ZONE_NAME}`];

const token = process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error(
    [
      'CLOUDFLARE_API_TOKEN is not set.',
      '',
      'Create a token at https://dash.cloudflare.com/profile/api-tokens -> Create Token -> Custom Token:',
      '  Account -> Cloudflare Pages: Edit',
      '  Zone    -> DNS: Edit',
      '  Zone    -> Zone: Read',
      '',
      'PowerShell:  $env:CLOUDFLARE_API_TOKEN="<token>"',
    ].join('\n')
  );
  process.exit(1);
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const detail = (json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ') || res.statusText;
    throw new Error(`${pathname} -> ${detail}`);
  }

  return json.result;
}

const step = (message) => console.log(`\n▸ ${message}`);
const ok = (message) => console.log(`  ✓ ${message}`);

async function main() {
  step('Resolving account and zone');
  const accounts = await api('/accounts');
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || accounts[0].id;
  ok(`account ${accounts.find((a) => a.id === accountId)?.name ?? accountId} (${accountId})`);

  let zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) {
    const zones = await api(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
    if (!zones.length) throw new Error(`zone "${ZONE_NAME}" not found in this account`);
    zoneId = zones[0].id;
  }
  ok(`zone ${ZONE_NAME} (${zoneId})`);

  step(`Creating Pages project "${PROJECT}" if needed`);
  const projects = await api('/pages/projects');
  let project = projects.find((p) => p.name === PROJECT);

  if (!project) {
    project = await api('/pages/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: PROJECT,
        production_branch: 'main',
        build_config: {
          build_command: 'npm run build',
          destination_dir: 'dist',
          root_dir: '',
          web_analytics_tag: false,
          ssl_redirect_enabled: true,
        },
      }),
    });
    ok(`project created (${project.name})`);
  } else {
    ok(`project already exists (${project.name})`);
  }

  const pagesHost = `${PROJECT}.pages.dev`;
  ok(`pages host ${pagesHost}`);

  step('Attaching custom domains');
  const attached = await api(`/pages/projects/${PROJECT}/domains`);
  for (const domain of DOMAINS) {
    if (attached.some((d) => d.name === domain)) {
      ok(`${domain} already attached`);
      continue;
    }
    await api(`/pages/projects/${PROJECT}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
    ok(`${domain} attached`);
  }

  step('Ensuring DNS records');
  const records = await api(`/zones/${zoneId}/dns_records?per_page=100`);
  for (const domain of DOMAINS) {
    const name = domain === ZONE_NAME ? ZONE_NAME : domain;
    const exists = records.some((r) => r.type === 'CNAME' && r.name === name && r.content === pagesHost);
    if (exists) {
      ok(`CNAME ${name} -> ${pagesHost} already exists`);
      continue;
    }
    await api(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'CNAME',
        name,
        content: pagesHost,
        ttl: 1,
        proxied: true,
      }),
    });
    ok(`CNAME ${name} -> ${pagesHost} created`);
  }

  step('Enabling Web Analytics');
  try {
    const sites = await api(`/accounts/${accountId}/rum/site_info/list`);
    if (sites.some((s) => s.host === ZONE_NAME)) {
      ok(`Web Analytics already enabled for ${ZONE_NAME}`);
    } else {
      await api(`/accounts/${accountId}/rum/site_info`, {
        method: 'POST',
        body: JSON.stringify({
          auto_install: true,
          host: ZONE_NAME,
          zone_tag: zoneId,
        }),
      });
      ok('Web Analytics enabled (beacon is injected on the next deploy)');
    }
  } catch (error) {
    console.warn(`  ! could not enable Web Analytics automatically: ${error.message}`);
    console.warn('    Enable it manually: Pages project -> Metrics -> Web Analytics -> Enable');
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('Remaining manual steps');
  console.log('─────────────────────────────────────────────────────');
  console.log(`1. Push the repo:      git push -u origin main`);
  console.log(`2. Connect GitHub:     Workers & Pages -> ${PROJECT} -> Settings -> Git -> Connect to Git`);
  console.log(`                         repository Syedny2022/helthvibe, production branch main`);
  console.log('3. Build settings:     build command "npm run build", output "dist", env NODE_VERSION=22');
  console.log('4. Verify:             https://' + ZONE_NAME + ' and https://www.' + ZONE_NAME + ' (301 -> apex)');
}

main().catch((error) => {
  console.error(`\nsetup failed: ${error.message}`);
  process.exit(1);
});
