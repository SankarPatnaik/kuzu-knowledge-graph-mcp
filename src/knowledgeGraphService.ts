import { appendLimit, cypherString, validateReadOnlyCypher } from './cypher.js';
import { KuzuGraph } from './kuzuGraph.js';
import { NODE_TABLES, REL_TABLES, SCHEMA_DESCRIPTION } from './schema.js';
import type { JsonValue, QueryRow, SearchResult } from './types.js';

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
      nodeCounts,
      relationshipCounts: relCounts,
      exampleQueries: [
        "MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN d.title, c.section, c.text LIMIT 5",
        "MATCH (c:Chunk)-[:MENTIONS]->(e:Entity) RETURN c.id, e.name, e.type LIMIT 10",
        "MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name, r.relation, b.name LIMIT 10",
      ],
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
    const safeQuery = appendLimit(validateReadOnlyCypher(query), limit);
    const rows = await this.graph.query(safeQuery);
    return {
      query: safeQuery,
      rowCount: rows.length,
      rows,
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

