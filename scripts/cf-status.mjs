// ============================================================
// Read-only Cloudflare status report for helthvibe.com.
//
// Shows the account, the zone, its DNS records and the Cloudflare
// Pages projects (with their custom domains), so you can confirm
// what is already configured before changing anything.
//
// Requires CLOUDFLARE_API_TOKEN (see README -> Cloudflare setup).
// Usage: npm run cf:status
// ============================================================

const API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = process.env.CLOUDFLARE_ZONE || 'helthvibe.com';

const token = process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error(
    [
      'CLOUDFLARE_API_TOKEN is not set.',
      '',
      'Create a token at https://dash.cloudflare.com/profile/api-tokens with:',
      '  Account -> Cloudflare Pages: Edit',
      '  Zone    -> DNS: Edit',
      '  Zone    -> Zone: Read',
      'then run:  set CLOUDFLARE_API_TOKEN=xxxx  (PowerShell: $env:CLOUDFLARE_API_TOKEN="xxxx")',
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
    const detail = (json.errors || []).map((e) => e.message).join('; ') || res.statusText;
    throw new Error(`${pathname} failed: ${detail}`);
  }

  return json.result;
}

function table(rows) {
  if (!rows.length) return '  (none)';
  return rows.map((row) => `  ${row}`).join('\n');
}

async function main() {
  const accounts = await api('/accounts');
  console.log('Accounts:');
  for (const account of accounts) {
    console.log(`  - ${account.name} (${account.id})`);
  }

  const zones = await api('/zones?name=' + encodeURIComponent(ZONE_NAME));
  if (!zones.length) {
    console.log(`\nZone "${ZONE_NAME}" not found in this account.`);
    return;
  }

  const zone = zones[0];
  console.log(`\nZone: ${zone.name} (${zone.id})`);
  console.log(`  status:      ${zone.status}`);
  console.log(`  nameservers: ${zone.name_servers.join(', ')}`);

  const records = await api(`/zones/${zone.id}/dns_records?per_page=100`);
  console.log('\nDNS records:');
  console.log(
    table(
      records.map(
        (r) => `${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${r.content}${r.proxied ? ' (proxied)' : ''}`
      )
    )
  );

  const projects = await api('/pages/projects');
  console.log('\nPages projects:');
  if (!projects.length) {
    console.log('  (none yet — create with: npx wrangler pages project create helthvibe --production-branch main)');
  }
  for (const project of projects) {
    console.log(`  - ${project.name} (production branch: ${project.production_branch})`);
    const domains = await api(`/pages/projects/${project.name}/domains`);
    console.log(`    domains: ${domains.length ? domains.map((d) => d.name).join(', ') : '(none)'}`);
  }

  console.log('\nAccount id (set as CLOUDFLARE_ACCOUNT_ID):', accounts[0]?.id ?? 'n/a');
  console.log('Zone id (set as CLOUDFLARE_ZONE_ID):', zone.id);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
