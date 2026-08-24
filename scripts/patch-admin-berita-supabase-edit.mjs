import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/components/AdminBerita.tsx');
const cssPath = path.join(root, 'src/index.css');
let component = fs.readFileSync(componentPath, 'utf8');

const imageHelper = [
  'const parseBeritaImageUrls = (value?: string | null) =>',
  "  (value || '').split(/[\\s,]+/).map(url => url.trim()).filter(Boolean);",
  '',
  'const serializeBeritaImageUrls = (urls: Array<string | undefined | null>) =>',
  "  urls.map(url => (url || '').trim()).filter(Boolean).join('\\n');",
  ''
].join('\n');
if (!component.includes('const parseBeritaImageUrls =')) {
  component = component.replace(
    'export default function AdminBerita({ session }: { session?: any }) {',
    imageHelper + 'export default function AdminBerita({ session }: { session?: any }) {'
  );
}

const mainUpload = [
  '  const uploadProcessedImage = async () => {',
  '    const croppedBlob = await createCroppedImage();',
  '    if (!croppedBlob) {',
  "      setFormError('Area gambar belum siap. Silakan atur crop lalu coba lagi.');",
  '      return;',
  '    }',
  '    setIsUploading(true);',
  '    setFormError(null);',
  '    try {',
  "      const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2, 10);",
  '      const filePath = `berita/${suffix}.jpg`;',
  "      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, croppedBlob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });",
  '      if (uploadError) throw uploadError;',
  "      const { data: publicData } = supabase.storage.from('images').getPublicUrl(filePath);",
  "      if (!publicData?.publicUrl) throw new Error('URL gambar Supabase tidak tersedia.');",
  '      setFormData(prev => ({ ...prev, gambar_url: publicData.publicUrl }));',
  '      setImageToCrop(null);',
  '      setCrop({ x: 0, y: 0 });',
  '      setZoom(1);',
  '    } catch (err: any) {',
  "      setFormError('Gagal menyimpan gambar ke Supabase Storage: ' + (err?.message || 'Unknown error'));",
  '    } finally {',
  '      setIsUploading(false);',
  '    }',
  '  };',
  '',
  '  const uploadDirectFile = async'
].join('\n');
component = component.replace(/  const uploadProcessedImage = async \(\) => \{[\s\S]*?\n  \};\n\n  const uploadDirectFile = async/m, () => mainUpload);

const additionalUpload = [
  "  const uploadDirectFile = async (file: File, field: 'gambar_url_2' | 'gambar_url_3' | 'gambar_url_4' | 'gambar_url_5') => {",
  "    if (!file.type.startsWith('image/')) { setFormError('File harus berupa gambar.'); return; }",
  "    if (file.size > 8 * 1024 * 1024) { setFormError('Ukuran setiap gambar maksimal 8 MB.'); return; }",
  '    setIsUploading(true);',
  '    setFormError(null);',
  '    try {',
  "      const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2, 10);",
  "      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';",
  '      const filePath = `berita/${suffix}.${extension}`;',
  "      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, { contentType: file.type || 'image/jpeg', cacheControl: '31536000', upsert: false });",
  '      if (uploadError) throw uploadError;',
  "      const { data: publicData } = supabase.storage.from('images').getPublicUrl(filePath);",
  "      if (!publicData?.publicUrl) throw new Error('URL gambar Supabase tidak tersedia.');",
  '      setFormData(prev => ({ ...prev, [field]: publicData.publicUrl }));',
  '    } catch (err: any) {',
  "      setFormError('Gagal menyimpan gambar tambahan ke Supabase: ' + (err?.message || 'Unknown error'));",
  '    } finally {',
  '      setIsUploading(false);',
  '    }',
  '  };',
  '',
  '  const handleSubmit'
].join('\n');
component = component.replace(/  const uploadDirectFile = async \(file: File, field: 'gambar_url_2' \| 'gambar_url_3' \| 'gambar_url_4' \| 'gambar_url_5'\) => \{[\s\S]*?\n  \};\n\n  const handleSubmit/m, () => additionalUpload);

const submitBlock = [
  '  const handleSubmit = async (e: React.FormEvent) => {',
  '    e.preventDefault();',
  '    if (isSaving || isUploading) return;',
  '    const imageUrls = [formData.gambar_url, formData.gambar_url_2, formData.gambar_url_3, formData.gambar_url_4, formData.gambar_url_5];',
  "    if (!formData.judul?.trim()) return setFormError('Judul berita wajib diisi.');",
  "    if (!formData.ringkasan?.trim()) return setFormError('Ringkasan berita wajib diisi.');",
  "    if (!imageUrls[0]?.trim()) return setFormError('Wajib upload gambar utama ke Supabase.');",
  '    setIsSaving(true);',
  '    setFormError(null);',
  '    const dbPayload = {',
  '      judul: formData.judul.trim(),',
  '      ringkasan: formData.ringkasan.trim(),',
  "      konten: formData.konten || '',",
  "      kategori: formData.kategori || 'Prestasi',",
  '      gambar_url: serializeBeritaImageUrls(imageUrls),',
  "      tanggal: formData.tanggal || new Date().toISOString().split('T')[0]",
  '    };',
  '    try {',
  '      if (editingId) {',
  "        const { error } = await supabase.from('berita').update(dbPayload).eq('id', editingId);",
  '        if (error) throw error;',
  '      } else {',
  "        const { error } = await supabase.from('berita').insert([dbPayload]);",
  '        if (error) throw error;',
  '        triggerPushNotification(',
  "          'Pengumuman Berita Baru!',",
  "          formData.judul || 'Ada berita terbaru di klub PB Bilibili 162!',",
  "          'berita'",
  '        ).catch(() => {});',
  '      }',
  "      broadcastDataChange('berita', editingId ? 'UPDATE' : 'INSERT', dbPayload);",
  '      await fetchNews();',
  '      setShowSuccess(true);',
  '      window.setTimeout(() => setShowSuccess(false), 2500);',
  '      setIsModalOpen(false);',
  '    } catch (err: any) {',
  "      console.error('Save berita failed:', err);",
  "      setFormError('Gagal menyimpan berita ke Supabase: ' + (err?.message || 'Unknown error'));",
  '    } finally {',
  '      setIsSaving(false);',
  '    }',
  '  };',
  '',
  '  const handleDelete = async'
].join('\n');
component = component.replace(/  const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const handleDelete = async/m, () => submitBlock);

const openModalBlock = [
  '  const openModal = (item?: Berita) => {',
  '    setFormError(null);',
  '    setImageToCrop(null);',
  '    setCrop({ x: 0, y: 0 });',
  '    setZoom(1);',
  '    if (item) {',
  '      const imgList = parseBeritaImageUrls(item.gambar_url);',
  '      setFormData({',
  "        judul: item.judul || '',",
  "        ringkasan: item.ringkasan || '',",
  "        konten: item.konten || '',",
  "        kategori: item.kategori || 'Prestasi',",
  "        gambar_url: imgList[0] || '',",
  "        gambar_url_2: imgList[1] || '',",
  "        gambar_url_3: imgList[2] || '',",
  "        gambar_url_4: imgList[3] || '',",
  "        gambar_url_5: imgList[4] || '',",
  "        tanggal: item.tanggal || new Date().toISOString().split('T')[0]",
  '      });',
  '    } else {',
  '      setFormData({',
  "        judul: '', ringkasan: '', konten: '', kategori: 'Prestasi',",
  "        gambar_url: '', gambar_url_2: '', gambar_url_3: '', gambar_url_4: '', gambar_url_5: '',",
  "        tanggal: new Date().toISOString().split('T')[0]",
  '      });',
  '    }',
  '    setEditingId(item?.id || null);',
  '    setIsModalOpen(true);',
  '  };',
  '',
  '  const closeModal'
].join('\n');
component = component.replace(/  const openModal = \(item\?: Berita\) => \{[\s\S]*?\n  \};\n\n  const closeModal/m, () => openModalBlock);

const oldButton = `<button type="submit" disabled={isSaving || isUploading} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} {editingId ? 'Update Berita' : 'Publikasikan'}
              </button>`;
const newButton = `<div className="sticky bottom-0 z-30 -mx-2 mt-2 px-2 pt-3 pb-[max(.5rem,env(safe-area-inset-bottom))] bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-white/10">
                <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-2 shadow-[0_-12px_30px_rgba(0,0,0,.45)]">
                  <div className="min-w-0 pl-2 hidden sm:block">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Status</div>
                    <div className="text-[10px] font-bold text-zinc-300 truncate">{isUploading ? 'Mengunggah gambar ke Supabase…' : isSaving ? 'Menyimpan berita…' : 'Siap disimpan'}</div>
                  </div>
                  <button type="submit" disabled={isSaving || isUploading} aria-label={editingId ? 'Simpan perubahan berita' : 'Publikasikan berita'} className="flex-1 sm:flex-none sm:min-w-[220px] min-h-[56px] px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[1rem] font-black uppercase text-[11px] tracking-[0.14em] flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 transition-all active:scale-[.985] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation">
                    {isSaving ? <Loader2 className="animate-spin" size={21}/> : <Save size={21}/>} {editingId ? 'Simpan Perubahan' : 'Publikasikan'}
                  </button>
                </div>
              </div>`;
if (component.includes(oldButton)) component = component.replace(oldButton, newButton);

component = component.replace(/\(item\.gambar_url \|\| ''\)\.split\(\/[\\s,]\+\/\)\[0\]/g, "parseBeritaImageUrls(item.gambar_url)[0] || ''");
component = component.replace(/\(formData\.gambar_url \|\| ''\)\.split\(\/[\\s,]\+\/\)\[0\]/g, "parseBeritaImageUrls(formData.gambar_url)[0] || ''");

fs.writeFileSync(componentPath, component, 'utf8');

const marker = '/* ADMIN-BERITA-SAVE-BUTTON-UX */';
const css = `\n${marker}\n#admin-berita-page .fixed.z-\\[100\\] form { scroll-padding-bottom: 8rem !important; }\n@media (max-width: 767px) {\n  #admin-berita-page .fixed.z-\\[100\\] { padding: max(.35rem, env(safe-area-inset-top)) .35rem max(.35rem, env(safe-area-inset-bottom)) !important; }\n  #admin-berita-page .fixed.z-\\[100\\] > div { width: 100% !important; max-width: 100% !important; max-height: calc(100dvh - .7rem) !important; border-radius: 1.25rem !important; }\n  #admin-berita-page .fixed.z-\\[100\\] form { padding: .9rem !important; padding-bottom: max(1rem, env(safe-area-inset-bottom)) !important; gap: 1rem !important; }\n  #admin-berita-page .fixed.z-\\[100\\] form > .sticky { position: sticky !important; bottom: 0 !important; z-index: 99999 !important; }\n  #admin-berita-page .fixed.z-\\[100\\] form > .sticky button[type="submit"] { min-height: 58px !important; width: 100% !important; touch-action: manipulation !important; -webkit-tap-highlight-color: transparent !important; }\n  #admin-berita-page .fixed.z-\\[100\\] form input, #admin-berita-page .fixed.z-\\[100\\] form select, #admin-berita-page .fixed.z-\\[100\\] form textarea { min-height: 50px !important; }\n}\n@media (max-width: 380px) { #admin-berita-page .fixed.z-\\[100\\] form > .sticky button[type="submit"] { min-height: 54px !important; font-size: .68rem !important; padding-left: .9rem !important; padding-right: .9rem !important; } }\n`;
let cssFile = fs.readFileSync(cssPath, 'utf8');
if (!cssFile.includes(marker)) fs.writeFileSync(cssPath, cssFile.trimEnd() + '\n' + css, 'utf8');

console.log('[patch-admin-berita-supabase-edit] applied');
