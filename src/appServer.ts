#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { loadConfig } from './config.js';
import { KuzuGraph } from './kuzuGraph.js';
import { KnowledgeGraphService } from './knowledgeGraphService.js';

type Session = {
  username: string;
  expiresAt: number;
};

type QueryLog = {
  id: string;
  kind: 'query' | 'import' | 'database';
  status: 'success' | 'error';
  label: string;
  query?: string;
  durationMs: number;
  rowCount?: number;
  error?: string;
  createdAt: string;
};

const config = loadConfig();
const graph = new KuzuGraph(config);
const service = new KnowledgeGraphService(graph);
const sessions = new Map<string, Session>();
const logs: QueryLog[] = [];
const staticRoot = path.resolve(process.cwd(), 'web');
const serverStartedAt = new Date().toISOString();

const appHost = process.env.KG_APP_HOST || '127.0.0.1';
const appPort = Number(process.env.KG_APP_PORT || 8787);
const appUser = process.env.KG_APP_USER || 'admin@example.com';
const appPassword = process.env.KG_APP_PASSWORD || 'kuzu';
const sessionCookie = 'kuzu_studio_session';
const sessionTtlMs = 1000 * 60 * 60 * 8;

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie ?? '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) {
          return [part, ''];
        }
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function getSession(req: IncomingMessage): Session | null {
  const token = parseCookies(req)[sessionCookie];
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function createSession(username: string): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + sessionTtlMs,
  });
  return token;
}

function clearSession(req: IncomingMessage): void {
  const token = parseCookies(req)[sessionCookie];
  if (token) {
    sessions.delete(token);
  }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > 2_000_000) {
      throw new Error('Request body is too large.');
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON body must be an object.');
  }
  return parsed as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(stringValue).map((item) => item.trim()).filter(Boolean);
}

function objectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function numberFromSearch(searchParams: URLSearchParams, name: string, fallback: number): number {
  const value = Number(searchParams.get(name) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function addLog(entry: Omit<QueryLog, 'id' | 'createdAt'>): QueryLog {
  const log = {
    ...entry,
    id: randomBytes(8).toString('hex'),
    createdAt: new Date().toISOString(),
  };
  logs.unshift(log);
  logs.splice(100);
  return log;
}

function knowledgeGraphDraftFromBody(body: Record<string, unknown>) {
  return {
    title: stringValue(body.title),
    body: stringValue(body.body),
    source: stringValue(body.source),
    owner: stringValue(body.owner),
    summary: stringValue(body.summary),
    topics: stringArray(body.topics),
    entities: objectArray(body.entities).map((entity) => ({
      name: stringValue(entity.name),
      type: stringValue(entity.type),
      description: stringValue(entity.description),
    })),
    relationships: objectArray(body.relationships).map((relationship) => ({
      from: stringValue(relationship.from),
      to: stringValue(relationship.to),
      relation: stringValue(relationship.relation),
      evidence: stringValue(relationship.evidence),
    })),
  };
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/status') {
    sendJson(res, 200, {
      status: 'ok',
      product: 'Kuzu Graph Console',
      serverStartedAt,
      database: await service.databaseSummary(),
    });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/session') {
    const session = getSession(req);
    sendJson(res, 200, {
      authenticated: Boolean(session),
      user: session ? { email: session.username } : null,
      database: await service.databaseSummary(),
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/login') {
    const body = await readJson(req);
    const email = stringValue(body.email).trim();
    const password = stringValue(body.password);

    if (email !== appUser || password !== appPassword) {
      sendJson(res, 401, { error: 'Invalid email or password.' });
      return;
    }

    const token = createSession(email);
    res.setHeader('set-cookie', `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}`);
    sendJson(res, 200, { authenticated: true, user: { email } });
    return;
  }

  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: 'Login required.' });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/logout') {
    clearSession(req);
    res.setHeader('set-cookie', `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    sendJson(res, 200, { authenticated: false });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/status') {
    sendJson(res, 200, {
      status: 'ok',
      product: 'Kuzu Graph Console',
      serverStartedAt,
      database: await service.databaseSummary(),
    });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/databases') {
    sendJson(res, 200, { databases: [await service.databaseSummary()] });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/databases/default/open') {
    const started = performance.now();
    await service.connect();
    const database = await service.databaseSummary();
    addLog({
      kind: 'database',
      status: 'success',
      label: 'Open database',
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    });
    sendJson(res, 200, { database });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/databases/default/disconnect') {
    addLog({
      kind: 'database',
      status: 'success',
      label: 'Disconnect requested',
      durationMs: 0,
    });
    sendJson(res, 200, {
      database: await service.databaseSummary(),
      message: 'Embedded Kuzu stays open for this server process. Stop the app server to fully close it.',
    });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/overview') {
    sendJson(res, 200, await service.overview());
    return;
  }

  if (method === 'GET' && (url.pathname === '/api/schema' || url.pathname === '/schema')) {
    sendJson(res, 200, await service.schema());
    return;
  }

  if (method === 'GET' && url.pathname === '/api/schema-details') {
    sendJson(res, 200, service.schemaDetails());
    return;
  }

  if (method === 'GET' && url.pathname === '/api/graph') {
    sendJson(res, 200, await service.graphSnapshot(numberFromSearch(url.searchParams, 'limit', 300)));
    return;
  }

  if (method === 'GET' && url.pathname === '/api/search') {
    sendJson(res, 200, await service.search(url.searchParams.get('q') ?? '', numberFromSearch(url.searchParams, 'limit', 12)));
    return;
  }

  if (method === 'GET' && url.pathname === '/api/document-context') {
    sendJson(res, 200, await service.documentContext(url.searchParams.get('id') ?? ''));
    return;
  }

  if (method === 'GET' && url.pathname === '/api/entity-neighborhood') {
    sendJson(res, 200, await service.entityNeighborhood(url.searchParams.get('entity') ?? ''));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/documents') {
    const body = await readJson(req);
    const started = performance.now();
    const result = await service.createKnowledgeGraph(knowledgeGraphDraftFromBody(body));
    addLog({
      kind: 'import',
      status: 'success',
      label: `Import document: ${stringValue(body.title) || 'Untitled'}`,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    });
    sendJson(res, 201, result);
    return;
  }

  if (method === 'POST' && url.pathname === '/api/import/preview') {
    const body = await readJson(req);
    sendJson(res, 200, service.importPreview(knowledgeGraphDraftFromBody(body)));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/relationships') {
    const body = await readJson(req);
    const result = await service.createEntityRelationship({
      from: stringValue(body.from),
      to: stringValue(body.to),
      relation: stringValue(body.relation),
      evidence: stringValue(body.evidence),
    });
    if (!result) {
      sendJson(res, 422, { error: 'Both entities must exist before a relationship can be created.' });
      return;
    }
    sendJson(res, 201, result);
    return;
  }

  if (method === 'POST' && (url.pathname === '/api/cypher' || url.pathname === '/cypher')) {
    const body = await readJson(req);
    const query = stringValue(body.query);
    const started = performance.now();
    try {
      const result = await service.runReadOnlyCypher(query, Number(body.limit ?? 100));
      addLog({
        kind: 'query',
        status: 'success',
        label: 'Run Cypher',
        query: result.query as string,
        durationMs: Number(result.executionMs ?? Math.round((performance.now() - started) * 100) / 100),
        rowCount: Number(result.rowCount ?? 0),
      });
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog({
        kind: 'query',
        status: 'error',
        label: 'Run Cypher',
        query,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        error: message,
      });
      throw error;
    }
    return;
  }

  if (method === 'POST' && url.pathname === '/api/question') {
    const body = await readJson(req);
    sendJson(res, 200, await service.answerContext(stringValue(body.question), Number(body.limit ?? 5)));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/explore') {
    const body = await readJson(req);
    sendJson(
      res,
      200,
      await service.exploreGraph({
        table: stringValue(body.table || 'Document'),
        depth: Number(body.depth ?? 1),
        limit: Number(body.limit ?? 100),
      }),
    );
    return;
  }

  if (method === 'GET' && url.pathname === '/api/logs') {
    sendJson(res, 200, { logs });
    return;
  }

  if (method === 'DELETE' && url.pathname === '/api/logs') {
    logs.splice(0);
    sendJson(res, 200, { logs });
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const requestPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.resolve(staticRoot, `.${requestPath}`);

  if (!filePath.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
      'cache-control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=60',
    });
    res.end(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const index = await fs.readFile(path.join(staticRoot, 'index.html'));
      res.writeHead(200, {
        'content-type': contentTypes['.html'],
        'cache-control': 'no-store',
      });
      res.end(index);
      return;
    }
    throw error;
  }
}

await service.connect();

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${appHost}:${appPort}`}`);
  const wantsJsonRoot = url.pathname === '/' && (req.headers.accept ?? '').includes('application/json');
  const isApiRequest = url.pathname.startsWith('/api/') || ['/status', '/schema', '/cypher'].includes(url.pathname) || wantsJsonRoot;
  if (wantsJsonRoot) {
    url.pathname = '/status';
  }

  Promise.resolve(isApiRequest ? handleApi(req, res, url) : serveStatic(req, res, url)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  });
});

server.listen(appPort, appHost, () => {
  console.log(`Kuzu Graph Console running at http://${appHost}:${appPort}`);
  console.log(`Login with ${appUser} / ${appPassword}`);
  console.log(`Database storage: ${config.dbPath.split('/').slice(-2).join('/')}`);
});
