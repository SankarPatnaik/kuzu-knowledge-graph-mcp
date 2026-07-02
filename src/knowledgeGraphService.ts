import { randomUUID } from 'node:crypto';
import { appendLimit, cypherString, validateReadOnlyCypher } from './cypher.js';
import { KuzuGraph } from './kuzuGraph.js';
import { NODE_TABLES, REL_TABLES, SCHEMA_DESCRIPTION, SCHEMA_TABLE_DETAILS } from './schema.js';
import type { JsonValue, QueryRow, SearchResult } from './types.js';

type EntityDraft = {
  name: string;
  type?: string;
  description?: string;
};

type EntityRelationshipDraft = {
  from: string;
  to: string;
  relation: string;
  evidence?: string;
};

type KnowledgeGraphDraft = {
  title: string;
  source?: string;
  owner?: string;
  createdAt?: string;
  summary?: string;
  body: string;
  topics?: string[];
  entities?: EntityDraft[];
  relationships?: EntityRelationshipDraft[];
};

type ExploreGraphRequest = {
  table: string;
  depth?: number;
  limit?: number;
};

type DocumentContext = {
  document: QueryRow | null;
  chunks: QueryRow[];
  entities: QueryRow[];
  topics: QueryRow[];
};

function asString(value: JsonValue | undefined): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function contains(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function scoreText(text: string, terms: string[]): number {
  const normalized = text.toLowerCase();
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

function termsFromQuery(query: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'can',
    'do',
    'does',
    'for',
    'from',
    'how',
    'i',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'the',
    'to',
    'what',
    'when',
    'where',
    'with',
  ]);

  return [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((term) => term.length > 2 && !stopWords.has(term))
    .slice(0, 12);
}

function toSnippet(text: string, length = 220): string {
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || 'item';
}

function uniqueId(prefix: string, label: string): string {
  return `${prefix}-${slugify(label)}-${randomUUID().slice(0, 8)}`;
}

function compactUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      output.push(value);
    }
  }

  return output;
}

function inferEntities(text: string): EntityDraft[] {
  const candidates = text.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3}\b/g) ?? [];
  const blocked = new Set(['The', 'This', 'That', 'When', 'Where', 'Before', 'After', 'Users', 'Create']);
  return compactUnique(candidates)
    .filter((name) => !blocked.has(name) && name.length > 2)
    .slice(0, 10)
    .map((name) => ({
      name,
      type: 'Concept',
      description: `Concept extracted from the uploaded knowledge text: ${name}.`,
    }));
}

function splitIntoChunks(text: string, maxChars = 900): string[] {
  const paragraphs = text
    .split(/\n{2,}/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const source = paragraphs.length > 0 ? paragraphs : [text.trim()].filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of source) {
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let index = 0; index < paragraph.length; index += maxChars) {
        chunks.push(paragraph.slice(index, index + maxChars).trim());
      }
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function estimateTokens(text: string): number {
  const words = text.match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words * 1.33));
}

function normalizeLimit(limit: number, fallback = 300): number {
  return Math.max(1, Math.min(Number.isFinite(limit) ? Math.trunc(limit) : fallback, 1000));
}

function graphNode(id: string, label: string, type: string, properties: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  return {
    id,
    label,
    type,
    ...properties,
  };
}

export class KnowledgeGraphService {
  constructor(private readonly graph: KuzuGraph) {}

  async connect(): Promise<void> {
    await this.graph.connect();
  }

  async schema(): Promise<Record<string, JsonValue>> {
    const nodeCounts = await this.nodeCounts();
    const relCounts = await this.relationshipCounts();

    return {
      databasePath: this.graph.dbPath,
      nodeTables: SCHEMA_DESCRIPTION.nodes,
      relationshipTables: SCHEMA_DESCRIPTION.relationships,
      tableDetails: this.schemaDetails(),
      nodeCounts,
      relationshipCounts: relCounts,
      exampleQueries: [
        "MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN d.title, c.section, c.text LIMIT 5",
        "MATCH (c:Chunk)-[:MENTIONS]->(e:Entity) RETURN c.id, e.name, e.type LIMIT 10",
        "MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name, r.relation, b.name LIMIT 10",
      ],
    };
  }

  schemaDetails(): Record<string, JsonValue> {
    const nodeTables = SCHEMA_TABLE_DETAILS.nodes.map((table) => ({
      name: table.name,
      description: table.description,
      properties: table.properties.map((property) => ({
        name: property.name,
        type: property.type,
        primaryKey: property.primaryKey,
      })),
      sampleQueries: [
        `MATCH (n:${table.name}) RETURN count(n) AS count`,
        `MATCH (n:${table.name}) RETURN n LIMIT 10`,
        `MATCH (n:${table.name}) RETURN ${table.properties.map((property) => `n.${property.name} AS ${property.name}`).join(', ')} LIMIT 10`,
      ],
    }));
    const relationshipTables = SCHEMA_TABLE_DETAILS.relationships.map((table) => ({
      name: table.name,
      from: table.from,
      to: table.to,
      description: table.description,
      properties: table.properties.map((property) => ({
        name: property.name,
        type: property.type,
      })),
      sampleQueries: [
        `MATCH (a:${table.from})-[r:${table.name}]->(b:${table.to}) RETURN count(r) AS count`,
        `MATCH (a:${table.from})-[r:${table.name}]->(b:${table.to}) RETURN a, r, b LIMIT 10`,
      ],
    }));
    const propertyCount =
      SCHEMA_TABLE_DETAILS.nodes.reduce((count, table) => count + table.properties.length, 0) +
      SCHEMA_TABLE_DETAILS.relationships.reduce((count, table) => count + table.properties.length, 0);

    return {
      nodeTables,
      relationshipTables,
      summary: {
        nodeTableCount: nodeTables.length,
        relationshipTableCount: relationshipTables.length,
        propertyCount,
      },
      generatedQueries: [
        'MATCH (n:Document) RETURN count(n) AS documents',
        'MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN d.title AS document, c.section AS section, c.text AS text LIMIT 10',
        'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity LIMIT 20',
        'MATCH (c:Chunk)-[:MENTIONS]->(e:Entity) RETURN c.section AS section, e.name AS entity, e.type AS type LIMIT 20',
      ],
    };
  }

  async databaseSummary(): Promise<Record<string, JsonValue>> {
    const [nodeCounts, relationshipCounts] = await Promise.all([this.nodeCounts(), this.relationshipCounts()]);
    const nodeTableCount = Object.keys(nodeCounts).length;
    const relationshipTableCount = Object.keys(relationshipCounts).length;

    return {
      id: 'default',
      name: 'Default Kuzu Knowledge Graph',
      storage: this.graph.dbPath.split('/').slice(-2).join('/'),
      status: 'connected',
      mode: 'read-write',
      lastOpenedAt: new Date().toISOString(),
      nodeTableCount,
      relationshipTableCount,
      nodeCounts,
      relationshipCounts,
    };
  }

  async overview(): Promise<Record<string, JsonValue>> {
    const [nodeCounts, relationshipCounts, topics, examples] = await Promise.all([
      this.nodeCounts(),
      this.relationshipCounts(),
      this.topicCoverage(),
      this.graphExamples(),
    ]);

    return {
      databasePath: this.graph.dbPath,
      nodeCounts,
      relationshipCounts,
      topicCoverage: topics,
      sampleQuestions: [
        'How does the context graph reduce AI cost?',
        'What do I need before production deployment?',
        'Which entities are connected to Kuzu?',
      ],
      exampleEvidence: examples,
    };
  }

  async search(query: string, limit = 8): Promise<SearchResult[]> {
    const terms = termsFromQuery(query);
    if (terms.length === 0) {
      return [];
    }

    const [documents, chunks, entities, topics] = await Promise.all([
      this.graph.query('MATCH (d:Document) RETURN d.id AS id, d.title AS title, d.summary AS summary, d.source AS source, d.owner AS owner'),
      this.graph.query('MATCH (c:Chunk) RETURN c.id AS id, c.section AS section, c.text AS text, c.tokenEstimate AS tokenEstimate'),
      this.graph.query('MATCH (e:Entity) RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description'),
      this.graph.query('MATCH (t:Topic) RETURN t.id AS id, t.name AS name, t.description AS description'),
    ]);

    const results: SearchResult[] = [];

    for (const row of documents) {
      const haystack = `${asString(row.title)} ${asString(row.summary)} ${asString(row.source)} ${asString(row.owner)}`;
      const score = scoreText(haystack, terms);
      if (score > 0) {
        results.push({
          kind: 'document',
          id: asString(row.id),
          title: asString(row.title),
          snippet: toSnippet(asString(row.summary)),
          score,
          metadata: { source: row.source ?? null, owner: row.owner ?? null },
        });
      }
    }

    for (const row of chunks) {
      const haystack = `${asString(row.section)} ${asString(row.text)}`;
      const score = scoreText(haystack, terms);
      if (score > 0) {
        results.push({
          kind: 'chunk',
          id: asString(row.id),
          title: asString(row.section),
          snippet: toSnippet(asString(row.text)),
          score,
          metadata: { tokenEstimate: row.tokenEstimate ?? null },
        });
      }
    }

    for (const row of entities) {
      const haystack = `${asString(row.name)} ${asString(row.type)} ${asString(row.description)}`;
      const score = scoreText(haystack, terms);
      if (score > 0) {
        results.push({
          kind: 'entity',
          id: asString(row.id),
          title: asString(row.name),
          snippet: toSnippet(asString(row.description)),
          score,
          metadata: { type: row.type ?? null },
        });
      }
    }

    for (const row of topics) {
      const haystack = `${asString(row.name)} ${asString(row.description)}`;
      const score = scoreText(haystack, terms);
      if (score > 0) {
        results.push({
          kind: 'topic',
          id: asString(row.id),
          title: asString(row.name),
          snippet: toSnippet(asString(row.description)),
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind)).slice(0, Math.min(limit, 25));
  }

  async documentContext(documentId: string): Promise<DocumentContext> {
    const id = cypherString(documentId);
    const [documents, chunks, entities, topics] = await Promise.all([
      this.graph.query(
        `MATCH (d:Document) WHERE d.id = ${id} RETURN d.id AS id, d.title AS title, d.source AS source, d.owner AS owner, d.createdAt AS createdAt, d.summary AS summary`,
      ),
      this.graph.query(
        `MATCH (d:Document)-[h:HAS_CHUNK]->(c:Chunk) WHERE d.id = ${id} RETURN c.id AS id, c.section AS section, c.text AS text, c.tokenEstimate AS tokenEstimate, h.position AS position ORDER BY h.position`,
      ),
      this.graph.query(
        `MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)-[m:MENTIONS]->(e:Entity) WHERE d.id = ${id} RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description, m.confidence AS confidence`,
      ),
      this.graph.query(
        `MATCH (d:Document)-[a:ABOUT]->(t:Topic) WHERE d.id = ${id} RETURN t.id AS id, t.name AS name, t.description AS description, a.weight AS weight ORDER BY a.weight DESC`,
      ),
    ]);

    return {
      document: documents[0] ?? null,
      chunks,
      entities: uniqueRows(entities, 'id'),
      topics,
    };
  }

  async entityNeighborhood(entity: string): Promise<Record<string, JsonValue>> {
    const rows = await this.graph.query(
      'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.id AS fromId, a.name AS fromName, a.type AS fromType, r.relation AS relation, r.evidence AS evidence, b.id AS toId, b.name AS toName, b.type AS toType',
    );
    const mentions = await this.graph.query(
      'MATCH (c:Chunk)-[m:MENTIONS]->(e:Entity) RETURN c.id AS chunkId, c.section AS section, c.text AS text, m.confidence AS confidence, e.id AS entityId, e.name AS entityName',
    );

    const terms = termsFromQuery(entity);
    const linkMatches = rows.filter((row) =>
      contains(`${asString(row.fromId)} ${asString(row.fromName)} ${asString(row.toId)} ${asString(row.toName)}`, terms),
    );
    const mentionMatches = mentions
      .filter((row) => contains(`${asString(row.entityId)} ${asString(row.entityName)}`, terms))
      .slice(0, 10);

    return {
      query: entity,
      relationships: linkMatches,
      supportingChunks: mentionMatches.map((row) => ({
        chunkId: row.chunkId ?? null,
        section: row.section ?? null,
        snippet: toSnippet(asString(row.text)),
        confidence: row.confidence ?? null,
      })),
    };
  }

  async answerContext(question: string, limit = 5): Promise<Record<string, JsonValue>> {
    const matches = await this.search(question, limit);
    const chunkIds = matches.filter((item) => item.kind === 'chunk').map((item) => item.id);
    const documentContexts = await this.documentContextsForChunks(chunkIds);

    return {
      question,
      strategy: 'Keyword search over Kuzu graph nodes, then expansion from matching chunks to documents, entities, and topics.',
      matches,
      expandedContext: documentContexts,
      promptHint: 'Send only the returned chunks, entities, and topic summaries to the LLM instead of every source document.',
    };
  }

  async runReadOnlyCypher(query: string, limit = 100): Promise<Record<string, JsonValue>> {
    const startedAt = performance.now();
    const safeQuery = appendLimit(validateReadOnlyCypher(query), limit);
    const rows = await this.graph.query(safeQuery);
    const executionMs = Math.round((performance.now() - startedAt) * 100) / 100;
    return {
      query: safeQuery,
      rowCount: rows.length,
      executionMs,
      rows,
      graph: this.graphFromRows(rows),
    };
  }

  async exploreGraph(input: ExploreGraphRequest): Promise<Record<string, JsonValue>> {
    const table = input.table.trim();
    const allowedTables = new Set<string>(NODE_TABLES);
    if (!allowedTables.has(table as (typeof NODE_TABLES)[number])) {
      throw new Error(`Explore table must be one of: ${NODE_TABLES.join(', ')}.`);
    }

    const limit = normalizeLimit(input.limit ?? 100, 100);
    const depth = Math.max(1, Math.min(Number(input.depth ?? 1), 3));
    const snapshot = await this.graphSnapshot(limit);
    const nodes = (snapshot.nodes as Record<string, JsonValue>[]).filter((node) => node.type === table);
    const seedIds = new Set(nodes.map((node) => asString(node.id)));
    const allNodes = snapshot.nodes as Record<string, JsonValue>[];
    const allEdges = snapshot.edges as Record<string, JsonValue>[];
    const visibleIds = new Set(seedIds);

    for (let step = 0; step < depth; step += 1) {
      for (const edge of allEdges) {
        const source = asString(edge.source);
        const target = asString(edge.target);
        if (visibleIds.has(source) || visibleIds.has(target)) {
          visibleIds.add(source);
          visibleIds.add(target);
        }
      }
    }

    const visibleNodes = allNodes.filter((node) => visibleIds.has(asString(node.id)));
    const visibleEdges = allEdges.filter((edge) => visibleIds.has(asString(edge.source)) && visibleIds.has(asString(edge.target)));

    return {
      table,
      depth,
      limit,
      generatedQuery: `MATCH (n:${table}) RETURN n LIMIT ${limit}`,
      warning:
        (snapshot.counts as Record<string, JsonValue>).nodes === limit
          ? `The graph was limited to ${limit} nodes. Increase the limit carefully if you need more context.`
          : null,
      nodes: visibleNodes,
      edges: visibleEdges,
      counts: {
        nodes: visibleNodes.length,
        edges: visibleEdges.length,
      },
    };
  }

  importPreview(input: KnowledgeGraphDraft): Record<string, JsonValue> {
    const title = input.title.trim();
    const body = input.body.trim();
    const chunks = body ? splitIntoChunks(body) : [];
    const topics = compactUnique(input.topics ?? []);
    const entities = this.normalizeEntityDrafts(input.entities?.length ? input.entities : inferEntities(body));
    const relationships = input.relationships?.filter((relationship) => relationship.from.trim() && relationship.to.trim() && relationship.relation.trim()) ?? [];

    return {
      valid: Boolean(title && body),
      warnings: [
        ...(!title ? ['Document title is required.'] : []),
        ...(!body ? ['Knowledge text is required.'] : []),
        ...(relationships.length !== (input.relationships ?? []).length ? ['Some relationship rows are incomplete and will be skipped.'] : []),
      ],
      operations: [
        { type: 'create-node', table: 'Document', count: title ? 1 : 0 },
        { type: 'create-node', table: 'Chunk', count: chunks.length },
        { type: 'create-node-or-reuse', table: 'Topic', count: topics.length },
        { type: 'create-node-or-reuse', table: 'Entity', count: entities.length },
        { type: 'create-relationship', table: 'HAS_CHUNK', count: chunks.length },
        { type: 'create-relationship', table: 'ABOUT', count: topics.length },
        { type: 'create-relationship', table: 'MENTIONS', count: entities.length },
        { type: 'create-relationship', table: 'RELATED_TO', count: relationships.length },
      ],
      generatedCypherPreview: [
        `CREATE (:Document {title: ${cypherString(title || 'Untitled')}})`,
        `CREATE ${chunks.length} Chunk node(s) and HAS_CHUNK relationship(s)`,
        `MERGE/CREATE ${topics.length} Topic node(s) and ABOUT relationship(s)`,
        `MERGE/CREATE ${entities.length} Entity node(s) and MENTIONS relationship(s)`,
        `CREATE ${relationships.length} RELATED_TO relationship(s)`,
      ],
    };
  }

  async graphSnapshot(limit = 300): Promise<Record<string, JsonValue>> {
    const rowLimit = normalizeLimit(limit);
    const [documents, chunks, entities, topics, hasChunks, mentions, about, related] = await Promise.all([
      this.graph.query(
        `MATCH (d:Document) RETURN d.id AS id, d.title AS label, d.summary AS summary, d.source AS source, d.owner AS owner, d.createdAt AS createdAt LIMIT ${rowLimit}`,
      ),
      this.graph.query(
        `MATCH (c:Chunk) RETURN c.id AS id, c.section AS label, c.text AS text, c.tokenEstimate AS tokenEstimate LIMIT ${rowLimit}`,
      ),
      this.graph.query(
        `MATCH (e:Entity) RETURN e.id AS id, e.name AS label, e.type AS entityType, e.description AS description LIMIT ${rowLimit}`,
      ),
      this.graph.query(`MATCH (t:Topic) RETURN t.id AS id, t.name AS label, t.description AS description LIMIT ${rowLimit}`),
      this.graph.query(
        `MATCH (d:Document)-[r:HAS_CHUNK]->(c:Chunk) RETURN d.id AS source, c.id AS target, r.position AS position LIMIT ${rowLimit}`,
      ),
      this.graph.query(
        `MATCH (c:Chunk)-[r:MENTIONS]->(e:Entity) RETURN c.id AS source, e.id AS target, r.confidence AS confidence LIMIT ${rowLimit}`,
      ),
      this.graph.query(
        `MATCH (d:Document)-[r:ABOUT]->(t:Topic) RETURN d.id AS source, t.id AS target, r.weight AS weight LIMIT ${rowLimit}`,
      ),
      this.graph.query(
        `MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.id AS source, b.id AS target, r.relation AS relation, r.evidence AS evidence LIMIT ${rowLimit}`,
      ),
    ]);

    const nodes = [
      ...documents.map((row) => ({ ...row, type: 'Document' })),
      ...chunks.map((row) => ({ ...row, type: 'Chunk', label: row.label || row.id })),
      ...entities.map((row) => ({ ...row, type: 'Entity' })),
      ...topics.map((row) => ({ ...row, type: 'Topic' })),
    ];
    const edges = [
      ...hasChunks.map((row) => ({ ...row, type: 'HAS_CHUNK', label: 'HAS_CHUNK' })),
      ...mentions.map((row) => ({ ...row, type: 'MENTIONS', label: 'MENTIONS' })),
      ...about.map((row) => ({ ...row, type: 'ABOUT', label: 'ABOUT' })),
      ...related.map((row) => ({ ...row, type: 'RELATED_TO', label: row.relation || 'RELATED_TO' })),
    ];

    return {
      nodes,
      edges,
      counts: {
        nodes: nodes.length,
        edges: edges.length,
      },
    };
  }

  async createKnowledgeGraph(input: KnowledgeGraphDraft): Promise<Record<string, JsonValue>> {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) {
      throw new Error('A document title is required.');
    }
    if (!body) {
      throw new Error('Knowledge text is required.');
    }

    await this.graph.connect();

    const documentId = uniqueId('doc', title);
    const createdAt = input.createdAt?.trim() || new Date().toISOString();
    const summary = input.summary?.trim() || toSnippet(body.replace(/\s+/g, ' '), 320);
    const source = input.source?.trim() || 'kuzu-studio';
    const owner = input.owner?.trim() || 'Knowledge Team';
    const chunkTexts = splitIntoChunks(body);
    const topicNames = compactUnique(input.topics ?? []);
    const entityDrafts = this.normalizeEntityDrafts(input.entities?.length ? input.entities : inferEntities(body));

    await this.graph.exec(
      `CREATE (:Document {id: ${cypherString(documentId)}, title: ${cypherString(title)}, source: ${cypherString(source)}, owner: ${cypherString(owner)}, createdAt: ${cypherString(createdAt)}, summary: ${cypherString(summary)}})`,
    );

    const chunks: QueryRow[] = [];
    for (const [index, text] of chunkTexts.entries()) {
      const chunkId = `${documentId}-chunk-${index + 1}`;
      const section = chunkTexts.length === 1 ? 'Main' : `Section ${index + 1}`;
      const tokenEstimate = estimateTokens(text);
      await this.graph.exec(
        `CREATE (:Chunk {id: ${cypherString(chunkId)}, text: ${cypherString(text)}, tokenEstimate: ${tokenEstimate}, section: ${cypherString(section)}})`,
      );
      await this.graph.exec(
        `MATCH (d:Document), (c:Chunk) WHERE d.id = ${cypherString(documentId)} AND c.id = ${cypherString(chunkId)} CREATE (d)-[:HAS_CHUNK {position: ${index + 1}}]->(c)`,
      );
      chunks.push({ id: chunkId, section, tokenEstimate, text: toSnippet(text) });
    }

    const topics: QueryRow[] = [];
    for (const topicName of topicNames) {
      const topic = await this.findOrCreateTopic(topicName);
      await this.graph.exec(
        `MATCH (d:Document), (t:Topic) WHERE d.id = ${cypherString(documentId)} AND t.id = ${cypherString(asString(topic.id))} CREATE (d)-[:ABOUT {weight: 0.9}]->(t)`,
      );
      topics.push(topic);
    }

    const entities: QueryRow[] = [];
    for (const entity of entityDrafts) {
      const existing = await this.findOrCreateEntity(entity);
      entities.push(existing);
      await this.createMentionsForEntity(chunkTexts, documentId, existing);
    }

    const relationships: QueryRow[] = [];
    for (const relationship of input.relationships ?? []) {
      const created = await this.createEntityRelationship(relationship);
      if (created) {
        relationships.push(created);
      }
    }

    return {
      document: {
        id: documentId,
        title,
        source,
        owner,
        createdAt,
        summary,
      },
      chunks,
      topics,
      entities,
      relationships,
    };
  }

  async createEntityRelationship(input: EntityRelationshipDraft): Promise<QueryRow | null> {
    const from = input.from.trim();
    const to = input.to.trim();
    const relation = input.relation.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
    if (!from || !to || !relation) {
      return null;
    }

    const [fromEntity, toEntity] = await Promise.all([this.findEntity(from), this.findEntity(to)]);
    if (!fromEntity || !toEntity) {
      return null;
    }

    const evidence = input.evidence?.trim() || `${asString(fromEntity.label ?? fromEntity.name)} ${relation} ${asString(toEntity.label ?? toEntity.name)}`;
    await this.graph.exec(
      `MATCH (a:Entity), (b:Entity) WHERE a.id = ${cypherString(asString(fromEntity.id))} AND b.id = ${cypherString(asString(toEntity.id))} CREATE (a)-[:RELATED_TO {relation: ${cypherString(relation)}, evidence: ${cypherString(evidence)}}]->(b)`,
    );

    return {
      fromId: fromEntity.id ?? null,
      fromName: fromEntity.name ?? fromEntity.label ?? null,
      relation,
      toId: toEntity.id ?? null,
      toName: toEntity.name ?? toEntity.label ?? null,
      evidence,
    };
  }

  private graphFromRows(rows: QueryRow[]): Record<string, JsonValue> {
    const nodes = new Map<string, Record<string, JsonValue>>();
    const edges: Record<string, JsonValue>[] = [];

    function addNode(id: string, label: string, type: string, properties: Record<string, JsonValue> = {}) {
      if (!nodes.has(id)) {
        nodes.set(id, graphNode(id, label, type, properties));
      }
    }

    for (const row of rows) {
      const fromEntity = asString(row.fromEntity ?? row.fromName);
      const toEntity = asString(row.toEntity ?? row.toName);
      const source = asString(row.source ?? row.fromId);
      const target = asString(row.target ?? row.toId);

      if (fromEntity && toEntity) {
        const fromId = `query-node-${slugify(fromEntity)}`;
        const toId = `query-node-${slugify(toEntity)}`;
        addNode(fromId, fromEntity, 'Entity');
        addNode(toId, toEntity, 'Entity');
        edges.push({
          source: fromId,
          target: toId,
          type: asString(row.relation || row.type || row.label || 'RELATED_TO'),
          label: asString(row.relation || row.type || row.label || 'RELATED_TO'),
          evidence: row.evidence ?? null,
        });
      } else if (source && target) {
        addNode(source, source, asString(row.sourceType || 'Node'));
        addNode(target, target, asString(row.targetType || 'Node'));
        edges.push({
          source,
          target,
          type: asString(row.type || row.label || row.relation || 'RELATIONSHIP'),
          label: asString(row.type || row.label || row.relation || 'RELATIONSHIP'),
        });
      } else if (row.id || row.label || row.name || row.title) {
        const id = asString(row.id || row.label || row.name || row.title);
        addNode(id, asString(row.label || row.name || row.title || row.id), asString(row.type || row.kind || 'Result'), row);
      }
    }

    return {
      nodes: [...nodes.values()],
      edges,
      counts: {
        nodes: nodes.size,
        edges: edges.length,
      },
    };
  }

  private async nodeCounts(): Promise<Record<string, number>> {
    const entries = await Promise.all(NODE_TABLES.map(async (table) => [table, await this.graph.countNodes(table)] as const));
    return Object.fromEntries(entries);
  }

  private async relationshipCounts(): Promise<Record<string, number>> {
    const entries = await Promise.all(
      REL_TABLES.map(async (table) => {
        const rows = await this.graph.query(`MATCH ()-[r:${table}]->() RETURN count(r) AS count`);
        return [table, Number(rows[0]?.count ?? 0)] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  private async topicCoverage(): Promise<QueryRow[]> {
    return this.graph.query(
      'MATCH (d:Document)-[a:ABOUT]->(t:Topic) RETURN t.id AS id, t.name AS name, t.description AS description, a.weight AS weight, d.title AS documentTitle ORDER BY t.name',
    );
  }

  private async graphExamples(): Promise<QueryRow[]> {
    return this.graph.query(
      'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity, r.evidence AS evidence LIMIT 8',
    );
  }

  private async documentContextsForChunks(chunkIds: string[]): Promise<DocumentContext[]> {
    const documentIds = new Set<string>();
    for (const chunkId of chunkIds) {
      const rows = await this.graph.query(
        `MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) WHERE c.id = ${cypherString(chunkId)} RETURN d.id AS id`,
      );
      for (const row of rows) {
        const id = asString(row.id);
        if (id) {
          documentIds.add(id);
        }
      }
    }

    return Promise.all([...documentIds].map((documentId) => this.documentContext(documentId)));
  }

  private normalizeEntityDrafts(entities: EntityDraft[]): EntityDraft[] {
    const seen = new Set<string>();
    const output: EntityDraft[] = [];

    for (const entity of entities) {
      const name = entity.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) {
        continue;
      }

      seen.add(key);
      output.push({
        name,
        type: entity.type?.trim() || 'Concept',
        description: entity.description?.trim() || `Curated graph entity: ${name}.`,
      });
    }

    return output;
  }

  private async findEntity(nameOrId: string): Promise<QueryRow | null> {
    const target = nameOrId.trim().toLowerCase();
    if (!target) {
      return null;
    }

    const rows = await this.graph.query('MATCH (e:Entity) RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description');
    return rows.find((row) => asString(row.id).toLowerCase() === target || asString(row.name).toLowerCase() === target) ?? null;
  }

  private async findOrCreateEntity(entity: EntityDraft): Promise<QueryRow> {
    const existing = await this.findEntity(entity.name);
    if (existing) {
      return existing;
    }

    const id = uniqueId('entity', entity.name);
    const type = entity.type?.trim() || 'Concept';
    const description = entity.description?.trim() || `Curated graph entity: ${entity.name}.`;
    await this.graph.exec(
      `CREATE (:Entity {id: ${cypherString(id)}, name: ${cypherString(entity.name)}, type: ${cypherString(type)}, description: ${cypherString(description)}})`,
    );
    return { id, name: entity.name, type, description };
  }

  private async findOrCreateTopic(name: string): Promise<QueryRow> {
    const target = name.trim().toLowerCase();
    const rows = await this.graph.query('MATCH (t:Topic) RETURN t.id AS id, t.name AS name, t.description AS description');
    const existing = rows.find((row) => asString(row.id).toLowerCase() === target || asString(row.name).toLowerCase() === target);
    if (existing) {
      return existing;
    }

    const id = uniqueId('topic', name);
    const description = `Knowledge area created in Kuzu Graph Console: ${name}.`;
    await this.graph.exec(`CREATE (:Topic {id: ${cypherString(id)}, name: ${cypherString(name)}, description: ${cypherString(description)}})`);
    return { id, name, description };
  }

  private async createMentionsForEntity(chunkTexts: string[], documentId: string, entity: QueryRow): Promise<void> {
    const entityName = asString(entity.name);
    const entityId = asString(entity.id);
    const matchedIndexes = chunkTexts
      .map((text, index) => ({ index, matched: text.toLowerCase().includes(entityName.toLowerCase()) }))
      .filter((item) => item.matched)
      .map((item) => item.index);
    const mentionIndexes = matchedIndexes.length > 0 ? matchedIndexes : [0];

    for (const index of mentionIndexes) {
      const chunkId = `${documentId}-chunk-${index + 1}`;
      const confidence = matchedIndexes.length > 0 ? 0.92 : 0.65;
      await this.graph.exec(
        `MATCH (c:Chunk), (e:Entity) WHERE c.id = ${cypherString(chunkId)} AND e.id = ${cypherString(entityId)} CREATE (c)-[:MENTIONS {confidence: ${confidence}}]->(e)`,
      );
    }
  }
}

function uniqueRows(rows: QueryRow[], key: string): QueryRow[] {
  const seen = new Set<string>();
  const output: QueryRow[] = [];

  for (const row of rows) {
    const value = asString(row[key]);
    if (!seen.has(value)) {
      seen.add(value);
      output.push(row);
    }
  }

  return output;
}
