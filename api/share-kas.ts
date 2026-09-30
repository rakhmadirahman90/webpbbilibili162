const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.SUPABASE_KEY || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0f0gn';
const DEFAULT_IMAGE = PUBLIC_DOMAIN + '/logo_pb_bilibili_162.png';
const esc=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const money=(n:any)=>'Rp '+Number(n||0).toLocaleString('id-ID');
const crawler=(ua:string)=>/WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i.test(ua);
const imageKind=(r:any)=>String(r?.lampiran_type||'').toLowerCase().startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(String(r?.lampiran_url||r?.lampiran_nama||''));

export default async function handler(req:any,res:any){
 if(req.method!=='GET') return res.status(405).send('Method Not Allowed');
 const id=String(req.query?.id||'').trim(); if(!id)return res.status(400).send('Transaksi tidak ditemukan');
 try{
  const endpoint=`${SUPABASE_URL}/rest/v1/kas_pb?id=eq.${encodeURIComponent(id)}&select=*`;
  const r=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store'});
  if(!r.ok) throw new Error('Supabase '+r.status);
  const rows=await r.json(); const row=Array.isArray(rows)?rows[0]:null; if(!row)return res.status(404).send('Transaksi tidak ditemukan');
  const hasImage=Boolean(row.lampiran_url)&&imageKind(row);
  const image=hasImage?String(row.lampiran_url):DEFAULT_IMAGE;
  const kind=String(row.jenis_transaksi||'Transaksi').toUpperCase();
  const title=`${kind} • ${money(row.jumlah_bayar)} • PB Bilibili 162`;
  const description=`${row.tanggal_transaksi||'-'} — ${row.nama_pembayar||'-'} — ${row.kategori||'-'}`.slice(0,200);
  const canonical=`${PUBLIC_DOMAIN}/kas-share?id=${encodeURIComponent(id)}`;
  const ua=String(req.headers?.['user-agent']||'');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('CDN-Cache-Control','no-store');
  return res.status(200).send(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:site_name" content="PB Bilibili 162"><meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="Bukti transaksi PB Bilibili 162"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(image)}"><link rel="canonical" href="${esc(canonical)}"></head><body><h1>${esc(title)}</h1><img src="${esc(image)}" alt="Preview transaksi" style="max-width:100%;height:auto"><p>${esc(description)}</p>${crawler(ua)?'':`<script>location.replace('${PUBLIC_DOMAIN}/')</script>`}</body></html>`);
 }catch(e){console.error('[share-kas]',e);return res.status(500).send('Gagal menyiapkan preview transaksi');}
}