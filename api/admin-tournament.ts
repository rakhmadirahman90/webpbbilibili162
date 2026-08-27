import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const ADMIN_PIN = process.env.ADMIN_TOURNAMENT_PIN || '160390';
const db = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

function authorized(req: any) {
  const pin = String(req.headers?.['x-admin-pin'] || req.body?.pin || '').trim();
  return pin && pin === ADMIN_PIN;
}

async function withDocumentUrls(row: any) {
  const fields = ['foto_pemain_1_url', 'foto_pemain_2_url', 'ktp_pemain_1_url', 'ktp_pemain_2_url'];
  const result = { ...row };
  for (const field of fields) {
    const value = String(row?.[field] || '').trim();
    if (!value) continue;
    // New records store the private Storage object path. Older records may contain a full URL.
    const path = value.startsWith('http') ? (value.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/turnamen-dokumen\/(.+)$/)?.[1] || '') : value;
    if (path) {
      const { data, error } = await db!.storage.from('turnamen-dokumen').createSignedUrl(decodeURIComponent(path), 60 * 60);
      if (!error && data?.signedUrl) result[field] = data.signedUrl;
    }
  }
  return result;
}

export default async function handler(req: any, res: any) {
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Akses administrator tidak valid.' });
  if (!db) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Vercel.' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await db.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = await Promise.all((data || []).map(withDocumentUrls));
      return res.status(200).json({ data: rows });
    }

    const id = String(req.body?.id || req.query?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID pendaftaran wajib diisi.' });

    if (req.method === 'DELETE') {
      const { error } = await db.from('pendaftaran_turnamen').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    const patch = req.body?.patch;
    if (!patch || typeof patch !== 'object') return res.status(400).json({ error: 'Data perubahan tidak valid.' });
    const allowed = ['status_pembayaran', 'status_pendaftaran', 'catatan_admin'];
    const clean: Record<string, string | null> = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch, key)) clean[key] = patch[key] == null ? null : String(patch[key]);
    const { data, error } = await db.from('pendaftaran_turnamen').update(clean).eq('id', id).select('*').single();
    if (error) throw error;
    return res.status(200).json({ data: await withDocumentUrls(data) });
  } catch (error: any) {
    console.error('[admin-tournament]', error);
    return res.status(500).json({ error: error?.message || 'Gagal mengakses data pendaftaran.' });
  }
}
