const DEFAULT_IMAGE = 'https://pbilibili162.99apps.id/logo_pb_bilibili_162.png';
function normalizeImageUrl(value: string) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return DEFAULT_IMAGE;
    if (url.hostname !== 'pbilibili162.99apps.id' && !url.hostname.endsWith('.supabase.co')) return DEFAULT_IMAGE;
    return url.toString();
  } catch { return DEFAULT_IMAGE; }
}
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const imageUrl = normalizeImageUrl(String(req.query?.image || ''));
  try {
    const upstream = await fetch(imageUrl, { headers: { 'User-Agent': 'PB-Bilibili-162-Kas-Preview/1.0', 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' } });
    if (!upstream.ok) return res.status(502).send('Lampiran gambar tidak dapat diambil.');
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) return res.status(415).send('Lampiran bukan file gambar.');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[kas-image] proxy failed:', error);
    return res.status(502).send('Lampiran gambar tidak dapat diproses.');
  }
}
