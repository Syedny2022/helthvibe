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

## Notes

- Composio-managed OAuth is the default, so you usually do **not** need to create separate
  Cloudflare/GitHub API tokens — the agent asks you to confirm each connection.
- If you prefer to keep your own API tokens, tell the agent: *"Use my own Cloudflare API
  token and GitHub token instead of Composio-managed auth."*
- The launch runbook in `docs/LAUNCH.md` stays the source of truth for what each step does.