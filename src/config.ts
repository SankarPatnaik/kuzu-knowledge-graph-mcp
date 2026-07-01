import path from 'node:path';

export type AppConfig = {
  dbPath: string;
  autoCreateSchema: boolean;
  autoSeed: boolean;
  serverName: string;
  serverVersion: string;
};

function readBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    dbPath: path.resolve(overrides.dbPath ?? process.env.KUZU_DB_PATH ?? './data/kuzu-demo'),
    autoCreateSchema: overrides.autoCreateSchema ?? readBoolean('KUZU_AUTO_CREATE_SCHEMA', true),
    autoSeed: overrides.autoSeed ?? readBoolean('KUZU_AUTO_SEED', true),
    serverName: overrides.serverName ?? process.env.MCP_SERVER_NAME ?? 'kuzu-knowledge-graph',
    serverVersion: overrides.serverVersion ?? process.env.MCP_SERVER_VERSION ?? '0.1.0',
  };
}

