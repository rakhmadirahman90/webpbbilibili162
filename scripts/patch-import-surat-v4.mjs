import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V4')) process.exit(0);

const marker = '/* PB162_IMPORT_SURAT_PATCH_V4 */';
s = s.replace('/* PB162_IMPORT_SURAT_PATCH_V3 */', '/* PB162_IMPORT_SURAT_PATCH_V3 */\n' + marker);

const oldParser = /  const normalizeImportedParagraphs = \(raw: string\) => \{[\s\S]*?\n  const handleImportSuratFile/;
const newParser = String.raw`  const normalizeImportedParagraphs = (raw: string) => {
    const normalized = raw
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim();

    const paragraphs: string[] = [];
    let current: string[] = [];
    const flush = () => {
      const value = current.join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([([{])\s+/g, '$1')
        .replace(/\s+([)\]}])/g, '$1')
        .trim();
      if (value) paragraphs.push(value);
      current = [];
    };

    for (const rawLine of normalized.split('\n')) {
      const line = rawLine.trim();
      if (!line) {
        flush();
        continue;
      }
      current.push(line);
    }
    flush();
    return paragraphs;
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
      const gaps = rows.slice(1)
        .map((row, index) => Math.abs(rows[index].y - row.y))
        .filter((gap) => gap > 0 && gap < 100);
      const sortedGaps = [...gaps].sort((a, b) => a - b);
      const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 12;
      const paragraphGap = Math.max(18, medianGap * 1.8);

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
    const rawLines = clean.split('\n').map((line) => line.trim());
    const nonEmptyLines = rawLines.filter(Boolean);

    const isLabel = (line: string) => /^(?:Nomor|No\.?|Nomor Surat|Lampiran|Perihal|Hal|Kepada|Yth\.?)\s*[:.-]?/i.test(line);
    const isDate = (line: string) => /^(?:(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)\s*,?\s*)?\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+20\d{2}$/i.test(line);
    const isGreeting = (line: string) => /^(?:Assalamu['’]?alaikum(?:\s+Warahmatullahi\s+Wabarakatuh)?[,.]?|Dengan hormat[,.]?)$/i.test(line);

    const readField = (patterns: RegExp[]) => {
      for (let i = 0; i < nonEmptyLines.length; i++) {
        for (const pattern of patterns) {
          const match = nonEmptyLines[i].match(pattern);
          if (!match) continue;
          return match[1]?.trim() || '';
        }
      }
      return '';
    };

    const nomor = readField([/^(?:Nomor|No\.?|Nomor Surat)\s*[:.-]\s*(.+)$/i]);
    const lampiran = readField([/^Lampiran\s*[:.-]\s*(.+)$/i]) || '-';
    const perihal = readField([/^(?:Perihal|Hal)\s*[:.-]\s*(.+)$/i]);

    // Read the complete recipient block, not only the first line after "Kepada Yth.".
    const recipientLines: string[] = [];
    const recipientStart = rawLines.findIndex((line) => /^(?:Kepada(?:\s+Yth\.?)?|Yth\.?)\s*[:.-]?\s*$/i.test(line) || /^(?:Kepada(?:\s+Yth\.?)?|Yth\.?)\s*[:.-]\s*(.+)$/i.test(line));
    if (recipientStart >= 0) {
      const first = rawLines[recipientStart].match(/^(?:Kepada(?:\s+Yth\.?)?|Yth\.?)\s*[:.-]?\s*(.+)$/i);
      if (first?.[1]?.trim()) recipientLines.push(first[1].trim());
      for (let i = recipientStart + 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) {
          if (recipientLines.length) break;
          continue;
        }
        if (/^(?:di|di-)\s+tempat$/i.test(line)) break;
        if (isGreeting(line)) break;
        if (isDate(line)) break;
        if (/^(?:Nomor|No\.?|Lampiran|Perihal|Hal)\s*[:.-]/i.test(line)) break;
        recipientLines.push(line);
      }
    }

    const tujuan = recipientLines.join('\n').trim();

    let importedDate = '';
    for (const line of nonEmptyLines) {
      const match = line.match(/^(?:(?:Parepare|Makassar|Pinrang|Sidrap|Barru|Pangkep|Maros|Gowa|Soppeng|Wajo|Bone|Enrekang|Palopo)\s*,?\s*)?(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+20\d{2})$/i);
      const labelMatch = line.match(/^(?:Tanggal|Tgl)\s*[:.-]\s*(.+)$/i);
      if (match?.[1]) { importedDate = line; break; }
      if (labelMatch?.[1]) { importedDate = labelMatch[1].trim(); break; }
    }
    if (!importedDate) importedDate = 'Parepare, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    else if (!importedDate.includes(',')) importedDate = 'Parepare, ' + importedDate;

    // Body starts after the greeting when available. This keeps the complete recipient block out of the body.
    let bodyStart = -1;
    const formalIndex = rawLines.findIndex((line) => /^Dengan hormat[,.]?$/i.test(line));
    const salamIndex = rawLines.findIndex((line) => /^Assalamu['’]?alaikum/i.test(line));
    if (formalIndex >= 0) bodyStart = formalIndex + 1;
    else if (salamIndex >= 0) bodyStart = salamIndex + 1;
    else {
      const recipientEnd = recipientStart >= 0 ? rawLines.findIndex((line, idx) => idx > recipientStart && /^(?:di|di-)\s+tempat$/i.test(line)) : -1;
      bodyStart = recipientEnd >= 0 ? recipientEnd + 1 : 0;
    }

    const bodyLines: string[] = [];
    for (let i = Math.max(0, bodyStart); i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (isDate(line) && i < bodyStart + 3) continue;
      if (/^(?:di|di-)\s+tempat$/i.test(line) && i < bodyStart + 3) continue;
      if (!line && bodyLines.length && bodyLines[bodyLines.length - 1] !== '') bodyLines.push('');
      else if (line) bodyLines.push(line);
    }

    const paragraphs = normalizeImportedParagraphs(bodyLines.join('\n'));
    const safeName = fileName.replace(/\.[^.]+$/, '');
    const iso = getSafeIsoDate('', importedDate);
    const pageCount = Math.max(1, importedPages.length || 1);

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
      import_page_breaks: importedPages.length > 1 ? importedPages.map((page, index) => ({ page: index + 1, textLength: page.length })) : [],
      import_source_format: fileName.toLowerCase().split('.').pop() || '',
      import_paragraph_count: paragraphs.length,
      import_structure_version: 'v4-complete-structure',
      created_at: iso ? new Date(iso + 'T12:00:00.000Z').toISOString() : new Date().toISOString()
    };
  };

  const handleImportSuratFile`;
if (!oldParser.test(s)) throw new Error('Import parser block not found for V4');
s = s.replace(oldParser, newParser);

const oldRecipient = /\{formData\.show_recipient && \([\s\S]*?\n\s*\)\}/;
const newRecipient = String.raw`{formData.show_recipient && (
                          <div className="mb-6 text-black space-y-0.5">
                              <p>Kepada Yth.</p>
                              {(formData.tujuan_yth || '').split(/\n+/).map((line: string, index: number) => (
                                <p key={index} className={index === 0 ? 'font-bold' : ''}>{line}</p>
                              ))}
                              {formData.jabatan_tujuan && <p>{formData.jabatan_tujuan}</p>}
                              <p>Di - Tempat</p>
                          </div>
                        )}`;
if (!oldRecipient.test(s)) throw new Error('Recipient render block not found for V4');
s = s.replace(oldRecipient, newRecipient);

const oldBody = /\s*<div className="space-y-4 text-justify text-black">[\s\S]*?<\/div>\n\n\s*<div className="mt-12/;
const newBody = String.raw`
                        <div className="space-y-4 text-justify text-black">
                            {formData.show_greetings && (
                              <>
                                <p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
                                <p className="font-bold">Dengan hormat,</p>
                              </>
                            )}
                            <div className="space-y-4 leading-[1.65]">
                              {(formData.isi_surat || '').split(/\n\s*\n+/).filter((paragraph: string) => paragraph.trim()).map((paragraph: string, index: number) => (
                                <p key={index} className="whitespace-pre-line text-justify">{paragraph.trim()}</p>
                              ))}
                            </div>
                        </div>

                        <div className="mt-12`;
if (!oldBody.test(s)) throw new Error('Body render block not found for V4');
s = s.replace(oldBody, newBody);

// Imported documents may legitimately exceed one A4 page. Do not clip their body.
s = s.replace(
  'className="bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative overflow-hidden shrink-0 select-text rounded-sm border border-slate-200"',
  'className={"bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative " + (formData.import_structure_version ? "overflow-visible h-auto" : "overflow-hidden") + " shrink-0 select-text rounded-sm border border-slate-200"}'
);

fs.writeFileSync(path, s);
console.log('[patch-import-surat-v4] complete recipient + paragraph rendering enabled');
