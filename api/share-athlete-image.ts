import { createClient } from '@supabase/supabase-js';

const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function fallbackSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#071a2f"/><stop offset="1" stop-color="#0b4f6c"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <circle cx="600" cy="245" r="105" fill="#ffffff" fill-opacity=".10"/>
    <text x="600" y="235" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="700">PB BILIBILI 162</text>
    <text x="600" y="315" text-anchor="middle" fill="#dbeafe" font-family="Arial,sans-serif" font-size="30">Profil Resmi Anggota</text>
    <text x="600" y="365" text-anchor="middle" fill="#93c5fd" font-family="Arial,sans-serif" font-size="24">Parepare</text>
  </svg>`;
  return Buffer.from(svg);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const athleteId = String(req.query?.athleteId || req.query?.id || '').trim();
  if (!athleteId) return res.status(400).send('Foto atlet tidak ditemukan');

  try {
    const endpoint =
      `${SUPABASE_URL}/rest/v1/pendaftaran?id=eq.${encodeURIComponent(athleteId)}&select=foto_url,bilibili_cup1_photo_path,updated_at`;

    const dbResponse = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!dbResponse.ok) throw new Error(`Supabase returned ${dbResponse.status}`);

    const rows = await dbResponse.json();
    const athlete = Array.isArray(rows) ? rows[0] : null;
    if (!athlete) return res.status(404).send('Foto atlet tidak ditemukan');

    let photoUrl = String(athlete?.foto_url || '').trim();

    if (!photoUrl && athlete?.bilibili_cup1_photo_path) {
      const path = String(athlete.bilibili_cup1_photo_path).trim();
      const { data: signedData, error: signedError } = await supabase.storage
        .from('turnamen-dokumen')
        .createSignedUrl(path, 60 * 60);

      if (!signedError) {
        photoUrl = String(signedData?.signedUrl || '').trim();
      } else {
        console.error('[share-athlete-image] signed URL error:', signedError.message);
      }
    }

    // Foto pribadi tidak tersedia: selalu kirim fallback branding PB BILIBILI 162,
    // bukan broken image atau icon kosong.
    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
      const fallback = fallbackSvg();
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Content-Length', String(fallback.length));
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(fallback);
    }

    const imageResponse = await fetch(photoUrl, { cache: 'no-store', redirect: 'follow' });

    // Jika foto tersimpan tetapi gagal diambil, fallback tetap dikirim agar
    // WhatsApp selalu memiliki preview visual.
    if (!imageResponse.ok) {
      const fallback = fallbackSvg();
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Content-Length', String(fallback.length));
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(fallback);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      const fallback = fallbackSvg();
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Content-Length', String(fallback.length));
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(fallback);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition', 'inline');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[share-athlete-image]', error);
    const fallback = fallbackSvg();
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Length', String(fallback.length));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.status(200).send(fallback);
  }
}
