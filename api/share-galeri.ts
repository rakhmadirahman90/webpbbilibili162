const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const DEFAULT_SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0f0gn';

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
function youtubeId(raw: string) {
  const match = String(raw || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^#&?\/\s]+)/i);
  return match?.[1] || '';
}
function crawler(ua: string) {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(ua);
}

async function loadGallery(id: string) {
  const urls = Array.from(new Set([process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PROJECT_URL, process.env.SUPABASE_URL, DEFAULT_SUPABASE_URL].filter(Boolean).map(v => String(v).replace(/\/$/, ''))));
  const keys = Array.from(new Set([process.env.VITE_SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON, process.env.VITE_SUPABASE_KEY, process.env.SUPABASE_ANON_KEY, process.env.SUPABASE_KEY, DEFAULT_SUPABASE_KEY].filter(Boolean).map(String)));
  let lastError = '';
  for (const baseUrl of urls) for (const key of keys) {
    for (const table of ['gallery', 'galeri']) {
      try {
        const endpoint = `${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`;
        const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) { lastError = `Supabase ${response.status} at ${baseUrl}/${table}`; continue; }
        const rows = await response.json();
        const gallery = Array.isArray(rows) ? rows[0] : null;
        if (gallery) return gallery;
        lastError = `Gallery ${id} not found at ${baseUrl}/${table}`;
      } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    }
  }
  throw new Error(lastError || 'Unable to load gallery');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const id = String(req.query?.id || req.query?.gallery || req.query?.galleryId || '').trim();
  if (!id) return res.status(400).send('Dokumentasi tidak ditemukan');

  try {
    const gallery = await loadGallery(id).catch(() => null);
    const queryTitle = String(req.query?.title || '').trim();
    const queryType = String(req.query?.type || '').trim().toLowerCase();
    const photoTitle = queryTitle || String(gallery?.title || gallery?.judul || '').replace(/\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
    const mediaType = queryType || String(gallery?.type || gallery?.media_type || '').trim().toLowerCase();
    const shareTitle = `Lihat dokumentasi \"${photoTitle}\" dari PB Bilibili 162:`;
    const version = String(req.query?.v || '24').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || '24';
    const detailUrl = `${PUBLIC_DOMAIN}/galeri?gallery=${encodeURIComponent(id)}`;

    const previewUrl = `${PUBLIC_DOMAIN}/api/gallery-share-image?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`;
    const rawUrl = String(req.query?.image || gallery?.url || gallery?.image_url || gallery?.foto_url || gallery?.media_url || '');
    const youtube = mediaType === 'video' ? youtubeId(rawUrl) : '';
    const ua = String(req.headers?.['user-agent'] || '');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Vary', 'User-Agent, Accept-Encoding');

    const videoMeta = mediaType === 'video'
      ? `<meta property="og:video" content="${esc(rawUrl)}"><meta property="og:video:secure_url" content="${esc(rawUrl)}"><meta property="og:video:type" content="video/mp4">`
      : '';
    const youtubeMeta = youtube
      ? `<meta property="og:video:url" content="https://www.youtube.com/watch?v=${esc(youtube)}"><meta property="og:video:secure_url" content="https://www.youtube.com/watch?v=${esc(youtube)}">`
      : '';

    return res.status(200).send(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(shareTitle)}</title><meta name="description" content="${esc(shareTitle)}"><meta property="og:type" content="${mediaType === 'video' ? 'video.other' : 'article'}"><meta property="og:url" content="${esc(detailUrl)}"><meta property="og:title" content="${esc(shareTitle)}"><meta property="og:description" content="${esc(shareTitle)}"><meta property="og:site_name" content="PB Bilibili 162"><meta property="og:image" content="${esc(previewUrl)}"><meta property="og:image:url" content="${esc(previewUrl)}"><meta property="og:image:secure_url" content="${esc(previewUrl)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="900"><meta property="og:image:alt" content="${esc(photoTitle)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(shareTitle)}"><meta name="twitter:description" content="${esc(shareTitle)}"><meta name="twitter:image" content="${esc(previewUrl)}"><link rel="canonical" href="${esc(detailUrl)}">${videoMeta}${youtubeMeta}</head><body style="margin:0;background:#070d1a;color:#fff;font-family:system-ui,sans-serif"><main style="max-width:900px;margin:0 auto;padding:24px"><h1>${esc(shareTitle)}</h1><img src="${esc(previewUrl)}" alt="${esc(photoTitle)}" style="display:block;width:100%;max-width:1200px;height:auto;border-radius:16px">${mediaType === 'video' ? `<p style="opacity:.75">▶ Video dokumentasi tersedia di halaman galeri.</p>` : ''}</main>${crawler(ua) ? '' : `<script>location.replace(${JSON.stringify(detailUrl)})</script>`}</body></html>`);
  } catch (error) {
    console.error('[share-galeri]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau dokumentasi');
  }
}
