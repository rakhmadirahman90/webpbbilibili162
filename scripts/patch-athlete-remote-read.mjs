import fs from 'node:fs';

const path = 'src/ManajemenAtlet.tsx';
let s = fs.readFileSync(path, 'utf8');

const old = `      const [pendaftaranRes, rankingsRes, statsRes] = await Promise.allSettled([\n        supabase.from('pendaftaran').select('*').order('nama', { ascending: true }),\n        supabase.from('rankings').select('*').order('total_points', { ascending: false }),\n        supabase.from('atlet_stats').select('pendaftaran_id, points, total_points, seed')\n      ]);`;

const next = `      // Admin athlete data is authoritative in Supabase, not IndexedDB.\n      // Each request has a finite timeout so a stalled network request can never\n      // leave the screen permanently stuck on \"MENGAKSES SERVER...\".\n      const remoteDb: any = (globalThis as any).__PB_REMOTE_SUPABASE || supabase;\n      const withTimeout = <T,>(promise: Promise<T>, ms = 8000): Promise<T> =>\n        Promise.race([\n          promise,\n          new Promise<T>((_, reject) =>\n            setTimeout(() => reject(new Error('Supabase request timeout')), ms)\n          ),\n        ]);\n\n      const [pendaftaranRes, rankingsRes, statsRes] = await Promise.allSettled([\n        withTimeout(remoteDb.from('pendaftaran').select('*').order('nama', { ascending: true })),\n        withTimeout(remoteDb.from('rankings').select('*').order('total_points', { ascending: false })),\n        withTimeout(remoteDb.from('atlet_stats').select('pendaftaran_id, points, total_points, seed'))\n      ]);`;

// This patch may already be present in a newer ManajemenAtlet implementation.
if (!s.includes(old)) {
  console.log('Athlete remote-read patch skipped: current read block is already newer/compatible.');
  process.exit(0);
}

s = s.replace(old, next);
fs.writeFileSync(path, s);
console.log('Applied authoritative Supabase athlete read + timeout patch.');
