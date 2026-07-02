# Kuzu Studio

Kuzu Studio is the built-in web app for creating, viewing, and querying the same embedded Kuzu knowledge graph exposed by the MCP server.

## Run It

Development:

```bash
npm run app:dev
```

Production-style:

```bash
npm run app
```

Then open:

```text
http://127.0.0.1:8787
```

Default local login:

```text
admin@example.com / kuzu
```

## App Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `KG_APP_HOST` | `127.0.0.1` | HTTP host for the Studio app |
| `KG_APP_PORT` | `8787` | HTTP port for the Studio app |
| `KG_APP_USER` | `admin@example.com` | Login email |
| `KG_APP_PASSWORD` | `kuzu` | Login password |
| `KUZU_DB_PATH` | `./data/kuzu-demo` | Embedded Kuzu database directory |
| `KUZU_AUTO_CREATE_SCHEMA` | `true` | Create graph tables on startup |
| `KUZU_AUTO_SEED` | `true` | Seed sample data when no documents exist |

Set `KG_APP_USER` and `KG_APP_PASSWORD` before exposing the app beyond local development.

## Workflows

- **Build**: paste knowledge text, add topics, add entities, and create relationships in one submit.
- **Explore**: inspect documents, chunks, entities, topics, and relationship edges visually.
- **Query**: run guarded read-only Cypher against Kuzu.
- **Ask**: build a graph-backed evidence pack for a natural-language question.

Entity lines use this shape:

```text
Name | Type | Description
```

Relationship lines use this shape:

```text
From Entity | RELATION | To Entity | Evidence
```

## API Surface

The web UI calls these local JSON endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/login` | Create a local session |
| `POST` | `/api/logout` | Clear the local session |
| `GET` | `/api/overview` | Counts, topics, and relationship examples |
| `GET` | `/api/graph` | Nodes and edges for visualization |
| `GET` | `/api/search?q=...` | Search documents, chunks, entities, and topics |
| `POST` | `/api/documents` | Create a document-centered knowledge graph |
| `POST` | `/api/relationships` | Create an entity relationship |
| `POST` | `/api/cypher` | Run guarded read-only Cypher |
| `POST` | `/api/question` | Build a graph-backed evidence pack |

