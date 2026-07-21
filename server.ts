import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
      console.log("Received AI generation request. Body:", JSON.stringify(req.body));
      try {
        const { perihal, tujuan_yth, jabatan_tujuan } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
          console.error("GEMINI_API_KEY is missing in environment variables");
          return res.status(500).json({ 
            error: "GEMINI_API_KEY is not configured in Settings > Secrets." 
          });
        }

        const prompt = `
          Tolong buatkan isi surat resmi untuk klub bulutangkis "PB Bilibili 162".
          
          Konteks:
          - Perihal: ${perihal}
          - Tujuan: ${tujuan_yth} (${jabatan_tujuan})
          
          Persyaratan:
          - Gunakan Bahasa Indonesia yang sangat formal, profesional, dan santun.
          - Sesuaikan gaya bahasa dengan perihal surat (misal: surat tugas harus instruktif tapi sopan, surat undangan harus persuasif dan ramah).
          - Tanpa salam pembuka (Assalamu'alaikum) dan tanpa salam penutup (Wassalam), karena itu sudah ada di template.
          - Fokus pada inti penyampaian pesan sesuai perihal.
          - Jangan sertakan informasi tanggal, nomor surat, atau tanda tangan, cukup isi paragraf utamanya saja.
          - Maksimal 2-3 paragraf yang padat dan jelas.
          - Gunakan istilah bulutangkis yang relevan jika sesuai konteks (seperti: sparring, pembinaan atlet, turnamen, dll).
        `;

        console.log("Sending request to Gemini 2.0 Flash...");
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        const text = response.text;
        
        if (!text) {
          console.error("Gemini returned empty text");
          throw new Error("AI returned an empty response. Please check your prompt or API key.");
        }

        console.log("Successfully generated AI content. Length:", text.length);
        res.json({ text: text.trim() });
      } catch (error: any) {
        console.error("AI Generation Detailed Error:", error);
        res.status(500).json({ 
          error: error.message || "An unexpected error occurred during generation.",
          details: error.toString()
        });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
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
