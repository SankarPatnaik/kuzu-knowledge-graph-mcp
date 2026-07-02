# Kuzu Graph Console Architecture

This repository is currently a TypeScript Node project with two product surfaces over the same embedded Kuzu database:

- MCP stdio server in `src/index.ts`
- Web console HTTP server in `src/appServer.ts`

The frontend is intentionally simple today: static HTML, CSS, and browser JavaScript in `web/`. There is no React, Vite, Next.js, Tailwind, shadcn, or Monaco setup in this repo, so the console reuses the existing static app instead of introducing a new build system.

## Existing Backend

- `src/kuzuGraph.ts` owns the Kuzu Node.js database and connection wrapper.
- `src/knowledgeGraphService.ts` owns graph operations used by both MCP and the web API.
- `src/cypher.ts` validates read-only Cypher for user-entered query execution.
- `src/schema.ts` defines the current Kuzu schema for documents, chunks, entities, topics, and relationships.
- `scripts/seed.ts` and `scripts/smoke.ts` provide CLI-style setup and verification.

## Existing UI Gaps Found

- The UI worked as a knowledge graph workbench, but not as a database console.
- The navigation did not include database instances, schema, import, logs, or settings.
- Query results were table-only and did not expose timing, raw JSON, or history.
- Schema information existed but was not represented as table/property details.
- Database status was implicit rather than presented as an instance dashboard.
- Import was available through the knowledge graph builder, but not framed as a safe import flow.

## Current Console Direction

The console keeps a safe backend boundary:

- no arbitrary shell execution from the browser
- no unrestricted local file path access from the browser
- browser-triggered queries are guarded read-only Cypher
- import/create flows call structured service methods instead of running shell commands
- database registry starts with the configured embedded Kuzu database and can be expanded later

