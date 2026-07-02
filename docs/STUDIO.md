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

## Create Your First Knowledge Graph

Follow this path when you want to create a new knowledge graph from source text such as a runbook, FAQ, support note, product document, or internal wiki page.

### 1. Start Kuzu Studio

Run the app:

```bash
npm run app:dev
```

Open:

```text
http://127.0.0.1:8787
```

Sign in with the local default credentials:

```text
admin@example.com / kuzu
```

### 2. Open The Build Screen

In the left navigation, choose **Build**.

This screen creates a document-centered graph:

- one `Document` node
- one or more `Chunk` nodes
- optional `Topic` nodes
- optional `Entity` nodes
- optional `RELATED_TO` edges between entities

### 3. Fill In The Document Fields

Use these fields:

| Field | What To Enter | Example |
| --- | --- | --- |
| Document title | Human-readable name for the source | `Customer Onboarding Runbook` |
| Source | File path, URL, or source label | `docs/runbooks/onboarding.md` |
| Owner | Team or person responsible for the content | `Customer Success` |
| Summary | Short description for search and review | `Steps for onboarding a new enterprise customer.` |
| Knowledge text | The actual source text to store in the graph | Paste the runbook, FAQ, or notes |

The app automatically splits `Knowledge text` into chunk nodes and connects them to the document.

### 4. Add Topics

In **Topics**, enter comma-separated categories:

```text
Onboarding, Deployment, Support
```

Each topic becomes a `Topic` node and is connected to the document with an `ABOUT` relationship.

### 5. Add Entities

In **Entities**, enter one entity per line:

```text
Kuzu | Graph Database | Embedded graph database used to store the knowledge graph
Customer Portal | Application | Internal portal used by support agents
API Key | Security Control | Secret token used to protect API access
```

Format:

```text
Name | Type | Description
```

You can also click **Suggest entities** after pasting the knowledge text. The app will suggest candidate entities from capitalized phrases, and you can edit them before submitting.

### 6. Add Entity Relationships

In **Entity relationships**, enter one relationship per line:

```text
Customer Portal | USES | API Key | Portal requests must include an API key
Customer Portal | READS_FROM | Kuzu | Portal queries the graph-backed assistant
Kuzu | STORES | Customer Onboarding Runbook | Kuzu stores the runbook as graph nodes and edges
```

Format:

```text
From Entity | RELATION | To Entity | Evidence
```

The `From Entity` and `To Entity` values must match entities that already exist in the graph or entities you are creating in the same form.

### 7. Create The Graph

Click **Create graph**.

Kuzu Studio will:

1. create a `Document` node
2. split the source text into `Chunk` nodes
3. connect the document to chunks with `HAS_CHUNK`
4. create or reuse `Topic` nodes
5. connect the document to topics with `ABOUT`
6. create or reuse `Entity` nodes
7. connect chunks to entities with `MENTIONS`
8. create entity-to-entity `RELATED_TO` relationships

After creation, the app switches to **Explore** and selects the new document.

### 8. Inspect The Visual Graph

Use **Explore** to review the graph visually.

- Choose **All** to see the full graph.
- Choose **Documents**, **Chunks**, **Entities**, or **Topics** to focus the view.
- Select a document node to load its chunks, entities, and topics.
- Select an entity node to load its neighborhood and supporting chunks.

### 9. Search The Graph

Use the search box in the top bar to find documents, chunks, entities, or topics.

For example:

```text
API Key
```

Selecting a search result opens the matching node in **Explore**.

### 10. Query With Cypher

Open **Query** to run guarded read-only Cypher.

Example:

```cypher
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
RETURN d.title AS document, c.section AS section, c.text AS text
LIMIT 10
```

Another useful relationship query:

```cypher
MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity)
RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity, r.evidence AS evidence
LIMIT 20
```

The app blocks mutating Cypher in this screen, so it is safe for inspection.

### 11. Ask A Natural-Language Question

Open **Ask** and enter a question:

```text
How does the customer portal use API keys?
```

Click **Build context**. The app searches the graph and returns an evidence pack that can be used by an AI assistant or reviewed directly.

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
