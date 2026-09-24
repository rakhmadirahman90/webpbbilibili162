const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeImageUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${PUBLIC_DOMAIN}${value.startsWith('/') ? '' : '/'}${value}`;
}

function isCrawler(userAgent: string): boolean {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(userAgent);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const athleteId = String(req.query?.athleteId || req.query?.id || '').trim();
  if (!athleteId) return res.status(400).send('Profil atlet tidak ditemukan');

  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/pendaftaran?id=eq.${encodeURIComponent(athleteId)}&select=id,nama,kategori,kategori_atlet,domisili,whatsapp,status,foto_url,bilibili_cup1_photo_path,updated_at`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Supabase returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }

    const rows = await response.json();
    const athlete = Array.isArray(rows) ? rows[0] : null;
    if (!athlete) return res.status(404).send('Profil atlet tidak ditemukan');

    const name = String(athlete.nama || 'Atlet PB BILIBILI 162').trim();
    const category = String(athlete.kategori_atlet || athlete.kategori || 'Atlet').trim();
    const status = String(athlete.status || 'Aktif').trim();
    // WhatsApp lebih konsisten mengambil gambar dari domain aplikasi sendiri.
    // Endpoint proxy akan mengambil foto asli dari Supabase server-side.
    const image = `${PUBLIC_DOMAIN}/api/share-athlete-image?athleteId=${encodeURIComponent(String(athlete.id))}`;

    const canonical = `${PUBLIC_DOMAIN}/atlet?athleteId=${encodeURIComponent(String(athlete.id))}`;
    const title = `${name} - PB BILIBILI 162`;
    const description = `Profil resmi ${name} • ${category} • Status: ${status}. Foto profil atlet PB BILIBILI 162.`.slice(0, 200);
    const crawler = isCrawler(String(req.headers?.['user-agent'] || ''));

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="PB BILIBILI 162">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:url" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="Foto profil ${escapeHtml(name)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${crawler ? '' : `<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}"><script>window.location.replace(${JSON.stringify(canonical)});</script>`}
</head>
<body style="margin:0;background:#070d1a;color:#fff;font-family:system-ui,sans-serif">
  <main style="max-width:720px;margin:0 auto;padding:24px;text-align:center">
    <img src="${escapeHtml(image)}" alt="Foto profil ${escapeHtml(name)}" style="display:block;width:min(100%,420px);max-height:560px;object-fit:cover;margin:0 auto 20px;border-radius:20px">
    <h1>${escapeHtml(name)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(canonical)}" style="color:#60a5fa">Buka Profil Atlet</a></p>
  </main>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', crawler ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[share-athlete]', error);
    return res.status(500).send('Gagal menyiapkan pratinjau profil atlet');
  }
}
