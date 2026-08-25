import fs from 'node:fs';

const path = 'src/components/KelolaSurat.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('PB162_IMPORT_SURAT_PATCH_V5')) process.exit(0);

const marker = '/* PB162_IMPORT_SURAT_PATCH_V5 */';
s = s.replace('/* PB162_IMPORT_SURAT_PATCH_V4 */', '/* PB162_IMPORT_SURAT_PATCH_V4 */\n' + marker);

s = s.replace(
  "      import_page_breaks: importedPages.length > 1 ? importedPages.map((page, index) => ({ page: index + 1, textLength: page.length })) : [],",
  "      import_page_breaks: importedPages.length > 1 ? importedPages.map((page, index) => ({ page: index + 1, textLength: page.length })) : [],\n      import_page_texts: importedPages.map((page) => page || ''),"
);

s = s.replace(
  "      updated_at: new Date().toISOString()\n    };",
  "      updated_at: new Date().toISOString(),\n      import_page_count: Number(rawPayload.import_page_count || 0),\n      import_page_texts: Array.isArray(rawPayload.import_page_texts) ? rawPayload.import_page_texts : [],\n      import_page_breaks: Array.isArray(rawPayload.import_page_breaks) ? rawPayload.import_page_breaks : [],\n      import_structure_version: rawPayload.import_structure_version || ''\n    };"
);

const oldBody = '<p className="whitespace-pre-line leading-[1.65]">{formData.isi_surat}</p>';
const newBody = `{(Array.isArray(formData.import_page_texts) && formData.import_page_texts.length > 0) ? (\n                              <div className="space-y-4 leading-[1.65]">\n                                {normalizeImportedParagraphs(formData.import_page_texts[0] || formData.isi_surat || '').map((paragraph: string, index: number) => (\n                                  <p key={index} className="text-justify">{paragraph}</p>\n                                ))}\n                              </div>\n                            ) : (\n                              <div className="space-y-4 leading-[1.65]">\n                                {(formData.isi_surat || '').split(/\\n\\s*\\n+/).filter((paragraph: string) => paragraph.trim()).map((paragraph: string, index: number) => (\n                                  <p key={index} className="text-justify whitespace-pre-line">{paragraph.trim()}</p>\n                                ))}\n                              </div>\n                            )}`;
if (!s.includes(oldBody)) throw new Error('V5 first-page body marker not found');
s = s.replace(oldBody, newBody);

const continuationMarker = '                      {/* === HALAMAN 2: LAMPIRAN PESERTA === */}';
const continuation = String.raw`                      {/* === HALAMAN LANJUTAN DOKUMEN IMPORT === */}
                      {Array.isArray(formData.import_page_texts) && formData.import_page_texts.length > 1 && formData.import_page_texts.slice(1).map((pageText: string, pageIndex: number) => (
                        <div
                          key={pageIndex + 2}
                          data-import-page={pageIndex + 1}
                          className="bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative overflow-hidden shrink-0 select-text rounded-sm border border-slate-200"
                          style={{ textRendering: 'geometricPrecision' }}
                        >
                          <div className="no-print no-export absolute top-2 right-3 text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Halaman {pageIndex + 2} dari {formData.import_page_texts.length} — Dokumen Import
                          </div>
                          <div className="flex items-center border-b-[4px] border-black pb-2 mb-6">
                            <div className="flex-shrink-0 flex items-center justify-center mr-4 w-[110px] h-[80px]">
                              <img src={getValidAssetUrl(formData.logo_url, DEFAULT_LOGO_URL)} alt="Logo PB Bilibili 162" crossOrigin="anonymous" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="text-center flex-1">
                              <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-black">PB BILIBILI 162</h1>
                              <p className="text-[9pt] leading-tight font-sans font-semibold text-black mt-0.5">Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131</p>
                              <p className="text-[9pt] font-sans font-semibold text-black">Telepon: 081219027234 | Email: pbilibili162@gmail.com</p>
                            </div>
                          </div>
                          <div className="mb-5 text-black">
                            <p className="font-bold">Lanjutan Surat</p>
                            <p>Nomor : {formData.nomor_surat}</p>
                            <p>Perihal : <strong>{formData.perihal}</strong></p>
                          </div>
                          <div className="space-y-4 leading-[1.65] text-justify text-black">
                            {normalizeImportedParagraphs(pageText || '').map((paragraph: string, paragraphIndex: number) => (
                              <p key={paragraphIndex}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      ))}

`;
if (!s.includes(continuationMarker)) throw new Error('V5 continuation insertion marker not found');
s = s.replace(continuationMarker, continuation + continuationMarker);

s = s.replace(
  '                        ref={page1Ref} \n                        onClick={() => setSelectedAsset(null)}',
  '                        ref={page1Ref} \n                        data-import-page="0"\n                        onClick={() => setSelectedAsset(null)}'
);

s = s.replace(
  'Halaman 1 dari 2 (Surat Utama - A4)',
  '{formData.import_page_count && formData.import_page_count > 1 ? `Halaman 1 dari ${formData.import_page_count} — Dokumen Import` : "Halaman 1 dari 2 (Surat Utama - A4)"}'
);

const oldPdfBranch = /      if \(formData\.include_lampiran_peserta && page1Ref\.current && page2Ref\.current\) \{[\s\S]*?      \} else \{\n        \/\/ Surat 1 Halaman Standar/;
const newPdfBranch = String.raw`      const importedPageElements = Array.from(document.querySelectorAll<HTMLElement>('[data-import-page]'));
      if (formData.import_page_count && formData.import_page_count > 1 && importedPageElements.length === formData.import_page_count) {
        for (let i = 0; i < importedPageElements.length; i++) {
          const canvas = await getCanvasFromElement(importedPageElements[i]);
          const img = canvas.toDataURL('image/png', 1.0);
          if (i > 0) pdf.addPage();
          pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pageHeight);
        }
      } else if (formData.include_lampiran_peserta && page1Ref.current && page2Ref.current) {
        const canvas1 = await getCanvasFromElement(page1Ref.current);
        const img1 = canvas1.toDataURL('image/png', 1.0);
        pdf.addImage(img1, 'PNG', 0, 0, pdfWidth, pageHeight);
        const canvas2 = await getCanvasFromElement(page2Ref.current);
        const img2 = canvas2.toDataURL('image/png', 1.0);
        pdf.addPage();
        pdf.addImage(img2, 'PNG', 0, 0, pdfWidth, pageHeight);
      } else {
        // Surat 1 Halaman Standar`;
if (!oldPdfBranch.test(s)) throw new Error('V5 PDF branch not found');
s = s.replace(oldPdfBranch, newPdfBranch);

fs.writeFileSync(path, s);
console.log('[patch-import-surat-v5] exact imported page count + continuation A4 pages enabled');
