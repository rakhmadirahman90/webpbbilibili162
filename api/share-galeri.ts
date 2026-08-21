const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${PUBLIC_DOMAIN}${value.startsWith('/') ? '' : '/'}${value}`;
}

function isBadPreviewAsset(url: string): boolean {
  const value = String(url || '').toLowerCase();
  return !value ||
    value.includes('logo_pb_bilibili') ||
    value.includes('/logo.') ||
    value.includes('/logo/') ||
    value.includes('favicon') ||
    value.includes('placeholder') ||
    value.endsWith('.svg');
}

function getPrimaryImage(url: string): string {
  const candidates = String(url || '')
    .split(/[\s,]+/)
    .map(normalizeUrl)
    .filter(Boolean);

  return candidates.find(candidate => !isBadPreviewAsset(candidate)) || '';
}

function isCrawler(userAgent: string): boolean {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const id = String(req.query?.id || req.query?.gallery || req.query?.galleryId || '').trim();
  if (!id) return res.status(400).send('Dokumentasi tidak ditemukan');

  try {
    // gallery table does not have thumbnail_url; use the album's first real photo
    // as the share preview instead of falling back to the PB Bilibili logo.
    const endpoint = `${SUPABASE_URL}/rest/v1/gallery?id=eq.${encodeURIComponent(id)}&select=id,title,description,url,created_at,type`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Supabase returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }

    const rows = await response.json();
    const gallery = Array.isArray(rows) ? rows[0] : null;
    if (!gallery) return res.status(404).send('Dokumentasi tidak ditemukan');

    const title = String(gallery.title || 'Dokumentasi PB Bilibili 162').trim();
    const image = gallery.type === 'image' ? getPrimaryImage(gallery.url) : '';
    const canonical = `${PUBLIC_DOMAIN}/?gallery=${encodeURIComponent(gallery.id)}`;
    const description = String(gallery.description || `Dokumentasi ${title} dari PB Bilibili 162`).replace(/\s+/g, ' ').trim().slice(0, 200);
    const pageTitle = `${title} - PB Bilibili 162`;
    const crawler = isCrawler(String(req.headers?.['user-agent'] || ''));

    const imageTags = image ? `
      <meta property="og:image" content="${escapeHtml(image)}" />
      <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
      <meta property="og:image:type" content="image/webp" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="${escapeHtml(title)}" />
      <meta name="twitter:image" content="${escapeHtml(image)}" />
    ` : '';

    const redirectScript = crawler ? '' : `<script>window.location.replace(${JSON.stringify(canonical)});</script>`;
    const redirectMeta = crawler ? '' : `<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}" />`;

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="PB Bilibili 162" />
  ${imageTags}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${redirectMeta}
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${redirectScript}
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto" />` : ''}
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(canonical)}">Buka dokumentasi</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', crawler ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[share-galeri]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau dokumentasi');
  }
}
