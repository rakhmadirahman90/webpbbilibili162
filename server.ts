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
