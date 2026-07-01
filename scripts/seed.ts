import fs from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { KuzuGraph } from '../src/kuzuGraph.js';
import { seedSampleData } from '../src/seedData.js';

const reset = process.argv.includes('--reset');
const config = loadConfig({ autoSeed: false });

if (reset) {
  await fs.rm(config.dbPath, { recursive: true, force: true });
  console.log(`Reset Kuzu database at ${config.dbPath}`);
}

const graph = new KuzuGraph(config);
await graph.connect();

const existingDocuments = await graph.countNodes('Document');
if (existingDocuments > 0) {
  console.log(`Database already has ${existingDocuments} documents. Use npm run seed to reset and reseed.`);
} else {
  await seedSampleData(graph);
  console.log(`Seeded sample knowledge graph at ${config.dbPath}`);
}

