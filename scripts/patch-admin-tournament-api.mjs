import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');
if (src.includes("const ADMIN_TOURNAMENT_API = '/api/admin-tournament';")) {
  console.log('Admin tournament API patch already applied.');
  process.exit(0);
}

src = src.replace("import { supabase } from '../supabase';\n", "const ADMIN_TOURNAMENT_API = '/api/admin-tournament';\n\nfunction getAdminPin() {\n  try {\n    const raw = localStorage.getItem('pb162_user_pins');\n    const dict = raw ? JSON.parse(raw) : {};\n    return String(dict?.admin?.pin || '');\n  } catch { return ''; }\n}\n\nasync function adminTournamentRequest(method = 'GET', body) {\n  const pin = getAdminPin();\n  const response = await fetch(ADMIN_TOURNAMENT_API, {\n    method,\n    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },\n    ...(body ? { body: JSON.stringify(body) } : {}),\n  });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) throw new Error(payload?.error || `Request gagal (${response.status})`);\n  return payload;\n}\n");

const oldLoad = "const load = async () => { setLoading(true); const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false }); if (error) Swal.fire({ icon:'error', title:'Gagal memuat pendaftaran', text:error.message }); setItems((data||[]) as Registration[]); setLoading(false); };";
const newLoad = "const load = async () => { setLoading(true); try { const payload = await adminTournamentRequest('GET'); setItems((payload.data || []) as Registration[]); } catch (error: any) { setItems([]); Swal.fire({ icon:'error', title:'Gagal memuat pendaftaran', text:error?.message || 'Tidak dapat mengambil data peserta.' }); } finally { setLoading(false); } };";
if (!src.includes(oldLoad)) throw new Error('Admin tournament patch: load marker not found');
src = src.replace(oldLoad, newLoad);

const oldEffect = "useEffect(() => { load(); const channel = supabase.channel('pendaftaran-turnamen-admin').on('postgres_changes',{event:'*',schema:'public',table:'pendaftaran_turnamen'},(payload:any)=>{ if(payload.eventType==='INSERT')setItems(p=>[payload.new,...p]); if(payload.eventType==='UPDATE')setItems(p=>p.map(x=>x.id===payload.new.id?payload.new:x)); if(payload.eventType==='DELETE')setItems(p=>p.filter(x=>x.id!==payload.old.id)); }).subscribe(); return()=>{supabase.removeChannel(channel)}; },[]);";
const newEffect = "useEffect(() => { load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer); },[]);";
if (!src.includes(oldEffect)) throw new Error('Admin tournament patch: effect marker not found');
src = src.replace(oldEffect, newEffect);

const oldUpdate = "const updateItem=async(id:string,patch:Partial<Registration>)=>{setSaving(true);const {data,error}=await supabase.from('pendaftaran_turnamen').update(patch).eq('id',id).select('*').single();if(error)Swal.fire({icon:'error',title:'Gagal menyimpan',text:error.message});else{setItems(p=>p.map(x=>x.id===id?data as Registration:x));setSelected(data as Registration)}setSaving(false)};";
const newUpdate = "const updateItem=async(id:string,patch:Partial<Registration>)=>{setSaving(true);try{const payload=await adminTournamentRequest('PATCH',{id,patch});const data=payload.data as Registration;setItems(p=>p.map(x=>x.id===id?data:x));setSelected(data);}catch(error:any){Swal.fire({icon:'error',title:'Gagal menyimpan',text:error?.message||'Perubahan tidak tersimpan.'});}finally{setSaving(false);}};";
if (!src.includes(oldUpdate)) throw new Error('Admin tournament patch: update marker not found');
src = src.replace(oldUpdate, newUpdate);

const oldRemove = "const remove=async(item:Registration)=>{const r=await Swal.fire({title:'Hapus pendaftaran?',text:`${item.nama_pemain_1} & ${item.nama_pemain_2}`,icon:'warning',showCancelButton:true,confirmButtonText:'Hapus',confirmButtonColor:'#ef4444'});if(!r.isConfirmed)return;const {error}=await supabase.from('pendaftaran_turnamen').delete().eq('id',item.id);if(error)Swal.fire({icon:'error',title:'Gagal menghapus',text:error.message});else setSelected(null)};";
const newRemove = "const remove=async(item:Registration)=>{const r=await Swal.fire({title:'Hapus pendaftaran?',text:`${item.nama_pemain_1} & ${item.nama_pemain_2}`,icon:'warning',showCancelButton:true,confirmButtonText:'Hapus',confirmButtonColor:'#ef4444'});if(!r.isConfirmed)return;try{await adminTournamentRequest('DELETE',{id:item.id});setItems(p=>p.filter(x=>x.id!==item.id));setSelected(null);}catch(error:any){Swal.fire({icon:'error',title:'Gagal menghapus',text:error?.message||'Pendaftaran tidak terhapus.'});}};";
if (!src.includes(oldRemove)) throw new Error('Admin tournament patch: remove marker not found');
src = src.replace(oldRemove, newRemove);

fs.writeFileSync(path, src);
console.log('Admin tournament API patch applied.');
