import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V1')) process.exit(0);

s = s.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport mammoth from 'mammoth';\nimport * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';\n\n/* PB162_IMPORT_SURAT_PATCH_V1 */");
s = s.replace("  const [isDownloading, setIsDownloading] = useState<'pdf' | 'png' | 'jpg' | null>(null);", "  const [isDownloading, setIsDownloading] = useState<'pdf' | 'png' | 'jpg' | null>(null);\n  const importSuratInputRef = useRef<HTMLInputElement>(null);\n  const [isImportingSurat, setIsImportingSurat] = useState(false);");

const marker = "  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {";
const handler = `  const parseImportedLetterText = (text: string, fileName: string) => {
    const clean = text.replace(/\\u00a0/g, ' ').replace(/\\r/g, '').trim();
    const lines = clean.split('\\n').map(v => v.trim()).filter(Boolean);
    const findValue = (patterns: RegExp[]) => {
      for (const line of lines) for (const p of patterns) {
        const m = line.match(p); if (m?.[1]) return m[1].trim();
      }
      return '';
    };
    const nomor = findValue([/^(?:Nomor|No\\.?)[\\s:.-]+(.+)$/i]);
    const lampiran = findValue([/^Lampiran[\\s:.-]+(.+)$/i]) || '-';
    const perihal = findValue([/^Perihal[\\s:.-]+(.+)$/i]);
    const tujuan = findValue([/^(?:Kepada Yth\\.?|Yth\\.?)[\\s:.-]+(.+)$/i]);
    const tanggal = findValue([/^(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)?[, ]*([0-9]{1,2}\\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\\s+20[0-9]{2})$/i, /(?:tanggal|tgl)[\\s:.-]+(.+)$/i]);
    const knownHeader = lines.findIndex(l => /^(?:Nomor|No\\.?|Lampiran|Perihal)\\b/i.test(l));
    const bodyLines = lines.slice(Math.max(0, knownHeader + 1)).filter(l => !/^(?:Nomor|No\\.?|Lampiran|Perihal|Kepada Yth\\.?|Yth\\.?)\\b/i.test(l));
    const body = bodyLines.join('\\n\\n').trim();
    const importedDate = tanggal ? (tanggal.includes(',') ? tanggal : \`Parepare, \${tanggal}\`) : \`Parepare, \${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\`;
    const safeName = fileName.replace(/\\.[^.]+$/, '');
    const iso = getSafeIsoDate('', importedDate);
    return { nomor_surat: nomor, lampiran, perihal: perihal || safeName, tempat_tanggal: importedDate, tujuan_yth: tujuan, isi_surat: body || clean, created_at: iso ? new Date(iso + 'T12:00:00.000Z').toISOString() : new Date().toISOString() };
  };

  const handleImportSuratFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setIsImportingSurat(true);
    try {
      let text = ''; const lower = file.name.toLowerCase();
      if (lower.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); text = result.value || '';
      } else if (lower.endsWith('.pdf')) {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
        const pages: string[] = [];
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) { const page = await pdf.getPage(pageNo); const content = await page.getTextContent(); pages.push(content.items.map((item: any) => item.str || '').join(' ')); }
        text = pages.join('\\n\\n');
      } else if (lower.endsWith('.txt')) text = await file.text();
      else throw new Error('Format belum didukung. Gunakan .DOCX, .PDF, atau .TXT.');
      if (!text.trim()) throw new Error('Teks surat tidak berhasil dibaca. PDF hasil scan/foto membutuhkan OCR.');
      const imported = parseImportedLetterText(text, file.name);
      const storedAssets = getStoredDigitalAssets();
      setEditId(null); setIsPreviewOnly(false); setActiveModalTab('form');
      setFormData(prev => ({ ...prev, ...imported, nomor_surat: imported.nomor_surat || generateNextNomorSurat(suratList), logo_url: prev.logo_url || storedAssets.logo_url || DEFAULT_LOGO_URL, ttd_ketua_url: prev.ttd_ketua_url || storedAssets.ttd_ketua_url, ttd_sekretaris_url: prev.ttd_sekretaris_url || storedAssets.ttd_sekretaris_url, cap_stempel_url: prev.cap_stempel_url || storedAssets.cap_stempel_url }));
      isInitialModalLoadRef.current = true; setIsModalOpen(true);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Surat berhasil di-import', text: 'Isi dokumen sudah masuk ke formulir. Periksa lalu simpan ke arsip.', showConfirmButton: false, timer: 2800 });
    } catch (err: any) {
      Swal.fire({ title: 'Import Surat Gagal', text: err?.message || 'File tidak dapat diproses.', icon: 'error', confirmButtonColor: '#2563eb' });
    } finally { setIsImportingSurat(false); }
  };

`;
if (!s.includes(marker)) throw new Error('Import handler marker not found');
s = s.replace(marker, handler + marker);

const buttonMarker = "        <div className=\"relative z-10 flex items-center gap-2 shrink-0\">";
const button = `        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {activeTab === 'keluar' && (
            <>
              <input ref={importSuratInputRef} type="file" accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleImportSuratFile} />
              <button type="button" onClick={() => importSuratInputRef.current?.click()} disabled={isImportingSurat} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 shrink-0 shadow-lg cursor-pointer text-white bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 disabled:opacity-60" title="Import surat dari Word/PDF">
                {isImportingSurat ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}<span>{isImportingSurat ? 'Import...' : 'Import Surat'}</span>
              </button>
            </>
          )}
`;
if (!s.includes(buttonMarker)) throw new Error('Header button marker not found');
s = s.replace(buttonMarker, button);
fs.writeFileSync(path, s);
