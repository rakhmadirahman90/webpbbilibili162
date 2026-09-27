const SUPABASE_ASSETS = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/';
const DEFAULT_PATH = 'branding/logo-1775228962198.png';

function cleanPath(value: string): string {
  const raw = String(value || '').trim().replace(/^\/+/, '');
  if (!raw || raw.length > 500) return DEFAULT_PATH;
  if (!/^[A-Za-z0-9._/-]+$/.test(raw) || raw.includes('..')) return DEFAULT_PATH;
  return raw;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const path = cleanPath(String(req.query?.p || req.query?.path || ''));
  const imageUrl = SUPABASE_ASSETS + path;

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'PB-Bilibili-162-WhatsApp-Preview/1.0',
        'Accept': 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
      console.error('[kas-share-image] upstream', upstream.status, path);
      return res.status(404).send('Lampiran gambar tidak ditemukan.');
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return res.status(415).send('Lampiran bukan file gambar.');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[kas-share-image] failed:', error);
    return res.status(502).send('Lampiran gambar tidak dapat diproses.');
  }
}
