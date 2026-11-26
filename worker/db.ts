import { SCHEMA } from '../shared/schema';

/** The slice of the D1 API this Worker uses, typed locally (no extra package). */
export interface D1PreparedStatement {
  bind(...values: (string | number | null)[]): D1PreparedStatement;
  first<T = Row>(): Promise<T | null>;
  all<T = Row>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<unknown>;
}

export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  DB: D1Database;
  ASSETS: AssetsBinding;
  PUZZLE_SECRET?: string;
}

export type Row = Record<string, unknown>;

export interface Db {
  one(sql: string, ...params: (string | number | null)[]): Promise<Row | null>;
  all(sql: string, ...params: (string | number | null)[]): Promise<Row[]>;
  run(sql: string, ...params: (string | number | null)[]): Promise<void>;
}

/** D1's exec() is line-oriented in workerd, so statements go one at a time. */
export const SCHEMA_STATEMENTS = SCHEMA.split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const ready = new WeakMap<object, Promise<void>>();

/**
 * D1 has no migration runner and the deployer cannot execute SQL, so the
 * Worker applies the same idempotent DDL once per isolate before serving.
 */
export function ensureSchema(env: Env): Promise<void> {
  const key = env.DB as unknown as object;
  const existing = ready.get(key);
  if (existing) return existing;
  const pending = (async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      await env.DB.prepare(statement).run();
    }
  })().catch((err: unknown) => {
    ready.delete(key);
    throw err;
  });
  ready.set(key, pending);
  return pending;
}

export function createDb(env: Env): Db {
  const bind = (sql: string, params: (string | number | null)[]) => env.DB.prepare(sql).bind(...params);
  return {
    async one(sql, ...params) {
      return (await bind(sql, params).first()) ?? null;
    },
    async all(sql, ...params) {
      const result = await bind(sql, params).all();
      return Array.isArray(result?.results) ? result.results : [];
    },
    async run(sql, ...params) {
      await bind(sql, params).run();
    },
  };
}
