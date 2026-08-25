import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/KelolaSurat.tsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;

// 1) Never reject real Supabase Storage URLs. The old guard explicitly rejected
// the project's own Supabase host, so TTD loaded from DB was blank after refresh.
source = source.replace(
  "    url.includes('vclmzvnyvdfxtvkmurxy.supabase.co') ||\n",
  ''
);

// 2) When the primary site_settings record contains an invalid/empty signature,
// fall back to the arsip_surat master record instead of treating the invalid value
// as a successful load.
source = source.replace(
  "    if (!masterFromDb || (!masterFromDb.ttd_ketua_url && !masterFromDb.cap_stempel_url)) {",
  "    if (!masterFromDb || (!getValidAssetUrl(masterFromDb.ttd_ketua_url, '') && !getValidAssetUrl(masterFromDb.ttd_sekretaris_url, '') && !getValidAssetUrl(masterFromDb.cap_stempel_url, ''))) {"
);

// 3) The master asset save must wait for the actual Supabase DB write. The previous
// 2-second race could report success before delete/insert finished, causing refresh
// to read the old master record. Keep the API/site-settings saves in parallel but
// make the arsip_surat write authoritative and awaited.
const oldMasterBlock = `    const supabasePromise = (async () => {\n      try {\n        await supabase.from('arsip_surat').delete().eq('nomor_surat', '__MASTER_DIGITAL_ASSETS__');\n        await supabase.from('arsip_surat').insert([masterRecord]);\n      } catch (dbErr) {\n        console.warn('Error saving master assets to arsip_surat table:', dbErr);\n      }\n    })();\n\n    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));\n    await Promise.race([\n      Promise.allSettled([apiPromise, siteSettingPromise, supabasePromise]),\n      timeoutPromise\n    ]);`;
const newMasterBlock = `    const supabasePromise = (async () => {\n      const { error: deleteError } = await supabase\n        .from('arsip_surat')\n        .delete()\n        .eq('nomor_surat', '__MASTER_DIGITAL_ASSETS__');\n      if (deleteError) throw deleteError;\n\n      const { data: insertedMaster, error: insertError } = await supabase\n        .from('arsip_surat')\n        .insert([masterRecord])\n        .select('id, nomor_surat, ttd_ketua_url, ttd_sekretaris_url, cap_stempel_url, updated_at')\n        .single();\n      if (insertError) throw insertError;\n      if (!insertedMaster) throw new Error('Master aset digital tidak dikembalikan oleh Supabase setelah insert.');\n      return insertedMaster;\n    })();\n\n    const persistenceResults = await Promise.allSettled([apiPromise, siteSettingPromise, supabasePromise]);\n    const dbResult = persistenceResults[2];\n    if (dbResult.status === 'rejected') {\n      const dbError = dbResult.reason instanceof Error ? dbResult.reason : new Error(String(dbResult.reason || 'Gagal menyimpan master aset digital ke Supabase.'));\n      console.error('Master digital assets Supabase persistence failed:', dbError);\n      throw dbError;\n    }`;
if (!source.includes(oldMasterBlock)) {
  throw new Error('patch-surat-ttd-persistence: master persistence block not found');
}
source = source.replace(oldMasterBlock, newMasterBlock);

// 4) A letter save also used a 300ms race. Remove it so a saved TTD/asset URL is
// not acknowledged before arsip_surat has actually finished writing.
const oldQuickTimeout = `    // Timeout guard so function returns targetId smoothly\n    const quickTimeout = new Promise(resolve => setTimeout(resolve, 300));\n    await Promise.race([syncPromise, quickTimeout]);`;
const newQuickTimeout = `    // Persistence is authoritative: do not return until Supabase/API writes finish.\n    await syncPromise;`;
if (!source.includes(oldQuickTimeout)) {
  throw new Error('patch-surat-ttd-persistence: quick timeout block not found');
}
source = source.replace(oldQuickTimeout, newQuickTimeout);

// 5) Avoid an accidental API fallback overwriting a good Supabase master with an
// invalid value. The DB is the source of truth for signature URLs.
source = source.replace(
  "      try {\n        const res = await fetch('/api/digital-assets');",
  "      try {\n        const res = await fetch('/api/digital-assets', { cache: 'no-store' });"
);

if (source === original) {
  throw new Error('patch-surat-ttd-persistence: no changes made');
}

fs.writeFileSync(file, source, 'utf8');
console.log('patch-surat-ttd-persistence: applied successfully');
