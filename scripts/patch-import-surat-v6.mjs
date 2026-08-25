import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V6')) process.exit(0);

const marker = '/* PB162_IMPORT_SURAT_PATCH_V6 */';
if (!s.includes('/* PB162_IMPORT_SURAT_PATCH_V5 */')) {
  throw new Error('V5 import patch marker not found');
}
s = s.replace('/* PB162_IMPORT_SURAT_PATCH_V5 */', '/* PB162_IMPORT_SURAT_PATCH_V5 */\n' + marker);

// Detect the Perihal/Hal belonging to each source page. When a page does not repeat
// the label, inherit the previous page's subject. A real subject change is preserved.
const helperAnchor = '  const handleImportSuratFile';
const helper = String.raw`  const extractImportedPerihal = (pageText: string, fallback = '') => {
    const lines = String(pageText || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(?:Perihal|Hal)\s*[:.-]?\s*(.*)$/i);
      if (!match) continue;
      let value = (match[1] || '').trim();
      if (!value && lines[i + 1] && !/^(?:Nomor|No\.?|Lampiran|Kepada|Yth\.?)\s*[:.-]?/i.test(lines[i + 1])) {
        value = lines[i + 1].trim();
      }
      if (value) return value;
    }
    return fallback || '';
  };

  const buildImportedPageMeta = (pages: string[], fallbackPerihal = '') => {
    let activePerihal = fallbackPerihal.trim();
    const meta: Array<{ page: number; perihal: string; perihalKey: string; startsNewPerihal: boolean }> = [];

    pages.forEach((pageText, index) => {
      const detected = extractImportedPerihal(pageText, activePerihal);
      const nextPerihal = detected || activePerihal || `Dokumen halaman ${index + 1}`;
      const key = nextPerihal.toLowerCase().replace(/\s+/g, ' ').trim();
      const previousKey = meta.length ? meta[meta.length - 1].perihalKey : '';
      const changed = index > 0 && !!key && !!previousKey && key !== previousKey;
      activePerihal = nextPerihal;
      meta.push({
        page: index + 1,
        perihal: nextPerihal,
        perihalKey: key,
        startsNewPerihal: changed
      });
    });

    return meta;
  };

`;
if (!s.includes(helperAnchor)) throw new Error('V6 import handler anchor not found');
s = s.replace(helperAnchor, helper + helperAnchor);

// Persist page-level Perihal metadata and a compact list of subject transitions.
const oldPersist = "      import_page_texts: importedPages.map((page) => page || ''),";
const newPersist = String.raw`      import_page_texts: importedPages.map((page) => page || ''),
      import_page_meta: buildImportedPageMeta(importedPages, rawPayload.perihal || ''),
      import_perihal_groups: (() => {
        const meta = buildImportedPageMeta(importedPages, rawPayload.perihal || '');
        return meta.filter((item, index) => index === 0 || item.perihalKey !== meta[index - 1].perihalKey)
          .map((item) => ({ page: item.page, perihal: item.perihal }));
      })(),`;
if (!s.includes(oldPersist)) throw new Error('V6 import page persistence anchor not found');
s = s.replace(oldPersist, newPersist);

const oldMetaPersist = "      import_structure_version: rawPayload.import_structure_version || ''";
const newMetaPersist = "      import_structure_version: rawPayload.import_structure_version || '',\n      import_page_meta: Array.isArray(rawPayload.import_page_meta) ? rawPayload.import_page_meta : [],\n      import_perihal_groups: Array.isArray(rawPayload.import_perihal_groups) ? rawPayload.import_perihal_groups : []";
if (!s.includes(oldMetaPersist)) throw new Error('V6 saved metadata anchor not found');
s = s.replace(oldMetaPersist, newMetaPersist);

// Use the detected Perihal on page 1 when available.
s = s.replace(
  '<p>Perihal : <strong>{formData.perihal}</strong></p>',
  '<p>Perihal : <strong>{formData.import_page_meta?.[0]?.perihal || formData.perihal}</strong></p>'
);

// Continuation pages get their own Perihal. When it changes, make the transition
// explicit instead of presenting it as a continuation of the previous subject.
s = s.replace(
  '<p className="font-bold">Lanjutan Surat</p>\n                            <p>Nomor : {formData.nomor_surat}</p>\n                            <p>Perihal : <strong>{formData.perihal}</strong></p>',
  String.raw`<p className="font-bold">{formData.import_page_meta?.[pageIndex + 1]?.startsNewPerihal ? 'Surat / Bagian Baru' : 'Lanjutan Surat'}</p>
                            <p>Nomor : {formData.nomor_surat}</p>
                            <p>Perihal : <strong>{formData.import_page_meta?.[pageIndex + 1]?.perihal || formData.perihal}</strong></p>`
);

// Saved records created before V6 still receive page-level metadata on render.
const oldContinuationCondition = "Array.isArray(formData.import_page_texts) && formData.import_page_texts.length > 1";
const newContinuationCondition = "Array.isArray(formData.import_page_texts) && formData.import_page_texts.length > 1";
// Keep the condition unchanged; this replacement is intentionally a no-op guard for clarity.
s = s.replace(oldContinuationCondition, newContinuationCondition);

// Make a Perihal change a hard visual boundary. The source page already becomes an
// A4 page; this adds a stronger divider before the first page of a new subject.
s = s.replace(
  '                          <div className="mb-5 text-black">\n                            <p className="font-bold">{formData.import_page_meta?.[pageIndex + 1]?.startsNewPerihal ? \'Surat / Bagian Baru\' : \'Lanjutan Surat\'}</p>',
  '                          <div className={"mb-5 text-black " + (formData.import_page_meta?.[pageIndex + 1]?.startsNewPerihal ? "border-t-4 border-black pt-5" : "")}>\n                            <p className="font-bold">{formData.import_page_meta?.[pageIndex + 1]?.startsNewPerihal ? \'Surat / Bagian Baru\' : \'Lanjutan Surat\'}</p>'
);

fs.writeFileSync(path, s);
console.log('[patch-import-surat-v6] automatic Perihal-aware page boundaries enabled');
