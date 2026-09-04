import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes('editFiles')) {
  src = src.replace(
    "  const [saving, setSaving] = useState(false);",
    "  const [saving, setSaving] = useState(false);\n  const [editFiles, setEditFiles] = useState<{ foto1: File | null; foto2: File | null; ktp1: File | null; ktp2: File | null; payment: File | null }>({ foto1: null, foto2: null, ktp1: null, ktp2: null, payment: null });"
  );
}

if (!src.includes('uploadEditedDocument')) {
  const marker = '  const saveEdit = async (e: React.FormEvent) => {';
  const helper = `  const uploadEditedDocument = async (file: File, field: 'foto1' | 'foto2' | 'ktp1' | 'ktp2' | 'payment', rowId: string | number) => {\n    const isPayment = field === 'payment';\n    const bucket = isPayment ? 'uploads' : 'turnamen-dokumen';\n    const ext = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');\n    const path = isPayment\n      ? \\`turnamen-bilibili-162/edit-\${rowId}-\${Date.now()}-\${field}.\${ext}\\`\n      : \\`pendaftaran/edit-\${rowId}-\${Date.now()}-\${field}.\${ext}\\`;\n    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream', cacheControl: '3600' });\n    if (error) throw new Error(\\`Upload \${field} gagal: \${error.message}\\`);\n    if (isPayment) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;\n    return path;\n  };\n\n`;
  if (!src.includes(marker)) throw new Error('saveEdit marker not found');
  src = src.replace(marker, helper + marker);
}

const saveStart = src.indexOf('  const saveEdit = async (e: React.FormEvent) => {');
const resetStart = src.indexOf('  const reset = () =>', saveStart);
if (saveStart < 0 || resetStart < 0) throw new Error('saveEdit/reset markers not found');
const newSave = `  const saveEdit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!editing) return;\n    setSaving(true);\n    try {\n      const payload: Record<string, any> = {\n        kategori: editing.kategori,\n        nama_pemain_1: clean(editing.nama_pemain_1),\n        nama_pemain_2: clean(editing.nama_pemain_2),\n        whatsapp: clean(editing.whatsapp),\n        email: clean(editing.email) || null,\n        asal_pb: clean(editing.asal_pb),\n        domisili: clean(editing.domisili),\n        nik_pemain_1: clean(editing.nik_pemain_1) || null,\n        nik_pemain_2: clean(editing.nik_pemain_2) || null,\n        wilayah_nik_pemain_1: clean(editing.wilayah_nik_pemain_1) || null,\n        wilayah_nik_pemain_2: clean(editing.wilayah_nik_pemain_2) || null\n      };\n      const fields: Array<['foto1'|'foto2'|'ktp1'|'ktp2'|'payment', string]> = [\n        ['foto1', 'foto_pemain_1_url'], ['foto2', 'foto_pemain_2_url'],\n        ['ktp1', 'ktp_pemain_1_url'], ['ktp2', 'ktp_pemain_2_url'],\n        ['payment', 'bukti_pembayaran_url']\n      ];\n      for (const [field, dbField] of fields) {\n        const file = editFiles[field];\n        if (file) {\n          if (file.size > 12 * 1024 * 1024) throw new Error(\\`\${field}: ukuran file maksimal 12 MB.\\`);\n          payload[dbField] = await uploadEditedDocument(file, field, editing.id);\n        }\n      }\n      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', editing.id);\n      if (error) throw error;\n      setEditing(null);\n      setEditFiles({ foto1: null, foto2: null, ktp1: null, ktp2: null, payment: null });\n      await load();\n      Swal.fire({ icon: 'success', title: 'Data & dokumen peserta diperbarui', text: 'Foto, KTP, bukti pembayaran, dan data peserta tersimpan.', timer: 1600, showConfirmButton: false });\n    } catch (e: any) {\n      Swal.fire({ icon: 'error', title: 'Gagal menyimpan perubahan', text: e?.message || 'Periksa file, Storage, dan hak akses admin.' });\n    } finally { setSaving(false); }\n  };\n\n`;
src = src.slice(0, saveStart) + newSave + src.slice(resetStart);

// Reset selected upload state whenever the edit dialog is opened.
src = src.replace(/setEditing\(row\)/g, "setEditFiles({ foto1: null, foto2: null, ktp1: null, ktp2: null, payment: null }); setEditing(row)");

// Add a complete document editor immediately inside the edit form.
if (!src.includes('EDIT DOKUMEN PESERTA')) {
  const formMarker = '<form onSubmit={saveEdit}';
  const formPos = src.indexOf(formMarker);
  if (formPos < 0) throw new Error('edit form marker not found');
  const tagEnd = src.indexOf('>', formPos);
  if (tagEnd < 0) throw new Error('edit form opening tag not found');
  const docsUi = `\n                <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">\n                  <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-600"/><div><p className="text-xs font-black uppercase tracking-wider text-blue-800">EDIT DOKUMEN PESERTA</p><p className="text-[10px] text-blue-600">Kosongkan file jika dokumen lama tetap dipakai. Maksimal 12 MB/file.</p></div></div>\n                  <div className="grid gap-3 sm:grid-cols-2">\n                    ${[['foto1','Foto Pemain 1','image/*'],['foto2','Foto Pemain 2','image/*'],['ktp1','KTP Pemain 1','image/*,.pdf'],['ktp2','KTP Pemain 2','image/*,.pdf'],['payment','Bukti Pembayaran','image/*,.pdf']].map(([key,label,accept]) => `\n                    <label className="block rounded-xl border border-blue-100 bg-white p-3">\n                      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">${label}</span>\n                      <input type="file" accept="${accept}" onChange={e=>setEditFiles(f=>({...f,${key}:e.target.files?.[0]||null}))} className="block w-full text-[10px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white"/>\n                      <span className="mt-1 block truncate text-[9px] text-slate-400">{editFiles.${key} ? editFiles.${key}.name : 'Dokumen lama tetap digunakan'}</span>\n                    </label>`).join('')}\n                  </div>\n                </div>\n`;
  src = src.slice(0, tagEnd + 1) + docsUi + src.slice(tagEnd + 1);
}

fs.writeFileSync(path, src);
console.log('[patch-registration-admin-edit-documents] admin participant edit now supports photo, KTP and payment-proof uploads.');
