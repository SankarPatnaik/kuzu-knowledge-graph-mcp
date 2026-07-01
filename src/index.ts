#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { KuzuGraph } from './kuzuGraph.js';
import { KnowledgeGraphService } from './knowledgeGraphService.js';

const config = loadConfig();
const graph = new KuzuGraph(config);
const service = new KnowledgeGraphService(graph);

const server = new Server(
  {
    name: config.serverName,
    version: config.serverVersion,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

function textJson(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'kg_overview',
      description: 'Return counts, topics, and sample relationships from the Kuzu knowledge graph.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'kg_search',
      description: 'Search documents, chunks, entities, and topics using simple keyword matching.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Question or keyword phrase to search.' },
          limit: { type: 'number', description: 'Maximum number of results. Default 8, maximum 25.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'kg_get_document_context',
      description: 'Return a document plus its chunks, mentioned entities, and topics.',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'Document id, for example doc-context-cost.' },
        },
        required: ['documentId'],
        additionalProperties: false,
      },
    },
    {
      name: 'kg_entity_neighborhood',
      description: 'Return one-hop entity relationships and supporting chunks for an entity name or id.',
      inputSchema: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'Entity name or id, for example Kuzu or entity-context-graph.' },
        },
        required: ['entity'],
        additionalProperties: false,
      },
    },
    {
      name: 'kg_question_context',
      description: 'Build a compact evidence pack for a natural-language question using graph search and expansion.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The user question to answer from graph context.' },
          limit: { type: 'number', description: 'Maximum search matches before graph expansion. Default 5.' },
        },
        required: ['question'],
        additionalProperties: false,
      },
    },
    {
      name: 'kg_readonly_cypher',
      description: 'Run a guarded read-only Cypher query against Kuzu. Mutating keywords are blocked.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Read-only Cypher query beginning with MATCH, RETURN, CALL, SHOW, WITH, UNWIND, EXPLAIN, or PROFILE.' },
          limit: { type: 'number', description: 'Default result limit added when no LIMIT is present. Default 100.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;

  switch (request.params.name) {
    case 'kg_overview':
      return textJson(await service.overview());
    case 'kg_search':
      return textJson(await service.search(String(args.query ?? ''), Number(args.limit ?? 8)));
    case 'kg_get_document_context':
      return textJson(await service.documentContext(String(args.documentId ?? '')));
    case 'kg_entity_neighborhood':
      return textJson(await service.entityNeighborhood(String(args.entity ?? '')));
    case 'kg_question_context':
      return textJson(await service.answerContext(String(args.question ?? ''), Number(args.limit ?? 5)));
    case 'kg_readonly_cypher':
      return textJson(await service.runReadOnlyCypher(String(args.query ?? ''), Number(args.limit ?? 100)));
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'kuzu://schema',
      name: 'Kuzu Knowledge Graph Schema',
      description: 'Node tables, relationship tables, counts, and example Cypher queries.',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== 'kuzu://schema') {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: 'application/json',
        text: JSON.stringify(await service.schema(), null, 2),
      },
    ],
  };
});

async function main() {
  await service.connect();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${config.serverName} MCP server connected to ${config.dbPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

