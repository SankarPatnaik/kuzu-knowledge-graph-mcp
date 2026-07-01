import { cypherString } from './cypher.js';
import type { KuzuGraph } from './kuzuGraph.js';

const documents = [
  {
    id: 'doc-workbench-overview',
    title: 'GenAI Workbench Product Overview',
    source: 'docs/product/workbench-overview.md',
    owner: 'Product',
    createdAt: '2026-07-01',
    summary: 'Workbench is a low-code/no-code GenAI product for document ingestion, chunking, vector search, context graphs, prompt testing, and deployment.',
  },
  {
    id: 'doc-context-cost',
    title: 'Context Cost Reduction Runbook',
    source: 'docs/runbooks/context-cost.md',
    owner: 'AI Platform',
    createdAt: '2026-07-01',
    summary: 'Bad context increases LLM token cost. Workbench reduces waste by retrieving focused chunks and graph-linked entities before calling the model.',
  },
  {
    id: 'doc-deployment',
    title: 'Customer Deployment Checklist',
    source: 'docs/deploy/customer-checklist.md',
    owner: 'Solutions',
    createdAt: '2026-07-01',
    summary: 'Production rollout requires API keys, tenant isolation, database backups, observability, and protected network ingress.',
  },
  {
    id: 'doc-support-journey',
    title: 'Support Journey: First Customer Onboarding',
    source: 'examples/customer-onboarding.md',
    owner: 'Customer Success',
    createdAt: '2026-07-01',
    summary: 'A customer uploads policy documents, builds vector and graph indexes, tests answers, and deploys the assistant through the REST API.',
  },
];

const chunks = [
  {
    id: 'chunk-overview-1',
    documentId: 'doc-workbench-overview',
    position: 1,
    section: 'Workflow',
    tokenEstimate: 61,
    text: 'Workbench guides users through upload, chunking, vector indexing, context graph creation, prompt configuration, playground testing, and deployment.',
  },
  {
    id: 'chunk-overview-2',
    documentId: 'doc-workbench-overview',
    position: 2,
    section: 'Storage',
    tokenEstimate: 55,
    text: 'The product stores raw documents in S3-compatible storage and uses Chroma, Qdrant, or PGVector for semantic retrieval.',
  },
  {
    id: 'chunk-cost-1',
    documentId: 'doc-context-cost',
    position: 1,
    section: 'Problem',
    tokenEstimate: 58,
    text: 'AI cost rises when the prompt contains too much irrelevant context. The retrieval layer should send the smallest useful evidence set to the LLM.',
  },
  {
    id: 'chunk-cost-2',
    documentId: 'doc-context-cost',
    position: 2,
    section: 'Graph Strategy',
    tokenEstimate: 70,
    text: 'The context graph links documents, chunks, entities, and topics. Kuzu can read this graph through Cypher so MCP clients can ask for precise context.',
  },
  {
    id: 'chunk-deploy-1',
    documentId: 'doc-deployment',
    position: 1,
    section: 'Security',
    tokenEstimate: 59,
    text: 'Before production deployment, enable API keys, tenant-scoped indexes, secret management, HTTPS ingress, and database backup routines.',
  },
  {
    id: 'chunk-deploy-2',
    documentId: 'doc-deployment',
    position: 2,
    section: 'Operations',
    tokenEstimate: 56,
    text: 'Operational review should track retrieval quality, prompt size, graph context size, model latency, token usage, and failed requests.',
  },
  {
    id: 'chunk-journey-1',
    documentId: 'doc-support-journey',
    position: 1,
    section: 'Customer Story',
    tokenEstimate: 73,
    text: 'A customer uploads policy PDFs, chooses chunk overlap, indexes the chunks, builds the Kuzu knowledge graph, and tests policy questions in the playground.',
  },
  {
    id: 'chunk-journey-2',
    documentId: 'doc-support-journey',
    position: 2,
    section: 'Deployment Story',
    tokenEstimate: 67,
    text: 'After validation, the team uses the REST API endpoint from Deploy and Integrate to connect the assistant to an internal support portal.',
  },
];

const entities = [
  {
    id: 'entity-workbench',
    name: 'GenAI Workbench',
    type: 'Product',
    description: 'Low-code/no-code product for building retrieval-augmented GenAI assistants.',
  },
  {
    id: 'entity-kuzu',
    name: 'Kuzu',
    type: 'GraphDatabase',
    description: 'Embedded open-source property graph database that supports Cypher queries.',
  },
  {
    id: 'entity-mcp',
    name: 'Model Context Protocol',
    type: 'IntegrationProtocol',
    description: 'Protocol that lets AI clients call tools and read resources from external systems.',
  },
  {
    id: 'entity-context-graph',
    name: 'Context Graph',
    type: 'ArchitectureConcept',
    description: 'Graph layer that links documents, chunks, entities, and topics to reduce irrelevant context.',
  },
  {
    id: 'entity-vector-search',
    name: 'Vector Search',
    type: 'RetrievalMethod',
    description: 'Semantic retrieval layer using embeddings and vector databases.',
  },
  {
    id: 'entity-api-key',
    name: 'API Key',
    type: 'SecurityControl',
    description: 'Secret token used to protect Workbench API traffic.',
  },
  {
    id: 'entity-tenant-isolation',
    name: 'Tenant Isolation',
    type: 'SecurityControl',
    description: 'Production boundary that keeps customer data, indexes, and graph records separated.',
  },
  {
    id: 'entity-rest-api',
    name: 'REST API',
    type: 'IntegrationSurface',
    description: 'Deployment interface used by applications to query the configured assistant.',
  },
];

const topics = [
  {
    id: 'topic-product-workflow',
    name: 'Product Workflow',
    description: 'End-to-end user journey inside GenAI Workbench.',
  },
  {
    id: 'topic-cost-control',
    name: 'Cost Control',
    description: 'Reducing token waste by improving retrieval and context selection.',
  },
  {
    id: 'topic-deployment',
    name: 'Deployment',
    description: 'Steps needed to run the product safely in customer environments.',
  },
  {
    id: 'topic-knowledge-graph',
    name: 'Knowledge Graph',
    description: 'Graph representation of documents, chunks, entities, topics, and relationships.',
  },
];

const chunkMentions = [
  ['chunk-overview-1', 'entity-workbench', 0.99],
  ['chunk-overview-1', 'entity-context-graph', 0.92],
  ['chunk-overview-2', 'entity-vector-search', 0.94],
  ['chunk-cost-1', 'entity-context-graph', 0.88],
  ['chunk-cost-2', 'entity-context-graph', 0.98],
  ['chunk-cost-2', 'entity-kuzu', 0.95],
  ['chunk-cost-2', 'entity-mcp', 0.91],
  ['chunk-deploy-1', 'entity-api-key', 0.97],
  ['chunk-deploy-1', 'entity-tenant-isolation', 0.94],
  ['chunk-deploy-2', 'entity-context-graph', 0.86],
  ['chunk-journey-1', 'entity-kuzu', 0.91],
  ['chunk-journey-1', 'entity-vector-search', 0.9],
  ['chunk-journey-2', 'entity-rest-api', 0.96],
];

const documentTopics = [
  ['doc-workbench-overview', 'topic-product-workflow', 0.95],
  ['doc-workbench-overview', 'topic-knowledge-graph', 0.72],
  ['doc-context-cost', 'topic-cost-control', 0.99],
  ['doc-context-cost', 'topic-knowledge-graph', 0.94],
  ['doc-deployment', 'topic-deployment', 0.98],
  ['doc-support-journey', 'topic-product-workflow', 0.88],
  ['doc-support-journey', 'topic-deployment', 0.77],
];

const entityLinks = [
  ['entity-workbench', 'entity-context-graph', 'USES', 'Workbench includes a Context Graph step after vector indexing.'],
  ['entity-context-graph', 'entity-kuzu', 'CAN_BE_STORED_IN', 'Kuzu stores graph relationships and can answer Cypher queries.'],
  ['entity-mcp', 'entity-kuzu', 'READS_FROM', 'This server exposes read tools over MCP and reads from Kuzu.'],
  ['entity-context-graph', 'entity-vector-search', 'COMPLEMENTS', 'Vector search finds semantic chunks; graph context explains nearby entities and topics.'],
  ['entity-api-key', 'entity-rest-api', 'PROTECTS', 'REST API calls should require API keys in production.'],
  ['entity-tenant-isolation', 'entity-rest-api', 'SCOPES', 'Tenant boundaries should scope API access and graph records.'],
  ['entity-rest-api', 'entity-workbench', 'DEPLOYS', 'Workbench deployment exposes REST calls for application integration.'],
];

export async function seedSampleData(graph: KuzuGraph): Promise<void> {
  for (const document of documents) {
    await graph.exec(
      `CREATE (:Document {id: ${cypherString(document.id)}, title: ${cypherString(document.title)}, source: ${cypherString(document.source)}, owner: ${cypherString(document.owner)}, createdAt: ${cypherString(document.createdAt)}, summary: ${cypherString(document.summary)}})`,
    );
  }

  for (const chunk of chunks) {
    await graph.exec(
      `CREATE (:Chunk {id: ${cypherString(chunk.id)}, text: ${cypherString(chunk.text)}, tokenEstimate: ${chunk.tokenEstimate}, section: ${cypherString(chunk.section)}})`,
    );
    await graph.exec(
      `MATCH (d:Document), (c:Chunk) WHERE d.id = ${cypherString(chunk.documentId)} AND c.id = ${cypherString(chunk.id)} CREATE (d)-[:HAS_CHUNK {position: ${chunk.position}}]->(c)`,
    );
  }

  for (const entity of entities) {
    await graph.exec(
      `CREATE (:Entity {id: ${cypherString(entity.id)}, name: ${cypherString(entity.name)}, type: ${cypherString(entity.type)}, description: ${cypherString(entity.description)}})`,
    );
  }

  for (const topic of topics) {
    await graph.exec(
      `CREATE (:Topic {id: ${cypherString(topic.id)}, name: ${cypherString(topic.name)}, description: ${cypherString(topic.description)}})`,
    );
  }

  for (const [chunkId, entityId, confidence] of chunkMentions) {
    await graph.exec(
      `MATCH (c:Chunk), (e:Entity) WHERE c.id = ${cypherString(String(chunkId))} AND e.id = ${cypherString(String(entityId))} CREATE (c)-[:MENTIONS {confidence: ${confidence}}]->(e)`,
    );
  }

  for (const [documentId, topicId, weight] of documentTopics) {
    await graph.exec(
      `MATCH (d:Document), (t:Topic) WHERE d.id = ${cypherString(String(documentId))} AND t.id = ${cypherString(String(topicId))} CREATE (d)-[:ABOUT {weight: ${weight}}]->(t)`,
    );
  }

  for (const [fromId, toId, relation, evidence] of entityLinks) {
    await graph.exec(
      `MATCH (a:Entity), (b:Entity) WHERE a.id = ${cypherString(String(fromId))} AND b.id = ${cypherString(String(toId))} CREATE (a)-[:RELATED_TO {relation: ${cypherString(String(relation))}, evidence: ${cypherString(String(evidence))}}]->(b)`,
    );
  }
}

export const sampleJourney = {
  name: 'GenAI Workbench support and deployment knowledge graph',
  question: 'How does the context graph reduce AI cost and how do I deploy it safely?',
  expectedPath: [
    'Search the question terms across chunks, documents, entities, and topics.',
    'Find Context Graph, Kuzu, Vector Search, API Key, Tenant Isolation, and REST API entities.',
    'Read the document context for context-cost and deployment documents.',
    'Return the small evidence set instead of sending every document to an LLM.',
  ],
};

