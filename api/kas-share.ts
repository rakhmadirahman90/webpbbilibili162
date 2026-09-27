const DEFAULT_IMAGE = 'https://pbilibili162.99apps.id/logo_pb_bilibili_162.png';

function normalizeImageUrl(value: string) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return DEFAULT_IMAGE;
    if (url.hostname !== 'pbilibili162.99apps.id' && !url.hostname.endsWith('.supabase.co')) return DEFAULT_IMAGE;
    return url.toString();
  } catch {
    return DEFAULT_IMAGE;
  }
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const imageUrl = normalizeImageUrl(String(req.query?.image || ''));
  const name = String(req.query?.name || 'Bukti transaksi kas').trim() || 'Bukti transaksi kas';
  const origin = getOrigin(req);
  const proxiedImage = origin + '/api/kas-image?image=' + encodeURIComponent(imageUrl);
  const title = 'PB Bilibili 162 - Persatuan Bulutangkis Terpadu';
  const description = 'Sistem Informasi Terpadu PB Bilibili 162. Kelola data atlet, pendaftaran, laporan kas, peringkat poin, berita bulutangkis, dan jadwal sholat secara realtime.';
  const pageUrl = origin + (req.url || '');

  const html = '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(name) + ' | PB Bilibili 162</title>' +
    '<meta name="description" content="' + escapeHtml(description) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(description) + '">' +
    '<meta property="og:url" content="' + escapeHtml(pageUrl) + '">' +
    '<meta property="og:site_name" content="PB Bilibili 162">' +
    '<meta property="og:image" content="' + escapeHtml(proxiedImage) + '">' +
    '<meta property="og:image:secure_url" content="' + escapeHtml(proxiedImage) + '">' +
    '<meta property="og:image:type" content="image/png">' +
    '<meta property="og:image:width" content="1200">' +
    '<meta property="og:image:height" content="630">' +
    '<meta property="og:image:alt" content="' + escapeHtml(name) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + escapeHtml(title) + '">' +
    '<meta name="twitter:description" content="' + escapeHtml(description) + '">' +
    '<meta name="twitter:image" content="' + escapeHtml(proxiedImage) + '">' +
    '<style>html,body{margin:0;background:#f3f4f6;font-family:Arial,sans-serif}main{max-width:900px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}img{display:block;width:100%;max-height:70vh;object-fit:contain;background:#fff}section{padding:18px 22px}h1{font-size:24px;margin:0 0 8px}p{font-size:16px;line-height:1.55;color:#5f6368;margin:0}</style>' +
    '</head><body><main><img src="' + escapeHtml(proxiedImage) + '" alt="' + escapeHtml(name) + '"><section><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></section></main></body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}

function getOrigin(req: any) {
  const forwarded = req.headers?.['x-forwarded-proto'];
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'pbilibili162.99apps.id';
  const proto = forwarded || 'https';
  return proto + '://' + host;
}
