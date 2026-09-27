const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const DEFAULT_IMAGE = 'https://pbilibili162.99apps.id/logo_pb_bilibili_162.png';

function esc(value: string) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function normalizeImageUrl(value: string) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return DEFAULT_IMAGE;
    if (url.hostname !== 'pbilibili162.99apps.id' && !url.hostname.endsWith('.supabase.co')) return DEFAULT_IMAGE;
    return url.toString();
  } catch { return DEFAULT_IMAGE; }
}

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const image = normalizeImageUrl(String(req.query?.image || ''));
  const name = String(req.query?.name || 'Bukti Transaksi Kas PB Bilibili 162').trim().slice(0, 160) || 'Bukti Transaksi Kas PB Bilibili 162';
  const title = esc(name);
  const imageEscaped = esc(image);
  const pageUrl = esc(PUBLIC_DOMAIN + '/api/kas-share?image=' + encodeURIComponent(image) + '&name=' + encodeURIComponent(name));
  const html = '<!doctype html><html lang="id"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<meta name="description" content="Bukti transaksi kas PB Bilibili 162">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + pageUrl + '">' +
    '<meta property="og:title" content="' + title + '">' +
    '<meta property="og:description" content="Bukti transaksi kas PB Bilibili 162">' +
    '<meta property="og:image" content="' + imageEscaped + '">' +
    '<meta property="og:image:secure_url" content="' + imageEscaped + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + title + '">' +
    '<meta name="twitter:image" content="' + imageEscaped + '">' +
    '</head><body style="margin:0;background:#070d1a;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box">' +
    '<main style="width:min(720px,100%);text-align:center"><img src="' + imageEscaped + '" alt="' + title + '" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:18px"><h1>' + title + '</h1><p>PB Bilibili 162 • Bukti transaksi kas</p></main>' +
    '</body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
}