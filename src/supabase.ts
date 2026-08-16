import './localSeed';

/* Local database compatibility layer. Runtime frontend uses IndexedDB. */
type Row = Record<string, any>;
type Filter = (row: Row) => boolean;

const DB_NAME = 'pb-bilibili-162-local-db';
const DB_VERSION = 1;
const STORE_NAME = 'tables';
const memoryTables: Record<string, Row[]> = {};
let dbPromise: Promise<IDBDatabase | null> | null = null;

function isBrowser() { return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'; }
function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
function clone<T>(value: T): T { try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); } }
async function readTable(table: string): Promise<Row[]> {
  if (memoryTables[table]) return clone(memoryTables[table]);
  const db = await openDb(); if (!db) return clone(memoryTables[table] || []);
  return new Promise((resolve) => {
    try { const tx = db.transaction(STORE_NAME, 'readonly'); const req = tx.objectStore(STORE_NAME).get(table);
      req.onsuccess = () => { const rows = Array.isArray(req.result) ? req.result : []; memoryTables[table] = rows; resolve(clone(rows)); };
      req.onerror = () => resolve(clone(memoryTables[table] || []));
    } catch { resolve(clone(memoryTables[table] || [])); }
  });
}
async function writeTable(table: string, rows: Row[]) {
  memoryTables[table] = clone(rows); const db = await openDb(); if (!db) return;
  await new Promise<void>((resolve) => { try { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(memoryTables[table], table); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); } catch { resolve(); } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('local-db-updated', { detail: { table } }));
}
function compare(a: any, b: any) { if (a === b) return 0; if (a == null) return -1; if (b == null) return 1; return a > b ? 1 : -1; }
function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }

class LocalQueryBuilder implements PromiseLike<any> {
  private table: string; private operation: 'select'|'insert'|'update'|'upsert'|'delete' = 'select'; private payload: Row[] = []; private filters: Filter[] = [];
  private orders: Array<{column:string;ascending:boolean}> = []; private limitCount: number|null = null; private rangeStart: number|null = null; private rangeEnd: number|null = null;
  private wantSingle=false; private wantMaybeSingle=false; private returnRows=false; private conflictColumn:string|null=null;
  constructor(table:string){this.table=table;}
  select(_columns='*'){this.returnRows=true;return this;} insert(v:Row|Row[]){this.operation='insert';this.payload=Array.isArray(v)?clone(v):[clone(v)];return this;}
  update(v:Row){this.operation='update';this.payload=[clone(v)];return this;} upsert(v:Row|Row[],o?:{onConflict?:string}){this.operation='upsert';this.payload=Array.isArray(v)?clone(v):[clone(v)];this.conflictColumn=o?.onConflict||'id';return this;}
  delete(){this.operation='delete';return this;} eq(c:string,v:any){this.filters.push(r=>r?.[c]===v);return this;} neq(c:string,v:any){this.filters.push(r=>r?.[c]!==v);return this;}
  gt(c:string,v:any){this.filters.push(r=>compare(r?.[c],v)>0);return this;} gte(c:string,v:any){this.filters.push(r=>compare(r?.[c],v)>=0);return this;} lt(c:string,v:any){this.filters.push(r=>compare(r?.[c],v)<0);return this;} lte(c:string,v:any){this.filters.push(r=>compare(r?.[c],v)<=0);return this;}
  ilike(c:string,p:string){const n=String(p||'').replace(/%/g,'').toLowerCase();this.filters.push(r=>String(r?.[c]??'').toLowerCase().includes(n));return this;} like(c:string,p:string){return this.ilike(c,p);}
  in(c:string,v:any[]){this.filters.push(r=>v.includes(r?.[c]));return this;} is(c:string,v:any){this.filters.push(r=>r?.[c]===v);return this;}
  not(c:string,op:string,v:any){if(op==='is'||op==='eq')this.filters.push(r=>r?.[c]!==v);return this;}
  or(expr:string){const parts=String(expr||'').split(',').map(p=>p.trim()).filter(Boolean);this.filters.push(r=>parts.some(part=>{const m=part.match(/^(\w+)\.(eq|ilike|neq)\.(.*)$/i);if(!m)return false;const [,c,op,raw]=m;const v=raw.replace(/^\"|\"$/g,'');if(op.toLowerCase()==='neq')return String(r?.[c]??'')!==v;if(op.toLowerCase()==='ilike')return String(r?.[c]??'').toLowerCase().includes(v.replace(/%/g,'').toLowerCase());return String(r?.[c]??'')===v;}));return this;}
  contains(c:string,v:any){this.filters.push(r=>{const a=r?.[c];if(Array.isArray(a))return Array.isArray(v)&&v.every(x=>a.includes(x));if(a&&typeof a==='object'&&v&&typeof v==='object')return Object.entries(v).every(([k,x])=>a[k]===x);return false;});return this;}
  order(c:string,o?:{ascending?:boolean}){this.orders.push({column:c,ascending:o?.ascending!==false});return this;} limit(v:number){this.limitCount=v;return this;} range(a:number,b:number){this.rangeStart=a;this.rangeEnd=b;return this;}
  single(){this.wantSingle=true;return this;} maybeSingle(){this.wantMaybeSingle=true;return this;}
  async execute(){try{const rows=await readTable(this.table);const matches=rows.filter(r=>this.filters.every(f=>f(r)));
    if(this.operation==='select'){let result=matches;for(const o of this.orders.slice().reverse())result=result.slice().sort((a,b)=>compare(a?.[o.column],b?.[o.column])*(o.ascending?1:-1));if(this.rangeStart!==null)result=result.slice(this.rangeStart,(this.rangeEnd??result.length-1)+1);if(this.limitCount!==null)result=result.slice(0,this.limitCount);if(this.wantSingle)return{data:result[0]||null,error:result.length===1?null:{message:'Expected exactly one row'}};if(this.wantMaybeSingle)return{data:result[0]||null,error:null};return{data:clone(result),error:null};}
    if(this.operation==='insert'){const now=new Date().toISOString();const created=this.payload.map(x=>({id:x.id??makeId(),created_at:x.created_at??now,updated_at:x.updated_at??now,...x}));await writeTable(this.table,rows.concat(created));return{data:this.returnRows?created:null,error:null};}
    if(this.operation==='update'){const now=new Date().toISOString();const updated=rows.map(r=>this.filters.every(f=>f(r))?{...r,...this.payload[0],updated_at:now}:r);await writeTable(this.table,updated);return{data:this.returnRows?updated.filter(r=>this.filters.every(f=>f(r))):null,error:null};}
    if(this.operation==='upsert'){const key=this.conflictColumn||'id';const next=rows.slice();const output:Row[]=[];for(const x of this.payload){const value=x[key]??makeId();const i=next.findIndex(r=>r?.[key]===value);const merged={...(i>=0?next[i]:{}),...x,[key]:value,updated_at:new Date().toISOString()};if(i>=0)next[i]=merged;else next.push({...merged,created_at:merged.created_at??new Date().toISOString()});output.push(merged);}await writeTable(this.table,next);return{data:this.returnRows?output:null,error:null};}
    if(this.operation==='delete'){const kept=rows.filter(r=>!this.filters.every(f=>f(r)));await writeTable(this.table,kept);return{data:this.returnRows?matches:null,error:null};}
    return{data:[],error:null};
  }catch(error:any){return{data:null,error:{message:error?.message||'Local database error'}};}}
  then(a?:any,b?:any){return this.execute().then(a,b);}
}

const noopChannel={on:()=>noopChannel,subscribe:(cb?:any)=>{cb?.('SUBSCRIBED');return noopChannel;}};

// Supabase-compatible local auth facade. Some existing frontend modules call
// auth.onAuthStateChange(); Local DB mode must provide the same API so startup
// cannot fail before any database query runs.
const authListeners = new Set<(event:string, session:any)=>void>();
const localSession = () => ({ access_token: null, user: null });
const localAuth = {
  getSession: async()=>({data:{session:localSession()},error:null}),
  getUser: async()=>({data:{user:null},error:null}),
  signInWithPassword: async()=>({data:{session:null,user:null},error:{message:'Authentication is local-only in this mode'}}),
  signOut: async()=>{ authListeners.forEach(listener=>listener('SIGNED_OUT',null)); return {error:null}; },
  onAuthStateChange: (callback:(event:string, session:any)=>void) => {
    authListeners.add(callback);
    queueMicrotask(() => { try { callback('INITIAL_SESSION', localSession()); } catch {} });
    return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
  },
};

export const supabase={from:(table:string)=>new LocalQueryBuilder(table),channel:()=>noopChannel,removeChannel:()=>undefined,auth:localAuth};
export const SUPABASE_URL='';
export const SUPABASE_ANON_KEY='';
export const SUPABASE_PROJECT_REF='';
export const SUPABASE_PROJECT_URL='';
export async function testSupabaseConnection(){return{connected:false,message:'Local Database Mode aktif — Supabase tidak digunakan oleh frontend.',timestamp:new Date().toISOString()};}
