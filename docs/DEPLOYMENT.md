# Deployment Guide

## Local development

```bash
npm install
npm run build
npm run seed
npm run smoke
npm run dev
```

The MCP server runs over stdio. It does not open a web port by default.

## Production-style local run

```bash
npm run build
KUZU_DB_PATH=/opt/kuzu/kg node dist/src/index.js
```

Use a persistent disk path for `KUZU_DB_PATH`.

## Docker

Build:

```bash
docker build -t kuzu-kg-mcp .
```

Run with a mounted Kuzu database volume:

```bash
docker run --rm -i \
  -v "$PWD/data:/data" \
  -e KUZU_DB_PATH=/data/kuzu-demo \
  kuzu-kg-mcp
```

For MCP desktop apps, local Node execution is usually easier than Docker because MCP stdio clients need a command they can spawn directly.

## Recommended production controls

- Keep this server read-only unless you intentionally add write tools.
- Use separate Kuzu database paths per tenant or environment.
- Back up the Kuzu database directory.
- Keep MCP server logs on stderr, not stdout, because stdout is reserved for MCP JSON-RPC messages.
- Review every new tool description carefully; MCP clients use tool descriptions to decide what to call.
- Avoid exposing raw write-capable Cypher to AI clients.
