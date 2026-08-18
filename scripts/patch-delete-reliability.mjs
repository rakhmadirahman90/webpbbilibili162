import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// The generic `supabase` proxy is local-first. Delete actions must bypass that
// queue and execute against the durable Supabase database immediately.
for (const file of walk(srcDir)) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('.delete()')) continue;

  const before = text;
  text = text.replace(/supabase\.from\((['"`])([^'"`]+)\1\)\.delete\(\)/g, 'remoteSupabase.from($1$2$1).delete()');
  if (text === before) continue;

  if (!/\bremoteSupabase\b/.test(before)) {
    text = text.replace(/import\s*\{([^}]*\bsupabase\b[^}]*)\}\s*from\s*(['"][^'"]+\/supabase['"])/, (m, imports, source) => {
      if (/\bremoteSupabase\b/.test(imports)) return m;
      return `import {${imports}, remoteSupabase} from ${source}`;
    });
  }

  fs.writeFileSync(file, text);
  console.log(`[delete-patch] ${path.relative(root, file)}`);
}

// The previous athlete cascade deleted parent/children in parallel and ignored
// all errors. PostgreSQL FK constraints therefore made the parent deletion
// fail while the UI could still report success.
const helperPath = path.join(srcDir, 'utils', 'siteSettingsHelper.ts');
let helper = fs.readFileSync(helperPath, 'utf8');
const start = helper.indexOf('export async function deleteAthleteCompletely');
const end = helper.indexOf('export const DEFAULT_HERO_CONFIG', start);
if (start >= 0 && end > start) {
  const replacement = `export async function deleteAthleteCompletely(id?: string, name?: string) {\n  try {\n    let athleteId = id?.trim() || '';\n    let athleteName = name?.trim() || '';\n\n    if (!athleteId && athleteName) {\n      const { data, error } = await remoteSupabase\n        .from('pendaftaran')\n        .select('id,nama')\n        .ilike('nama', athleteName)\n        .limit(1)\n        .maybeSingle();\n      if (error) throw error;\n      athleteId = data?.id || '';\n      athleteName = data?.nama || athleteName;\n    }\n\n    if (!athleteId && !athleteName) throw new Error('ID atau nama atlet wajib tersedia.');\n\n    // Delete FK children first.\n    if (athleteId) {\n      const childDeletes = await Promise.all([\n        remoteSupabase.from('pertandingan').delete().eq('pendaftaran_id', athleteId),\n        remoteSupabase.from('atlet_stats').delete().eq('pendaftaran_id', athleteId),\n        remoteSupabase.from('rankings').delete().eq('pendaftaran_id', athleteId),\n      ]);\n      const childError = childDeletes.find((result: any) => result.error)?.error;\n      if (childError) throw childError;\n    }\n\n    if (athleteName) {\n      const [rankingByName, statsByName] = await Promise.all([\n        remoteSupabase.from('rankings').delete().ilike('player_name', athleteName),\n        remoteSupabase.from('atlet_stats').delete().ilike('player_name', athleteName),\n      ]);\n      if (rankingByName.error) throw rankingByName.error;\n      if (statsByName.error) throw statsByName.error;\n    }\n\n    // Delete the parent only after every child deletion succeeds.\n    const parentResult = athleteId\n      ? await remoteSupabase.from('pendaftaran').delete().eq('id', athleteId)\n      : await remoteSupabase.from('pendaftaran').delete().ilike('nama', athleteName);\n    if (parentResult.error) throw parentResult.error;\n\n    if (athleteId) {\n      const { data: remaining, error } = await remoteSupabase\n        .from('pendaftaran')\n        .select('id')\n        .eq('id', athleteId)\n        .maybeSingle();\n      if (error) throw error;\n      if (remaining) throw new Error('Supabase masih mengembalikan data atlet setelah penghapusan.');\n    }\n\n    broadcastDataChange('pendaftaran', 'DELETE', { id: athleteId || undefined, name: athleteName || undefined });\n    broadcastDataChange('rankings', 'DELETE', { id: athleteId || undefined, name: athleteName || undefined });\n    broadcastDataChange('atlet_stats', 'DELETE', { id: athleteId || undefined, name: athleteName || undefined });\n    broadcastDataChange('pertandingan', 'DELETE', { id: athleteId || undefined, name: athleteName || undefined });\n\n    return { data: { id: athleteId || null, name: athleteName || null }, error: null };\n  } catch (err: any) {\n    console.error('[deleteAthleteCompletely] durable deletion failed:', err);\n    return { data: null, error: err };\n  }\n}\n\n`;
  helper = helper.slice(0, start) + replacement + helper.slice(end);
  fs.writeFileSync(helperPath, helper);
}

// Add a delete action to the dedicated Manajemen Atlet screen.
const athletePath = path.join(srcDir, 'ManajemenAtlet.tsx');
let athlete = fs.readFileSync(athletePath, 'utf8');
if (!athlete.includes('const handleDeleteAtlet')) {
  athlete = athlete.replace(
    "import { Search, Users, Trophy, Edit3, ChevronLeft, ChevronRight, Loader2, Plus, X, Save, RefreshCcw } from 'lucide-react';",
    "import { Search, Users, Trophy, Edit3, Trash2, ChevronLeft, ChevronRight, Loader2, Plus, X, Save, RefreshCcw } from 'lucide-react';"
  );
  if (!athlete.includes("deleteAthleteCompletely")) {
    athlete = athlete.replace("import { Registrant } from './types';", "import { Registrant } from './types';\nimport { deleteAthleteCompletely } from './utils/siteSettingsHelper';");
  }
  const marker = "  const filtered = atlets.filter((a:any) =>";
  const handler = `  const handleDeleteAtlet = async (a:any) => {\n    if (isSaving) return;\n    const result = await Swal.fire({\n      title: 'Hapus Atlet?',\n      text: 'Data atlet beserta statistik, ranking, dan riwayat pertandingan akan dihapus permanen dari Supabase.',\n      icon: 'warning',\n      showCancelButton: true,\n      confirmButtonColor: '#EF4444',\n      cancelButtonColor: '#374151',\n      confirmButtonText: 'Ya, Hapus Permanen',\n      cancelButtonText: 'Batal',\n      background: '#0F172A',\n      color: '#fff'\n    });\n    if (!result.isConfirmed) return;\n\n    setIsSaving(true);\n    try {\n      const outcome = await deleteAthleteCompletely(a?.id, a?.nama);\n      if (outcome?.error) throw outcome.error;\n      await fetchAtlets();\n      setSelectedAtlet(null);\n      await Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Atlet berhasil dihapus dari Supabase', showConfirmButton:false, timer:1800 });\n    } catch (err:any) {\n      await fetchAtlets();\n      await Swal.fire({ icon:'error', title:'Gagal Menghapus Atlet', text:err?.message || 'Data tidak berhasil dihapus dari Supabase.', confirmButtonColor:'#2563EB', background:'#0F172A', color:'#fff' });\n    } finally {\n      setIsSaving(false);\n    }\n  };\n\n`;
  athlete = athlete.replace(marker, handler + marker);
}
athlete = athlete.replace(
  /<button onClick=\{\(\)=>openEdit\(a\)\} className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600" title="Edit atlet"><Edit3 size=\{18\}\/><\/button>/,
  `<div className="flex items-center gap-1">\n                <button onClick={()=>openEdit(a)} disabled={isSaving} className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50" title="Edit atlet"><Edit3 size={18}/></button>\n                <button onClick={()=>void handleDeleteAtlet(a)} disabled={isSaving} className="rounded-xl bg-red-50 p-3 text-red-600 hover:bg-red-100 disabled:opacity-50" title="Hapus atlet"><Trash2 size={18}/></button>\n              </div>`
);
fs.writeFileSync(athletePath, athlete);
console.log('[delete-patch] src/ManajemenAtlet.tsx');
