import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function injectNewsMetaTags(html: string, newsId: string, hostHeader?: string): Promise<string> {
  try {
    const response = await fetch(`https://missjyvqfehamtpyodjr.supabase.co/rest/v1/berita?id=eq.${newsId}&select=*`, {
      headers: {
        'apikey': 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn'
      }
    });
    if (!response.ok) return html;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return html;

    const news = data[0];
    const title = (news.judul || 'Berita PB Bilibili 162').trim();
    const rawContent = (news.ringkasan || news.konten || '').replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Journalistic lead snippet format matching Kilas Sulawesi sample (e.g. PAREPARE– ...)
    const leadSnippet = rawContent.toUpperCase().startsWith('PAREPARE')
      ? rawContent.substring(0, 160)
      : `PAREPARE– ${rawContent.substring(0, 150)}`;

    const ogTitle = `${title} - PB BILIBILI 162`;
    const description = leadSnippet;
    
    // Always use public production domain for WhatsApp and social media web scrapers
    const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';
    const proxyImage = `${PUBLIC_DOMAIN}/api/news-image?id=${news.id}`;
    const fullUrl = `${PUBLIC_DOMAIN}/berita?newsId=${news.id}`;

    const metaInject = `
    <!-- Dynamic Open Graph Meta Tags for News (WhatsApp & Social Preview) -->
    <title>${ogTitle.replace(/"/g, '&quot;')}</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="PB BILIBILI 162" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${proxyImage}" />
    <meta property="og:image:url" content="${proxyImage}" />
    <meta property="og:image:secure_url" content="${proxyImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${proxyImage}" />
    <link rel="image_src" href="${proxyImage}" />`;

    // Strip default title, description, and OG/Twitter tags
    let modified = html
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']+["']\s+content=["'][^"']*["']\s*\/?>/gi, '')
      .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/gi, '');

    // Inject dynamic news tags right at the top of <head>
    modified = modified.replace('<head>', `<head>${metaInject}`);
    return modified;
  } catch (err) {
    console.error("Failed to inject news meta tags:", err);
    return html;
  }
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.set('trust proxy', true);
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // API Routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Persistent Site Settings Store
    const SETTINGS_FILE = path.join(process.cwd(), 'data', 'site_settings.json');
    
    function loadLocalSettingsStore(): Record<string, any> {
      try {
        if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
          fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
        }
        if (fs.existsSync(SETTINGS_FILE)) {
          const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
          return JSON.parse(raw);
        }
      } catch (e) {
        console.warn("Failed to read local settings store:", e);
      }
      return {};
    }

    function saveLocalSettingsStore(store: Record<string, any>) {
      try {
        if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
          fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
        }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2), 'utf-8');
      } catch (e) {
        console.warn("Failed to save local settings store:", e);
      }
    }

    function appendCacheBustParam(url?: string, timestamp?: string | number): string {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

      let ts: number;
      if (typeof timestamp === 'number') {
        ts = timestamp;
      } else if (typeof timestamp === 'string' && timestamp.trim().length > 0) {
        const parsed = new Date(timestamp).getTime();
        ts = !isNaN(parsed) && parsed > 0 ? parsed : (Number(timestamp) || Date.now());
      } else {
        ts = Date.now();
      }

      try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const u = new URL(trimmed);
          u.searchParams.set('v', String(ts));
          return u.toString();
        } else {
          const [base, search] = trimmed.split('?');
          const params = new URLSearchParams(search || '');
          params.set('v', String(ts));
          return `${base}?${params.toString()}`;
        }
      } catch {
        const delim = trimmed.includes('?') ? '&' : '?';
        return `${trimmed}${delim}v=${ts}`;
      }
    }

    // Default hero config with video slide as #1 and ketua photo as #2
    const DEFAULT_HERO_CONFIG = {
      slides: [
        {
          id: 1786206064378,
          title: 'PB Bilibili Video Hero',
          subtitle: 'PB BILIBILI 162 PROFESSIONAL CLUB',
          image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
          videoUrl: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
          poster: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-poster-1786206060056.webp',
          type: 'video',
          active: true,
          titleSize: 28,
          subtitleSize: 12,
          fontFamily: 'font-sans'
        },
        {
          id: 1786206064379,
          title: 'Ketua & Pembina PB Bilibili 162',
          subtitle: 'Pusat Pembinaan Bulutangkis Standar BWF',
          image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png',
          type: 'image',
          active: false,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        },
        {
          id: 1,
          title: 'Pusat Pelatihan PB Bilibili 162',
          subtitle: 'Fasilitas lapangan berkualitas internasional dengan standar karpet BWF.',
          image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
          active: false,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        },
        {
          id: 2,
          title: 'Keluarga Besar Atlet Kami',
          subtitle: 'Membangun komunitas solid dengan dedikasi tinggi terhadap bulutangkis.',
          image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg',
          active: false,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        }
      ],
      settings: { duration: 7 },
      updated_at: '2026-08-12T23:59:59.000Z'
    };

    const sseClients: any[] = [];

    app.get("/api/site-settings/stream", (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      sseClients.push(res);

      req.on('close', () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
    });

    app.get("/api/site-settings", async (req, res) => {
      const key = (req.query.key as string) || 'hero_config';
      const store = loadLocalSettingsStore();
      const localVal = store[key];

      const getTs = (v: any) => {
        if (!v) return 0;
        const p = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return {}; } })() : v;
        return p?.updated_at ? new Date(p.updated_at).getTime() || 0 : 0;
      };

      // Try fetching live setting from Supabase REST API
      try {
        const response = await fetch(`https://missjyvqfehamtpyodjr.supabase.co/rest/v1/site_settings?key=eq.${key}&select=*`, {
          headers: {
            'apikey': 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].value !== undefined && data[0].value !== null) {
            const dbVal = typeof data[0].value === 'string' ? JSON.parse(data[0].value) : data[0].value;
            const localTs = getTs(localVal);
            const dbTs = getTs(dbVal);

            let finalVal = dbVal;
            if (key === 'hero_config') {
              const slides = dbVal?.slides || (Array.isArray(dbVal) ? dbVal : []);
              const hasVideo = Array.isArray(slides) && slides.some((s: any) => s && (s.type === 'video' || s.videoUrl || (typeof s.image === 'string' && (s.image.endsWith('.webm') || s.image.endsWith('.mp4')))));
              const isStale = !dbVal?.updated_at || new Date(dbVal.updated_at).getTime() < new Date('2026-08-12T23:50:00.000Z').getTime();
              
              let finalSlides = slides;
              if (!hasVideo || isStale) {
                const defaultVideoSlide = DEFAULT_HERO_CONFIG.slides[0];
                const existingVideoSlide = Array.isArray(slides) ? slides.find((s: any) => s && (s.id === 1786206064378 || s.type === 'video' || s.videoUrl)) : null;
                const videoSlide = existingVideoSlide ? { ...defaultVideoSlide, ...existingVideoSlide, active: true } : defaultVideoSlide;

                const otherSlides = Array.isArray(slides) && slides.length > 0
                  ? slides.filter((s: any) => s && s.id !== 1786206064378 && s.type !== 'video' && !s.videoUrl)
                  : DEFAULT_HERO_CONFIG.slides.slice(1);

                finalSlides = [videoSlide, ...otherSlides];
              }

              const configTs = dbVal?.updated_at || new Date().toISOString();
              const sanitizedSlides = (Array.isArray(finalSlides) ? finalSlides : []).map((s: any) => {
                if (!s || typeof s !== 'object') return s;
                const isVid = s.type === 'video' || s.videoUrl || (typeof s.image === 'string' && (s.image.endsWith('.webm') || s.image.endsWith('.mp4')));
                if (!isVid) {
                  return { ...s, active: false };
                }
                return { ...s, active: s.active !== false };
              });
              const cacheBustedSlides = sanitizedSlides.map((s: any) => {
                if (!s || typeof s !== 'object') return s;
                const slideTs = s.updated_at || s.timestamp || s.id || configTs;
                return {
                  ...s,
                  image: s.image ? appendCacheBustParam(s.image, slideTs) : s.image,
                  videoUrl: s.videoUrl ? appendCacheBustParam(s.videoUrl, slideTs) : s.videoUrl,
                  poster: s.poster ? appendCacheBustParam(s.poster, slideTs) : s.poster,
                };
              });

              finalVal = {
                settings: dbVal?.settings || DEFAULT_HERO_CONFIG.settings,
                slides: cacheBustedSlides,
                updated_at: configTs
              };
            }

            if (localVal && localTs > dbTs) {
              return res.json({ key, value: localVal });
            }

            store[key] = finalVal;
            saveLocalSettingsStore(store);
            return res.json({ key, value: finalVal });
          }
        }
      } catch (e) {
        console.warn("[server.ts] Supabase fetch error for site-settings:", e);
      }

      // Check master digital assets from arsip_surat table if requested
      if (key === 'digital_assets_surat') {
        try {
          const masterRes = await fetch(`https://missjyvqfehamtpyodjr.supabase.co/rest/v1/arsip_surat?nomor_surat=eq.__MASTER_DIGITAL_ASSETS__&select=*`, {
            headers: { 'apikey': 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn' }
          });
          if (masterRes.ok) {
            const masterData = await masterRes.json();
            if (Array.isArray(masterData) && masterData.length > 0) {
              const m = masterData[0];
              let extra: any = {};
              try { extra = typeof m.isi_surat === 'string' ? JSON.parse(m.isi_surat) : m.isi_surat; } catch (e) {}
              const resolvedAssets = {
                logo_url: m.logo_url || '/logo_pb_bilibili_162.svg',
                ttd_ketua_url: m.ttd_ketua_url || '',
                ttd_sekretaris_url: m.ttd_sekretaris_url || '',
                cap_stempel_url: m.cap_stempel_url || '',
                nama_ketua: m.nama_ketua || extra.nama_ketua || 'H. WAWAN',
                nama_sekretaris: m.nama_sekretaris || extra.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
                logo_scale: extra.logo_scale || 100,
                ttd_ketua_scale: extra.ttd_ketua_scale || 100,
                ttd_sekretaris_scale: extra.ttd_sekretaris_scale || 100,
                stempel_scale: extra.stempel_scale || 100,
                logo_pos: extra.logo_pos || { x: 0, y: 0 },
                stempel_pos: extra.stempel_pos || { x: -35, y: 0 },
                ttd_ketua_pos: extra.ttd_ketua_pos || { x: 0, y: 0 },
                ttd_sekretaris_pos: extra.ttd_sekretaris_pos || { x: 0, y: 0 },
              };
              store[key] = resolvedAssets;
              saveLocalSettingsStore(store);
              return res.json({ key, value: resolvedAssets });
            }
          }
        } catch (e) {}
      }

      if (store[key] !== undefined && store[key] !== null) {
        return res.json({ key, value: store[key] });
      }

      if (key === 'hero_config') {
        return res.json({ key: 'hero_config', value: DEFAULT_HERO_CONFIG });
      }
      return res.json({ key, value: null });
    });

    app.post("/api/site-settings", (req, res) => {
      try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: "Key is required" });
        const store = loadLocalSettingsStore();
        store[key] = value;
        saveLocalSettingsStore(store);

        // Broadcast realtime update to all SSE clients
        const payloadStr = JSON.stringify({ key, value, table: key, eventType: 'UPDATE', data: value });
        for (const client of sseClients) {
          try {
            client.write(`data: ${payloadStr}\n\n`);
          } catch (e) {}
        }

        return res.json({ success: true, key, value });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // Persistent JSON Store for Arsip Surat, Surat Masuk, Digital Assets, and Konfigurasi Popup
    const SURAT_FILE = path.join(process.cwd(), 'data', 'arsip_surat.json');
    const SURAT_MASUK_FILE = path.join(process.cwd(), 'data', 'surat_masuk.json');
    const DIGITAL_ASSETS_FILE = path.join(process.cwd(), 'data', 'digital_assets.json');
    const POPUP_FILE = path.join(process.cwd(), 'data', 'konfigurasi_popup.json');

    function loadJsonFile(filePath: string, defaultVal: any = []) {
      try {
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      } catch (e) {}
      return defaultVal;
    }

    function saveJsonFile(filePath: string, data: any) {
      try {
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
    }

    const SUPABASE_URL = "https://missjyvqfehamtpyodjr.supabase.co";
    const SUPABASE_KEY = "sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn";

    async function syncArsipSuratToSupabase(item: any) {
      try {
        if (!item) return;
        const nomor = item.nomor_surat;
        const validCols = [
          'created_at', 'nomor_surat', 'jenis_surat', 'perihal', 
          'tujuan_instansi', 'isi_surat', 'tanggal_surat', 'file_lampiran', 
          'nama_ketua', 'nama_sekretaris', 'status', 'logo_url', 'ttd_ketua_url', 
          'ttd_sekretaris_url', 'cap_stempel_url', 'lampiran', 'tempat_tanggal', 
          'jabatan_tujuan', 'hari_tanggal', 'waktu', 'tempat_kegiatan', 'tema', 'tujuan_yth'
        ];
        const payload: any = {};
        validCols.forEach(col => {
          if (item[col] !== undefined) payload[col] = item[col];
        });
        if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
          payload.id = item.id;
        }

        if (nomor && nomor !== '__MASTER_DIGITAL_ASSETS__') {
          await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?nomor_surat=eq.${encodeURIComponent(nomor)}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY }
          });
        } else if (payload.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?id=eq.${payload.id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY }
          });
        }

        await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn("Supabase sync warning:", e);
      }
    }

    async function deleteArsipSuratFromSupabase(queryId: string, nomorSurat: string) {
      try {
        if (nomorSurat) {
          await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?nomor_surat=eq.${encodeURIComponent(nomorSurat)}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY }
          });
        }
        if (queryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId)) {
          await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?id=eq.${queryId}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY }
          });
        }
      } catch (e) {}
    }

    async function syncMasterAssetsToSupabase(assets: any) {
      try {
        const masterRecord = {
          nomor_surat: '__MASTER_DIGITAL_ASSETS__',
          jenis_surat: 'MASTER_CONFIG',
          perihal: 'Master Aset Digital Kop Surat & TTD PB Bilibili',
          nama_ketua: assets.nama_ketua || 'H. WAWAN',
          nama_sekretaris: assets.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
          logo_url: assets.logo_url || '/logo_pb_bilibili_162.svg',
          ttd_ketua_url: assets.ttd_ketua_url || '',
          ttd_sekretaris_url: assets.ttd_sekretaris_url || '',
          cap_stempel_url: assets.cap_stempel_url || '',
          isi_surat: JSON.stringify(assets),
          status: 'CONFIG'
        };
        await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?nomor_surat=eq.__MASTER_DIGITAL_ASSETS__`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY }
        });
        await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(masterRecord)
        });
      } catch (e) {}
    }

    // Digital Assets API
    app.get("/api/digital-assets", async (req, res) => {
      let assets = loadJsonFile(DIGITAL_ASSETS_FILE, null);
      if (!assets || !assets.logo_url) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const response = await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?nomor_surat=eq.__MASTER_DIGITAL_ASSETS__&select=*`, {
            headers: {
              'apikey': SUPABASE_KEY
            },
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));

          if (response.ok) {
            const dbData = await response.json();
            if (Array.isArray(dbData) && dbData.length > 0) {
              const row = dbData[0];
              let extra: any = {};
              if (row.isi_surat) {
                try { extra = JSON.parse(row.isi_surat); } catch (e) {}
              }
              assets = {
                logo_url: row.logo_url || '/logo_pb_bilibili_162.svg',
                ttd_ketua_url: row.ttd_ketua_url || '',
                ttd_sekretaris_url: row.ttd_sekretaris_url || '',
                cap_stempel_url: row.cap_stempel_url || '',
                nama_ketua: row.nama_ketua || extra.nama_ketua || 'H. WAWAN',
                nama_sekretaris: row.nama_sekretaris || extra.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
                ...extra
              };
              saveJsonFile(DIGITAL_ASSETS_FILE, assets);
            }
          }
        } catch (e) {}
      }
      return res.json(assets || {});
    });

    app.post("/api/digital-assets", async (req, res) => {
      try {
        const assets = req.body;
        saveJsonFile(DIGITAL_ASSETS_FILE, assets);
        await syncMasterAssetsToSupabase(assets);

        const payloadStr = JSON.stringify({ table: 'digital_assets_surat', eventType: 'UPSERT', data: assets, value: assets });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: assets });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    const sanitizeSuratItem = (item: any) => {
      if (!item) return item;
      const copy = { ...item };
      let extra: any = {};
      const rawLampiran = copy.lampiran || '';
      const rawIsi = copy.isi_surat || '';
      if (rawLampiran && typeof rawLampiran === 'string' && rawLampiran.trim().startsWith('{')) {
        try { extra = JSON.parse(rawLampiran); } catch (e) {}
      } else if (rawIsi && typeof rawIsi === 'string' && rawIsi.trim().startsWith('{')) {
        try { extra = JSON.parse(rawIsi); } catch (e) {}
      }
      const cleanIsi = extra.isi_ringkas || copy.isi_ringkas || (rawIsi && !rawIsi.startsWith('{') ? rawIsi : '') || '';
      const cleanLampiran = extra.lampiran_text || (rawLampiran && !rawLampiran.trim().startsWith('{') ? rawLampiran : '-') || '-';
      copy.isi_surat = cleanIsi;
      copy.isi_ringkas = cleanIsi;
      copy.lampiran = cleanLampiran;
      if (extra.paragraf_2) copy.paragraf_2 = extra.paragraf_2;
      if (extra.paragraf_3) copy.paragraf_3 = extra.paragraf_3;

      // Standardize Sidrap letter numbering if mislabeled
      if (copy.perihal?.includes('Tiga Lima Sidrap') || copy.perihal?.includes('Sidrap')) {
        copy.nomor_surat = '003/PB-BILIBILI162/V/2026';
      }
      return copy;
    };

    const normalizeSuratKey = (item: any): string => {
      if (!item) return '';
      const sanitized = sanitizeSuratItem(item);
      const rawNomor = (sanitized.nomor_surat || '').trim().toUpperCase().replace(/PB[-_]BILIBILI[-_]?162/i, 'PB-BILIBILI162').replace(/\s+/g, '');
      if (rawNomor && rawNomor !== '__MASTER_DIGITAL_ASSETS__') {
        return `nomor_${rawNomor}`;
      }
      const perihal = (sanitized.perihal || '').trim().toLowerCase();
      const tanggal = (sanitized.tanggal_surat || sanitized.tempat_tanggal || '').trim().toLowerCase();
      if (perihal) {
        return `perihal_${perihal}_${tanggal}`;
      }
      return `id_${sanitized.id || ''}`;
    };

    app.get("/api/arsip-surat", async (req, res) => {
      const localData = loadJsonFile(SURAT_FILE, []);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?select=*&order=created_at.desc`, {
          headers: {
            'apikey': SUPABASE_KEY
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          const dbData = await response.json();
          if (Array.isArray(dbData)) {
            const map = new Map();
            localData.forEach((i: any) => {
              if (i && i.nomor_surat !== '__MASTER_DIGITAL_ASSETS__' && !i.nomor_surat?.includes('TEST') && i.jenis_surat !== 'MASUK') {
                const sanitized = sanitizeSuratItem(i);
                const key = normalizeSuratKey(sanitized);
                if (key) map.set(key, sanitized);
              }
            });
            dbData.forEach((i: any) => {
              if (i && i.nomor_surat !== '__MASTER_DIGITAL_ASSETS__' && !i.nomor_surat?.includes('TEST') && i.jenis_surat !== 'MASUK') {
                const sanitized = sanitizeSuratItem(i);
                const key = normalizeSuratKey(sanitized);
                if (key) {
                  const existing = map.get(key);
                  map.set(key, { ...(existing || {}), ...sanitized });
                }
              }
            });
            const merged = Array.from(map.values());
            saveJsonFile(SURAT_FILE, merged);
            return res.json(merged);
          }
        }
      } catch (e) {}
      res.json(localData);
    });

    app.post("/api/arsip-surat", async (req, res) => {
      try {
        const item = req.body;
        const current = loadJsonFile(SURAT_FILE, []);
        const itemKey = normalizeSuratKey(item);

        let found = false;
        const updated = current.map((i: any) => {
          if (i.id === item.id || (itemKey && normalizeSuratKey(i) === itemKey)) {
            found = true;
            return { ...i, ...item };
          }
          return i;
        });

        const finalData = found ? updated : [item, ...updated];
        saveJsonFile(SURAT_FILE, finalData);
        await syncArsipSuratToSupabase(item);

        const payloadStr = JSON.stringify({ table: 'arsip_surat', eventType: 'UPSERT', data: item, value: finalData });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: finalData });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.delete("/api/arsip-surat", async (req, res) => {
      try {
        const { id, nomor_surat } = req.body;
        const targetNomor = (nomor_surat || id || '').trim().toUpperCase().replace(/PB[-_]BILIBILI[-_]?162/i, 'PB-BILIBILI162').replace(/\s+/g, '');
        const current = loadJsonFile(SURAT_FILE, []);
        const updated = current.filter((i: any) => {
          if (i.id === id || i.nomor_surat === id) return false;
          if (targetNomor && i.nomor_surat) {
            const itemNomor = i.nomor_surat.trim().toUpperCase().replace(/PB[-_]BILIBILI[-_]?162/i, 'PB-BILIBILI162').replace(/\s+/g, '');
            if (itemNomor === targetNomor) return false;
          }
          return true;
        });
        saveJsonFile(SURAT_FILE, updated);
        await deleteArsipSuratFromSupabase(id, nomor_surat);

        const payloadStr = JSON.stringify({ table: 'arsip_surat', eventType: 'DELETE', data: { id, nomor_surat }, value: updated });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: updated });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Surat Masuk API
    app.get("/api/surat-masuk", async (req, res) => {
      const localData = loadJsonFile(SURAT_MASUK_FILE, []);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/arsip_surat?jenis_surat=eq.MASUK&select=*&order=created_at.desc`, {
          headers: {
            'apikey': SUPABASE_KEY
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          const dbData = await response.json();
          if (Array.isArray(dbData)) {
            const map = new Map();
            localData.forEach((i: any) => {
              if (i && i.nomor_surat) map.set(i.nomor_surat, i);
            });
            dbData.forEach((i: any) => {
              let extra: any = {};
              if (i.isi_surat) {
                try { extra = JSON.parse(i.isi_surat); } catch (e) {}
              }
              const parsed = {
                ...i,
                ...extra,
                pengirim: extra.pengirim || i.tujuan_instansi || '',
                file_url: extra.file_url || i.file_lampiran || '',
                status_tindak_lanjut: extra.status_tindak_lanjut || i.status || 'Belum Ditindaklanjuti',
                sifat_surat: extra.sifat_surat || 'Biasa',
                disposisi_kepada: extra.disposisi_kepada || 'Ketua PB Bilibili 162',
                catatan_disposisi: extra.catatan_disposisi || '',
                tanggal_diterima: extra.tanggal_diterima || i.tanggal_surat || new Date().toISOString().split('T')[0]
              };
              if (parsed.nomor_surat) map.set(parsed.nomor_surat, parsed);
            });
            const merged = Array.from(map.values());
            saveJsonFile(SURAT_MASUK_FILE, merged);
            return res.json(merged);
          }
        }
      } catch (e) {}
      res.json(localData);
    });

    app.post("/api/surat-masuk", async (req, res) => {
      try {
        const item = req.body;
        const current = loadJsonFile(SURAT_MASUK_FILE, []);
        let found = false;
        const updated = current.map((i: any) => {
          if (i.id === item.id || (item.nomor_surat && i.nomor_surat === item.nomor_surat)) {
            found = true;
            return { ...i, ...item };
          }
          return i;
        });
        const finalData = found ? updated : [item, ...updated];
        saveJsonFile(SURAT_MASUK_FILE, finalData);
        await syncArsipSuratToSupabase({ ...item, jenis_surat: 'MASUK' });

        const payloadStr = JSON.stringify({ table: 'arsip_surat_masuk', eventType: 'UPSERT', data: item, value: finalData });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: finalData });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.delete("/api/surat-masuk", async (req, res) => {
      try {
        const { id, nomor_surat } = req.body;
        const current = loadJsonFile(SURAT_MASUK_FILE, []);
        const updated = current.filter((i: any) => i.id !== id && (!nomor_surat || i.nomor_surat !== nomor_surat));
        saveJsonFile(SURAT_MASUK_FILE, updated);
        await deleteArsipSuratFromSupabase(id, nomor_surat);

        const payloadStr = JSON.stringify({ table: 'arsip_surat_masuk', eventType: 'DELETE', data: { id, nomor_surat }, value: updated });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: updated });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/konfigurasi-popup", (req, res) => {
      const data = loadJsonFile(POPUP_FILE, []);
      res.json(data);
    });

    app.post("/api/konfigurasi-popup", (req, res) => {
      try {
        const items = req.body;
        saveJsonFile(POPUP_FILE, items);

        const payloadStr = JSON.stringify({ table: 'konfigurasi_popup', eventType: 'UPSERT', data: items, value: items });
        for (const client of sseClients) {
          try { client.write(`data: ${payloadStr}\n\n`); } catch (e) {}
        }
        res.json({ success: true, data: items });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/realtime-broadcast", (req, res) => {
      try {
        const { table, eventType, data, key, value } = req.body;
        const targetKey = key || table;
        const targetValue = value || data;

        if (targetKey && targetValue && (targetKey.includes('_config') || targetKey.includes('settings') || targetKey.includes('_content'))) {
          const store = loadLocalSettingsStore();
          store[targetKey] = targetValue;
          saveLocalSettingsStore(store);
        }

        const payloadStr = JSON.stringify({
          table: targetKey,
          key: targetKey,
          eventType: eventType || 'UPDATE',
          data: targetValue,
          value: targetValue,
          timestamp: Date.now()
        });

        for (const client of sseClients) {
          try {
            client.write(`data: ${payloadStr}\n\n`);
          } catch (e) {}
        }

        return res.json({ success: true, key: targetKey, data: targetValue });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // Clean image proxy route for WhatsApp / Open Graph crawlers (bypasses Supabase x-robots-tag: none)
    app.get("/api/news-image", async (req, res) => {
      try {
        const newsId = (req.query.id || req.query.newsId) as string;
        const directUrl = req.query.url as string;

        let imageUrl = directUrl;
        if (!imageUrl && newsId) {
          const response = await fetch(`https://missjyvqfehamtpyodjr.supabase.co/rest/v1/berita?id=eq.${newsId}&select=gambar_url`, {
            headers: {
              'apikey': 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn'
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0 && data[0].gambar_url) {
              const images = data[0].gambar_url.split(/[\s,]+/).filter(Boolean);
              imageUrl = images[0];
            }
          }
        }

        if (!imageUrl) {
          return res.redirect('https://pbilibili162.99apps.id/logo_pb_bilibili_162.png');
        }

        // Optimize image to 1200x630 JPEG via weserv.nl for WhatsApp crawler compatibility (fast & lightweight <150KB)
        const cleanUrl = imageUrl.replace(/^https?:\/\//, '');
        const optimizedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=1200&h=630&fit=cover&output=jpg&q=85`;

        let imgRes = await fetch(optimizedUrl);
        if (!imgRes.ok) {
          // Fallback to original image URL
          imgRes = await fetch(imageUrl);
        }

        if (!imgRes.ok) {
          return res.redirect('https://pbilibili162.99apps.id/logo_pb_bilibili_162.png');
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', buffer.length.toString());
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');
        return res.status(200).send(buffer);
      } catch (err) {
        console.error("Failed to proxy news image:", err);
        return res.redirect('https://pbilibili162.99apps.id/logo_pb_bilibili_162.png');
      }
    });

    function generateSmartFallbackLetter(perihal: string, tujuan_yth?: string, jabatan_tujuan?: string): string {
      const p = (perihal || '').toLowerCase();
      
      if (p.includes('tugas') || p.includes('mabar') || p.includes('mandat') || p.includes('delegasi')) {
        return `Sehubungan dengan keikutsertaan PB Bilibili 162 Parepare dalam agenda "${perihal}", bersama ini Pengurus PB Bilibili 162 memberikan penugasan dan mandat resmi kepada nama-nama terlampir untuk mewakili dan menjalankan tugas organisasi dengan penuh tanggung jawab serta menjunjung tinggi sportivitas.\n\nSeluruh personil yang ditugaskan diharapkan dapat menjaga nama baik klub, mematuhi seluruh tata tertib kegiatan yang berlaku, serta berkoordinasi secara aktif dengan jajaran panitia pelaksana.\n\nDemikian surat tugas ini diberikan untuk dapat dipergunakan sebagaimana mestinya dengan penuh dedikasi dan rasa tanggung jawab.`;
      }

      if (p.includes('kajian') || p.includes('narasumber') || p.includes('pemateri') || p.includes('undangan kajian') || p.includes('religi')) {
        return `Dalam rangka meningkatkan pemahaman keilmuan, pembinaan mental spiritual, serta mempererat ukhuwah islamiyah dan silaturahmi, bersama ini Pengurus PB Bilibili 162 bermaksud mengundang Bapak/Ibu untuk berkenan hadir sebagai Narasumber / Peserta pada kegiatan pengajian dan kajian bersama keluarga besar PB Bilibili 162.\n\nKehadiran dan tausiyah/ilmu yang Bapak/Ibu berikan tentu akan menjadi lentera ilmu yang sangat berharga serta membawa keberkahan bagi seluruh jajaran pengurus, pelatih, dan atlet kami.\n\nDemikian surat permohonan dan undangan ini kami sampaikan. Atas keikhlasan, perkenan, dan kesediaan waktu Bapak/Ibu, kami haturkan ucapan terima kasih yang sebesar-besarnya. Jazakumullahu Khairan Katsiran.`;
      }

      if (p.includes('sparing') || p.includes('sparring') || p.includes('persahabatan') || p.includes('tanding') || p.includes('sidrap')) {
        return `Sehubungan dengan agenda rutin pembinaan atlet serta program kerja Pengurus PB Bilibili 162 Parepare dalam rangka meningkatkan kualitas teknik bertanding dan mempererat tali silaturahmi antar pecinta bulutangkis, bersama ini kami bermaksud mengajukan permohonan laga sparing persahabatan bersama tim yang Bapak/Ibu pimpin.\n\nMelalui laga persahabatan ini, kami berharap dapat saling berbagi pengalaman taktis di lapangan serta menambah jam terbang atlet kedua belah pihak dalam suasana yang sportif dan penuh keakraban. Adapun teknis pelaksanaan, jumlah partai, serta jadwal pertandingan dapat kita koordinasikan lebih lanjut sesuai kesepakatan bersama.\n\nDemikian permohonan ini kami sampaikan, besar harapan kami atas kesediaan dan konfirmasi baik dari Bapak/Ibu. Atas perhatian, dukungan, dan kerjasamanya kami ucapkan terima kasih.`;
      }
      
      if (p.includes('undangan') || p.includes('kejuaraan') || p.includes('turnamen') || p.includes('internal cup') || p.includes('muskot') || p.includes('rapat')) {
        return `Dalam rangka menyukseskan agenda kegiatan "${perihal}" serta memperkuat sinergi dan kebersamaan keluarga besar pecinta bulutangkis di Kota Parepare, kami segenap Pengurus PB Bilibili 162 bermaksud mengundang Bapak/Ibu untuk berkenan hadir dan berpartisipasi dalam kegiatan resmi tersebut.\n\nKehadiran dan dukungan Bapak/Ibu sekalian tentunya akan memberikan kehormatan besar serta menjadi motivasi dan dorongan semangat bagi para peserta dan seluruh jajaran panitia pelaksana.\n\nDemikian surat undangan ini kami sampaikan. Atas kesediaan, perhatian, serta kehadiran Bapak/Ibu tepat pada waktunya, kami haturkan terima kasih yang sebesar-besarnya.`;
      }

      if (p.includes('izin') || p.includes('pinjam') || p.includes('gor') || p.includes('lapangan') || p.includes('fasilitas') || p.includes('tempat')) {
        return `Sehubungan dengan rencana pelaksanaan kegiatan ${perihal} oleh PB Bilibili 162 Parepare, bersama surat ini kami bermaksud mengajukan permohonan izin penggunaan fasilitas sarana dan prasarana sebagaimana yang dimaksud.\n\nKegiatan ini merupakan bagian integral dari program pembinaan atlet dan pemeliharaan performa rutin klub kami. Pihak PB Bilibili 162 berkomitmen penuh untuk senantiasa menjaga kebersihan, ketertiban, serta merawat sarana fasilitas yang digunakan dengan sebaik-baiknya.\n\nDemikian surat permohonan izin ini kami ajukan dengan penuh rasa hormat. Besar harapan kami atas perkenan dan restu dari Bapak/Ibu. Atas kebijaksanaan dan kerjasamanya, kami sampaikan terima kasih.`;
      }

      if (p.includes('bantuan') || p.includes('sponsor') || p.includes('dana') || p.includes('proposal')) {
        return `Sehubungan dengan diselenggarakannya agenda kegiatan ${perihal} oleh PB Bilibili 162 Parepare, bersama surat ini kami bermaksud mengajukan permohonan dukungan dan kemitraan strategis kepada instansi yang Bapak/Ibu pimpin.\n\nMelalui sinergi ini, kami meyakini potensi pembinaan generasi muda dan prestasi olahraga bulutangkis di daerah dapat terus berkembang pesat secara berkelanjutan. Rincian proposal serta bentuk timbal balik kemitraan siap kami paparkan lebih lanjut.\n\nDemikian permohonan ini kami sampaikan, besar harapan kami untuk dapat menjalin kerja sama yang saling menguntungkan. Atas perhatian dan perkenan Bapak/Ibu, kami ucapkan terima kasih.`;
      }

      return `Sehubungan dengan pelaksanaan program kerja PB Bilibili 162 Parepare dan menindaklanjuti perihal "${perihal}", bersama ini kami menyampaikan maksud dan permohonan resmi kepada Bapak/Ibu.\n\nKami meyakini bahwa melalui komunikasi dan koordinasi yang baik, tujuan bersama dalam mendukung pembinaan serta kelancaran agenda tersebut dapat terwujud secara optimal dan profesional.\n\nDemikian surat ini kami sampaikan dengan penuh rasa hormat. Atas perhatian, arahan, dan kerja sama yang senantiasa terjalin baik dari Bapak/Ibu, kami ucapkan terima kasih.`;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    app.post("/api/generate-letter", async (req, res) => {
      console.log(">>> [AI] Received generation request");
      const { perihal, tujuan_yth, jabatan_tujuan } = req.body;

      if (!perihal || typeof perihal !== 'string' || !perihal.trim()) {
        return res.status(400).json({ error: "Perihal surat wajib diisi." });
      }

      const prompt = `
        Anda adalah sekretaris profesional untuk klub bulutangkis "PB Bilibili 162" di Parepare.
        Tugas Anda adalah menulis isi surat resmi berdasarkan perihal berikut:
        
        PERIHAL: ${perihal}
        TUJUAN: ${tujuan_yth || '-'}
        JABATAN TUJUAN: ${jabatan_tujuan || '-'}
        
        INSTRUKSI KHUSUS:
        1. Tuliskan HANYA isi surat (paragraf utama).
        2. JANGAN sertakan: kepala surat, nomor surat, tanggal, salam pembuka, salam penutup, atau bagian tanda tangan.
        3. Gunakan Bahasa Indonesia yang sangat formal, baku, dan sopan.
        4. Isi surat harus terdiri dari 2 sampai 3 paragraf yang padat.
        5. Paragraf pertama harus langsung merujuk pada perihal "${perihal}".
        6. Paragraf kedua berisi detail atau maksud utama dari surat tersebut.
        7. Paragraf ketiga berisi harapan atau tindak lanjut yang diinginkan.
        8. Gunakan istilah bulutangkis jika relevan (misal: pembinaan atlet, sparring, turnamen, dll).
      `;

      // Candidate models in prioritized order to ensure robust fallback
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];

      let lastError: any = null;

      if (process.env.GEMINI_API_KEY) {
        for (const modelName of candidateModels) {
          try {
            console.log(`>>> [AI] Trying model: ${modelName}...`);
            // Add a strict 3.5-second timeout so user never waits more than a few seconds
            const aiPromise = ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI generation timeout')), 3500)
            );

            const response: any = await Promise.race([aiPromise, timeoutPromise]);
            const text = response?.text;
            if (text && text.trim().length > 0) {
              console.log(`>>> [AI] Success with ${modelName}. Length: ${text.length}`);
              return res.json({ 
                text: text.trim(),
                model: modelName,
                source: 'ai'
              });
            }
          } catch (err: any) {
            console.warn(`>>> [AI] Model ${modelName} notice:`, err.message || err);
            lastError = err;
            // Immediate fallback to next model or template
          }
        }
      }

      // If all AI models failed, timed out, or experienced temporary 503/429 demand, use high-quality instant fallback
      console.log(">>> [AI] Delivering smart template fallback for letter generation");
      const fallbackText = generateSmartFallbackLetter(perihal, tujuan_yth, jabatan_tujuan);
      return res.json({ 
        text: fallbackText,
        source: 'template_fallback'
      });
    });

    app.post("/api/send-push-notification", async (req, res) => {
      try {
        const { title, body, topic, token } = req.body;
        console.log(">>> [Push] Request received:", { title, body, topic, token });

        const serverKey = process.env.FCM_SERVER_KEY;
        if (!serverKey) {
          console.warn(">>> [Push] FCM_SERVER_KEY is missing. Simulation only.");
          return res.json({ 
            success: false, 
            simulated: true,
            message: "FCM_SERVER_KEY is not configured in .env. Notifications will show up locally." 
          });
        }

        // Send to specific device token, or fallback to topic registration if provided
        const target = token || (topic ? `/topics/${topic}` : null);
        if (!target) {
          return res.status(400).json({ success: false, error: "Missing token or topic target." });
        }

        const payload = {
          to: target,
          notification: {
            title,
            body,
            icon: "/favicon.ico",
            click_action: "/"
          },
          data: {
            topic: topic || "general",
            click_action: "/"
          }
        };

        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Authorization": `key=${serverKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const fcmData = await fcmResponse.json();
        console.log(">>> [Push] FCM Response:", fcmData);
        return res.json({ success: true, fcmData });

      } catch (error: any) {
        console.error(">>> [Push] Error sending FCM message:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
    });

    // Initialize Vite server in dev mode first so transformIndexHtml is available
    let viteServer: any = null;
    if (process.env.NODE_ENV !== "production") {
      viteServer = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
    }

    // Shared News Meta Tag Middleware (Runs BEFORE express.static and vite.middlewares)
    app.use(async (req, res, next) => {
      const isAsset = req.path.includes('.') || req.path.startsWith('/api') || req.path.startsWith('/@');
      const urlObj = new URL(req.originalUrl || req.url, 'https://pbilibili162.99apps.id');
      const newsId = (req.query.newsId as string) || urlObj.searchParams.get('newsId') || urlObj.searchParams.get('id');

      if (newsId && !isAsset) {
        try {
          const host = req.get('x-forwarded-host') || req.get('host') || 'pbilibili162.99apps.id';
          if (process.env.NODE_ENV !== "production" && viteServer) {
            const rawHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
            const transformedHtml = await viteServer.transformIndexHtml(req.originalUrl, rawHtml);
            const injectedHtml = await injectNewsMetaTags(transformedHtml, newsId, host);
            return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(injectedHtml);
          } else {
            const distPath = path.join(process.cwd(), 'dist');
            const rawHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
            const injectedHtml = await injectNewsMetaTags(rawHtml, newsId, host);
            return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(injectedHtml);
          }
        } catch (e) {
          console.error("Meta injection failed:", e);
          next();
        }
      } else {
        next();
      }
    });

    // Development or Production static handlers
    if (process.env.NODE_ENV !== "production" && viteServer) {
      app.use(viteServer.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      }));
      app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Critical server error during startup:", error);
    process.exit(1);
  }
}

startServer();
