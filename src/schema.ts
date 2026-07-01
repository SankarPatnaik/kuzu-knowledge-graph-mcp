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

