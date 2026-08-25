import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V3')) process.exit(0);

const marker = '/* PB162_IMPORT_SURAT_PATCH_V3 */';
s = s.replace('/* PB162_IMPORT_SURAT_PATCH_V2 */', '/* PB162_IMPORT_SURAT_PATCH_V2 */\n' + marker);

const oldBlock = /  const normalizeImportedParagraphs = \(raw: string\) => \{[\s\S]*?\n  const handleImportSuratFile/;
const newBlock = String.raw`  const normalizeImportedParagraphs = (raw: string) => {
    const source = raw
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim();

    const blocks = source
      .split(/\n\s*\n+/)
      .map((block) => block
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([([{])\s+/g, '$1')
        .replace(/\s+([)\]}])/g, '$1')
        .trim()
      )
      .filter((block) => block.length > 0);

    return blocks;
  };

  const parsePdfPagesToStructuredText = async (file: File) => {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
    const pages: string[] = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const rows: Array<{ y: number; x: number; text: string }> = [];

      for (const item of content.items as any[]) {
        const text = String(item.str || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const x = Number(item.transform?.[4] || 0);
        const y = Number(item.transform?.[5] || 0);
        const existing = rows.find((row) => Math.abs(row.y - y) <= 2.5);
        if (existing) {
          existing.text = [existing.text, text].join(' ').replace(/\s+/g, ' ').trim();
          existing.x = Math.min(existing.x, x);
        } else {
          rows.push({ y, x, text });
        }
      }

      rows.sort((a, b) => b.y - a.y || a.x - b.x);
      const gaps = rows.slice(1).map((row, index) => Math.abs(rows[index].y - row.y)).filter((gap) => gap > 0 && gap < 100);
      const sortedGaps = [...gaps].sort((a, b) => a - b);
      const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 12;
      const paragraphGap = Math.max(18, medianGap * 1.85);

      const lines: string[] = [];
      let previousY: number | null = null;
      for (const row of rows) {
        if (previousY !== null && Math.abs(previousY - row.y) >= paragraphGap) lines.push('');
        lines.push(row.text);
        previousY = row.y;
      }
      pages.push(lines.join('\n').trim());
    }

    return { pages, pageCount: pdf.numPages };
  };

  const parseImportedLetterText = (text: string, fileName: string, importedPages: string[] = []) => {
    const clean = text.replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
    const rawLines = clean.split('\n').map((line) => line.trim()).filter(Boolean);
    const labelPatterns = {
      nomor: /^(?:Nomor|No\.?|Nomor Surat)\s*[:.-]?\s*(.*)$/i,
      lampiran: /^Lampiran\s*[:.-]?\s*(.*)$/i,
      perihal: /^(?:Perihal|Hal)\s*[:.-]?\s*(.*)$/i,
      tujuan: /^(?:Kepada(?: Yth\.?)?|Yth\.?)\s*[:.-]?\s*(.*)$/i,
      date: /^(?:tempat[ ,]*)?(?:tanggal|tgl)?\s*[:.-]?\s*(.*)$/i
    };

    const readLabeledValue = (pattern: RegExp, labelsToStop: RegExp[] = []) => {
      for (let i = 0; i < rawLines.length; i++) {
        const match = rawLines[i].match(pattern);
        if (!match) continue;
        const parts: string[] = [];
        if (match[1]?.trim()) parts.push(match[1].trim());
        for (let j = i + 1; j < rawLines.length && j < i + 4; j++) {
          const next = rawLines[j];
          if (!next || labelsToStop.some((stop) => stop.test(next))) break;
          if (/^(?:Assalamu['’]?alaikum|Dengan hormat|di\s*[-–]?\s*tempat)$/i.test(next)) break;
          if (/^(?:Nomor|No\.?|Lampiran|Perihal|Hal|Kepada|Yth\.?)\b/i.test(next)) break;
          if (parts.length > 0 && /^(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)\s*,?\s*\d{1,2}\s+/i.test(next)) break;
          if (parts.length === 0 || next.length < 120) parts.push(next);
          else break;
        }
        return parts.join(' ').trim();
      }
      return '';
    };

    const nomor = readLabeledValue(labelPatterns.nomor);
    const lampiran = readLabeledValue(labelPatterns.lampiran) || '-';
    const perihal = readLabeledValue(labelPatterns.perihal);
    const tujuan = readLabeledValue(labelPatterns.tujuan);

    const dateRegex = /^(?:(?:[A-Za-z .-]+),\s*)?(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+20\d{2})$/i;
    const dateLabelRegex = /^(?:Tanggal|Tgl)\s*[:.-]?\s*(.+)$/i;
    let tanggal = '';
    for (const line of rawLines) {
      const dm = line.match(dateRegex) || line.match(dateLabelRegex);
      if (dm?.[1]) { tanggal = dm[1].trim(); break; }
    }

    const greetingIndex = rawLines.findIndex((line) => /^(?:Assalamu['’]?alaikum(?:\s+Warahmatullahi\s+Wabarakatuh)?|Dengan hormat[,.]?)$/i.test(line));
    const bodyStartIndex = greetingIndex >= 0 ? greetingIndex + 1 : Math.max(0, rawLines.findIndex((line) => /^Perihal\s*[:.-]/i.test(line)) + 1);

    const excluded = (line: string) => {
      if (/^(?:Nomor|No\.?|Nomor Surat|Lampiran|Perihal|Hal)\s*[:.-]?/i.test(line)) return true;
      if (/^(?:Kepada(?: Yth\.?)?|Yth\.?)\s*[:.-]?/i.test(line)) return true;
      if (/^(?:di|di-)\s+tempat$/i.test(line)) return true;
      if (dateRegex.test(line) || dateLabelRegex.test(line)) return true;
      return false;
    };

    let bodyLines = rawLines.slice(bodyStartIndex).filter((line) => !excluded(line));
    bodyLines = bodyLines.filter((line, index) => {
      if (index === 0 && /^(?:Assalamu['’]?alaikum|Dengan hormat)/i.test(line)) return false;
      return true;
    });

    const bodyRaw = bodyLines.join('\n');
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
      import_paragraph_count: paragraphs.length,
      import_structure_version: 'v3-intelligent-paragraphs',
      created_at: iso ? new Date(iso + 'T12:00:00.000Z').toISOString() : new Date().toISOString()
    };
  };

  const handleImportSuratFile`;
if (!oldBlock.test(s)) throw new Error('Import parser V2 block not found');
s = s.replace(oldBlock, newBlock);

fs.writeFileSync(path, s);
console.log('[patch-import-surat-v3] intelligent paragraph reconstruction enabled');
