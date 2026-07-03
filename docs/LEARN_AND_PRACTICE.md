# Learn & Practice Guide

Learn & Practice is the in-app tutorial center for Kuzu Graph Console. It lets users learn Kuzu concepts, load safe example data, run Cypher queries, inspect results, and reset practice databases without using the CLI.

The feature uses bundled tutorial metadata inspired by the official Kuzu tutorials repository:

- Source repo: https://github.com/kuzudb/tutorials
- Source path: https://github.com/kuzudb/tutorials/tree/main/src
- License: MIT

The app does not depend on GitHub at runtime.

Official source folders reviewed for the initial registry include `network_analysis`, `video_1` through `video_12`, and `video_13_marimo_1` through `video_15_marimo_3`.

## Quick Start

1. Start the console:

```bash
npm run app:dev
```

2. Open:

```text
http://127.0.0.1:8787
```

3. Sign in:

```text
admin@example.com / kuzu
```

4. Click **Learn & Practice** in the sidebar.
5. Use the Learn tabs: **Home**, **Catalog**, **Tutorial**, **Practice**, **Data**, and **Help**.
6. Click **Start with Cypher Basics** to open Practice with a query ready to run.
7. Click **Load dataset**.
8. Click **Run practice query**.
9. Review the result in **Table**, **Graph**, **JSON**, or **Logs**.

## Beginner Workflow

### 1. Start From Home

The **Home** tab gives a beginner-friendly starting point:

- **Start with Cypher Basics** opens the practice workspace with a beginner query.
- **Explore Sample Graphs** opens the sample data manager.
- **Practice Network Analysis** opens the network tutorial in Practice.
- **Load Tutorial Dataset** opens the data manager.
- **Featured Tutorials** shows recommended tutorials from the bundled catalog.

### 2. Browse Tutorials

Open **Catalog**, then use the search box or topic filter to find a tutorial.

Each tutorial card shows:

- title
- description
- difficulty
- tags
- estimated time
- dataset availability
- source link

Click **Start Tutorial** to open the detail panel.

### 3. Read The Tutorial Detail

Open **Tutorial** to read the selected tutorial. The detail page includes:

- learning objectives
- schema preview
- dataset files
- step-by-step instructions
- runnable query blocks
- expected result notes
- official source attribution

Use **Copy** to copy a query, **Run in Practice** to send it to the practice workspace, or **Open in Query Editor** to move it into the main Query page.

### 4. Load Sample Data

Open **Data** or use a tutorial card's **Load Dataset** button before running practice queries.

Practice data is loaded into:

```text
.kuzu-practice/<tutorial-id>/
```

This is separate from the active Kuzu database configured by `KUZU_DB_PATH`.

### 5. Run Practice Queries

Open **Practice**:

1. Pick a sample query or type your own read-only Cypher.
2. Click **Run practice query**.
3. Review row count and execution time.
4. Switch between **Table**, **Graph**, **JSON**, and **Logs**.

Practice queries use the same read-only Cypher guard as the main Query page.

### 6. Reset A Practice Dataset

Use **Reset sandbox** or the **Sample Data Manager** reset action when you want a clean tutorial database.

Reset removes only the tutorial sandbox folder. It does not modify the active database.

### 7. Mark A Tutorial Complete

Click **Mark complete** when you finish the tutorial. The progress summary updates for the current app session.

## Product Areas

| Area | Purpose |
| --- | --- |
| Learn & Practice Home | Welcome card, quick action cards, progress summary, search, filters, and featured tutorials |
| Tutorial Catalog | Searchable list of tutorial cards |
| Tutorial Detail | Objectives, schema preview, dataset files, steps, queries, and attribution |
| Practice Workspace | Split workspace for steps, query editor, results, graph, JSON, and logs |
| Sample Data Manager | Dataset load/reload/reset/schema/explore actions |
| Help / Concepts | Beginner explanations and common task guidance for safe practice |

## Bundled Starter Tutorials

The first bundled catalog includes:

1. **Getting Started with KuzuDB**
2. **Importing CSV Data**
3. **Exploring a Knowledge Graph**
4. **Network Analysis Basics**
5. **Cypher Query Practice**

Each tutorial keeps a link to the related official source folder and MIT attribution.

## Architecture Changes

New backend files:

- `src/tutorials.ts`: structured tutorial registry, schema metadata, steps, sample queries, and bundled practice documents
- `src/tutorialService.ts`: tutorial catalog, progress, isolated practice database loading, reset, schema, graph, and query execution

Updated backend file:

- `src/appServer.ts`: authenticated tutorial API routes

Updated frontend files:

- `web/index.html`: sidebar item and Learn & Practice panels
- `web/app.js`: tutorial catalog rendering, practice actions, query copy/open/run behavior, progress refresh, and graph/table/JSON/log results
- `web/styles.css`: enterprise-style tutorial cards, split practice layout, responsive behavior, and graph panel support

Updated test file:

- `scripts/smoke.ts`: validates bundled tutorial catalog, loads a tutorial practice database, and runs a tutorial query

## API Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/tutorials` | List tutorials, topics, attribution, and progress |
| `GET` | `/api/tutorials/progress` | Read tutorial progress for the current process |
| `GET` | `/api/tutorials/:id` | Read one tutorial with practice state |
| `POST` | `/api/tutorials/:id/load-data` | Reset and load the tutorial dataset into `.kuzu-practice/<id>/` |
| `POST` | `/api/tutorials/:id/reset` | Delete the tutorial sandbox database |
| `POST` | `/api/tutorials/:id/query` | Run guarded read-only Cypher against the tutorial sandbox |
| `GET` | `/api/tutorials/:id/schema` | Return tutorial schema metadata and runtime schema if loaded |
| `GET` | `/api/tutorials/:id/graph` | Return a graph snapshot for the loaded tutorial sandbox |
| `POST` | `/api/tutorials/:id/complete` | Mark a tutorial complete for the current process |
| `POST` | `/api/tutorials/sync-official` | Placeholder response; runtime sync is intentionally disabled |

## Tutorial Storage

Tutorial content is stored as TypeScript metadata in `src/tutorials.ts`.

The registry uses a structured model with:

- tutorial identity and source URL
- difficulty and estimated time
- tags and concepts
- learning objectives
- dataset metadata
- schema metadata
- step-by-step instructions
- sample queries
- MIT attribution

Practice records are generated through the existing `KnowledgeGraphService.createKnowledgeGraph()` flow. That keeps tutorial data compatible with the same `Document`, `Chunk`, `Entity`, `Topic`, `HAS_CHUNK`, `MENTIONS`, `ABOUT`, and `RELATED_TO` schema used by the rest of the product.

## GitHub Sync

Runtime GitHub fetching is not implemented. This is intentional:

- the UI should work offline after install
- the browser should not depend on GitHub availability
- tutorial conversion should be reviewed before users see it
- the official tutorials repo is archived/read-only

The current sync endpoint returns a `not_implemented` response explaining that future sync should be an admin-only script.

A future sync script can:

1. Download or clone `https://github.com/kuzudb/tutorials`.
2. Read `src/network_analysis`, `src/video_*`, and notebook folders.
3. Extract markdown, Python, notebooks, CSV/data files, and Cypher snippets.
4. Convert useful examples into the local tutorial metadata format.
5. Store generated assets in the repo.
6. Preserve original source URLs and MIT attribution.

Do not fetch tutorials dynamically in the browser.

## Safety Model

Practice datasets are isolated by tutorial ID:

```text
.kuzu-practice/getting-started-kuzu/
.kuzu-practice/importing-csv-data/
.kuzu-practice/exploring-knowledge-graph/
```

The active database path, usually `./data/kuzu-demo`, is not used for tutorial practice data.

Safety behavior:

- loading a tutorial first resets only that tutorial sandbox
- resetting a tutorial deletes only `.kuzu-practice/<tutorial-id>/`
- practice queries are read-only
- `.kuzu-practice/` is ignored by Git
- every tutorial page shows the isolation warning

## Run And Test

Build:

```bash
npm run build
```

Smoke test:

```bash
npm test
```

Expected smoke output includes:

```json
{
  "status": "ok",
  "tutorialCount": 5,
  "tutorialPracticeRows": 1
}
```

Manual test checklist:

1. Start `npm run app:dev`.
2. Log in.
3. Open **Learn & Practice**.
4. Search for `Cypher`.
5. Confirm the Catalog tab opens and shows matching cards.
6. Click **Start with Cypher Basics** on Home.
7. Confirm Practice opens with a query in the editor.
8. Click **Load dataset**.
9. Run the sample query.
10. Confirm **Table** and **JSON** show rows.
11. Open **Graph** for relationship-shaped results.
12. Click **Copy** and confirm the query copies.
13. Click **Query Editor** and confirm the main Query page opens with the query.
14. Open **Data** and reset the sandbox.

## Limitations And TODOs

- Tutorial progress is in memory for the current app process. Persist it later if users need long-term completion tracking.
- The sync endpoint is a safe placeholder. Add an admin-only script when full official tutorial conversion is needed.
- The first tutorial set is curated starter content, not a full conversion of every official tutorial folder.
- Practice datasets are generated through the product schema, so they are beginner-friendly rather than raw copies of notebooks or CSV files.
- Authentication is still local/demo oriented. Change `KG_APP_USER` and `KG_APP_PASSWORD` before exposing the app beyond local development.
