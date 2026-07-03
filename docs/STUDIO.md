# Kuzu Graph Console

Kuzu Graph Console is the built-in web app for opening, inspecting, learning, querying, importing into, and visually exploring the same embedded Kuzu knowledge graph exposed by the MCP server.

For a beginner-friendly product walkthrough, start with [Kuzu Graph Console User Guide](./USER_GUIDE.md).

For the in-app tutorial center, see [Learn & Practice Guide](./LEARN_AND_PRACTICE.md).

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

### 1. Start Kuzu Graph Console

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

### 2. Open Import Data

In the left navigation, choose **Import Data**.

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

### 7. Preview And Run The Import

Click **Preview** to validate the import plan, then click **Run import**.

Kuzu Graph Console will:

1. create a `Document` node
2. split the source text into `Chunk` nodes
3. connect the document to chunks with `HAS_CHUNK`
4. create or reuse `Topic` nodes
5. connect the document to topics with `ABOUT`
6. create or reuse `Entity` nodes
7. connect chunks to entities with `MENTIONS`
8. create entity-to-entity `RELATED_TO` relationships

After creation, the app switches to **Explore Graph** and selects the new document.

### 8. Inspect The Visual Graph

Use **Explore Graph** to review the graph visually.

- Choose a node table such as `Document`, `Chunk`, `Entity`, or `Topic`.
- Set depth from `1` to `3`.
- Set a result limit.
- Click **Explore**.
- Select a document node to load its chunks, entities, and topics.
- Select an entity node to load its neighborhood and supporting chunks.

### 9. Search The Graph

Use the search box in the top bar to find documents, chunks, entities, or topics.

For example:

```text
API Key
```

Selecting a search result opens the matching node in **Explore Graph**.

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

### 11. Review Jobs And Logs

Open **Jobs / Logs** to inspect recent queries, imports, database open events, duration, row counts, and errors.

## Learn And Practice Tutorials

Use **Learn & Practice** when you want guided Kuzu examples without using the command line.

The tutorial center includes:

- Home, Catalog, Tutorial, Practice, Data, and Help tabs
- searchable tutorial catalog
- topic filters
- tutorial detail panel
- schema preview
- step-by-step instructions
- sample data manager
- isolated practice databases under `.kuzu-practice/<tutorial-id>/`
- read-only practice query execution
- table, graph, JSON, and log result tabs
- source attribution back to `kuzudb/tutorials`

First practice run:

1. Open **Learn & Practice**.
2. On **Home**, click **Start with Cypher Basics**.
3. Confirm **Practice** opens with a query ready.
4. Click **Load dataset**.
5. Click **Run practice query**.
6. Review **Table** and **JSON**.
7. Use **Open in Query Editor** to continue in the main query workspace.

Practice datasets are isolated from the active database and can be reset safely.

## App Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `KG_APP_HOST` | `127.0.0.1` | HTTP host for the console app |
| `KG_APP_PORT` | `8787` | HTTP port for the console app |
| `KG_APP_USER` | `admin@example.com` | Login email |
| `KG_APP_PASSWORD` | `kuzu` | Login password |
| `KUZU_DB_PATH` | `./data/kuzu-demo` | Embedded Kuzu database directory |
| `KUZU_AUTO_CREATE_SCHEMA` | `true` | Create graph tables on startup |
| `KUZU_AUTO_SEED` | `true` | Seed sample data when no documents exist |

Set `KG_APP_USER` and `KG_APP_PASSWORD` before exposing the app beyond local development.

## Workflows

- **Overview**: database status, graph counts, topic coverage, and recent activity.
- **Databases**: configured database card with open, query, explore, schema, and disconnect actions.
- **Schema**: node and relationship tables, properties, primary keys, and generated sample queries.
- **Query**: guarded read-only Cypher workspace with table, graph, JSON, and raw result views.
- **Learn & Practice**: tutorial catalog, guided steps, isolated practice datasets, sample queries, and progress.
- **Explore Graph**: table/depth/limit controls that generate safe graph exploration queries internally.
- **Import Data**: safe document-centered import flow with preview and structured writes.
- **Jobs / Logs**: recent queries, imports, database actions, durations, row counts, and errors.
- **Settings**: connection summary and safety posture.

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
| `GET` | `/status` | Server and database health |
| `GET` | `/api/status` | Authenticated server and database health |
| `GET` | `/api/databases` | Configured database registry |
| `POST` | `/api/databases/default/open` | Open/connect the configured database |
| `POST` | `/api/databases/default/disconnect` | Record a disconnect request for the embedded database |
| `GET` | `/api/overview` | Counts, topics, and relationship examples |
| `GET` | `/api/schema` | Schema, counts, and examples |
| `GET` | `/api/schema-details` | Node/relationship tables, properties, and generated queries |
| `GET` | `/api/graph` | Nodes and edges for visualization |
| `GET` | `/api/search?q=...` | Search documents, chunks, entities, and topics |
| `POST` | `/api/import/preview` | Validate and preview a structured import |
| `POST` | `/api/documents` | Create a document-centered knowledge graph |
| `POST` | `/api/relationships` | Create an entity relationship |
| `POST` | `/api/cypher` | Run guarded read-only Cypher |
| `POST` | `/api/explore` | Generate and run a safe graph exploration request |
| `GET` | `/api/tutorials` | List Learn & Practice tutorials |
| `GET` | `/api/tutorials/progress` | Read tutorial progress |
| `GET` | `/api/tutorials/:id` | Read tutorial detail |
| `POST` | `/api/tutorials/:id/load-data` | Load tutorial data into an isolated practice database |
| `POST` | `/api/tutorials/:id/reset` | Reset the tutorial practice database |
| `POST` | `/api/tutorials/:id/query` | Run read-only Cypher against a tutorial sandbox |
| `GET` | `/api/tutorials/:id/schema` | Read tutorial schema metadata and runtime schema |
| `GET` | `/api/tutorials/:id/graph` | Read a tutorial sandbox graph snapshot |
| `POST` | `/api/tutorials/:id/complete` | Mark a tutorial complete for the current process |
| `POST` | `/api/tutorials/sync-official` | Safe placeholder for future admin-only tutorial sync |
| `GET` | `/api/logs` | Read local job/query history |
| `DELETE` | `/api/logs` | Clear local job/query history |
| `POST` | `/api/question` | Build a graph-backed evidence pack |
