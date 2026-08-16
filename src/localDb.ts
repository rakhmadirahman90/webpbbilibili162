/*
 * Local database for PB Bilibili 162.
 *
 * Production frontend data is intentionally served from IndexedDB instead of
 * Supabase. This keeps the UI usable when the remote database is unavailable
 * and gives every module one consistent local data source.
 *
 * The exported `supabase` object below is a compatibility facade so existing
 * modules can keep using the familiar `.from(...).select()/insert()/update()`
 * API while all reads/writes are performed locally.
 */

type Row = Record<string, any>;
type Filter = (row: Row) => boolean;

const DB_NAME = 'pb-bilibili-162-local-db';
const DB_VERSION = 1;
const STORE_NAME = 'tables';
const META_KEY = '__meta__';

const memoryTables: Record<string, Row[]> = {};
let dbPromise: Promise<IDBDatabase | null> | null = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function readTable(table: string): Promise<Row[]> {
  if (memoryTables[table]) return structuredCloneSafe(memoryTables[table]);
  const db = await openDb();
  if (!db) return structuredCloneSafe(memoryTables[table] || []);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(table);
      request.onsuccess = () => {
        const rows = Array.isArray(request.result) ? request.result : [];
        memoryTables[table] = rows;
        resolve(structuredCloneSafe(rows));
      };
      request.onerror = () => resolve(structuredCloneSafe(memoryTables[table] || []));
    } catch {
      resolve(structuredCloneSafe(memoryTables[table] || []));
    }
  });
}

async function writeTable(table: string, rows: Row[]) {
  memoryTables[table] = structuredCloneSafe(rows);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(memoryTables[table], table);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local-db-updated', { detail: { table } }));
  }
}

function structuredCloneSafe<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function compare(a: any, b: any) {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a > b) return 1;
  return -1;
}

function valueMatches(row: Row, column: string, value: any) {
  return row?.[column] === value;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class LocalQueryBuilder implements PromiseLike<any> {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row[] = [];
  private filters: Filter[] = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private returnRows = false;
  private conflictColumn: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*') {
    this.returnRows = true;
    if (this.operation === 'select') this.operation = 'select';
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = 'insert';
    this.payload = Array.isArray(values) ? structuredCloneSafe(values) : [structuredCloneSafe(values)];
    return this;
  }

  update(values: Row) {
    this.operation = 'update';
    this.payload = [structuredCloneSafe(values)];
    return this;
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.operation = 'upsert';
    this.payload = Array.isArray(values) ? structuredCloneSafe(values) : [structuredCloneSafe(values)];
    this.conflictColumn = options?.onConflict || 'id';
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => valueMatches(row, column, value));
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => !valueMatches(row, column, value));
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((row) => compare(row?.[column], value) > 0);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => compare(row?.[column], value) >= 0);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((row) => compare(row?.[column], value) < 0);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => compare(row?.[column], value) <= 0);
    return this;
  }

  ilike(column: string, pattern: string) {
    const needle = String(pattern || '').replace(/%/g, '').toLowerCase();
    this.filters.push((row) => String(row?.[column] ?? '').toLowerCase().includes(needle));
    return this;
  }

  like(column: string, pattern: string) {
    return this.ilike(column, pattern);
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row?.[column]));
    return this;
  }

  is(column: string, value: any) {
    this.filters.push((row) => row?.[column] === value);
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is') this.filters.push((row) => row?.[column] !== value);
    else if (operator === 'eq') this.filters.push((row) => row?.[column] !== value);
    return this;
  }

  or(expression: string) {
    const parts = String(expression || '').split(',').map((p) => p.trim()).filter(Boolean);
    this.filters.push((row) => parts.some((part) => {
      const match = part.match(/^([\w-]+)\.(eq|ilike|neq)\.(.*)$/i);
      if (!match) return false;
      const [, column, op, raw] = match;
      const value = raw.replace(/^\"|\"$/g, '');
      if (op.toLowerCase() === 'neq') return String(row?.[column] ?? '') !== value;
      if (op.toLowerCase() === 'ilike') return String(row?.[column] ?? '').toLowerCase().includes(value.replace(/%/g, '').toLowerCase());
      return String(row?.[column] ?? '') === value;
    }));
    return this;
  }

  contains(column: string, value: any) {
    this.filters.push((row) => {
      const actual = row?.[column];
      if (Array.isArray(actual)) return Array.isArray(value) && value.every((v) => actual.includes(v));
      if (actual && typeof actual === 'object' && value && typeof value === 'object') return Object.entries(value).every(([k, v]) => actual[k] === v);
      return false;
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.limitCount = value;
    return this;
  }

  range(from: number, to: number) {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantMaybeSingle = true;
    return this;
  }

  async execute(): Promise<any> {
    try {
      const rows = await readTable(this.table);
      const matches = () => rows.filter((row) => this.filters.every((f) => f(row)));
      const selected = matches();

      if (this.operation === 'select') {
        let result = selected;
        for (const order of this.orders.slice().reverse()) {
          result = result.slice().sort((a, b) => compare(a?.[order.column], b?.[order.column]) * (order.ascending ? 1 : -1));
        }
        if (this.rangeStart !== null) result = result.slice(this.rangeStart, (this.rangeEnd ?? result.length - 1) + 1);
        if (this.limitCount !== null) result = result.slice(0, this.limitCount);
        if (this.wantSingle) return { data: result[0] || null, error: result.length === 1 ? null : { message: 'Expected exactly one row' } };
        if (this.wantMaybeSingle) return { data: result[0] || null, error: null };
        return { data: structuredCloneSafe(result), error: null };
      }

      if (this.operation === 'insert') {
        const now = new Date().toISOString();
        const created = this.payload.map((item) => ({ id: item.id ?? makeId(), created_at: item.created_at ?? now, updated_at: item.updated_at ?? now, ...item }));
        await writeTable(this.table, rows.concat(created));
        return { data: this.returnRows ? created : null, error: null };
      }

      if (this.operation === 'update') {
        const now = new Date().toISOString();
        let count = 0;
        const updated = rows.map((row) => {
          if (!this.filters.every((f) => f(row))) return row;
          count += 1;
          return { ...row, ...this.payload[0], updated_at: now };
        });
        await writeTable(this.table, updated);
        return { data: this.returnRows ? updated.filter((r) => this.filters.every((f) => f(r))) : null, error: null, count };
      }

      if (this.operation === 'upsert') {
        const key = this.conflictColumn || 'id';
        const next = rows.slice();
        const output: Row[] = [];
        for (const item of this.payload) {
          const value = item[key] ?? makeId();
          const index = next.findIndex((row) => row?.[key] === value);
          const merged = { ...(index >= 0 ? next[index] : {}), ...item, [key]: value, updated_at: new Date().toISOString() };
          if (index >= 0) next[index] = merged;
          else next.push({ ...merged, created_at: merged.created_at ?? new Date().toISOString() });
          output.push(merged);
        }
        await writeTable(this.table, next);
        return { data: this.returnRows ? output : null, error: null };
      }

      if (this.operation === 'delete') {
        const kept = rows.filter((row) => !this.filters.every((f) => f(row)));
        await writeTable(this.table, kept);
        return { data: this.returnRows ? selected : null, error: null, count: rows.length - kept.length };
      }

      return { data: [], error: null };
    } catch (error: any) {
      return { data: null, error: { message: error?.message || 'Local database error' } };
    }
  }

  then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

function from(table: string) {
  return new LocalQueryBuilder(table);
}

const noopChannel = {
  on: () => noopChannel,
  subscribe: (callback?: (status: string) => void) => {
    callback?.('SUBSCRIBED');
    return noopChannel;
  },
};

export const supabase = {
  from,
  channel: () => noopChannel,
  removeChannel: () => undefined,
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Authentication is local-only in this mode' } }),
    signOut: async () => ({ error: null }),
  },
};

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
export const SUPABASE_PROJECT_REF = '';
export const SUPABASE_PROJECT_URL = '';

export async function testSupabaseConnection() {
  return {
    connected: false,
    message: 'Local Database Mode aktif — Supabase tidak digunakan oleh frontend.',
    timestamp: new Date().toISOString(),
  };
}

export async function localDbExport() {
  const db = await openDb();
  if (!db) return {};
  return new Promise<Record<string, Row[]>>((resolve) => {
    const result: Record<string, Row[]> = {};
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (cursor.key !== META_KEY && Array.isArray(cursor.value)) result[String(cursor.key)] = cursor.value;
        cursor.continue();
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    } catch {
      resolve(result);
    }
  });
}

export async function localDbImport(data: Record<string, Row[]>) {
  for (const [table, rows] of Object.entries(data || {})) {
    if (Array.isArray(rows)) await writeTable(table, rows);
  }
  return { ok: true };
}
