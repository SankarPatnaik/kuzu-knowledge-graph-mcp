const DISALLOWED_WRITE_KEYWORDS = [
  'ALTER',
  'ATTACH',
  'COPY',
  'CREATE',
  'DELETE',
  'DETACH',
  'DROP',
  'EXPORT',
  'IMPORT',
  'INSTALL',
  'LOAD',
  'MERGE',
  'REMOVE',
  'SET',
];

const READ_START_KEYWORDS = ['CALL', 'EXPLAIN', 'MATCH', 'PROFILE', 'RETURN', 'SHOW', 'UNWIND', 'WITH'];

export function cypherString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');

  return `'${escaped}'`;
}

export function validateReadOnlyCypher(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Cypher query is required.');
  }

  const withoutTrailingSemicolon = trimmed.endsWith(';') ? trimmed.slice(0, -1).trim() : trimmed;
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Only one Cypher statement is allowed per MCP tool call.');
  }

  const firstWord = withoutTrailingSemicolon.match(/^[A-Za-z]+/)?.[0]?.toUpperCase();
  if (!firstWord || !READ_START_KEYWORDS.includes(firstWord)) {
    throw new Error(`Read-only query must start with one of: ${READ_START_KEYWORDS.join(', ')}.`);
  }

  for (const keyword of DISALLOWED_WRITE_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (pattern.test(withoutTrailingSemicolon)) {
      throw new Error(`The query contains '${keyword}', which is not allowed by this read-only MCP server.`);
    }
  }

  return withoutTrailingSemicolon;
}

export function appendLimit(query: string, limit: number): string {
  const normalizedLimit = Math.max(1, Math.min(limit, 1000));
  if (/\bLIMIT\s+\d+\b/i.test(query)) {
    return query;
  }

  return `${query} LIMIT ${normalizedLimit}`;
}

