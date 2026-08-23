const DEFAULT_SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn';

function normalizeUrl(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

async function loadGallery(id: string) {
  const urls = Array.from(new Set([
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PROJECT_URL,
    process.env.SUPABASE_URL,
    DEFAULT_SUPABASE_URL,
  ].filter(Boolean).map(v => String(v).replace(/\/$/, ''))));
  const keys = Array.from(new Set([
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON,
    process.env.VITE_SUPABASE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_KEY,
    DEFAULT_SUPABASE_KEY,
  ].filter(Boolean).map(String)));

  for (const baseUrl of urls) for (const key of keys) {
    for (const table of ['gallery', 'galeri']) {
      try {
        const endpoint = `${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`;
        const response = await fetch(endpoint, {
          headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) continue;
        const rows = await response.json();
        const gallery = Array.isArray(rows) ? rows[0] : null;
        if (gallery) return gallery;
      } catch {}
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).send('ID dokumentasi wajib diisi');

  try {
    const gallery = await loadGallery(id);
    if (!gallery) return res.status(404).send('Dokumentasi tidak ditemukan');

    const raw = String(gallery.url || gallery.image_url || gallery.foto_url || gallery.media_url || '');
    const firstImage = raw.split(/[\s,]+/).map(normalizeUrl).find(Boolean) || '';
    if (!firstImage) return res.status(404).send('Foto utama tidak ditemukan');

    const upstream = await fetch(firstImage, { cache: 'no-store' });
    if (!upstream.ok) return res.status(502).send(`Gagal mengambil foto utama (${upstream.status})`);

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) return res.status(415).send('Media utama bukan gambar');

    const bytes = Buffer.from(await upstream.arrayBuffer());
    const title = String(gallery.title || gallery.judul || 'PB Bilibili 162').replace(/[\r\n]+/g, ' ').trim();
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(title).slice(0, 80)}.${ext}"`);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(bytes);
  } catch (error) {
    console.error('[gallery-share-image]', error);
    return res.status(500).send('Gagal menyiapkan foto untuk WhatsApp');
  }
}
