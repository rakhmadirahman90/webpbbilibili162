const SUPABASE_ASSETS = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/';
const DEFAULT_PATH = 'branding/logo-1775228962198.png';

function getAssetUrl(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return SUPABASE_ASSETS + DEFAULT_PATH;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && url.hostname === 'missjyvqfehamtpyodjr.supabase.co' && url.pathname.startsWith('/storage/v1/object/public/assets/')) {
      return url.toString();
    }
  } catch {}
  const path = raw.replace(/^\\/+/, '');
  if (/^[a-zA-Z0-9._\\/-]+$/.test(path)) return SUPABASE_ASSETS + path;
  return SUPABASE_ASSETS + DEFAULT_PATH;
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  // WhatsApp receives a short URL such as /api/kas-share?p=branding%2Ffoto.png.
  // Keeping the source path out of the query prevents the old nested-URL problem.
  const assetUrl = getAssetUrl(String(req.query?.p || req.query?.path || ''));
  const origin = getOrigin(req);
  const title = 'PB Bilibili 162 - Persatuan Bulutangkis Terpadu';
  const description = 'Sistem Informasi Terpadu PB Bilibili 162. Kelola data atlet, pendaftaran, laporan kas, peringkat poin, berita bulutangkis, dan jadwal sholat secara realtime.';
  const pageUrl = origin + (req.url || '');

  const html = '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(title) + '</title>' +
    '<meta name="description" content="' + escapeHtml(description) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(description) + '">' +
    '<meta property="og:url" content="' + escapeHtml(pageUrl) + '">' +
    '<meta property="og:site_name" content="PB Bilibili 162">' +
    '<meta property="og:image" content="' + escapeHtml(assetUrl) + '">' +
    '<meta property="og:image:secure_url" content="' + escapeHtml(assetUrl) + '">' +
    '<meta property="og:image:type" content="image/png">' +
    '<meta property="og:image:alt" content="Bukti transaksi kas PB Bilibili 162">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + escapeHtml(title) + '">' +
    '<meta name="twitter:description" content="' + escapeHtml(description) + '">' +
    '<meta name="twitter:image" content="' + escapeHtml(assetUrl) + '">' +
    '<style>html,body{margin:0;background:#f3f4f6;font-family:Arial,sans-serif}main{max-width:900px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}img{display:block;width:100%;max-height:75vh;object-fit:contain;background:#fff}section{padding:18px 22px}h1{font-size:24px;margin:0 0 8px}p{font-size:16px;line-height:1.55;color:#5f6368;margin:0}</style>' +
    '</head><body><main><img src="' + escapeHtml(assetUrl) + '" alt="Bukti transaksi kas PB Bilibili 162"><section><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></section></main></body></html>';

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
