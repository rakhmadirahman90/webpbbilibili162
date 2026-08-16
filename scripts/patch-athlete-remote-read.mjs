import fs from 'node:fs';

const path = 'src/ManajemenAtlet.tsx';
let s = fs.readFileSync(path, 'utf8');

const old = `      const [pendaftaranRes, rankingsRes, statsRes] = await Promise.allSettled([\n        supabase.from('pendaftaran').select('*').order('nama', { ascending: true }),\n        supabase.from('rankings').select('*').order('total_points', { ascending: false }),\n        supabase.from('atlet_stats').select('pendaftaran_id, points, total_points, seed')\n      ]);`;

const next = `      // Athlete management must read the durable Supabase source directly.\n      // The generic client is Local-First and can legitimately start with an empty\n      // IndexedDB; using the remote client here prevents an empty local cache from\n      // masking the 66 existing athlete records in production.\n      const remoteDb: any = (globalThis as any).__PB_REMOTE_SUPABASE || supabase;\n      const [pendaftaranRes, rankingsRes, statsRes] = await Promise.allSettled([\n        remoteDb.from('pendaftaran').select('*').order('nama', { ascending: true }),\n        remoteDb.from('rankings').select('*').order('total_points', { ascending: false }),\n        remoteDb.from('atlet_stats').select('pendaftaran_id, points, total_points, seed')\n      ]);`;

if (!s.includes(old)) throw new Error('Athlete remote read block not found');
s = s.replace(old, next);
fs.writeFileSync(path, s);
console.log('Applied athlete direct Supabase read patch.');
