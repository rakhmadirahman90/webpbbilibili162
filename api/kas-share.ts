const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_BUCKET = 'assets';
const DEFAULT_PATH = 'branding/logo-1775228962198.png';
const ALLOWED_BUCKETS = new Set(['assets', 'uploads']);

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function cleanPath(value: string): string {
  const raw = String(value || '').trim().replace(/^\/+/, '');
  if (!raw || raw.length > 500 || !/^[A-Za-z0-9._/-]+$/.test(raw) || raw.includes('..')) return DEFAULT_PATH;
  return raw;
}
function cleanBucket(value: string): string {
  const bucket = String(value || '').trim();
  return ALLOWED_BUCKETS.has(bucket) ? bucket : DEFAULT_BUCKET;
}
function getAsset(req: any): { bucket: string; path: string } {
  const queryPath = String(req.query?.p || req.query?.path || '').trim();
  const queryBucket = String(req.query?.b || req.query?.bucket || '').trim();
  if (queryPath) return { bucket: cleanBucket(queryBucket), path: cleanPath(queryPath) };
  const imageUrl = String(req.query?.image || '').trim();
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      const marker = '/storage/v1/object/public/';
      if (url.protocol === 'https:' && url.hostname === 'missjyvqfehamtpyodjr.supabase.co' && url.pathname.startsWith(marker)) {
        const rest = url.pathname.slice(marker.length);
        const slash = rest.indexOf('/');
        if (slash > 0) return { bucket: cleanBucket(rest.slice(0, slash)), path: cleanPath(rest.slice(slash + 1)) };
      }
    } catch {}
  }
  return { bucket: DEFAULT_BUCKET, path: DEFAULT_PATH };
}
function isCrawler(userAgent: string): boolean {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);
}
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  try {
    const { bucket, path } = getAsset(req);
    const image = `${PUBLIC_DOMAIN}/api/kas-share-image?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}`;
    const canonical = `${PUBLIC_DOMAIN}/api/kas-share?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}`;
    const title = 'Bukti Transaksi Kas - PB Bilibili 162';
    const description = 'Gambar bukti transaksi kas PB Bilibili 162.';
    const crawler = isCrawler(String(req.headers?.['user-agent'] || ''));
    const html = `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="article"><meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:site_name" content="PB BILIBILI 162"><meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:url" content="${escapeHtml(image)}"><meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="Gambar bukti transaksi kas PB Bilibili 162">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
${crawler ? '' : `<meta http-equiv="refresh" content="0;url=${escapeHtml(PUBLIC_DOMAIN + '/kas')}"><script>window.location.replace(${JSON.stringify(PUBLIC_DOMAIN + '/kas')});</script>`}
</head><body style="margin:0;background:#070d1a;color:#fff;font-family:system-ui,sans-serif">
<main style="max-width:720px;margin:0 auto;padding:24px;text-align:center"><img src="${escapeHtml(image)}" alt="Gambar bukti transaksi kas PB Bilibili 162" style="display:block;width:100%;max-width:720px;max-height:720px;object-fit:contain;margin:0 auto 20px;background:#fff;border-radius:16px">
<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(PUBLIC_DOMAIN + '/kas')}" style="color:#60a5fa">Buka Kelola Kas PB Bilibili 162</a></p></main></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', crawler ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store');
    res.setHeader('X-Robots-Tag', 'index,follow');
    return res.status(200).send(html);
  } catch (error) { console.error('[kas-share] failed:', error); return res.status(500).send('Gagal menyiapkan pratinjau bukti transaksi.'); }
}
