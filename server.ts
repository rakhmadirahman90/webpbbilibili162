import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate-letter", async (req, res) => {
    console.log("Received AI generation request");
    try {
      const { perihal, tujuan_yth, jabatan_tujuan } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is missing");
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured in Settings > Secrets." 
        });
      }

      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ text: text.trim() });
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred during generation." });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
