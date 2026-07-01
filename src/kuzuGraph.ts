import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, type AppConfig } from './config.js';
import { SCHEMA_STATEMENTS } from './schema.js';
import { seedSampleData } from './seedData.js';
import type { JsonValue, QueryRow } from './types.js';

const require = createRequire(import.meta.url);

type QueryResultLike = {
  getAll?: () => Promise<unknown[]>;
  getAllSync?: () => unknown[];
};

function normalizeValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const maybeToJSON = value as { toJSON?: () => unknown };
    if (typeof maybeToJSON.toJSON === 'function') {
      return normalizeValue(maybeToJSON.toJSON());
    }

    const output: Record<string, JsonValue> = {};
    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = normalizeValue(childValue);
    }
    return output;
  }

  return String(value);
}

function normalizeRow(row: unknown): QueryRow {
  if (Array.isArray(row)) {
    return Object.fromEntries(row.map((value, index) => [`col${index + 1}`, normalizeValue(value)]));
  }

  if (row && typeof row === 'object') {
    return Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, normalizeValue(value)]),
    );
  }

  return { value: normalizeValue(row) };
}

export class KuzuGraph {
  private readonly config: AppConfig;
  private db: unknown;
  private conn: { query: (statement: string) => Promise<QueryResultLike | QueryResultLike[]> } | undefined;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = loadConfig(config);
  }

  get dbPath(): string {
    return this.config.dbPath;
  }

  async connect(): Promise<void> {
    if (this.conn) {
      return;
    }

    await fs.mkdir(path.dirname(this.config.dbPath), { recursive: true });
    const kuzu = require('kuzu');
    this.db = new kuzu.Database(this.config.dbPath);
    this.conn = new kuzu.Connection(this.db);

    if (this.config.autoCreateSchema) {
      await this.ensureSchema();
    }

    if (this.config.autoSeed && (await this.countNodes('Document')) === 0) {
      await seedSampleData(this);
    }
  }

  async ensureSchema(): Promise<void> {
    for (const statement of SCHEMA_STATEMENTS) {
      await this.execSchemaStatement(statement);
    }
  }

  async query(statement: string): Promise<QueryRow[]> {
    await this.connect();
    if (!this.conn) {
      throw new Error('Kuzu connection is not initialized.');
    }

    const result = await this.conn.query(statement);
    if (Array.isArray(result)) {
      const nestedRows = await Promise.all(result.map((item) => this.rowsFromResult(item)));
      return nestedRows.flat();
    }

    return this.rowsFromResult(result);
  }

  async exec(statement: string): Promise<void> {
    await this.query(statement);
  }

  async countNodes(table: string): Promise<number> {
    const rows = await this.query(`MATCH (n:${table}) RETURN count(n) AS count`);
    const value = rows[0]?.count;
    return typeof value === 'number' ? value : Number(value ?? 0);
  }

  private async rowsFromResult(result: QueryResultLike): Promise<QueryRow[]> {
    if (typeof result.getAll === 'function') {
      return (await result.getAll()).map(normalizeRow);
    }

    if (typeof result.getAllSync === 'function') {
      return result.getAllSync().map(normalizeRow);
    }

    return [];
  }

  private async execSchemaStatement(statement: string): Promise<void> {
    try {
      await this.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|Catalog exception/i.test(message)) {
        return;
      }

      if (/Parser exception/i.test(message) && statement.includes(' IF NOT EXISTS')) {
        try {
          await this.query(statement.replace(' IF NOT EXISTS', ''));
          return;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          if (/already exists|Catalog exception/i.test(fallbackMessage)) {
            return;
          }
          throw fallbackError;
        }
      }

      throw error;
    }
  }
}

