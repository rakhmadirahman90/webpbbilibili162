const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_BUCKET = 'assets';
const DEFAULT_PATH = 'branding/logo-1775228962198.png';
const ALLOWED_BUCKETS = new Set(['assets', 'uploads']);
function cleanPath(value: string): string {
  const raw = String(value || '').trim().replace(/^\/+/, '');
  if (!raw || raw.length > 500 || !/^[A-Za-z0-9._/-]+$/.test(raw) || raw.includes('..')) return DEFAULT_PATH;
  return raw;
}
function cleanBucket(value: string): string {
  const bucket = String(value || '').trim();
  return ALLOWED_BUCKETS.has(bucket) ? bucket : DEFAULT_BUCKET;
}
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const bucket = cleanBucket(String(req.query?.b || req.query?.bucket || ''));
  const path = cleanPath(String(req.query?.p || req.query?.path || ''));
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  try {
    const upstream = await fetch(imageUrl, { headers: { 'User-Agent': 'PB-Bilibili-162-WhatsApp-Preview/1.0', 'Accept': 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8' } });
    if (!upstream.ok) { console.error('[kas-share-image] upstream', upstream.status, bucket, path); return res.status(404).send('Lampiran gambar tidak ditemukan.'); }
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) return res.status(415).send('Lampiran bukan file gambar.');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType); res.setHeader('Content-Length', String(buffer.length)); res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600'); res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) { console.error('[kas-share-image] failed:', error); return res.status(502).send('Lampiran gambar tidak dapat diproses.'); }
}
