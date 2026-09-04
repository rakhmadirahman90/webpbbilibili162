import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes('editFiles')) {
  const anchor = '  const [saving, setSaving] = useState(false);';
  if (src.includes(anchor)) src = src.replace(anchor, anchor + "\n  const [editFiles, setEditFiles] = useState({ foto1:null, foto2:null, ktp1:null, ktp2:null, payment:null });");
}

if (!src.includes('uploadEditedDocument')) {
  const anchor = '  const saveEdit = async (e: React.FormEvent) => {';
  const helper = [
    '  const uploadEditedDocument = async (file: File, field: string, rowId: string|number) => {',
    "    const isPayment = field === 'payment';",
    "    const bucket = isPayment ? 'uploads' : 'turnamen-dokumen';",
    "    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';",
    "    const prefix = isPayment ? 'turnamen-bilibili-162/edit-' : 'pendaftaran/edit-';",
    "    const storagePath = prefix + String(rowId) + '-' + String(Date.now()) + '-' + field + '.' + ext;",
    "    const result = await supabase.storage.from(bucket).upload(storagePath, file, { upsert:false, contentType:file.type || 'application/octet-stream', cacheControl:'3600' });",
    "    if (result.error) throw new Error('Upload ' + field + ' gagal: ' + result.error.message);",
    "    return isPayment ? supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl : storagePath;",
    '  };',
    ''
  ].join('\n');
  if (src.includes(anchor)) src = src.replace(anchor, helper + anchor);
}

const start = src.indexOf('  const saveEdit = async (e: React.FormEvent) => {');
const end = src.indexOf('  const reset = () =>', start);
if (start >= 0 && end > start) {
  const save = [
    '  const saveEdit = async (e: React.FormEvent) => {',
    '    e.preventDefault();',
    '    if (!editing) return;',
    '    setSaving(true);',
    '    try {',
    '      const payload: Record<string, any> = {',
    '        kategori: clean(editing.kategori), nama_pemain_1: clean(editing.nama_pemain_1), nama_pemain_2: clean(editing.nama_pemain_2),',
    '        whatsapp: clean(editing.whatsapp), email: clean(editing.email) || null, asal_pb: clean(editing.asal_pb), domisili: clean(editing.domisili),',
    '        nik_pemain_1: clean(editing.nik_pemain_1) || null, nik_pemain_2: clean(editing.nik_pemain_2) || null,',
    '        wilayah_nik_pemain_1: clean(editing.wilayah_nik_pemain_1) || null, wilayah_nik_pemain_2: clean(editing.wilayah_nik_pemain_2) || null',
    '      };',
    "      const fields = [['foto1','foto_pemain_1_url'],['foto2','foto_pemain_2_url'],['ktp1','ktp_pemain_1_url'],['ktp2','ktp_pemain_2_url'],['payment','bukti_pembayaran_url']];",
    '      for (const [field, dbField] of fields) {',
    '        const file = editFiles[field];',
    '        if (!file) continue;',
    "        if (file.size > 12 * 1024 * 1024) throw new Error(field + ': ukuran file maksimal 12 MB.');",
    '        payload[dbField] = await uploadEditedDocument(file, field, editing.id);',
    '      }',
    "      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', editing.id);",
    '      if (error) throw error;',
    '      setEditing(null); setEditFiles({ foto1:null, foto2:null, ktp1:null, ktp2:null, payment:null }); await load();',
    "      Swal.fire({ icon:'success', title:'Data & dokumen peserta diperbarui', timer:1600, showConfirmButton:false });",
    "    } catch (e:any) { Swal.fire({ icon:'error', title:'Gagal menyimpan perubahan', text:e?.message || 'Periksa file dan hak akses Storage.' }); }",
    '    finally { setSaving(false); }',
    '  };',
    '',
    ''
  ].join('\n');
  src = src.slice(0, start) + save + src.slice(end);
}

if (!src.includes('EDIT DOKUMEN PESERTA')) {
  const formMarker = '<form onSubmit={saveEdit}';
  const formPos = src.indexOf(formMarker);
  if (formPos >= 0) {
    const tagEnd = src.indexOf('>', formPos);
    if (tagEnd >= 0) {
      const ui = [
        '',
        '                <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">',
        '                  <div className="mb-3"><p className="text-xs font-black uppercase tracking-wider text-blue-800">EDIT DOKUMEN PESERTA</p><p className="text-[10px] text-blue-600">Pilih file baru hanya jika ingin mengganti dokumen lama. Maksimal 12 MB/file.</p></div>',
        '                  <div className="grid gap-3 sm:grid-cols-2">',
        '                    <EditDocInput label="Foto Pemain 1" accept="image/*" file={editFiles.foto1} onChange={file=>setEditFiles(f=>({...f,foto1:file}))}/>',
        '                    <EditDocInput label="Foto Pemain 2" accept="image/*" file={editFiles.foto2} onChange={file=>setEditFiles(f=>({...f,foto2:file}))}/>',
        '                    <EditDocInput label="KTP Pemain 1" accept="image/*,.pdf" file={editFiles.ktp1} onChange={file=>setEditFiles(f=>({...f,ktp1:file}))}/>',
        '                    <EditDocInput label="KTP Pemain 2" accept="image/*,.pdf" file={editFiles.ktp2} onChange={file=>setEditFiles(f=>({...f,ktp2:file}))}/>',
        '                    <EditDocInput label="Bukti Pembayaran" accept="image/*,.pdf" file={editFiles.payment} onChange={file=>setEditFiles(f=>({...f,payment:file}))}/>',
        '                  </div>',
        '                </div>',
        ''
      ].join('\n');
      src = src.slice(0, tagEnd + 1) + ui + src.slice(tagEnd + 1);
    }
  }
}

if (!src.includes('function EditDocInput')) {
  const marker = 'export default function AdminPendaftaranTurnamenModern()';
  const component = [
    'function EditDocInput({label,accept,file,onChange}:{label:string;accept:string;file:File|null;onChange:(file:File|null)=>void}){',
    '  return <label className="block rounded-xl border border-blue-100 bg-white p-3">',
    '    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</span>',
    '    <input type="file" accept={accept} onChange={e=>onChange(e.target.files?.[0]||null)} className="block w-full text-[10px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white"/>',
    "    <span className=\"mt-1 block truncate text-[9px] text-slate-400\">{file ? file.name : 'Dokumen lama tetap digunakan'}</span>",
    '  </label>;',
    '}',
    '',
    ''
  ].join('\n');
  if (src.includes(marker)) src = src.replace(marker, component + marker);
}

fs.writeFileSync(path, src);
console.log('[patch-admin-participant-doc-edit-safe] applied');
