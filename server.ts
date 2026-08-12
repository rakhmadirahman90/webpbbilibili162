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
    app.use(express.json());

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
          active: true,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        },
        {
          id: 1,
          title: 'Pusat Pelatihan PB Bilibili 162',
          subtitle: 'Fasilitas lapangan berkualitas internasional dengan standar karpet BWF.',
          image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
          active: true,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        },
        {
          id: 2,
          title: 'Keluarga Besar Atlet Kami',
          subtitle: 'Membangun komunitas solid dengan dedikasi tinggi terhadap bulutangkis.',
          image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg',
          active: true,
          titleSize: 24,
          subtitleSize: 10,
          fontFamily: 'font-sans'
        }
      ],
      settings: { duration: 7 },
      updated_at: '2026-08-12T20:00:00.000Z'
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
              const isStale = !dbVal?.updated_at || new Date(dbVal.updated_at).getTime() < new Date('2026-08-12T12:00:00.000Z').getTime();
              
              let finalSlides = slides;
              if (!hasVideo || isStale) {
                const otherSlides = Array.isArray(slides)
                  ? slides.filter((s: any) => s && s.id !== 1786206064378 && s.id !== 1786206064379 && s.id !== 'video-main-1')
                  : [];
                finalSlides = [DEFAULT_HERO_CONFIG.slides[0], DEFAULT_HERO_CONFIG.slides[1], ...otherSlides];
              }

              const configTs = dbVal?.updated_at || new Date().toISOString();
              const cacheBustedSlides = (Array.isArray(finalSlides) ? finalSlides : []).map((s: any) => {
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
        const payloadStr = JSON.stringify({ key, value });
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
      try {
        const { perihal, tujuan_yth, jabatan_tujuan } = req.body;
        console.log(">>> [AI] Context:", { perihal, tujuan_yth, jabatan_tujuan });
        
        if (!process.env.GEMINI_API_KEY) {
          console.error(">>> [AI] Error: GEMINI_API_KEY is missing");
          return res.status(500).json({ 
            error: "GEMINI_API_KEY is not configured." 
          });
        }

        const prompt = `
          Anda adalah sekretaris profesional untuk klub bulutangkis "PB Bilibili 162" di Parepare.
          Tugas Anda adalah menulis isi surat resmi berdasarkan perihal berikut:
          
          PERIHAL: ${perihal}
          TUJUAN: ${tujuan_yth}
          JABATAN TUJUAN: ${jabatan_tujuan}
          
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

        console.log(">>> [AI] Sending request to Gemini (gemini-flash-latest)...");
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        const text = response.text;
        
        if (!text) {
          console.error(">>> [AI] Error: Empty text returned", response);
          throw new Error("AI returned empty response. Please try again.");
        }

        console.log(">>> [AI] Success. Length:", text.length);
        res.json({ text: text.trim() });
      } catch (error: any) {
        console.error(">>> [AI] Catch Error:", error);
        
        let statusCode = 500;
        if (typeof error.status === 'number') {
          statusCode = error.status;
        } else if (error.status && typeof error.status === 'string') {
          // Some errors might have string status like "RESOURCE_EXHAUSTED"
          statusCode = 500;
        }

        res.status(statusCode).json({ 
          error: error.message || "Unexpected error during AI generation",
          details: error.toString()
        });
      }
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
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
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
