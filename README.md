# Kuzu Knowledge Graph MCP Server

A beginner-friendly Model Context Protocol server that connects to an embedded [Kuzu](https://kuzudb.github.io/docs/) graph database and lets AI clients read a knowledge graph.

This project is designed for a first Kuzu journey:

1. Create a small knowledge graph.
2. Store it in Kuzu.
3. Expose read-only graph tools through MCP.
4. Connect the MCP server to an AI client.
5. Ask graph-backed questions.

## What You Get

- TypeScript MCP server over stdio
- Embedded Kuzu database connection
- Auto-created graph schema
- Optional sample data seed
- Built-in Kuzu Graph Console web app
- Read-only Cypher guard
- Six MCP tools
- One schema resource
- Dockerfile
- Step-by-step docs

## Why Kuzu

Kuzu is an embedded property graph database. It runs inside your application process, stores graph data on disk, and supports Cypher queries. That makes it a good fit for local or product-embedded knowledge graph workloads where you do not want to run a separate graph database server.

## Architecture

```text
AI Client
  |
  | MCP stdio
  v
Kuzu Knowledge Graph MCP Server
  |
  | Kuzu Node.js API
  v
Embedded Kuzu DB directory

Browser
  |
  | HTTP JSON + static UI
  v
Kuzu Graph Console App
  |
  | Kuzu Node.js API
  v
Embedded Kuzu DB directory
```

## Requirements

- Node.js 20 or newer
- npm, pnpm, or another Node package manager
- macOS, Linux, or Windows with a supported Kuzu Node package

## Quick Start

```bash
git clone <your-repo-url>
cd kuzu-knowledge-graph-mcp

npm install
npm run build
npm run seed
npm run smoke
```

Expected smoke result:

```json
{
  "status": "ok",
  "nodeCounts": {
    "Document": 4,
    "Chunk": 8,
    "Entity": 8,
    "Topic": 4
  }
}
```

## Run Kuzu Graph Console

Kuzu Graph Console is the built-in browser app for opening the configured Kuzu database, inspecting schema, running read-only Cypher, exploring graph results, importing source text, and reviewing logs.

```bash
npm run app:dev
```

Open:

```text
http://127.0.0.1:8787
```

Default local login:

```text
admin@example.com / kuzu
```

Beginner user guide: [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)

Console API/reference guide: [docs/STUDIO.md](./docs/STUDIO.md)

To create a new graph from pasted documents or notes, follow [Create A New Knowledge Graph](./docs/USER_GUIDE.md#create-a-new-knowledge-graph).

## Run The MCP Server

Development:

```bash
npm run dev
```

Production-style:

```bash
npm run build
npm run start
```

The server uses stdio, so it will appear to wait silently. That is normal. MCP clients talk to it through stdin/stdout.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Important settings:

| Variable | Default | Meaning |
| --- | --- | --- |
| `KUZU_DB_PATH` | `./data/kuzu-demo` | Directory where Kuzu stores the database |
| `KUZU_AUTO_CREATE_SCHEMA` | `true` | Create node and relationship tables on startup |
| `KUZU_AUTO_SEED` | `true` | Seed sample data when the database has no documents |
| `MCP_SERVER_NAME` | `kuzu-knowledge-graph` | Name shown to MCP clients |

## Connect To Claude Desktop Or Another MCP Client

Build first:

```bash
npm run build
```

Then add a config like this to your MCP client. Replace the paths with your real absolute path.

```json
{
  "mcpServers": {
    "kuzu-knowledge-graph": {
      "command": "node",
      "args": ["/absolute/path/to/kuzu-knowledge-graph-mcp/dist/src/index.js"],
      "env": {
        "KUZU_DB_PATH": "/absolute/path/to/kuzu-knowledge-graph-mcp/data/kuzu-demo",
        "KUZU_AUTO_CREATE_SCHEMA": "true",
        "KUZU_AUTO_SEED": "true"
      }
    }
  }
}
```

An editable copy is available in [mcp-config.example.json](./mcp-config.example.json).

## Available MCP Tools

- `kg_overview`: graph counts, topics, and examples
- `kg_search`: keyword search across documents, chunks, entities, and topics
- `kg_get_document_context`: document, chunks, topics, and entities
- `kg_entity_neighborhood`: one-hop entity relationships and supporting chunks
- `kg_question_context`: compact graph-backed evidence pack for a natural-language question
- `kg_readonly_cypher`: guarded read-only Cypher query

Full tool guide: [docs/TOOLS.md](./docs/TOOLS.md)

## Create And Run A Simple MCP Client

This repo includes a beginner MCP client that starts the Kuzu MCP server, lists tools, reads the schema resource, and calls graph tools.

```bash
npm run client:demo
```

Client guide: [docs/CLIENT.md](./docs/CLIENT.md)

## Example Journey

The included sample graph models a GenAI Workbench support and deployment knowledge graph.

Try asking your MCP client:

```text
Use the Kuzu knowledge graph. How does the context graph reduce AI cost and how do I deploy it safely?
```

The expected journey:

1. Search chunks for context graph, cost, deployment, and safety.
2. Expand to documents such as `doc-context-cost` and `doc-deployment`.
3. Pull entities like Kuzu, Context Graph, API Key, Tenant Isolation, and REST API.
4. Return a small evidence pack for the LLM.

Detailed walkthrough: [docs/DATA_JOURNEY.md](./docs/DATA_JOURNEY.md)

## Useful Read-Only Cypher

```cypher
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
RETURN d.title AS document, c.section AS section, c.text AS text
LIMIT 5
```

```cypher
MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity)
RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity
LIMIT 10
```

More examples: [examples/graph-journey.cypher](./examples/graph-journey.cypher)

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Project Structure

```text
src/
  index.ts                 MCP server entrypoint
  kuzuGraph.ts             Kuzu connection and query wrapper
  knowledgeGraphService.ts Graph read operations
  appServer.ts              Kuzu Graph Console HTTP API and static server
  schema.ts                Kuzu graph schema
  seedData.ts              Sample data journey
  cypher.ts                Read-only Cypher validation
web/
  index.html
  styles.css
  app.js
scripts/
  seed.ts                  Reset and seed the demo graph
  smoke.ts                 Build confidence test
docs/
  USER_GUIDE.md
  CONSOLE_ARCHITECTURE.md
  DATA_JOURNEY.md
  DEPLOYMENT.md
  STUDIO.md
  TOOLS.md
examples/
  graph-journey.cypher
  questions.md
```

## Notes For Beginners

- Kuzu is embedded. You are not connecting to a database server URL. You are opening a database directory.
- MCP stdio servers do not expose an HTTP port. Your AI client starts the server command and talks through standard input/output.
- Do not write normal logs to stdout in an MCP server. stdout is reserved for protocol messages.
- Keep raw Cypher read-only unless you are building an admin-only server.

## References

- Kuzu documentation: https://kuzudb.github.io/docs/
- Kuzu Node.js API: https://kuzudb.github.io/docs/client-apis/nodejs/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
