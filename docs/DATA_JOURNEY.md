# Data Journey: From Documents To MCP Context

This example uses a GenAI Workbench support and deployment graph.

## 1. Source Documents

The journey begins with four knowledge artifacts:

- `doc-workbench-overview`: product workflow
- `doc-context-cost`: context and token cost reduction
- `doc-deployment`: production checklist
- `doc-support-journey`: first customer onboarding story

These are represented as `Document` nodes.

## 2. Chunks

Each document is split into smaller `Chunk` nodes.

Example:

```text
AI cost rises when the prompt contains too much irrelevant context.
The retrieval layer should send the smallest useful evidence set to the LLM.
```

Workbench-style systems should send these compact chunks to the LLM instead of whole documents.

## 3. Entities

Important terms become `Entity` nodes:

- GenAI Workbench
- Kuzu
- Model Context Protocol
- Context Graph
- Vector Search
- API Key
- Tenant Isolation
- REST API

Chunks connect to entities through `MENTIONS`.

## 4. Topics

Documents connect to high-level `Topic` nodes:

- Product Workflow
- Cost Control
- Deployment
- Knowledge Graph

Topics help route questions.

## 5. Semantic Links

Entities connect to other entities through `RELATED_TO`.

Example:

```text
Context Graph - CAN_BE_STORED_IN -> Kuzu
Model Context Protocol - READS_FROM -> Kuzu
API Key - PROTECTS -> REST API
```

These relationships are where the graph starts becoming more useful than flat text search.

## 6. MCP Context Pack

When an MCP client asks:

```text
How does the context graph reduce AI cost and how do I deploy it safely?
```

The `kg_question_context` tool:

1. Searches documents, chunks, entities, and topics.
2. Finds matching chunks about cost control and deployment.
3. Expands from chunks to source documents.
4. Returns related entities and topics.
5. Produces a compact evidence pack for the LLM.

That means the LLM receives focused graph-backed context rather than all documents.

