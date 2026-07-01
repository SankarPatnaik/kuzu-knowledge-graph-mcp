# MCP Tools

The server exposes Kuzu through a small, safe set of read tools.

## `kg_overview`

Returns:

- Database path
- Node counts
- Relationship counts
- Topic coverage
- Example relationships
- Sample questions

Use it first to confirm the server can read Kuzu.

## `kg_search`

Input:

```json
{
  "query": "context graph cost reduction",
  "limit": 8
}
```

Searches documents, chunks, entities, and topics. This is simple keyword search for beginner clarity. You can later replace it with full-text search or vector retrieval.

## `kg_get_document_context`

Input:

```json
{
  "documentId": "doc-context-cost"
}
```

Returns a document, ordered chunks, entities mentioned by the chunks, and topics connected to the document.

## `kg_entity_neighborhood`

Input:

```json
{
  "entity": "Kuzu"
}
```

Returns one-hop entity relationships and chunk evidence that mentions the entity.

## `kg_question_context`

Input:

```json
{
  "question": "How does the context graph reduce AI cost and how do I deploy it safely?",
  "limit": 5
}
```

Builds a compact evidence pack:

1. Search graph records.
2. Find matching chunks.
3. Expand to source documents, topics, and entities.
4. Return focused context for an LLM.

## `kg_readonly_cypher`

Input:

```json
{
  "query": "MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity) RETURN a.name, r.relation, b.name",
  "limit": 100
}
```

This tool blocks mutating Cypher keywords including `CREATE`, `MERGE`, `DELETE`, `DROP`, `ALTER`, `COPY`, `SET`, and `REMOVE`.

## Resource

The server also exposes:

```text
kuzu://schema
```

This returns schema descriptions, counts, and example Cypher queries.

