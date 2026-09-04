import fs from 'node:fs';

const cssPath = 'src/tournament-admin-modern.css';
let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Tournament admin detail modal mobile scroll fix. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.tournament-admin-page .fixed.inset-0{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;align-items:flex-start!important;justify-content:center!important;padding:12px!important}.tournament-admin-page .fixed.inset-0 > div{max-height:none!important;height:auto!important;overflow:visible!important;margin-top:0!important;margin-bottom:0!important}@media (max-width:767px){.tournament-admin-page .fixed.inset-0{min-height:100dvh!important;padding:10px!important;align-items:flex-start!important}.tournament-admin-page .fixed.inset-0 > div{width:100%!important;max-width:none!important;min-width:0!important;border-radius:20px!important}.tournament-admin-page .fixed.inset-0 button{touch-action:manipulation!important}}\n`;
  fs.writeFileSync(cssPath, css);
}

const tsPath = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(tsPath, 'utf8');

if (!src.includes('editFiles')) {
  src = src.replace("  const [saving, setSaving] = useState(false);", "  const [saving, setSaving] = useState(false);\n  const [editFiles, setEditFiles] = useState<{ foto1: File | null; foto2: File | null; ktp1: File | null; ktp2: File | null; payment: File | null }>({ foto1:null, foto2:null, ktp1:null, ktp2:null, payment:null });");
}

if (!src.includes('uploadEditedDocument')) {
  const markerSave = '  const saveEdit = async (e: React.FormEvent) => {';
  const helper = `  const uploadEditedDocument = async (file: File, field: 'foto1'|'foto2'|'ktp1'|'ktp2'|'payment', rowId: string|number) => {\n    const isPayment = field === 'payment';\n    const bucket = isPayment ? 'uploads' : 'turnamen-dokumen';\n    const ext = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');\n    const path = isPayment ? \\`turnamen-bilibili-162/edit-\${rowId}-\${Date.now()}-\${field}.\${ext}\\` : \\`pendaftaran/edit-\${rowId}-\${Date.now()}-\${field}.\${ext}\\`;\n    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert:false, contentType:file.type || 'application/octet-stream', cacheControl:'3600' });\n    if (error) throw new Error(\\`Upload \${field} gagal: \${error.message}\\`);\n    return isPayment ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : path;\n  };\n\n`;
  if (src.includes(markerSave)) src = src.replace(markerSave, helper + markerSave);
}

const saveStart = src.indexOf('  const saveEdit = async (e: React.FormEvent) => {');
const resetStart = src.indexOf('  const reset = () =>', saveStart);
if (saveStart >= 0 && resetStart >= 0) {
  const newSave = `  const saveEdit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!editing) return;\n    setSaving(true);\n    try {\n      const payload: Record<string, any> = { kategori:editing.kategori, nama_pemain_1:clean(editing.nama_pemain_1), nama_pemain_2:clean(editing.nama_pemain_2), whatsapp:clean(editing.whatsapp), email:clean(editing.email)||null, asal_pb:clean(editing.asal_pb), domisili:clean(editing.domisili), nik_pemain_1:clean(editing.nik_pemain_1)||null, nik_pemain_2:clean(editing.nik_pemain_2)||null, wilayah_nik_pemain_1:clean(editing.wilayah_nik_pemain_1)||null, wilayah_nik_pemain_2:clean(editing.wilayah_nik_pemain_2)||null };\n      const fields:Array<['foto1'|'foto2'|'ktp1'|'ktp2'|'payment',string]> = [['foto1','foto_pemain_1_url'],['foto2','foto_pemain_2_url'],['ktp1','ktp_pemain_1_url'],['ktp2','ktp_pemain_2_url'],['payment','bukti_pembayaran_url']];\n      for (const [field,dbField] of fields) { const file=editFiles[field]; if(file){ if(file.size>12*1024*1024) throw new Error(field+': ukuran file maksimal 12 MB.'); payload[dbField]=await uploadEditedDocument(file,field,editing.id); } }\n      const {error}=await supabase.from('pendaftaran_turnamen').update(payload).eq('id',editing.id);\n      if(error) throw error;\n      setEditing(null); setEditFiles({foto1:null,foto2:null,ktp1:null,ktp2:null,payment:null}); await load();\n      Swal.fire({icon:'success',title:'Data & dokumen peserta diperbarui',text:'Data peserta, foto, KTP, dan bukti pembayaran berhasil disimpan.',timer:1600,showConfirmButton:false});\n    } catch(e:any){ Swal.fire({icon:'error',title:'Gagal menyimpan perubahan',text:e?.message||'Periksa file, Storage, dan hak akses admin.'}); } finally { setSaving(false); }\n  };\n\n`;
  src = src.slice(0,saveStart)+newSave+src.slice(resetStart);
}

src = src.replace(/setEditing\(row\)/g, "setEditFiles({foto1:null,foto2:null,ktp1:null,ktp2:null,payment:null}); setEditing(row)");

if (!src.includes('EDIT DOKUMEN PESERTA')) {
  const formMarker = '<form onSubmit={saveEdit}';
  const formPos = src.indexOf(formMarker);
  if (formPos >= 0) {
    const tagEnd = src.indexOf('>',formPos);
    if (tagEnd >= 0) {
      const docsUi = `\n                <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">\n                  <div className="mb-3"><p className="text-xs font-black uppercase tracking-wider text-blue-800">EDIT DOKUMEN PESERTA</p><p className="text-[10px] text-blue-600">Pilih file baru hanya jika ingin mengganti dokumen lama. Maksimal 12 MB/file.</p></div>\n                  <div className="grid gap-3 sm:grid-cols-2">\n                    <EditDocInput label="Foto Pemain 1" accept="image/*" file={editFiles.foto1} onChange={file=>setEditFiles(f=>({...f,foto1:file}))}/>\n                    <EditDocInput label="Foto Pemain 2" accept="image/*" file={editFiles.foto2} onChange={file=>setEditFiles(f=>({...f,foto2:file}))}/>\n                    <EditDocInput label="KTP Pemain 1" accept="image/*,.pdf" file={editFiles.ktp1} onChange={file=>setEditFiles(f=>({...f,ktp1:file}))}/>\n                    <EditDocInput label="KTP Pemain 2" accept="image/*,.pdf" file={editFiles.ktp2} onChange={file=>setEditFiles(f=>({...f,ktp2:file}))}/>\n                    <EditDocInput label="Bukti Pembayaran" accept="image/*,.pdf" file={editFiles.payment} onChange={file=>setEditFiles(f=>({...f,payment:file}))}/>\n                  </div>\n                </div>\n`;
      src = src.slice(0,tagEnd+1)+docsUi+src.slice(tagEnd+1);
    }
  }
}

if (!src.includes('function EditDocInput')) {
  const exportMarker='export default function AdminPendaftaranTurnamenModern()';
  const component=`function EditDocInput({label,accept,file,onChange}:{label:string;accept:string;file:File|null;onChange:(file:File|null)=>void}){return <label className="block rounded-xl border border-blue-100 bg-white p-3"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</span><input type="file" accept={accept} onChange={e=>onChange(e.target.files?.[0]||null)} className="block w-full text-[10px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white"/><span className="mt-1 block truncate text-[9px] text-slate-400">{file?file.name:'Dokumen lama tetap digunakan'}</span></label>}\n\n`;
  if(src.includes(exportMarker)) src=src.replace(exportMarker,component+exportMarker);
}

fs.writeFileSync(tsPath,src);
console.log('[patch-tournament-admin-detail-scroll] detail scroll + admin participant document editing applied');
