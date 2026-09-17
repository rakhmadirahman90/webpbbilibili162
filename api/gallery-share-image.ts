const DEFAULT_SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn';
const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';

function normalizeUrl(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

function youtubeId(raw: string) {
  const match = String(raw || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^#&?\/\s]+)/i);
  return match?.[1] || '';
}

function looksLikeImage(url: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:$|[?#])/i.test(url);
}

async function loadGallery(id: string) {
  const urls = Array.from(new Set([
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PROJECT_URL,
    process.env.SUPABASE_URL,
    DEFAULT_SUPABASE_URL,
  ].filter(Boolean).map(v => String(v).replace(/\/$/, ''))));
  const keys = Array.from(new Set([
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON,
    process.env.VITE_SUPABASE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_KEY,
    DEFAULT_SUPABASE_KEY,
  ].filter(Boolean).map(String)));

  for (const baseUrl of urls) for (const key of keys) {
    for (const table of ['gallery', 'galeri']) {
      try {
        const endpoint = `${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`;
        const response = await fetch(endpoint, {
          headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) continue;
        const rows = await response.json();
        const gallery = Array.isArray(rows) ? rows[0] : null;
        if (gallery) return gallery;
      } catch {}
    }
  }
  return null;
}

async function fetchImage(url: string) {
  if (!url) return null;
  try {
    const upstream = await fetch(url, { cache: 'no-store' });
    if (!upstream.ok) return null;
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) return null;
    return { bytes: Buffer.from(await upstream.arrayBuffer()), contentType };
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).send('ID dokumentasi wajib diisi');

  try {
    const gallery = await loadGallery(id);
    if (!gallery) return res.status(404).send('Dokumentasi tidak ditemukan');

    const raw = String(gallery.url || gallery.image_url || gallery.foto_url || gallery.media_url || '');
    const type = String(gallery.type || gallery.media_type || '').toLowerCase();
    const thumbnailRaw = String(gallery.thumbnail_url || gallery.thumbnail || gallery.poster_url || gallery.preview_url || '');
    const rawCandidates = raw.split(/[\s,]+/).map(normalizeUrl).filter(Boolean);
    const youtubeThumbnail = youtubeId(raw) ? `https://img.youtube.com/vi/${youtubeId(raw)}/hqdefault.jpg` : '';

    // For photos use the first actual image. For videos prefer an explicitly
    // stored poster/thumbnail, then a YouTube thumbnail, then any image URL.
    const candidates = type === 'video'
      ? [thumbnailRaw, youtubeThumbnail, ...rawCandidates.filter(looksLikeImage)]
      : rawCandidates;

    let selected = '';
    let media = null;
    for (const candidate of candidates) {
      const image = await fetchImage(candidate);
      if (image) {
        selected = candidate;
        media = image;
        break;
      }
    }

    // A video uploaded directly to Supabase may not have a thumbnail yet.
    // Keep the social share valid by falling back to the official club image
    // rather than exposing an MP4 URL as og:image.
    if (!media) {
      const fallback = `${PUBLIC_DOMAIN}/logo_pb_bilibili_162.png?gallery_share_fallback=${encodeURIComponent(id)}`;
      media = await fetchImage(fallback);
      selected = fallback;
    }

    if (!media) return res.status(404).send('Gambar pratinjau tidak tersedia');

    const title = String(gallery.title || gallery.judul || 'PB Bilibili 162').replace(/[\r\n]+/g, ' ').trim();
    const contentType = media.contentType.toLowerCase();
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';

    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Content-Length', String(media.bytes.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(title).slice(0, 80)}.${ext}"`);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Gallery-Preview-Source', selected || 'fallback');
    return res.status(200).send(media.bytes);
  } catch (error) {
    console.error('[gallery-share-image]', error);
    return res.status(500).send('Gagal menyiapkan gambar pratinjau');
  }
}
