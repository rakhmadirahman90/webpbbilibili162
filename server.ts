import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function injectNewsMetaTags(html: string, newsId: string, hostHeader?: string, protocol: string = 'https'): Promise<string> {
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
    const title = news.judul || 'Berita PB Bilibili 162';
    const description = (news.ringkasan || news.konten || '').substring(0, 160).replace(/["\n\r]/g, ' ').trim();
    const images = (news.gambar_url || '').split(/[\s,]+/).filter(Boolean);
    const mainImage = images[0] || 'https://pbilibili162.99apps.id/logo_pb_bilibili_162.svg';
    const host = hostHeader || 'pbilibili162.99apps.id';
    const fullUrl = `${protocol}://${host}/?newsId=${news.id}`;

    const metaInject = `
    <!-- Dynamic Open Graph Meta Tags for News -->
    <title>${title} - PB Bilibili 162</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="PB Bilibili 162" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${mainImage}" />
    <meta property="og:image:secure_url" content="${mainImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${mainImage}" />
    <link rel="image_src" href="${mainImage}" />
    `;

    // Strip default title, description, and OG/Twitter tags
    let modified = html
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']+["']\s+content=["'][^"']*["']\s*\/?>/gi, '')
      .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/gi, '');

    modified = modified.replace('</head>', `${metaInject}\n</head>`);
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

    app.use(express.json());

    // API Routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
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

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });

      app.use(async (req, res, next) => {
        const newsId = req.query.newsId as string;
        const isAsset = req.path.includes('.') || req.path.startsWith('/api') || req.path.startsWith('/@');
        if (newsId && !isAsset) {
          try {
            const rawHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
            const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
            const injectedHtml = await injectNewsMetaTags(transformedHtml, newsId, req.get('host'), req.protocol);
            return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(injectedHtml);
          } catch (e) {
            next();
          }
        } else {
          next();
        }
      });

      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');

      app.get('*all', async (req, res, next) => {
        const newsId = req.query.newsId as string;
        if (newsId) {
          try {
            const rawHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
            const injectedHtml = await injectNewsMetaTags(rawHtml, newsId, req.get('host'), req.protocol);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(injectedHtml);
          } catch (e) {
            return res.sendFile(path.join(distPath, 'index.html'));
          }
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });

      app.use(express.static(distPath));
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
