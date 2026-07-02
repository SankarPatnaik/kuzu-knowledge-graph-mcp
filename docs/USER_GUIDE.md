# Kuzu Graph Console User Guide

This guide is for first-time users who want to use the web product without learning command-line Kuzu workflows first.

Kuzu Graph Console helps you:

- open the configured embedded Kuzu database
- create a knowledge graph from pasted text
- inspect the database schema
- run safe read-only Cypher queries
- learn Kuzu concepts with guided tutorials
- load tutorial datasets into isolated practice databases
- view query results as tables, JSON, raw responses, or graphs
- explore graph data visually
- review recent jobs and errors

## Before You Start

You need:

- Node.js 20 or newer
- this repository downloaded locally
- dependencies installed with `npm install`, `pnpm install`, or your preferred package manager

If you are brand new, start with:

```bash
npm install
npm run app:dev
```

Then open:

```text
http://127.0.0.1:8787
```

Default local login:

```text
admin@example.com / kuzu
```

## Beginner Mental Model

Kuzu is an embedded graph database. That means the database runs inside this app process and stores data in a local folder, instead of requiring a separate database server.

The sample graph has four node tables:

| Node Table | Meaning |
| --- | --- |
| `Document` | A source document, note, runbook, FAQ, or page |
| `Chunk` | A smaller text section split from a document |
| `Entity` | A named concept, product, person, team, system, or control |
| `Topic` | A high-level category |

And four relationship tables:

| Relationship | Meaning |
| --- | --- |
| `Document - HAS_CHUNK -> Chunk` | A document contains chunks |
| `Chunk - MENTIONS -> Entity` | Text mentions an entity |
| `Document - ABOUT -> Topic` | A document belongs to a topic |
| `Entity - RELATED_TO -> Entity` | One entity is connected to another |

When you import text, the console creates these graph records for you.

## Quick Start Checklist

1. Run `npm run app:dev`.
2. Open `http://127.0.0.1:8787`.
3. Sign in with `admin@example.com / kuzu`.
4. Open **Databases** and confirm the default database is `connected`.
5. Open **Schema** to understand the available tables.
6. Open **Learn & Practice** and run a starter tutorial query.
7. Open **Import Data** and create your first graph from pasted text.
8. Open **Explore Graph** to visually inspect what was created.
9. Open **Query** to run read-only Cypher.
10. Open **Jobs / Logs** if something does not work.

## Page-By-Page Guide

### Overview

Use **Overview** as your home screen.

It shows:

- database connection status
- total node records
- total relationship records
- node and relationship table counts
- topic coverage
- recent activity

If the status is not `connected`, go to **Databases** and click **Open**.

### Databases

Use **Databases** to see the configured Kuzu database.

The current version shows the default local embedded database. The card includes:

- database name
- storage label
- status
- mode
- node table count
- relationship table count
- quick actions

Common actions:

| Action | What It Does |
| --- | --- |
| **Open** | Connects/initializes the configured Kuzu database |
| **Query** | Opens the query workspace |
| **Explore** | Opens visual graph exploration |
| **View schema** | Opens the schema explorer |
| **Disconnect** | Records a disconnect request. Because Kuzu is embedded, fully closing it means stopping the app server |

### Schema

Use **Schema** when you want to understand what tables exist and how data is shaped.

The page shows:

- node tables
- relationship tables
- properties
- property data types
- primary keys
- generated example queries

Click a table such as `Document` or `RELATED_TO` to see details.

To try a generated query:

1. Click **Use** beside a generated query.
2. The console opens **Query**.
3. Click **Run query**.

### Query

Use **Query** when you want to inspect graph data with Cypher.

The query editor is guarded as read-only. It is intended for inspection, not destructive database changes.

Useful first query:

```cypher
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
RETURN d.title AS document, c.section AS section, c.text AS text
LIMIT 10
```

Useful relationship query:

```cypher
MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity)
RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity, r.evidence AS evidence
LIMIT 20
```

Ways to run a query:

- Click **Run query**
- Press `Cmd + Enter` on macOS
- Press `Ctrl + Enter` on Windows/Linux

Result tabs:

| Tab | Use It For |
| --- | --- |
| **Table** | Normal rows and columns |
| **Graph** | Visual relationships when the result can be graphed |
| **JSON** | Clean JSON rows |
| **Raw** | Full API response, including metadata |

Query tools:

| Button | Meaning |
| --- | --- |
| **Format** | Lightly formats common Cypher keywords onto new lines |
| **Save** | Saves the current query in browser local storage |
| **Stop** | Reserved for future cancellation support |

### Learn & Practice

Use **Learn & Practice** when you want to learn KuzuDB concepts inside the product before working on your own data.

This page includes:

- a tutorial catalog
- search and topic filters
- step-by-step tutorial details
- schema previews
- sample datasets
- a practice query workspace
- table, graph, JSON, and log result tabs
- a sample data manager
- beginner concept notes

Practice datasets are loaded into isolated folders:

```text
.kuzu-practice/<tutorial-id>/
```

They do not modify the active database shown on the **Databases** page.

#### Run Your First Practice Tutorial

1. Open **Learn & Practice**.
2. Select **Getting Started with KuzuDB**.
3. Click **Load Dataset**.
4. In **Practice Query**, choose the first sample query.
5. Click **Run practice query**.
6. Open **Table** to see rows.
7. Open **JSON** to see the same rows as JSON.
8. Open **Graph** when the result includes connected graph objects.
9. Click **Copy** beside any tutorial query if you want it on your clipboard.
10. Click **Open in Query Editor** or **Copy to Query Editor** to continue in the main **Query** page.

#### Use The Tutorial Catalog

Tutorial cards show:

| Field | Meaning |
| --- | --- |
| Title | What you will learn |
| Difficulty | Beginner, Intermediate, or Advanced |
| Tags | Topic filters such as `Cypher Basics` or `Network Analysis` |
| Estimated time | Approximate completion time |
| Dataset availability | Whether the tutorial has practice data |
| Open Source | Link to the official Kuzu tutorial source |

Use the topic filter for:

- Getting Started
- Data Import
- Cypher Basics
- Graph Modeling
- Network Analysis
- Python
- JavaScript / Node.js
- Marimo / Notebook
- Advanced Queries

#### Use The Practice Workspace

The left side shows the tutorial steps and sample queries. The right side is a practice editor.

Common actions:

| Action | What It Does |
| --- | --- |
| **Load dataset** | Creates a clean sandbox database for the selected tutorial |
| **Run practice query** | Runs read-only Cypher against the sandbox |
| **Reset sandbox** | Deletes the selected tutorial sandbox |
| **Copy** | Copies the query text |
| **Open in Query Editor** | Opens the main Query page with the tutorial query |
| **Open dataset graph** | Opens a graph snapshot for the tutorial sandbox |
| **Mark complete** | Updates tutorial progress for the current app session |

For the full tutorial feature reference, see [Learn & Practice Guide](./LEARN_AND_PRACTICE.md).

### Explore Graph

Use **Explore Graph** when you want to inspect the database visually without writing Cypher.

Steps:

1. Choose a node table, such as `Document`, `Entity`, or `Topic`.
2. Choose a depth.
3. Choose a limit.
4. Click **Explore**.

Depth means how far the graph expands from the selected table.

| Depth | Meaning |
| --- | --- |
| `1` | Show directly connected records |
| `2` | Expand one more relationship away |
| `3` | Expand farther, but may show more data |

Graph controls:

- scroll to zoom
- drag the background to pan
- drag nodes to rearrange them
- click a node or edge to view details
- click **Reset layout** to return to the default layout
- click **Fit** to re-render the graph in the available space

If the graph is too large, lower the limit or use a smaller depth.

### Import Data

Use **Import Data** to create a knowledge graph from pasted source text.

This is the most beginner-friendly way to add new data.

#### Step 1: Prepare Some Text

You can paste:

- a support article
- a runbook
- a product note
- an FAQ
- a policy
- meeting notes
- a small CSV copied as text

Example text:

```text
Customer Portal uses API Key authentication for support requests.
Kuzu stores the support knowledge graph.
Support Agents use the Customer Portal to answer onboarding questions.
Tenant Isolation protects customer data.
```

#### Step 2: Fill Document Fields

| Field | Example |
| --- | --- |
| Document title | `Support Portal Authentication Notes` |
| Source | `docs/support/authentication.md` |
| Owner | `Support Team` |
| Summary | `How the support portal uses API keys and tenant isolation.` |
| Source text or CSV notes | Paste the source text |

#### Step 3: Add Topics

Topics are comma-separated.

Example:

```text
Support, Security, Onboarding
```

#### Step 4: Add Entities

Use one entity per line.

Format:

```text
Name | Type | Description
```

Example:

```text
Customer Portal | Application | Portal used by support agents
API Key | Security Control | Token used to authenticate requests
Kuzu | Graph Database | Embedded graph database
Tenant Isolation | Security Control | Boundary that protects customer data
```

Tip: click **Suggest entities** after pasting source text. The suggestions are editable, so treat them as a starting point.

#### Step 5: Add Relationships

Use one relationship per line.

Format:

```text
From Entity | RELATION | To Entity | Evidence
```

Example:

```text
Customer Portal | USES | API Key | Portal requests require an API key
Customer Portal | READS_FROM | Kuzu | Portal answers use graph-backed context
Tenant Isolation | PROTECTS | Customer Portal | Tenant isolation protects customer access
```

The `From Entity` and `To Entity` names should match entities that already exist or entities you are creating in the form.

#### Step 6: Preview

Click **Preview** before importing.

The preview shows:

- whether the import is valid
- warnings
- planned node operations
- planned relationship operations
- a generated Cypher-style preview

If the preview says something is missing, fix the form and preview again.

#### Step 7: Run Import

Click **Run import**.

The console will:

1. create one `Document`
2. split source text into `Chunk` records
3. connect document to chunks with `HAS_CHUNK`
4. create or reuse `Topic` records
5. connect the document to topics with `ABOUT`
6. create or reuse `Entity` records
7. connect chunks to entities with `MENTIONS`
8. create entity relationships with `RELATED_TO`

After import, the console opens **Explore Graph** so you can inspect the result.

### Jobs / Logs

Use **Jobs / Logs** to troubleshoot.

It shows:

- query executions
- imports
- database open events
- status
- duration
- row count
- error messages

Click **Clear local history** to clear the in-memory browser/API session history.

### Settings

Use **Settings** to review:

- current database connection summary
- storage label
- mode
- table counts
- safety posture

The console intentionally avoids exposing arbitrary shell commands or unrestricted local file access to the browser.

## Common Workflows

### Practice Before Creating Your Own Graph

1. Open **Learn & Practice**.
2. Pick **Getting Started with KuzuDB** or **Cypher Query Practice**.
3. Click **Load Dataset**.
4. Run two or three sample queries.
5. Look at the same result in **Table**, **Graph**, and **JSON**.
6. Click **Open in Query Editor** for a query you understand.
7. Return to **Import Data** when you are ready to add your own source text.

### Create A New Knowledge Graph

1. Open **Import Data**.
2. Paste your source text.
3. Add a title, source, owner, and summary.
4. Add topics.
5. Add entities.
6. Add relationships.
7. Click **Preview**.
8. Fix warnings if needed.
9. Click **Run import**.
10. Inspect the graph in **Explore Graph**.

### Find Something In The Graph

1. Use the search box in the top bar.
2. Type an entity, topic, or document keyword.
3. Select a result.
4. Review it in **Explore Graph**.

### Learn The Schema

1. Open **Schema**.
2. Click each table.
3. Review properties and primary keys.
4. Click **Use** on a generated query.
5. Run that query in **Query**.

### Run A Safe Query

1. Open **Query**.
2. Paste a read-only Cypher query.
3. Click **Run query**.
4. Review the **Table** result.
5. Open **Graph** if the result contains relationships.
6. Open **JSON** or **Raw** for debugging.

## Troubleshooting

### The page does not open

Confirm the app server is running:

```bash
npm run app:dev
```

Then open:

```text
http://127.0.0.1:8787
```

### Login fails

Use the default local credentials unless you changed environment variables:

```text
admin@example.com / kuzu
```

If you changed them, check:

```text
KG_APP_USER
KG_APP_PASSWORD
```

### Query fails

The Query page only allows read-only Cypher. Mutating keywords such as `CREATE`, `DELETE`, `DROP`, `SET`, and `MERGE` are blocked there.

Use **Import Data** for supported structured writes.

### Practice query says to load a dataset

Open **Learn & Practice**, select the tutorial, and click **Load Dataset**. Practice queries run against a tutorial sandbox, not the active database.

### Practice data looks wrong

Click **Reset sandbox**, then click **Load Dataset** again. This recreates only `.kuzu-practice/<tutorial-id>/`.

### Graph is too crowded

In **Explore Graph**:

- lower the limit
- use depth `1`
- start from a narrower table such as `Document` or `Topic`

### Import preview has warnings

Common causes:

- missing document title
- missing source text
- relationship line missing `from`, `relation`, or `to`
- entity names in relationships do not match the entity list

### Logs disappeared

Logs are local in-memory history for the running app session. They are not a permanent audit log yet.

## Safety Notes

- The Query page is read-only by design.
- Import writes are structured and validated by the backend.
- Tutorial practice data is stored under `.kuzu-practice/` and is isolated from the active database.
- The browser cannot run arbitrary shell commands.
- The browser does not get unrestricted local filesystem access.
- Change the default login before exposing the console outside local development.

## Next Steps After The First Import

After creating your first graph:

1. Open **Schema** and understand what was created.
2. Open **Query** and run a few sample queries.
3. Open **Explore Graph** and inspect relationships.
4. Add another document through **Import Data**.
5. Open **Learn & Practice** when you want guided examples.
6. Use **Jobs / Logs** to review what happened.
