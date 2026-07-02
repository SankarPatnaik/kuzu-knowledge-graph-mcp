import fs from 'node:fs/promises';
import path from 'node:path';
import { KuzuGraph } from '../src/kuzuGraph.js';
import { KnowledgeGraphService } from '../src/knowledgeGraphService.js';

const smokeDbPath = path.resolve('.tmp/smoke-kuzu');
await fs.rm(smokeDbPath, { recursive: true, force: true });

const service = new KnowledgeGraphService(
  new KuzuGraph({
    dbPath: smokeDbPath,
    autoCreateSchema: true,
    autoSeed: true,
  }),
);

await service.connect();

const overview = await service.overview();
const questionContext = await service.answerContext('How does Kuzu context graph reduce AI cost and support deployment?', 5);
const safeCypher = await service.runReadOnlyCypher(
  'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity',
  20,
);
const created = await service.createKnowledgeGraph({
  title: 'Kuzu Studio Smoke Runbook',
  source: 'smoke/studio.md',
  owner: 'QA',
  summary: 'Smoke test document for the Kuzu Studio product path.',
  body: 'Kuzu Studio lets users create a Knowledge Graph from pasted text. Kuzu stores the graph, and the Studio visualizer helps users inspect documents, entities, topics, and relationships.',
  topics: ['Studio', 'Knowledge Graph'],
  entities: [
    { name: 'Kuzu Studio', type: 'Product', description: 'Browser app for creating and exploring the graph.' },
    { name: 'Knowledge Graph', type: 'Data Model', description: 'Connected documents, chunks, entities, and topics.' },
    { name: 'Kuzu', type: 'Graph Database', description: 'Embedded graph database used by the app.' },
  ],
  relationships: [{ from: 'Kuzu Studio', relation: 'CREATES', to: 'Knowledge Graph', evidence: 'Users create graph records from source text.' }],
});
const snapshot = await service.graphSnapshot(500);

if ((overview.nodeCounts as Record<string, number>).Document < 4) {
  throw new Error('Smoke test expected at least four sample documents.');
}

if ((questionContext.matches as unknown[]).length === 0) {
  throw new Error('Smoke test expected question context matches.');
}

if (safeCypher.rowCount === 0) {
  throw new Error('Smoke test expected read-only Cypher rows.');
}

const createdDocument = created.document as Record<string, unknown>;
const snapshotNodes = snapshot.nodes as Record<string, unknown>[];
if (!snapshotNodes.some((node) => node.id === createdDocument.id)) {
  throw new Error('Smoke test expected the Studio-created document in the graph snapshot.');
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      dbPath: smokeDbPath,
      nodeCounts: overview.nodeCounts,
      questionMatches: (questionContext.matches as unknown[]).length,
      cypherRows: safeCypher.rowCount,
      studioDocument: createdDocument.id,
      snapshotNodes: snapshotNodes.length,
    },
    null,
    2,
  ),
);
