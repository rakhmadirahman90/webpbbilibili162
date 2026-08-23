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
  return !value || value.includes('logo_pb_bilibili') || value.includes('/logo.') || value.includes('/logo/') || value.includes('favicon') || value.includes('placeholder') || value.endsWith('.svg');
}

function getPrimaryImage(url: string): string {
  return String(url || '').split(/[\s,]+/).map(normalizeUrl).filter(Boolean).find(candidate => !isBadPreviewAsset(candidate)) || '';
}

function getImageMime(url: string): string {
  const value = String(url || '').split('?')[0].toLowerCase();
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function isCrawler(userAgent: string): boolean {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const id = String(req.query?.id || req.query?.gallery || req.query?.galleryId || '').trim();
  if (!id) return res.status(400).send('Dokumentasi tidak ditemukan');

  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/gallery?id=eq.${encodeURIComponent(id)}&select=id,title,description,url,created_at,updated_at,type`;
    const response = await fetch(endpoint, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);

    const rows = await response.json();
    const gallery = Array.isArray(rows) ? rows[0] : null;
    if (!gallery) return res.status(404).send('Dokumentasi tidak ditemukan');

    // v17: the activity title is always taken from the gallery record.
    const photoTitle = String(gallery.title || gallery.description || '').replace(/\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
    const shareTitle = `Lihat dokumentasi \"${photoTitle}\" dari PB Bilibili 162`;
    const galleryDescription = String(gallery.description || '').replace(/\s+/g, ' ').trim();
    const description = galleryDescription || shareTitle;
    const image = gallery.type === 'image' ? getPrimaryImage(gallery.url) : '';

    // The share endpoint itself is the Open Graph object. The version is part
    // of the URL so WhatsApp gets a fresh object instead of an old cached one.
    const requestedVersion = String(req.query?.v || '17').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || '17';
    const shareUrl = `${PUBLIC_DOMAIN}/api/share-galeri?id=${encodeURIComponent(gallery.id)}&v=${encodeURIComponent(requestedVersion)}`;
    const detailUrl = `${PUBLIC_DOMAIN}/?gallery=${encodeURIComponent(gallery.id)}&share=v17&v=${encodeURIComponent(requestedVersion)}`;
    const crawler = isCrawler(String(req.headers?.['user-agent'] || ''));
    const imageMime = getImageMime(image);
    // A query suffix makes the image URL a new CDN/cache key for this preview.
    const previewImage = image ? `${image}${image.includes('?') ? '&' : '?'}share=v17` : '';

    const imageTags = previewImage ? `
      <meta property=\"og:image\" content=\"${escapeHtml(previewImage)}\" />
      <meta property=\"og:image:url\" content=\"${escapeHtml(previewImage)}\" />
      <meta property=\"og:image:secure_url\" content=\"${escapeHtml(previewImage)}\" />
      <meta property=\"og:image:type\" content=\"${escapeHtml(imageMime)}\" />
      <meta property=\"og:image:width\" content=\"1200\" />
      <meta property=\"og:image:height\" content=\"900\" />
      <meta property=\"og:image:alt\" content=\"${escapeHtml(photoTitle)}\" />
      <meta name=\"twitter:image\" content=\"${escapeHtml(previewImage)}\" />
    ` : '';

    const html = `<!doctype html>
<html lang=\"id\"><head>
<meta charset=\"utf-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
<title>${escapeHtml(shareTitle)}</title>
<meta name=\"description\" content=\"${escapeHtml(description.slice(0, 300))}\" />
<meta property=\"og:type\" content=\"article\" />
<meta property=\"og:url\" content=\"${escapeHtml(shareUrl)}\" />
<meta property=\"og:title\" content=\"${escapeHtml(shareTitle)}\" />
<meta property=\"og:description\" content=\"${escapeHtml(description.slice(0, 300))}\" />
<meta property=\"og:site_name\" content=\"PB Bilibili 162\" />
${imageTags}
<meta name=\"twitter:card\" content=\"summary_large_image\" />
<meta name=\"twitter:title\" content=\"${escapeHtml(shareTitle)}\" />
<meta name=\"twitter:description\" content=\"${escapeHtml(description.slice(0, 300))}\" />
<link rel=\"canonical\" href=\"${escapeHtml(detailUrl)}\" />
${crawler ? '' : `<meta http-equiv=\"refresh\" content=\"0;url=${escapeHtml(detailUrl)}\" /><script>window.location.replace(${JSON.stringify(detailUrl)});</script>`}
</head><body>
<h1>${escapeHtml(shareTitle)}</h1>
${previewImage ? `<img src=\"${escapeHtml(previewImage)}\" alt=\"${escapeHtml(photoTitle)}\" style=\"max-width:100%;height:auto\" />` : ''}
<p>${escapeHtml(description)}</p>
<p><a href=\"${escapeHtml(detailUrl)}\">Buka dokumentasi</a></p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Vary', 'User-Agent');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[share-galeri]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau dokumentasi');
  }
}