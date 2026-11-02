const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hoyrgpbfbakogenxdijt.supabase.co').replace(/\\/$/, '');
const ALLOWED_HOSTS = new Set([new URL(SUPABASE_URL).hostname, 'hoyrgpbfbakogenxdijt.supabase.co']);

function getSource(req: any): URL | null {
  const raw = String(req.query?.src || '').trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return null;
      if (!/^\\/storage\\/v1\\/object\\/(public|sign)\\/(uploads|assets)\\//.test(url.pathname)) return null;
      return url;
    } catch { return null; }
  }

  const bucket = String(req.query?.b || req.query?.bucket || 'uploads');
  const path = String(req.query?.p || req.query?.path || '').trim().replace(/^\\/+/, '');
  if (!['uploads', 'assets'].includes(bucket) || !path || path.length > 500 || path.includes('..') || !/^[A-Za-z0-9._/-]+$/.test(path)) return null;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return new URL(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`);
}

export default async function handler(req: any, res: any) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).send('Method Not Allowed');
  const source = getSource(req);
  if (!source) return res.status(400).send('Sumber gambar tidak valid.');

  try {
    const upstream = await fetch(source.toString(), {
      method: req.method,
      headers: {
        'User-Agent': 'PB-Bilibili-162-WhatsApp-Preview/2.0',
        'Accept': 'image/jpeg,image/png,image/webp,image/gif,*/*;q=0.5'
      },
      redirect: 'error'
    });
    if (!upstream.ok) {
      console.error('[kas-share-image] upstream', upstream.status, source.hostname, source.pathname);
      return res.status(upstream.status === 404 ? 404 : 502).send('Gambar bukti transaksi tidak dapat diakses.');
    }

    const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
      return res.status(415).send('Lampiran bukan format gambar yang didukung.');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="pb-bilibili-162-proof"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'HEAD') {
      const length = upstream.headers.get('content-length');
      if (length) res.setHeader('Content-Length', length);
      return res.status(200).end();
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > 20 * 1024 * 1024) return res.status(413).send('Ukuran gambar terlalu besar.');
    res.setHeader('Content-Length', String(buffer.length));
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[kas-share-image] failed:', error);
    return res.status(502).send('Gambar bukti transaksi tidak dapat diproses.');
  }
}
