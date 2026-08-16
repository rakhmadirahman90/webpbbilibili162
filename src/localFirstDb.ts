/* Local-first data layer: IndexedDB is the UI database; Supabase is the durable sync target. */
type Row = Record<string, any>;
type Op = 'insert'|'update'|'upsert'|'delete';
type QueueItem = { id:string; table:string; op:Op; payload:any; filters:any[]; targetIds?:string[]; localIds?:string[]; createdAt:number; attempts:number; };

const DB_NAME = 'pb-bilibili-162-local-first';
const DB_VERSION = 2;
const TABLES = 'tables';
const QUEUE = 'sync_queue';
const memory: Record<string, Row[]> = {};
let dbPromise: Promise<IDBDatabase|null>|null = null;
let syncRunning = false;

const browser = () => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const clone = <T,>(v:T):T => { try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); } };
const now = () => new Date().toISOString();
const makeId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function openDb(): Promise<IDBDatabase|null> {
  if (!browser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(TABLES)) db.createObjectStore(TABLES);
        if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath:'id' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function readTable(table:string):Promise<Row[]> {
  if (memory[table]) return clone(memory[table]);
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    try {
      const r = db.transaction(TABLES,'readonly').objectStore(TABLES).get(table);
      r.onsuccess = () => { memory[table] = Array.isArray(r.result) ? r.result : []; resolve(clone(memory[table])); };
      r.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

async function writeTable(table:string, rows:Row[]) {
  memory[table] = clone(rows);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(TABLES,'readwrite');
      tx.objectStore(TABLES).put(memory[table], table);
      tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
    } catch { resolve(); }
  });
  if (browser()) window.dispatchEvent(new CustomEvent('local-db-updated',{detail:{table}}));
}

async function putQueue(item:QueueItem) {
  const db = await openDb(); if (!db) return;
  await new Promise<void>(resolve => {
    try { const tx=db.transaction(QUEUE,'readwrite'); tx.objectStore(QUEUE).put(item); tx.oncomplete=()=>resolve(); tx.onerror=()=>resolve(); }
    catch { resolve(); }
  });
}
async function removeQueue(key:string) {
  const db=await openDb(); if(!db) return;
  await new Promise<void>(resolve=>{try{const tx=db.transaction(QUEUE,'readwrite');tx.objectStore(QUEUE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch{resolve();}});
}
async function readQueue():Promise<QueueItem[]> {
  const db=await openDb(); if(!db) return [];
  return new Promise(resolve=>{try{const r=db.transaction(QUEUE,'readonly').objectStore(QUEUE).getAll();r.onsuccess=()=>resolve(Array.isArray(r.result)?r.result:[]);r.onerror=()=>resolve([]);}catch{resolve([]);}});
}

function matches(row:Row, filters:any[]) { return filters.every((f:any)=> {
  const v=row?.[f.column];
  switch(f.op){
    case 'eq': return v===f.value; case 'neq': return v!==f.value;
    case 'gt': return v>f.value; case 'gte': return v>=f.value; case 'lt': return v<f.value; case 'lte': return v<=f.value;
    case 'in': return Array.isArray(f.value)&&f.value.includes(v); case 'is': return v===f.value;
    case 'ilike': case 'like': return String(v??'').toLowerCase().includes(String(f.value??'').replace(/%/g,'').toLowerCase());
    default: return true;
  }
}); }
function sortRows(rows:Row[], orders:any[]) {
  let out=rows.slice(); for(const o of orders.slice().reverse()) out.sort((a,b)=>{const av=a?.[o.column],bv=b?.[o.column]; if(av===bv)return 0; const n=av>bv?1:-1; return o.ascending?n:-n;}); return out;
}

export class LocalFirstQuery implements PromiseLike<any> {
  private table:string; private operation:Op|'select'='select'; private payload:any[]=[]; private filters:any[]=[]; private orders:any[]=[];
  private limitCount:number|null=null; private rangeStart:number|null=null; private rangeEnd:number|null=null; private singleMode:'single'|'maybe'|null=null; private returnRows=false;
  private upsertConflict='id'; private orExpression?:string; private containsFilter?:any;
  constructor(table:string){this.table=table;}
  select(_columns='*'){this.returnRows=true; return this;}
  insert(v:any){this.operation='insert';this.payload=Array.isArray(v)?clone(v):[clone(v)];return this;}
  update(v:any){this.operation='update';this.payload=[clone(v)];return this;}
  upsert(v:any,o?:any){this.operation='upsert';this.payload=Array.isArray(v)?clone(v):[clone(v)];this.upsertConflict=o?.onConflict||'id';return this;}
  delete(){this.operation='delete';return this;}
  eq(c:string,v:any){this.filters.push({column:c,op:'eq',value:v});return this;} neq(c:string,v:any){this.filters.push({column:c,op:'neq',value:v});return this;}
  gt(c:string,v:any){this.filters.push({column:c,op:'gt',value:v});return this;} gte(c:string,v:any){this.filters.push({column:c,op:'gte',value:v});return this;}
  lt(c:string,v:any){this.filters.push({column:c,op:'lt',value:v});return this;} lte(c:string,v:any){this.filters.push({column:c,op:'lte',value:v});return this;}
  ilike(c:string,v:string){this.filters.push({column:c,op:'ilike',value:v});return this;} like(c:string,v:string){return this.ilike(c,v);}
  in(c:string,v:any[]){this.filters.push({column:c,op:'in',value:v});return this;} is(c:string,v:any){this.filters.push({column:c,op:'is',value:v});return this;}
  not(c:string,op:string,v:any){this.filters.push({column:c,op:op==='eq'?'neq':'neq',value:v});return this;}
  or(expr:string){this.orExpression=expr;return this;}
  contains(c:string,v:any){this.containsFilter={column:c,value:v};return this;}
  order(c:string,o?:any){this.orders.push({column:c,ascending:o?.ascending!==false});return this;}
  limit(v:number){this.limitCount=v;return this;} range(a:number,b:number){this.rangeStart=a;this.rangeEnd=b;return this;}
  single(){this.singleMode='single';return this;} maybeSingle(){this.singleMode='maybe';return this;}

  async execute(){
    const rows=await readTable(this.table); let selected=rows.filter(r=>!r?._deleted && matches(r,this.filters));
    if(this.orExpression){const parts=this.orExpression.split(',').map(x=>x.trim()).filter(Boolean); selected=selected.filter(r=>parts.some(p=>{const m=p.match(/^([\w-]+)\.(eq|ilike|neq)\.(.*)$/i);if(!m)return false;const v=String(r?.[m[1]]??''),x=m[3].replace(/^"|"$/g,'');return m[2].toLowerCase()==='neq'?v!==x:m[2].toLowerCase()==='ilike'?v.toLowerCase().includes(x.replace(/%/g,'').toLowerCase()):v===x;}));}
    if(this.containsFilter) selected=selected.filter(r=>{const a=r?.[this.containsFilter.column],v=this.containsFilter.value;return Array.isArray(a)?Array.isArray(v)&&v.every((x:any)=>a.includes(x)):a&&typeof a==='object'&&v&&typeof v==='object'&&Object.entries(v).every(([k,x])=>a[k]===x);});
    if(this.operation==='select'){
      let result=sortRows(selected,this.orders); if(this.rangeStart!==null) result=result.slice(this.rangeStart,(this.rangeEnd??result.length-1)+1); if(this.limitCount!==null) result=result.slice(0,this.limitCount);
      const localResult=this.singleMode==='single'?{data:result[0]??null,error:result.length===1?null:{message:'Expected exactly one row'}}:this.singleMode==='maybe'?{data:result[0]??null,error:null}:{data:clone(result),error:null};
      void this.backgroundRemoteSelect(); return localResult;
    }
    const result=await this.applyLocalWrite(rows);
    void flushSyncQueue();
    return result;
  }

  private async applyLocalWrite(rows:Row[]){
    const t=now();
    if(this.operation==='insert'){
      const created=this.payload.map(x=>({...x,id:x.id??makeId(),created_at:x.created_at??t,updated_at:t,_local_updated_at:t,_sync_status:'pending',_deleted:false}));
      await writeTable(this.table,rows.concat(created)); for(const x of created) { const localPayload=Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith('_'))); await putQueue({id:makeId(),table:this.table,op:'insert',payload:localPayload,localIds:[String(x.id)],filters:[],createdAt:Date.now(),attempts:0}); }
      return {data:this.returnRows?clone(created):null,error:null};
    }
    if(this.operation==='update'){
      const targetIds=rows.filter(r=>matches(r,this.filters)).map(r=>String(r.id)).filter(Boolean); const updated=rows.map(r=>matches(r,this.filters)?{...r,...this.payload[0],updated_at:t,_local_updated_at:t,_sync_status:'pending'}:r); await writeTable(this.table,updated);
      await putQueue({id:makeId(),table:this.table,op:'update',payload:this.payload[0],filters:this.filters,targetIds,createdAt:Date.now(),attempts:0});
      return {data:this.returnRows?updated.filter(r=>matches(r,this.filters)):null,error:null};
    }
    if(this.operation==='upsert'){
      const key=this.upsertConflict,next=rows.slice(),out:Row[]=[]; for(const p of this.payload){const val=p[key]??makeId(),i=next.findIndex(r=>r[key]===val),merged={...(i>=0?next[i]:{}),...p,[key]:val,updated_at:t,_local_updated_at:t,_sync_status:'pending',_deleted:false};if(i>=0)next[i]=merged;else next.push({...merged,created_at:t});out.push(merged);} await writeTable(this.table,next); await putQueue({id:makeId(),table:this.table,op:'upsert',payload:this.payload,filters:[],createdAt:Date.now(),attempts:0}); return {data:this.returnRows?out:null,error:null};
    }
    const targetIds=rows.filter(r=>matches(r,this.filters)).map(r=>String(r.id)).filter(Boolean); const selected=rows.filter(r=>matches(r,this.filters)); const next=rows.map(r=>matches(r,this.filters)?{...r,_deleted:true,_local_updated_at:t,_sync_status:'pending',updated_at:t}:r); await writeTable(this.table,next); await putQueue({id:makeId(),table:this.table,op:'delete',payload:null,filters:this.filters,targetIds,createdAt:Date.now(),attempts:0}); return {data:this.returnRows?selected:null,error:null};
  }

  private async backgroundRemoteSelect(){
    try{
      const remote:any=(globalThis as any).__PB_REMOTE_SUPABASE; if(!remote)return;
      let q:any=remote.from(this.table).select('*');
      for(const f of this.filters){if(f.op==='eq')q=q.eq(f.column,f.value);else if(f.op==='neq')q=q.neq(f.column,f.value);else if(f.op==='gt')q=q.gt(f.column,f.value);else if(f.op==='gte')q=q.gte(f.column,f.value);else if(f.op==='lt')q=q.lt(f.column,f.value);else if(f.op==='lte')q=q.lte(f.column,f.value);else if(f.op==='in')q=q.in(f.column,f.value);else if(f.op==='is')q=q.is(f.column,f.value);else if(f.op==='ilike')q=q.ilike(f.column,f.value);}
      for(const o of this.orders)q=q.order(o.column,{ascending:o.ascending}); if(this.limitCount!==null)q=q.limit(this.limitCount); if(this.rangeStart!==null)q=q.range(this.rangeStart,this.rangeEnd??this.rangeStart);
      const timeout = new Promise<{data:null,error:any}>(resolve => setTimeout(() => resolve({data:null,error:{message:'timeout'}}), 4000));
      const {data,error}=await Promise.race([q, timeout]) as any; if(error||!Array.isArray(data))return;
      const current=await readTable(this.table), map=new Map(current.map(r=>[String(r.id),r]));
      for(const remoteRow of data){const local=map.get(String(remoteRow.id)); if(!local || local._sync_status!=='pending' || new Date(remoteRow.updated_at??0).getTime()>=new Date(local.updated_at??0).getTime()) map.set(String(remoteRow.id),{...remoteRow,_sync_status:'synced',_local_updated_at:local?._local_updated_at});}
      await writeTable(this.table,Array.from(map.values()));
    }catch{}
  }
  then(a?:any,b?:any){return this.execute().then(a,b);}
}

async function applyRemote(item:QueueItem, remote:any){
  let q:any=remote.from(item.table);
  if(item.op==='insert') { const {error}=await q.insert(item.payload); if(error)throw error; }
  else if(item.op==='upsert') { const clean=item.payload.map((x:any)=>Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith('_')))); const {error}=await q.upsert(clean,{onConflict:'id'}); if(error)throw error; }
  else if(item.op==='update') { if(item.targetIds?.length) q=q.in('id',item.targetIds); else for(const f of item.filters) if(f.op==='eq') q=q.eq(f.column,f.value); const clean=Object.fromEntries(Object.entries(item.payload||{}).filter(([k])=>!k.startsWith('_'))); const {error}=await q.update(clean); if(error)throw error; }
  else { if(item.targetIds?.length) q=q.in('id',item.targetIds); else for(const f of item.filters) if(f.op==='eq') q=q.eq(f.column,f.value); const {error}=await q.delete(); if(error)throw error; }
}

export async function flushSyncQueue(){
  if(syncRunning)return; const remote=(globalThis as any).__PB_REMOTE_SUPABASE; if(!remote)return; syncRunning=true;
  try{for(const item of await readQueue()){try{await applyRemote(item,remote); await markSynced(item); await removeQueue(item.id);}catch{item.attempts++;await putQueue(item);}}}finally{syncRunning=false;}
}
async function markSynced(item:QueueItem){
  const rows=await readTable(item.table); let next=rows;
  if(item.op==='delete') next=rows.filter(r=>!(item.targetIds?.length ? item.targetIds.includes(String(r.id)) : matches(r,item.filters)));
  else if(item.op==='update') next=rows.map(r=>matches(r,item.filters)?{...r,_sync_status:'synced'}:r);
  else if(item.op==='insert') next=rows.map(r=>r.id===item.payload.id?{...r,_sync_status:'synced'}:r);
  else if(item.op==='upsert') next=rows.map(r=>item.payload.some((p:any)=>p.id===r.id)?{...r,_sync_status:'synced'}:r);
  await writeTable(item.table,next);
}

export function startLocalFirstSync(){
  if(!browser())return; const run=()=>void flushSyncQueue(); window.addEventListener('online',run); window.setInterval(run,15000); run();
}
export async function localDbExport(){const db=await openDb();if(!db)return{};return new Promise<any>(resolve=>{const out:any={};try{const tx=db.transaction(TABLES,'readonly'),r=tx.objectStore(TABLES).openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;out[String(c.key)]=c.value;c.continue();};tx.oncomplete=()=>resolve(out);tx.onerror=()=>resolve(out);}catch{resolve(out);}});}
export async function localDbImport(data:any){for(const [table,rows] of Object.entries(data||{}))if(Array.isArray(rows))await writeTable(table,rows as Row[]);return{ok:true};}
export function from(table:string){return new LocalFirstQuery(table);}
