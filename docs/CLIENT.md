# Creating An MCP Client

An MCP client is the program that starts your MCP server, connects to it, lists tools, and calls those tools.

In this repo:

- MCP server: `src/index.ts`
- Demo MCP client: `scripts/client.ts`

The demo client uses stdio. That means it starts the server as a child process and talks to it through stdin/stdout.

## Run The Demo Client

From the project root:

```bash
npm run client:demo
```

You should see:

1. Client connects to the server.
2. Client lists tools such as `kg_overview` and `kg_search`.
3. Client reads the `kuzu://schema` resource.
4. Client calls graph tools and prints JSON results.

The demo client uses `.tmp/client-demo-kuzu` by default so it will not fight with a separately running `npm run dev` process. If you want it to use your main demo graph, stop `npm run dev` first and run:

```bash
KUZU_DB_PATH=./data/kuzu-demo npm run client:demo
```

## Minimal Client Code

This is the core pattern:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
  name: 'my-kuzu-client',
  version: '0.1.0',
});

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/src/index.js'],
  env: {
    KUZU_DB_PATH: './data/kuzu-demo',
    KUZU_AUTO_CREATE_SCHEMA: 'true',
    KUZU_AUTO_SEED: 'true',
  },
});

await client.connect(transport);

const tools = await client.listTools();
console.log(tools.tools.map((tool) => tool.name));

const result = await client.callTool({
  name: 'kg_question_context',
  arguments: {
    question: 'How does the context graph reduce AI cost?',
    limit: 5,
  },
});

console.log(result.content);
await client.close();
```

## Important Beginner Notes

- The client launches the server. You normally do not run `npm run dev` separately for a stdio MCP setup.
- Kuzu locks the database file while one process is using it. Do not point two running MCP server processes at the same `KUZU_DB_PATH`.
- The server must write MCP JSON messages to stdout. Normal logs should go to stderr.
- A stdio MCP server does not have a browser URL.
- For a visual client, use MCP Inspector or an MCP-enabled desktop/client app.

## Your Next Client Options

Use this demo client as a starting point for:

- A command-line graph explorer
- A test harness for new MCP tools
- A web backend that calls graph tools before sending context to an LLM
- A desktop app integration
