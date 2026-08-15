import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/KelolaSurat.tsx');
const source = fs.readFileSync(file, 'utf8');

const oldBlock = `    // Timeout guard so function returns targetId smoothly\n    const quickTimeout = new Promise(resolve => setTimeout(resolve, 300));\n    await Promise.race([syncPromise, quickTimeout]);\n\n    return resultId || targetId;`;

const newBlock = `    // Persistence is authoritative: wait for every database/API write to finish.\n    // The previous 300ms race could return before Supabase had committed the record.\n    let persistenceTimer;\n    try {\n      await Promise.race([\n        syncPromise,\n        new Promise((_, reject) => {\n          persistenceTimer = setTimeout(() => reject(new Error('Penyimpanan surat ke database timeout setelah 15 detik.')), 15000);\n        })\n      ]);\n    } finally {\n      if (persistenceTimer) clearTimeout(persistenceTimer);\n    }\n\n    // Read back the saved record so the UI never reports a false permanent save.\n    if (!dbPayload.nomor_surat) {\n      throw new Error('Nomor surat wajib tersedia untuk verifikasi penyimpanan.');\n    }\n\n    const { data: verifiedRows, error: verifyError } = await supabase\n      .from('arsip_surat')\n      .select('id, nomor_surat, jenis_surat, perihal, isi_surat, created_at, updated_at')\n      .eq('nomor_surat', dbPayload.nomor_surat)\n      .order('created_at', { ascending: false })\n      .limit(1);\n\n    if (verifyError) {\n      throw new Error(\`Verifikasi penyimpanan surat gagal: \${verifyError.message}\`);\n    }\n\n    const verified = verifiedRows?.[0];\n    if (!verified) {\n      throw new Error('Surat belum ditemukan di database setelah proses penyimpanan.');\n    }\n\n    if (dbPayload.perihal && verified.perihal !== dbPayload.perihal) {\n      throw new Error('Verifikasi gagal: data perihal surat di database belum sesuai.');\n    }\n\n    if (dbPayload.isi_surat && verified.isi_surat !== dbPayload.isi_surat) {\n      throw new Error('Verifikasi gagal: isi surat di database belum sesuai.');\n    }\n\n    resultId = verified.id || resultId;\n    return resultId || targetId;`;

if (!source.includes(oldBlock)) {
  if (source.includes('Persistence is authoritative: wait for every database/API write to finish.')) {
    console.log('[KelolaSurat] Persistence patch already applied.');
    process.exit(0);
  }
  throw new Error('Target persistence block was not found; source was not modified.');
}

fs.writeFileSync(file, source.replace(oldBlock, newBlock), 'utf8');
console.log('[KelolaSurat] Applied authoritative Supabase save + read-back verification patch.');
