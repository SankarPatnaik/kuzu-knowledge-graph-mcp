-- Explore the seeded GenAI Workbench knowledge graph.

-- 1. See documents and summaries.
MATCH (d:Document)
RETURN d.id AS id, d.title AS title, d.summary AS summary
ORDER BY d.title;

-- 2. See the chunks that came from one document.
MATCH (d:Document)-[h:HAS_CHUNK]->(c:Chunk)
WHERE d.id = 'doc-context-cost'
RETURN h.position AS position, c.section AS section, c.text AS text
ORDER BY h.position;

-- 3. See entities mentioned in the context-cost runbook.
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)-[m:MENTIONS]->(e:Entity)
WHERE d.id = 'doc-context-cost'
RETURN e.name AS entity, e.type AS type, m.confidence AS confidence
ORDER BY confidence DESC;

-- 4. See how graph concepts relate to deployment and cost.
MATCH (a:Entity)-[r:RELATED_TO]->(b:Entity)
RETURN a.name AS fromEntity, r.relation AS relation, b.name AS toEntity, r.evidence AS evidence;

-- 5. Read compact evidence for deployment.
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
WHERE d.id = 'doc-deployment'
RETURN d.title AS document, c.section AS section, c.text AS evidence
ORDER BY c.section;

