import type { JsonValue } from './types.js';

export type TutorialDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type TutorialDataFile = {
  name: string;
  type: 'csv' | 'cypher' | 'markdown' | 'generated';
  description: string;
  sizeLabel?: string;
};

export type TutorialNodeTable = {
  name: string;
  description: string;
  properties: { name: string; type: string; primaryKey?: boolean }[];
};

export type TutorialRelationshipTable = {
  name: string;
  from: string;
  to: string;
  description: string;
  properties: { name: string; type: string }[];
};

export type TutorialStep = {
  title: string;
  explanation: string;
  code?: string;
  query?: string;
  expectedResultDescription?: string;
};

export type TutorialQuery = {
  id: string;
  title: string;
  description: string;
  query: string;
  expectedUse: string;
};

export type TutorialPracticeDocument = {
  title: string;
  source: string;
  owner: string;
  summary: string;
  body: string;
  topics: string[];
  entities: { name: string; type: string; description: string }[];
  relationships: { from: string; relation: string; to: string; evidence: string }[];
};

export type Tutorial = {
  id: string;
  title: string;
  description: string;
  sourceFolder: string;
  sourceUrl: string;
  difficulty: TutorialDifficulty;
  estimatedMinutes: number;
  tags: string[];
  concepts: string[];
  learningObjectives: string[];
  dataset?: {
    name: string;
    description: string;
    files: TutorialDataFile[];
    documents: TutorialPracticeDocument[];
  };
  schema?: {
    nodes: TutorialNodeTable[];
    relationships: TutorialRelationshipTable[];
  };
  steps: TutorialStep[];
  sampleQueries: TutorialQuery[];
  attribution: {
    source: 'kuzudb/tutorials';
    license: 'MIT';
    url: string;
  };
};

const practiceSchema = {
  nodes: [
    {
      name: 'Document',
      description: 'A source artifact used in the tutorial practice graph.',
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'title', type: 'STRING' },
        { name: 'source', type: 'STRING' },
        { name: 'owner', type: 'STRING' },
        { name: 'createdAt', type: 'STRING' },
        { name: 'summary', type: 'STRING' },
      ],
    },
    {
      name: 'Chunk',
      description: 'A retrievable text section split from a document.',
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'text', type: 'STRING' },
        { name: 'tokenEstimate', type: 'INT64' },
        { name: 'section', type: 'STRING' },
      ],
    },
    {
      name: 'Entity',
      description: 'A named graph concept used for practice queries.',
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'name', type: 'STRING' },
        { name: 'type', type: 'STRING' },
        { name: 'description', type: 'STRING' },
      ],
    },
    {
      name: 'Topic',
      description: 'A tutorial topic or category.',
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'name', type: 'STRING' },
        { name: 'description', type: 'STRING' },
      ],
    },
  ],
  relationships: [
    {
      name: 'HAS_CHUNK',
      from: 'Document',
      to: 'Chunk',
      description: 'Document to ordered source chunks.',
      properties: [{ name: 'position', type: 'INT64' }],
    },
    {
      name: 'MENTIONS',
      from: 'Chunk',
      to: 'Entity',
      description: 'Chunk to entity mentions.',
      properties: [{ name: 'confidence', type: 'DOUBLE' }],
    },
    {
      name: 'ABOUT',
      from: 'Document',
      to: 'Topic',
      description: 'Document to topic coverage.',
      properties: [{ name: 'weight', type: 'DOUBLE' }],
    },
    {
      name: 'RELATED_TO',
      from: 'Entity',
      to: 'Entity',
      description: 'Entity-to-entity practice relationship.',
      properties: [
        { name: 'relation', type: 'STRING' },
        { name: 'evidence', type: 'STRING' },
      ],
    },
  ],
};

function attribution(sourceFolder: string) {
  const url = `https://github.com/kuzudb/tutorials/tree/main/src/${sourceFolder}`;
  return {
    source: 'kuzudb/tutorials' as const,
    license: 'MIT' as const,
    url,
  };
}

function dataset(name: string, description: string, documents: TutorialPracticeDocument[]): NonNullable<Tutorial['dataset']> {
  return {
    name,
    description,
    files: [
      {
        name: 'generated-practice-documents.json',
        type: 'generated',
        description: 'Local practice records converted into Kuzu Graph Console document/entity/topic form.',
        sizeLabel: `${documents.length} document${documents.length === 1 ? '' : 's'}`,
      },
    ],
    documents,
  };
}

export const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started-kuzu',
    title: 'Getting Started with KuzuDB',
    description: 'Learn the basic graph building blocks: node tables, relationship tables, records, and simple MATCH queries.',
    sourceFolder: 'video_1',
    sourceUrl: 'https://github.com/kuzudb/tutorials/tree/main/src/video_1',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    tags: ['Getting Started', 'Cypher Basics', 'Graph Modeling'],
    concepts: ['node table', 'relationship table', 'MATCH', 'RETURN', 'LIMIT'],
    learningObjectives: [
      'Understand the difference between nodes and relationships.',
      'Run your first read-only Cypher query.',
      'Inspect graph records as table, JSON, and graph results.',
    ],
    schema: practiceSchema,
    dataset: dataset('Starter Knowledge Graph', 'A tiny graph for learning Kuzu graph basics.', [
      {
        title: 'KuzuDB Getting Started Notes',
        source: 'tutorials/getting-started.md',
        owner: 'Kuzu Tutorials',
        summary: 'Introduces node tables, relationship tables, and basic Cypher queries in Kuzu.',
        body:
          'KuzuDB is an embedded graph database. A graph contains nodes such as Person, City, Document, or Entity. Relationships connect nodes and explain how records are related. Cypher queries use MATCH and RETURN to inspect graph patterns.',
        topics: ['Getting Started', 'Cypher Basics'],
        entities: [
          { name: 'KuzuDB', type: 'Graph Database', description: 'Embedded graph database for connected data.' },
          { name: 'Node Table', type: 'Schema Concept', description: 'Stores nodes with the same label and properties.' },
          { name: 'Relationship Table', type: 'Schema Concept', description: 'Stores typed edges between source and destination node tables.' },
          { name: 'Cypher', type: 'Query Language', description: 'Pattern query language used by Kuzu.' },
        ],
        relationships: [
          { from: 'KuzuDB', relation: 'USES', to: 'Cypher', evidence: 'Kuzu supports Cypher-style graph queries.' },
          { from: 'Node Table', relation: 'CONNECTS_BY', to: 'Relationship Table', evidence: 'Relationship tables connect node records.' },
        ],
      },
    ]),
    steps: [
      {
        title: 'Start with graph vocabulary',
        explanation: 'A graph is made of nodes and relationships. In Kuzu, tables define the shape of those records.',
        expectedResultDescription: 'You should be able to identify node tables and relationship tables in Schema.',
      },
      {
        title: 'Run a first query',
        explanation: 'Use MATCH to find records and RETURN to choose columns.',
        query: 'MATCH (d:Document) RETURN d.title AS title, d.summary AS summary LIMIT 10',
        expectedResultDescription: 'A table of tutorial documents appears.',
      },
      {
        title: 'Inspect relationships',
        explanation: 'Relationships explain how graph records connect.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity LIMIT 10',
        expectedResultDescription: 'The Graph result tab shows connected entities.',
      },
    ],
    sampleQueries: [
      {
        id: 'documents',
        title: 'List documents',
        description: 'Return practice documents in the sandbox database.',
        query: 'MATCH (d:Document) RETURN d.title AS title, d.summary AS summary LIMIT 10',
        expectedUse: 'Use this to confirm the dataset loaded.',
      },
      {
        id: 'relationships',
        title: 'List entity relationships',
        description: 'See graph edges between practice entities.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity, r.evidence AS evidence LIMIT 20',
        expectedUse: 'Use this to populate the graph result view.',
      },
    ],
    attribution: attribution('video_1'),
  },
  {
    id: 'importing-csv-data',
    title: 'Importing CSV Data',
    description: 'Practice the shape of an import workflow: define records, load them safely, validate counts, and inspect relationships.',
    sourceFolder: 'video_3',
    sourceUrl: 'https://github.com/kuzudb/tutorials/tree/main/src/video_3',
    difficulty: 'Beginner',
    estimatedMinutes: 20,
    tags: ['Data Import', 'Cypher Basics'],
    concepts: ['CSV', 'COPY', 'validation query', 'schema mapping'],
    learningObjectives: [
      'Understand how tabular data maps into graph nodes and relationships.',
      'Validate imported records with count queries.',
      'Inspect imported data with simple MATCH patterns.',
    ],
    schema: practiceSchema,
    dataset: dataset('Import Workflow Practice', 'Generated source records representing a CSV import scenario.', [
      {
        title: 'Customer Support Import Plan',
        source: 'tutorials/import/customer-support.csv',
        owner: 'Data Team',
        summary: 'Example import plan for customers, tickets, support agents, and systems.',
        body:
          'A CSV import usually starts with columns. Customer, Ticket, Support Agent, and Product Area can become graph entities. Relationship columns describe ownership, assignment, and product coverage. After loading, validation queries count nodes and inspect relationships.',
        topics: ['Data Import', 'Validation'],
        entities: [
          { name: 'Customer', type: 'Business Entity', description: 'A customer record from a CSV file.' },
          { name: 'Ticket', type: 'Support Entity', description: 'A support ticket imported from tabular data.' },
          { name: 'Support Agent', type: 'Person', description: 'A team member assigned to a ticket.' },
          { name: 'Product Area', type: 'Category', description: 'The product area connected to a ticket.' },
        ],
        relationships: [
          { from: 'Customer', relation: 'OPENS', to: 'Ticket', evidence: 'The customer_id column links customers to tickets.' },
          { from: 'Support Agent', relation: 'OWNS', to: 'Ticket', evidence: 'The assignee column links agents to tickets.' },
          { from: 'Ticket', relation: 'ABOUT', to: 'Product Area', evidence: 'The product_area column categorizes tickets.' },
        ],
      },
    ]),
    steps: [
      {
        title: 'Map rows to graph records',
        explanation: 'Think of each row as a set of nodes and relationships. Columns often become properties or relationship keys.',
      },
      {
        title: 'Validate loaded documents',
        explanation: 'A count query is the fastest way to confirm data exists.',
        query: 'MATCH (d:Document) RETURN count(d) AS documents',
        expectedResultDescription: 'One or more practice documents are counted.',
      },
      {
        title: 'Inspect imported relationships',
        explanation: 'Imported edges should preserve the meaning of the original tabular columns.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS source, r.relation AS relation, b.name AS target LIMIT 25',
      },
    ],
    sampleQueries: [
      {
        id: 'count-documents',
        title: 'Count documents',
        description: 'Confirm the import produced source documents.',
        query: 'MATCH (d:Document) RETURN count(d) AS documents',
        expectedUse: 'Validation after loading data.',
      },
      {
        id: 'import-relationships',
        title: 'Inspect import relationships',
        description: 'Show the relationships generated from the import scenario.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS source, r.relation AS relation, b.name AS target LIMIT 25',
        expectedUse: 'Check if row relationships were modeled well.',
      },
    ],
    attribution: attribution('video_3'),
  },
  {
    id: 'exploring-knowledge-graph',
    title: 'Exploring a Knowledge Graph',
    description: 'Learn how documents, chunks, topics, and entities work together in a knowledge graph.',
    sourceFolder: 'video_6',
    sourceUrl: 'https://github.com/kuzudb/tutorials/tree/main/src/video_6',
    difficulty: 'Beginner',
    estimatedMinutes: 18,
    tags: ['Graph Modeling', 'Cypher Basics'],
    concepts: ['neighborhood', 'topic coverage', 'chunk evidence', 'entity mention'],
    learningObjectives: [
      'Trace from a document to chunks, topics, and entities.',
      'Use graph expansion to find supporting context.',
      'Read evidence before trusting an answer.',
    ],
    schema: practiceSchema,
    dataset: dataset('Knowledge Graph Exploration', 'A small retrieval-style knowledge graph for exploration practice.', [
      {
        title: 'Policy Assistant Knowledge Graph',
        source: 'tutorials/explore/policy-assistant.md',
        owner: 'Knowledge Team',
        summary: 'Shows how policy documents connect to chunks, entities, topics, and evidence.',
        body:
          'A policy assistant answers questions by retrieving focused chunks. Topics route questions to the right documents. Entities such as Policy Document, Employee, Approval Workflow, and Audit Log help explain the surrounding context.',
        topics: ['Knowledge Graph', 'Retrieval', 'Policy'],
        entities: [
          { name: 'Policy Document', type: 'Source', description: 'A document used as evidence.' },
          { name: 'Approval Workflow', type: 'Process', description: 'Steps required to approve a policy exception.' },
          { name: 'Audit Log', type: 'System Record', description: 'Record of policy access and decisions.' },
          { name: 'Employee', type: 'Actor', description: 'A person using the policy assistant.' },
        ],
        relationships: [
          { from: 'Employee', relation: 'REQUESTS', to: 'Approval Workflow', evidence: 'Employees request approval for exceptions.' },
          { from: 'Approval Workflow', relation: 'REFERENCES', to: 'Policy Document', evidence: 'Workflow steps are defined by policy documents.' },
          { from: 'Audit Log', relation: 'TRACKS', to: 'Approval Workflow', evidence: 'Audit logs track workflow decisions.' },
        ],
      },
    ]),
    steps: [
      {
        title: 'Start from a document',
        explanation: 'Documents are source-level records. Expand from them to chunks and topics to understand coverage.',
        query: 'MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN d.title AS document, c.section AS section, c.text AS text LIMIT 10',
      },
      {
        title: 'Find mentioned entities',
        explanation: 'Entity mentions connect evidence text to named concepts.',
        query: 'MATCH (c:Chunk)-[:MENTIONS]->(e:Entity) RETURN c.section AS section, e.name AS entity, e.type AS type LIMIT 20',
      },
      {
        title: 'Explore topic coverage',
        explanation: 'Topics help users understand what the graph knows about.',
        query: 'MATCH (d:Document)-[:ABOUT]->(t:Topic) RETURN d.title AS document, t.name AS topic LIMIT 20',
      },
    ],
    sampleQueries: [
      {
        id: 'document-context',
        title: 'Document context',
        description: 'Show document chunks and text evidence.',
        query: 'MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN d.title AS document, c.section AS section, c.text AS text LIMIT 10',
        expectedUse: 'Read source evidence.',
      },
      {
        id: 'entity-mentions',
        title: 'Entity mentions',
        description: 'Find which entities appear in source chunks.',
        query: 'MATCH (c:Chunk)-[:MENTIONS]->(e:Entity) RETURN c.section AS section, e.name AS entity, e.type AS type LIMIT 20',
        expectedUse: 'Understand concept coverage.',
      },
    ],
    attribution: attribution('video_6'),
  },
  {
    id: 'network-analysis-basics',
    title: 'Network Analysis Basics',
    description: 'Practice reading connected records, one-hop neighborhoods, and simple paths in a graph.',
    sourceFolder: 'network_analysis',
    sourceUrl: 'https://github.com/kuzudb/tutorials/tree/main/src/network_analysis',
    difficulty: 'Intermediate',
    estimatedMinutes: 25,
    tags: ['Network Analysis', 'Advanced Queries'],
    concepts: ['neighborhood', 'path', 'connected nodes', 'relationship direction'],
    learningObjectives: [
      'Read one-hop entity neighborhoods.',
      'Understand relationship direction.',
      'Use paths to investigate a network.',
    ],
    schema: practiceSchema,
    dataset: dataset('Network Analysis Practice Graph', 'A small system dependency network inspired by network analysis tutorials.', [
      {
        title: 'Service Dependency Network',
        source: 'tutorials/network/service-dependencies.md',
        owner: 'Platform Team',
        summary: 'A network of services, databases, APIs, and incidents for one-hop exploration.',
        body:
          'A service network contains API Gateway, Auth Service, Billing Service, Kuzu Database, Incident, and Dashboard. Services depend on databases and APIs. Incidents affect downstream systems. Network analysis helps identify connected systems and likely impact.',
        topics: ['Network Analysis', 'Operations'],
        entities: [
          { name: 'API Gateway', type: 'Service', description: 'Entry point for application traffic.' },
          { name: 'Auth Service', type: 'Service', description: 'Authentication and token service.' },
          { name: 'Billing Service', type: 'Service', description: 'Service that handles payment workflows.' },
          { name: 'Kuzu Database', type: 'Database', description: 'Graph database used by internal tooling.' },
          { name: 'Incident', type: 'Event', description: 'Operational event affecting systems.' },
          { name: 'Dashboard', type: 'Application', description: 'Operational dashboard used by teams.' },
        ],
        relationships: [
          { from: 'API Gateway', relation: 'ROUTES_TO', to: 'Auth Service', evidence: 'Login traffic reaches Auth Service through the gateway.' },
          { from: 'API Gateway', relation: 'ROUTES_TO', to: 'Billing Service', evidence: 'Billing traffic reaches Billing Service through the gateway.' },
          { from: 'Auth Service', relation: 'READS_FROM', to: 'Kuzu Database', evidence: 'Auth Service reads graph-backed tenant metadata.' },
          { from: 'Billing Service', relation: 'READS_FROM', to: 'Kuzu Database', evidence: 'Billing Service reads customer graph metadata.' },
          { from: 'Incident', relation: 'AFFECTS', to: 'API Gateway', evidence: 'Gateway latency affected downstream requests.' },
          { from: 'Dashboard', relation: 'MONITORS', to: 'Incident', evidence: 'Dashboard tracks active incidents.' },
        ],
      },
    ]),
    steps: [
      {
        title: 'List connected systems',
        explanation: 'A network is useful when you can quickly inspect connected records.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity LIMIT 25',
      },
      {
        title: 'Filter a neighborhood',
        explanation: 'Use WHERE to focus on one system.',
        query: "MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) WHERE a.name = 'API Gateway' RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity",
      },
      {
        title: 'Count relationship types',
        explanation: 'Aggregation helps summarize network structure.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN r.relation AS relation, count(r) AS count ORDER BY count DESC',
      },
    ],
    sampleQueries: [
      {
        id: 'network-edges',
        title: 'All network edges',
        description: 'Show service dependency relationships.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity LIMIT 25',
        expectedUse: 'Render the network in the graph tab.',
      },
      {
        id: 'relationship-summary',
        title: 'Relationship summary',
        description: 'Count relationships by type.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN r.relation AS relation, count(r) AS count ORDER BY count DESC',
        expectedUse: 'Summarize graph structure.',
      },
    ],
    attribution: attribution('network_analysis'),
  },
  {
    id: 'cypher-query-practice',
    title: 'Cypher Query Practice',
    description: 'Practice MATCH, WHERE, RETURN, LIMIT, ORDER BY, and aggregation with guided examples.',
    sourceFolder: 'video_8',
    sourceUrl: 'https://github.com/kuzudb/tutorials/tree/main/src/video_8',
    difficulty: 'Intermediate',
    estimatedMinutes: 22,
    tags: ['Cypher Basics', 'Advanced Queries'],
    concepts: ['MATCH', 'WHERE', 'RETURN', 'ORDER BY', 'count', 'aggregation'],
    learningObjectives: [
      'Filter records with WHERE.',
      'Sort records with ORDER BY.',
      'Summarize graph data with count.',
    ],
    schema: practiceSchema,
    dataset: dataset('Cypher Practice Data', 'A focused graph for query syntax practice.', [
      {
        title: 'Cypher Practice Notes',
        source: 'tutorials/cypher/practice.md',
        owner: 'Developer Education',
        summary: 'Query examples for filtering, sorting, limiting, and aggregation.',
        body:
          'Cypher practice starts with MATCH. WHERE filters rows. RETURN chooses output columns. LIMIT keeps results readable. ORDER BY sorts results. Aggregation such as count helps summarize relationships and topics.',
        topics: ['Cypher Basics', 'Advanced Queries'],
        entities: [
          { name: 'MATCH', type: 'Cypher Clause', description: 'Finds graph patterns.' },
          { name: 'WHERE', type: 'Cypher Clause', description: 'Filters matched rows.' },
          { name: 'RETURN', type: 'Cypher Clause', description: 'Chooses result columns.' },
          { name: 'ORDER BY', type: 'Cypher Clause', description: 'Sorts result rows.' },
          { name: 'Aggregation', type: 'Query Technique', description: 'Summarizes rows with functions such as count.' },
        ],
        relationships: [
          { from: 'MATCH', relation: 'FILTERED_BY', to: 'WHERE', evidence: 'WHERE narrows matched graph patterns.' },
          { from: 'MATCH', relation: 'OUTPUT_BY', to: 'RETURN', evidence: 'RETURN controls visible result columns.' },
          { from: 'RETURN', relation: 'SORTED_BY', to: 'ORDER BY', evidence: 'ORDER BY sorts returned rows.' },
          { from: 'Aggregation', relation: 'SUMMARIZES', to: 'RETURN', evidence: 'Aggregations are returned as query output.' },
        ],
      },
    ]),
    steps: [
      {
        title: 'Filter by entity type',
        explanation: 'Use WHERE to narrow results.',
        query: "MATCH (e:Entity) WHERE e.type = 'Cypher Clause' RETURN e.name AS clause, e.description AS description ORDER BY clause",
      },
      {
        title: 'Limit results',
        explanation: 'Use LIMIT while exploring unknown data.',
        query: 'MATCH (e:Entity) RETURN e.name AS entity, e.type AS type LIMIT 5',
      },
      {
        title: 'Aggregate relationships',
        explanation: 'Use count to summarize how many relationships each relation type has.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN r.relation AS relation, count(r) AS count ORDER BY count DESC',
      },
    ],
    sampleQueries: [
      {
        id: 'where-filter',
        title: 'WHERE filter',
        description: 'Filter entities by type.',
        query: "MATCH (e:Entity) WHERE e.type = 'Cypher Clause' RETURN e.name AS clause, e.description AS description ORDER BY clause",
        expectedUse: 'Practice WHERE and ORDER BY.',
      },
      {
        id: 'count-relations',
        title: 'Count relationship types',
        description: 'Aggregate relationships by relation name.',
        query: 'MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN r.relation AS relation, count(r) AS count ORDER BY count DESC',
        expectedUse: 'Practice aggregation.',
      },
    ],
    attribution: attribution('video_8'),
  },
];

export function tutorialSummary(tutorial: Tutorial): Record<string, JsonValue> {
  return {
    id: tutorial.id,
    title: tutorial.title,
    description: tutorial.description,
    sourceFolder: tutorial.sourceFolder,
    sourceUrl: tutorial.sourceUrl,
    difficulty: tutorial.difficulty,
    estimatedMinutes: tutorial.estimatedMinutes,
    tags: tutorial.tags,
    concepts: tutorial.concepts,
    learningObjectives: tutorial.learningObjectives,
    dataset: tutorial.dataset
      ? {
          name: tutorial.dataset.name,
          description: tutorial.dataset.description,
          files: tutorial.dataset.files,
        }
      : null,
    schema: tutorial.schema ?? null,
    steps: tutorial.steps,
    sampleQueries: tutorial.sampleQueries,
    attribution: tutorial.attribution,
  };
}
