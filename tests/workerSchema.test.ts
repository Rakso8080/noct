import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLES } from '../shared/schema.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const schema = read('../shared/schema.ts');
const server = read('../server/index.ts');
const worker = read('../worker/index.ts');

const declared = new Set([...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]));

test('every declared table is documented with its columns', () => {
  for (const [table, columns] of Object.entries(TABLES)) {
    assert.ok(declared.has(table), `${table} is missing from the DDL`);
    const body = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`));
    assert.ok(body, `no CREATE TABLE body for ${table}`);
    for (const column of columns) {
      assert.match(body[1], new RegExp(`\\b${column}\\b`), `${table}.${column} is not in the DDL`);
    }
  }
});

test('the API only touches tables the schema creates', () => {
  const referenced = new Set<string>();
  // SQL keywords that follow update/join without naming a table.
  const notTables = new Set(['set', 'excluded', 'where', 'select']);
  for (const source of [server, worker]) {
    for (const match of source.matchAll(/\b(?:from|into|update|join)\s+([a-z_]+)\b/g)) {
      if (!notTables.has(match[1])) referenced.add(match[1]);
    }
  }
  assert.ok(referenced.size >= 5, 'expected the API to query the main tables');
  for (const table of referenced) {
    assert.ok(declared.has(table), `API queries ${table}, which the schema does not create`);
  }
});

test('Node and Worker expose the same routes', () => {
  const literals = (source: string) =>
    new Set([...source.matchAll(/`?'(\/api\/[a-z/:0-9-]*)'`?/g)].map((m) => m[1]));
  const patterns = (source: string) =>
    new Set([...source.matchAll(/path\.match\(\/\^(.+?)\$\/\)/g)].map((m) => m[1]));

  const nodeLiterals = literals(server);
  const workerLiterals = literals(worker);
  for (const route of nodeLiterals) {
    assert.ok(workerLiterals.has(route), `worker is missing ${route}`);
  }
  const nodePatterns = patterns(server);
  const workerPatterns = patterns(worker);
  assert.ok(nodePatterns.size >= 4, 'expected the Node server to expose its regex routes');
  for (const route of nodePatterns) {
    assert.ok(workerPatterns.has(route), `worker is missing route ${route}`);
  }
});
