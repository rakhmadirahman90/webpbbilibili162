const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const DEFAULT_SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn';

function esc(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;');
}
function normalizeUrl(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${PUBLIC_DOMAIN}${value.startsWith('/') ? '' : '/'}${value}`;
}
function previewImage(raw: string) {
  return String(raw || '').split(/[\s,]+/).map(normalizeUrl).find(url => url && !/logo_pb_bilibili|\/logo(?:[./]|$)|favicon|placeholder|\.svg(?:$|\?)/i.test(url)) || '';
}
function crawler(ua: string) { return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(ua); }

async function loadGallery(id: string) {
  const urls = Array.from(new Set([
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
    DEFAULT_SUPABASE_URL,
  ].filter(Boolean).map(v => String(v).replace(/\/$/, ''))));
  const keys = Array.from(new Set([
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_KEY,
    DEFAULT_SUPABASE_KEY,
  ].filter(Boolean).map(String)));

  let lastError = '';
  for (const baseUrl of urls) {
    for (const key of keys) {
      try {
        const endpoint = `${baseUrl}/rest/v1/gallery?id=eq.${encodeURIComponent(id)}&select=id,title,description,type,url,created_at`;
        const response = await fetch(endpoint, {
          headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          lastError = `Supabase ${response.status} at ${baseUrl}`;
          continue;
        }
        const rows = await response.json();
        const gallery = Array.isArray(rows) ? rows[0] : null;
        if (gallery) return gallery;
        lastError = `Gallery ${id} not found at ${baseUrl}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }
  throw new Error(lastError || 'Unable to load gallery');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const id = String(req.query?.id || req.query?.gallery || req.query?.galleryId || '').trim();
  if (!id) return res.status(400).send('Dokumentasi tidak ditemukan');

  try {
    const gallery = await loadGallery(id);

    // WhatsApp must use the actual activity/photo title stored in gallery.title.
    // description is only a fallback when title is empty.
    const photoTitle = String(gallery.title || gallery.description || '').replace(/\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
    const shareTitle = `Lihat dokumentasi \"${photoTitle}\" dari PB Bilibili 162:`;
    const image = gallery.type === 'image' ? previewImage(gallery.url) : '';
    const version = String(req.query?.v || '19').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || '19';
    const detailUrl = `${PUBLIC_DOMAIN}/?gallery=${encodeURIComponent(gallery.id)}&share=v19`;
    const shareUrl = `${PUBLIC_DOMAIN}/api/share-galeri?id=${encodeURIComponent(gallery.id)}&v=${version}`;
    const cacheImage = image ? `${image}${image.includes('?') ? '&' : '?'}share=v19` : '';
    const mime = /\.png(?:$|\?)/i.test(image) ? 'image/png' : /\.webp(?:$|\?)/i.test(image) ? 'image/webp' : 'image/jpeg';
    const ua = String(req.headers?.['user-agent'] || '');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Vary', 'User-Agent, Accept-Encoding');

    return res.status(200).send(`<!doctype html><html lang=\"id\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>${esc(shareTitle)}</title><meta name=\"description\" content=\"${esc(shareTitle)}\"><meta property=\"og:type\" content=\"article\"><meta property=\"og:url\" content=\"${esc(shareUrl)}\"><meta property=\"og:title\" content=\"${esc(shareTitle)}\"><meta property=\"og:description\" content=\"${esc(shareTitle)}\"><meta property=\"og:site_name\" content=\"PB Bilibili 162\">${cacheImage ? `<meta property=\"og:image\" content=\"${esc(cacheImage)}\"><meta property=\"og:image:url\" content=\"${esc(cacheImage)}\"><meta property=\"og:image:secure_url\" content=\"${esc(cacheImage)}\"><meta property=\"og:image:type\" content=\"${mime}\"><meta property=\"og:image:width\" content=\"1200\"><meta property=\"og:image:height\" content=\"900\"><meta property=\"og:image:alt\" content=\"${esc(photoTitle)}\"><meta name=\"twitter:image\" content=\"${esc(cacheImage)}\">` : ''}<meta name=\"twitter:card\" content=\"summary_large_image\"><meta name=\"twitter:title\" content=\"${esc(shareTitle)}\"><meta name=\"twitter:description\" content=\"${esc(shareTitle)}\"><link rel=\"canonical\" href=\"${esc(detailUrl)}\"></head><body><h1>${esc(shareTitle)}</h1>${cacheImage ? `<img src=\"${esc(cacheImage)}\" alt=\"${esc(photoTitle)}\" style=\"max-width:100%;height:auto\">` : ''}${crawler(ua) ? '' : `<script>location.replace(${JSON.stringify(detailUrl)})</script>`}</body></html>`);
  } catch (error) {
    console.error('[share-galeri]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau dokumentasi');
  }
}
