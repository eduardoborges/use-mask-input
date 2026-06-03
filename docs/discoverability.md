---
sidebar_position: 100
---

# Agent discovery

This documentation site publishes machine-readable discovery files for crawlers and AI agents.

## robots.txt

[`/robots.txt`](https://use-mask-input.eduardoborges.dev/robots.txt) follows [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) with:

- `User-agent: *` and explicit blocks for AI crawlers (`GPTBot`, `Claude-Web`, `Google-Extended`, and others)
- `Allow` / `Disallow` for docs, LLM files, and `/.well-known/`
- `Content-Signal` preferences: `ai-train=no`, `search=yes`, `ai-input=yes`

Source: `apps/docussaurus/static/robots.txt`

## Link headers (RFC 8288)

The homepage response includes `Link` headers (via Cloudflare Pages `_headers`) pointing to the API catalog, agent skills index, `llm.txt`, API reference, and `auth.md`.

## API catalog (RFC 9727)

[`/.well-known/api-catalog`](https://use-mask-input.eduardoborges.dev/.well-known/api-catalog) returns `application/linkset+json` describing the library API reference and machine-readable `llm-full.txt` spec.

## Agent skills

[`/.well-known/agent-skills/index.json`](https://use-mask-input.eduardoborges.dev/.well-known/agent-skills/index.json) lists installable skills with SHA-256 digests.

## Auth and OAuth metadata

| File | Purpose |
| --- | --- |
| [`/auth.md`](https://use-mask-input.eduardoborges.dev/auth.md) | Public site; no agent registration required |
| [`/.well-known/oauth-protected-resource`](https://use-mask-input.eduardoborges.dev/.well-known/oauth-protected-resource) | Declares no authorization servers (read-only docs) |

There is no `/.well-known/oauth-authorization-server` because this hostname does not issue tokens.

## MCP server card

[`/.well-known/mcp/server-card.json`](https://use-mask-input.eduardoborges.dev/.well-known/mcp/server-card.json) describes documentation resources. No Streamable HTTP MCP server is hosted on this domain.

## WebMCP

The homepage registers WebMCP tools when `navigator.modelContext` is available (Chrome experimental). See `apps/docussaurus/src/components/WebMcpTools.tsx`.

## Markdown for Agents (Cloudflare)

HTML-to-markdown negotiation (`Accept: text/markdown`) is a **zone-level Cloudflare** feature. Enable **Markdown for Agents** under [AI Crawl Control](https://dash.cloudflare.com/) for the zone that serves `use-mask-input.eduardoborges.dev`. Disable managed robots.txt in the dashboard if it overrides the static file from this repo.

## DNS for AI Discovery (DNS-AID)

Add DNS records on the **apex zone** (`eduardoborges.dev`) in Cloudflare DNS. Example (adjust priority and enable DNSSEC on the zone):

```dns
_index._agents.eduardoborges.dev. 3600 IN HTTPS 1 use-mask-input.eduardoborges.dev. alpn=h2,h3 port=443
```

See `apps/docussaurus/static/dns-aid.example.zone` for a copy-paste template.

## LLM context

| File | URL |
| --- | --- |
| Summary | [`/llm.txt`](https://use-mask-input.eduardoborges.dev/llm.txt) |
| Full reference | [`/llm-full.txt`](https://use-mask-input.eduardoborges.dev/llm-full.txt) |

## Validate

```bash
curl -sI https://use-mask-input.eduardoborges.dev/ | grep -i '^link:'
curl -s https://use-mask-input.eduardoborges.dev/robots.txt | head
curl -sH 'Accept: application/linkset+json' https://use-mask-input.eduardoborges.dev/.well-known/api-catalog
```

Or POST your URL to the [isitagentready scan API](https://isitagentready.com/).
