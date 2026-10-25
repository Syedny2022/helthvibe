# Connecting Composio to Helthvibe

Composio is a platform that gives an AI agent pre-authenticated access to 1,500+ apps
(GitHub, Cloudflare, Google Search Console, Bing Webmaster Tools, Google Analytics, etc.)
through the **Model Context Protocol (MCP)**.

Once connected, an agent can run the remaining launch steps — creating the GitHub repo,
pushing, building the Cloudflare Pages project, publishing the GSC/Bing verification
records and reading analytics — without you pasting tokens into a chat.

## Why this matters for Helthvibe

| Step | Without Composio | With Composio |
| --- | --- | --- |
| GitHub repo + push | You run `gh auth login` and a few commands | Agent does it |
| Cloudflare Pages project + domain | You create a token, run `npm run cf:setup` | Agent does it (uses your Cloudflare API key) |
| GSC / Bing verification | You publish one TXT record each | Agent does it |
| GA4 / analytics checks | You open dashboards | Agent reads them |

## What you need to do (one-time)

1. **Create a Composio account** at <https://composio.dev>.
2. **Get an API key** — in the dashboard, go to **API Keys** (or the *AI Clients* page) and
   copy your **project API key**. Do not paste it into a chat.
3. **Tell the agent the key** — say:

   > Set this as an environment variable: `COMPOSIO_API_KEY=<the key you just copied>`

   The agent will then install the Composio MCP server and connect it.

## How the agent connects it

The agent adds a remote MCP server to the project config:

```jsonc
// .kilo/kilo.json (or your global config)
{
  "mcp": {
    "composio": {
      "type": "remote",
      "url": "https://connect.composio.dev/mcp",
      "headers": { "x-consumer-api-key": "<your API key>" }
    }
  }
}
```

It then links the accounts the agent needs to act on:

| App | Used for |
| --- | --- |
| `github` | Create the repo, push, open PRs |
| `cloudflare` | Pages project, custom domains, DNS records, Web Analytics |
| `google_search_console` | Verify the domain, submit the sitemap |
| `bing_webmaster_tools` | Verify the domain, submit the sitemap |
| `google_analytics` | Read traffic and confirm GA4 is collecting |

The agent links each one by name (e.g. "link my GitHub account"). You may be asked to
confirm each connection in a browser window — that is normal and expected.

## What the agent can do once connected

- `composio github create repo Syedny2022/helthvibe --public --source=. --remote=origin`
- `composio cloudflare create pages project helthvibe --production-branch main`
- `composio cloudflare create dns record --name google-site-verification --type TXT --content <token>`
- `composio google_search_console add site --site helthvibe.com`
- `composio google_analytics list properties` / `composio google_analytics get data`

## Troubleshooting

### The MCP endpoint rejects my key with "Bearer token rejected"

`https://connect.composio.dev/mcp` expects a **consumer key** (`ck_...`), not a
project API key (`ak_...`). I tested the key you shared (`ak_LN7Q6NTRpGtqhbJax7ac`):

- `GET https://connect.composio.dev/mcp` → 401
- `POST .../mcp` with `x-consumer-api-key` → 401
- `POST .../mcp` with `x-api-key` → 401
- `GET https://backend.composio.dev/api/v3.1/toolkits?limit=1` with `x-api-key` → **200** (valid project key)
- `GET .../connected_accounts` → 200, shows 5 auth configs, all **EXPIRED** ("Authorization was started but not completed within 10 minutes")

So the key works for the REST API but is the wrong type for the consumer MCP endpoint, and
the existing connections never finished their OAuth flow.

**Fix:** in the Composio dashboard go to **For You → AI Clients**, select the client and
copy the **consumer key** (it starts with `ck_`). Paste it as `x-consumer-api-key` and the
MCP endpoint will accept it. Then go to **For You → Connect Apps** and connect GitHub,
Cloudflare, Google Search Console, Bing Webmaster Tools and Google Analytics — each opens
a browser window where you confirm the connection.

### The sign-in page never opens

That is the OAuth step above. The MCP endpoint returns the auth flow only after the
consumer key is valid; a wrong key just answers 401, so no sign-in page is ever served.
Get the `ck_...` key first, then the sign-in flow works.

- Composio-managed OAuth is the default, so you usually do **not** need to create separate
  Cloudflare/GitHub API tokens — the agent asks you to confirm each connection.
- If you prefer to keep your own API tokens, tell the agent: *"Use my own Cloudflare API
  token and GitHub token instead of Composio-managed auth."*
- The launch runbook in `docs/LAUNCH.md` stays the source of truth for what each step does.