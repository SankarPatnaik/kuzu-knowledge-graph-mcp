# Example Questions

Use these prompts from an MCP client after connecting the server.

1. What is inside the Kuzu knowledge graph?
2. Search the graph for context graph cost reduction.
3. Show me the document context for `doc-context-cost`.
4. Which entities are connected to Kuzu?
5. Build context for this question: "How does the context graph reduce AI cost and how do I deploy safely?"
6. Run this read-only Cypher:

```cypher
MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity)
RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity
LIMIT 10
```

