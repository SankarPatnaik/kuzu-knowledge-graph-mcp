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

if ((overview.nodeCounts as Record<string, number>).Document < 4) {
  throw new Error('Smoke test expected at least four sample documents.');
}

if ((questionContext.matches as unknown[]).length === 0) {
  throw new Error('Smoke test expected question context matches.');
}

if (safeCypher.rowCount === 0) {
  throw new Error('Smoke test expected read-only Cypher rows.');
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      dbPath: smokeDbPath,
      nodeCounts: overview.nodeCounts,
      questionMatches: (questionContext.matches as unknown[]).length,
      cypherRows: safeCypher.rowCount,
    },
    null,
    2,
  ),
);

