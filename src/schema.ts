export const NODE_TABLES = ['Document', 'Chunk', 'Entity', 'Topic'] as const;
export const REL_TABLES = ['HAS_CHUNK', 'MENTIONS', 'ABOUT', 'RELATED_TO'] as const;

export const SCHEMA_STATEMENTS = [
  'CREATE NODE TABLE IF NOT EXISTS Document(id STRING PRIMARY KEY, title STRING, source STRING, owner STRING, createdAt STRING, summary STRING)',
  'CREATE NODE TABLE IF NOT EXISTS Chunk(id STRING PRIMARY KEY, text STRING, tokenEstimate INT64, section STRING)',
  'CREATE NODE TABLE IF NOT EXISTS Entity(id STRING PRIMARY KEY, name STRING, type STRING, description STRING)',
  'CREATE NODE TABLE IF NOT EXISTS Topic(id STRING PRIMARY KEY, name STRING, description STRING)',
  'CREATE REL TABLE IF NOT EXISTS HAS_CHUNK(FROM Document TO Chunk, position INT64)',
  'CREATE REL TABLE IF NOT EXISTS MENTIONS(FROM Chunk TO Entity, confidence DOUBLE)',
  'CREATE REL TABLE IF NOT EXISTS ABOUT(FROM Document TO Topic, weight DOUBLE)',
  'CREATE REL TABLE IF NOT EXISTS RELATED_TO(FROM Entity TO Entity, relation STRING, evidence STRING)',
];

export const SCHEMA_DESCRIPTION = {
  nodes: {
    Document: 'Source-level knowledge artifact such as runbook, FAQ, architecture note, or customer journey.',
    Chunk: 'Small retrievable text segment connected to its source document.',
    Entity: 'Important business, technical, product, or operational concept mentioned in chunks.',
    Topic: 'Higher-level category used to route questions and summarize graph coverage.',
  },
  relationships: {
    HAS_CHUNK: 'Document -> Chunk. Preserves source order through position.',
    MENTIONS: 'Chunk -> Entity. Connects text evidence to named concepts.',
    ABOUT: 'Document -> Topic. Connects source material to high-level themes.',
    RELATED_TO: 'Entity -> Entity. Captures curated semantic links between concepts.',
  },
};

export const SCHEMA_TABLE_DETAILS = {
  nodes: [
    {
      name: 'Document',
      description: SCHEMA_DESCRIPTION.nodes.Document,
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'title', type: 'STRING', primaryKey: false },
        { name: 'source', type: 'STRING', primaryKey: false },
        { name: 'owner', type: 'STRING', primaryKey: false },
        { name: 'createdAt', type: 'STRING', primaryKey: false },
        { name: 'summary', type: 'STRING', primaryKey: false },
      ],
    },
    {
      name: 'Chunk',
      description: SCHEMA_DESCRIPTION.nodes.Chunk,
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'text', type: 'STRING', primaryKey: false },
        { name: 'tokenEstimate', type: 'INT64', primaryKey: false },
        { name: 'section', type: 'STRING', primaryKey: false },
      ],
    },
    {
      name: 'Entity',
      description: SCHEMA_DESCRIPTION.nodes.Entity,
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'name', type: 'STRING', primaryKey: false },
        { name: 'type', type: 'STRING', primaryKey: false },
        { name: 'description', type: 'STRING', primaryKey: false },
      ],
    },
    {
      name: 'Topic',
      description: SCHEMA_DESCRIPTION.nodes.Topic,
      properties: [
        { name: 'id', type: 'STRING', primaryKey: true },
        { name: 'name', type: 'STRING', primaryKey: false },
        { name: 'description', type: 'STRING', primaryKey: false },
      ],
    },
  ],
  relationships: [
    {
      name: 'HAS_CHUNK',
      from: 'Document',
      to: 'Chunk',
      description: SCHEMA_DESCRIPTION.relationships.HAS_CHUNK,
      properties: [{ name: 'position', type: 'INT64' }],
    },
    {
      name: 'MENTIONS',
      from: 'Chunk',
      to: 'Entity',
      description: SCHEMA_DESCRIPTION.relationships.MENTIONS,
      properties: [{ name: 'confidence', type: 'DOUBLE' }],
    },
    {
      name: 'ABOUT',
      from: 'Document',
      to: 'Topic',
      description: SCHEMA_DESCRIPTION.relationships.ABOUT,
      properties: [{ name: 'weight', type: 'DOUBLE' }],
    },
    {
      name: 'RELATED_TO',
      from: 'Entity',
      to: 'Entity',
      description: SCHEMA_DESCRIPTION.relationships.RELATED_TO,
      properties: [
        { name: 'relation', type: 'STRING' },
        { name: 'evidence', type: 'STRING' },
      ],
    },
  ],
} as const;
