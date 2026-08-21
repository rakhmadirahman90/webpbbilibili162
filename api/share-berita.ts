const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeImageUrl(raw: string): string {
  const first = String(raw || '').split(/[\s,]+/).map(v => v.trim()).find(Boolean) || '';
  if (!first) return '';
  if (/^https?:\/\//i.test(first)) return first;
  if (first.startsWith('//')) return `https:${first}`;
  return `${PUBLIC_DOMAIN}${first.startsWith('/') ? '' : '/'}${first}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar'
  }).format(d).replace(' pukul ', ' | ') + ' WITA';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).send('Berita tidak ditemukan');

  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/berita?id=eq.${encodeURIComponent(id)}&select=id,judul,ringkasan,konten,kategori,gambar_url,tanggal,penulis`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    const news = Array.isArray(rows) ? rows[0] : null;
    if (!news) return res.status(404).send('Berita tidak ditemukan');

    const title = String(news.judul || 'Berita PB Bilibili 162').trim();
    const description = String(news.ringkasan || news.konten || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const image = normalizeImageUrl(news.gambar_url);
    const canonical = `${PUBLIC_DOMAIN}/berita?newsId=${encodeURIComponent(news.id)}`;
    const pageTitle = `${title} - PB Bilibili 162`;

    // IMPORTANT: this is a server-rendered share surface. WhatsApp/Facebook/etc.
    // read these OG tags directly; the React SPA cannot change OG tags for crawlers.
    const imageTags = image ? `
      <meta property="og:image" content="${escapeHtml(image)}" />
      <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:alt" content="${escapeHtml(title)}" />
      <meta name="twitter:image" content="${escapeHtml(image)}" />
    ` : '';

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
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}" />
  <script>window.location.replace(${JSON.stringify(canonical)});</script>
</head>
<body>
  <p>Membuka berita PB Bilibili 162…</p>
  <p><a href="${escapeHtml(canonical)}">Buka berita</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[share-berita]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau berita');
  }
}
