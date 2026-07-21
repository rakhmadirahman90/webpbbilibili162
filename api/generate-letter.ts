import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const { perihal, tujuan_yth, jabatan_tujuan } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.error(">>> [AI] Error: GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel environment variables." });
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
      throw new Error("AI returned empty response.");
    }

    res.status(200).json({ text: text.trim() });
  } catch (error: any) {
    console.error(">>> [AI] Catch Error:", error);
    
    let statusCode = 500;
    if (typeof error.status === 'number') {
      statusCode = error.status;
    } else if (error.status && typeof error.status === 'string') {
      statusCode = 500;
    }

    res.status(statusCode).json({ 
      error: error.message || "Unexpected error during AI generation",
      details: error.toString()
    });
  }
}
