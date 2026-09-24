import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

    // Jika foto_url utama kosong, gunakan foto peserta terbaru dari
    // bucket private turnamen melalui signed URL.
    if (!photoUrl && athlete?.bilibili_cup1_photo_path) {
      const path = String(athlete.bilibili_cup1_photo_path).trim();
      const { data: signedData, error: signedError } = await supabase.storage
        .from('turnamen-dokumen')
        .createSignedUrl(path, 60 * 60);

      if (signedError) {
        console.error('[share-athlete-image] signed URL error:', signedError.message);
      } else {
        photoUrl = String(signedData?.signedUrl || '').trim();
      }
    }

    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
      return res.status(404).send('Foto atlet tidak tersedia');
    }

    const imageResponse = await fetch(photoUrl, { cache: 'no-store', redirect: 'follow' });
    if (!imageResponse.ok) {
      throw new Error(`Photo returned ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(415).send('File foto tidak valid');
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition', 'inline');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[share-athlete-image]', error);
    return res.status(404).send('Foto atlet tidak tersedia');
  }
}
