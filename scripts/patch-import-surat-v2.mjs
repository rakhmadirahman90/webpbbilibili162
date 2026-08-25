import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V2')) process.exit(0);

const marker = '/* PB162_IMPORT_SURAT_PATCH_V2 */';
s = s.replace('/* PB162_IMPORT_SURAT_PATCH_V1 */', '/* PB162_IMPORT_SURAT_PATCH_V1 */\n' + marker);

const oldParser = /  const parseImportedLetterText = \(text: string, fileName: string\) => \{[\s\S]*?\n  \};\n\n  const handleImportSuratFile/;
const newParser = String.raw`  const normalizeImportedParagraphs = (raw: string) => {
    return raw
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .split(/\n\s*\n+/)
      .map((p) => p
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ')
        .trim()
      )
      .filter((p) => p.length > 0);
  };

  const parsePdfPagesToStructuredText = async (file: File) => {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
    const pages: string[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const rows: Array<{ y: number; x: number; text: string }> = [];
      for (const item of content.items as any[]) {
        const text = String(item.str || '').trim();
        if (!text) continue;
        const x = Number(item.transform?.[4] || 0);
        const y = Number(item.transform?.[5] || 0);
        const existing = rows.find((r) => Math.abs(r.y - y) <= 2.5);
        if (existing) {
          existing.text = [existing.text, text].join(' ').replace(/\s+/g, ' ').trim();
          existing.x = Math.min(existing.x, x);
        } else {
          rows.push({ y, x, text });
        }
      }
      rows.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines: string[] = [];
      let previousY: number | null = null;
      for (const row of rows) {
        if (previousY !== null && Math.abs(previousY - row.y) > 18) lines.push('');
        lines.push(row.text);
        previousY = row.y;
      }
      pages.push(lines.join('\n').trim());
    }
    return { pages, pageCount: pdf.numPages };
  };

  const parseImportedLetterText = (text: string, fileName: string, importedPages: string[] = []) => {
    const clean = text.replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
    const rawLines = clean.split('\n').map((v) => v.trim()).filter(Boolean);
    const findValue = (patterns: RegExp[]) => {
      for (const line of rawLines) {
        for (const p of patterns) {
          const m = line.match(p);
          if (m?.[1]) return m[1].trim();
        }
      }
      return '';
    };

    const nomor = findValue([/^(?:Nomor|No\.?)\s*[:.-]\s*(.+)$/i]);
    const lampiran = findValue([/^Lampiran\s*[:.-]\s*(.+)$/i]) || '-';
    const perihal = findValue([/^Perihal\s*[:.-]\s*(.+)$/i]);
    const tujuan = findValue([/^(?:Kepada Yth\.?|Yth\.?)\s*[:.-]?\s*(.+)$/i]);
    const tanggal = findValue([
      /^(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)?[, ]*([0-9]{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+20[0-9]{2})$/i,
      /^(?:tanggal|tgl)\s*[:.-]\s*(.+)$/i
    ]);

    const withoutHeader = rawLines.filter((line) => {
      if (/^(?:Nomor|No\.?|Lampiran|Perihal)\s*[:.-]/i.test(line)) return false;
      if (/^(?:Kepada Yth\.?|Yth\.?)\s*[:.-]?/i.test(line)) return false;
      if (/^(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)?[, ]*[0-9]{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+20[0-9]{2}$/i.test(line)) return false;
      if (/^(?:di|di-)\s+tempat$/i.test(line)) return false;
      return true;
    });

    const bodyRaw = withoutHeader
      .filter((line) => !/^Assalamu['’]?alaikum/i.test(line) && !/^Dengan hormat[,.]?$/i.test(line))
      .join('\n');
    const paragraphs = normalizeImportedParagraphs(bodyRaw);
    const safeName = fileName.replace(/\.[^.]+$/, '');
    const importedDate = tanggal
      ? (tanggal.includes(',') ? tanggal : 'Parepare, ' + tanggal)
      : 'Parepare, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const iso = getSafeIsoDate('', importedDate);

    const pageCount = Math.max(1, importedPages.length || 1);
    const pageBreaks = importedPages.length > 1
      ? importedPages.map((page, index) => ({ page: index + 1, textLength: page.length }))
      : [];

    return {
      nomor_surat: nomor,
      lampiran,
      perihal: perihal || safeName,
      tempat_tanggal: importedDate,
      tujuan_yth: tujuan,
      isi_surat: paragraphs.join('\n\n'),
      isi_ringkas: paragraphs[0] || '',
      paragraf_2: paragraphs[1] || '',
      paragraf_3: paragraphs[2] || '',
      import_page_count: pageCount,
      import_page_breaks: pageBreaks,
      import_source_format: fileName.toLowerCase().split('.').pop() || '',
      created_at: iso ? new Date(iso + 'T12:00:00.000Z').toISOString() : new Date().toISOString()
    };
  };

  const handleImportSuratFile`;
if (!oldParser.test(s)) throw new Error('Import parser V1 block not found');
s = s.replace(oldParser, newParser);

const oldBranch = /      if \(lower\.endsWith\('\.docx'\)\) \{[\s\S]*?      \} else if \(lower\.endsWith\('\.txt'\)\) text = await file\.text\(\);/;
const newBranch = String.raw`      let importedPages: string[] = [];
      if (lower.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value || '';
        importedPages = [text];
      } else if (lower.endsWith('.pdf')) {
        const structured = await parsePdfPagesToStructuredText(file);
        importedPages = structured.pages;
        text = structured.pages.join('\n\n');
      } else if (lower.endsWith('.txt')) {
        text = await file.text();
        importedPages = [text];
      }`;
if (!oldBranch.test(s)) throw new Error('Import file branch V1 block not found');
s = s.replace(oldBranch, newBranch);

s = s.replace(
  '      const imported = parseImportedLetterText(text, file.name);',
  '      const imported = parseImportedLetterText(text, file.name, importedPages);'
);

const oldPageClass = 'className="bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative overflow-hidden shrink-0 select-text rounded-sm border border-slate-200"';
const newPageClass = 'className={"bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative " + (formData.import_page_count && formData.import_page_count > 1 ? "overflow-visible h-auto" : "overflow-hidden") + " shrink-0 select-text rounded-sm border border-slate-200"}';
if (s.includes(oldPageClass)) s = s.replace(oldPageClass, newPageClass);

s = s.replace('{formData.include_lampiran_peserta && (', '{(formData.include_lampiran_peserta || (formData.import_page_count && formData.import_page_count > 1)) && (');
s = s.replace('Halaman 1 dari 2 (Surat Utama - A4)', '{formData.import_page_count && formData.import_page_count > 1 ? "Dokumen Import: " + formData.import_page_count + " Halaman" : "Halaman 1 dari 2 (Surat Utama - A4)"}');

fs.writeFileSync(path, s);
console.log('[patch-import-surat-v2] structured paragraphs and source page metadata enabled');
