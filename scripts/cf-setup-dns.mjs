// ============================================================
// Idempotent DNS record management for helthvibe.com.
//
// Used to publish the Google Search Console and Bing Webmaster
// verification records (TXT) without touching anything else.
//
// Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.
// Usage:
//   node scripts/cf-setup-dns.mjs --name google-site-verification --content <token>
//   node scripts/cf-setup-dns.mjs --name google-site-verification --content <token> --ttl 3600
//   node scripts/cf-setup-dns.mjs --name bing --content <value> --type CNAME
// ============================================================

const API = 'https://api.cloudflare.com/client/v4';

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;

function parseArgs(argv) {
  const args = { type: 'TXT', ttl: 1, proxied: false };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[i + 1];
    i += 1;
    if (name === 'type') args.type = value.toUpperCase();
    else if (name === 'ttl') args.ttl = Number(value);
    else if (name === 'proxied') args.proxied = value === 'true';
    else args[name] = value;
  }

  return args;
}

if (!token || !zoneId) {
  console.error(
    [
      'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are required.',
      'Run `npm run cf:status` to print the zone id.',
    ].join('\n')
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (!args.name || !args.content) {
  console.error('Usage: node scripts/cf-setup-dns.mjs --name <record name> --content <value> [--type TXT] [--ttl 1]');
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

async function main() {
  const existing = await api(
    `/zones/${zoneId}/dns_records?type=${args.type}&name=${encodeURIComponent(args.name)}`
  );

  const match = existing.find((record) => record.content === args.content);

  if (match) {
    console.log(`record already present: ${args.type} ${args.name} (${match.id})`);
    return;
  }

  if (existing.length) {
    const [record] = existing;
    const updated = await api(`/zones/${zoneId}/dns_records/${record.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: args.type,
        name: args.name,
        content: args.content,
        ttl: args.ttl,
        proxied: args.type === 'CNAME' ? args.proxied : false,
      }),
    });
    console.log(`updated existing ${args.type} record ${updated.id}: ${args.name}`);
    return;
  }

  const created = await api(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: args.type,
      name: args.name,
      content: args.content,
      ttl: args.ttl,
      proxied: args.type === 'CNAME' ? args.proxied : false,
    }),
  });

  console.log(`created ${args.type} record ${created.id}: ${args.name} -> ${args.content}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
