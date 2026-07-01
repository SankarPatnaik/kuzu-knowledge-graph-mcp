import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const serverPath = path.join(repoRoot, 'dist/src/index.js');
const dbPath = process.env.KUZU_DB_PATH ?? path.join(repoRoot, '.tmp/client-demo-kuzu');

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function printToolText(result: Awaited<ReturnType<Client['callTool']>>): void {
  const content = Array.isArray(result.content) ? result.content : [];
  for (const item of content) {
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      item.type === 'text' &&
      'text' in item &&
      typeof item.text === 'string'
    ) {
      console.log(item.text);
    }
  }
}

function resourceText(result: Awaited<ReturnType<Client['readResource']>>): string {
  const first = result.contents[0];
  if (first && 'text' in first && typeof first.text === 'string') {
    return first.text;
  }

  return 'No text resource returned.';
}

const client = new Client({
  name: 'kuzu-knowledge-graph-demo-client',
  version: '0.1.0',
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: repoRoot,
  env: {
    ...getDefaultEnvironment(),
    KUZU_DB_PATH: dbPath,
    KUZU_AUTO_CREATE_SCHEMA: 'true',
    KUZU_AUTO_SEED: 'true',
  },
  stderr: 'pipe',
});

transport.stderr?.on('data', (chunk) => {
  const text = String(chunk).trim();
  if (process.env.MCP_CLIENT_DEBUG === 'true' && text) {
    console.error(`[server] ${text}`);
  }
});

try {
  printSection('Connect');
  await client.connect(transport);
  console.log(`Connected to ${client.getServerVersion()?.name ?? 'MCP server'}`);
  console.log(`Kuzu DB path: ${dbPath}`);

  printSection('List Tools');
  const tools = await client.listTools();
  for (const tool of tools.tools) {
    console.log(`- ${tool.name}: ${tool.description ?? 'No description'}`);
  }

  printSection('Read Schema Resource');
  const schema = await client.readResource({ uri: 'kuzu://schema' });
  console.log(resourceText(schema));

  printSection('Call kg_overview');
  printToolText(await client.callTool({ name: 'kg_overview', arguments: {} }));

  printSection('Call kg_search');
  printToolText(
    await client.callTool({
      name: 'kg_search',
      arguments: {
        query: 'context graph cost deployment',
        limit: 5,
      },
    }),
  );

  printSection('Call kg_question_context');
  printToolText(
    await client.callTool({
      name: 'kg_question_context',
      arguments: {
        question: 'How does the context graph reduce AI cost and how do I deploy it safely?',
        limit: 5,
      },
    }),
  );
} finally {
  await client.close();
}
