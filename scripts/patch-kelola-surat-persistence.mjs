import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/KelolaSurat.tsx');
let source = fs.readFileSync(file, 'utf8');
let changes = 0;

function replace(oldText, newText, label, required = false) {
  if (!source.includes(oldText)) {
    if (required) throw new Error(`[KelolaSurat patch] Target not found: ${label}`);
    return;
  }
  source = source.replace(oldText, newText);
  changes++;
  console.log(`[KelolaSurat patch] ${label}`);
}
function replaceAll(oldText, newText, label) {
  if (!source.includes(oldText)) return;
  const count = source.split(oldText).length - 1;
  source = source.split(oldText).join(newText);
  changes += count;
  console.log(`[KelolaSurat patch] ${label}: ${count}`);
}

// Explicit Save must wait for the database write.
replace(
`    // Timeout guard so function returns targetId smoothly\n    const quickTimeout = new Promise(resolve => setTimeout(resolve, 300));\n    await Promise.race([syncPromise, quickTimeout]);\n\n    return resultId || targetId;`,
`    // Authoritative persistence: wait for the database before reporting success.\n    let persistenceTimer: ReturnType<typeof setTimeout> | null = null;\n    try {\n      await Promise.race([\n        syncPromise,\n        new Promise((_, reject) => {\n          persistenceTimer = setTimeout(() => reject(new Error('Penyimpanan surat timeout setelah 15 detik.')), 15000);\n        })\n      ]);\n    } finally {\n      if (persistenceTimer) clearTimeout(persistenceTimer);\n    }\n\n    persistLocalCache();\n    return resultId || targetId;`,
'persistence wait', true);

// Explicit Save is the only writer for Surat Keluar; stale debounce must not overwrite cleared fields.
const autoRe = /  \/\/ Debounced Realtime Auto-Save for Surat Keluar\n  useEffect\(\(\) => \{[\s\S]*?\n  \}, \[formData, logoPos, stempelPos, ttdKetuaPos, ttdSekretarisPos, isModalOpen, isPreviewOnly\]\);/;
if (autoRe.test(source)) {
  source = source.replace(autoRe, `  // Surat Keluar uses explicit Save only.\n  useEffect(() => {\n    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n    return () => {\n      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n    };\n  }, []);`);
  changes++;
  console.log('[KelolaSurat patch] disabled Surat Keluar debounced auto-save');
}

// Do not show success before persistence. Replace the optimistic handler.
const saveRe = /  const handleSave = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleDelete =/;
if (saveRe.test(source)) {
  source = source.replace(saveRe, `  const handleSave = async () => {\n    if (isSubmitting) return;\n    setIsSubmitting(true);\n    const targetEditId = editId;\n    try {\n      const dbId = await saveSuratToSupabase(formData, targetEditId, { logoPos, stempelPos, ttdKetuaPos, ttdSekretarisPos });\n      const savedId = dbId || targetEditId || ('local_' + Date.now());\n      setEditId(savedId);\n      setRealtimeSyncStatus('synced');\n      setIsModalOpen(false);\n      await fetchSurat();\n      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: targetEditId ? 'Surat berhasil diperbarui & tersimpan ke database.' : 'Surat berhasil disimpan ke database.', showConfirmButton: false, timer: 2200 });\n    } catch (err) {\n      setRealtimeSyncStatus('offline');\n      console.error('[KelolaSurat] Save failed:', err);\n      Swal.fire({ icon: 'error', title: 'Gagal menyimpan surat', text: err?.message || 'Perubahan belum tersimpan ke database.', confirmButtonColor: '#2563eb' });\n    } finally {\n      setIsSubmitting(false);\n    }\n  };\n\n  const handleDelete =`);
  changes++;
  console.log('[KelolaSurat patch] authoritative handleSave');
}

// Empty string is a real value: deleting a field must stay deleted after refresh.
replaceAll(`const activeIsiText = (rawPayload.isi_surat && String(rawPayload.isi_surat).trim())\n      ? String(rawPayload.isi_surat).trim()\n      : ((rawPayload.isi_ringkas && String(rawPayload.isi_ringkas).trim()) ? String(rawPayload.isi_ringkas).trim() : '');`,
`const activeIsiText = rawPayload.isi_surat !== undefined && rawPayload.isi_surat !== null\n      ? String(rawPayload.isi_surat)\n      : (rawPayload.isi_ringkas !== undefined && rawPayload.isi_ringkas !== null ? String(rawPayload.isi_ringkas) : '');`, 'preserve empty body');
replaceAll(`paragraf_2: rawPayload.paragraf_2 || '',`, `paragraf_2: rawPayload.paragraf_2 !== undefined && rawPayload.paragraf_2 !== null ? rawPayload.paragraf_2 : '',`, 'preserve empty paragraph 2');
replaceAll(`paragraf_3: rawPayload.paragraf_3 || '',`, `paragraf_3: rawPayload.paragraf_3 !== undefined && rawPayload.paragraf_3 !== null ? rawPayload.paragraf_3 : '',`, 'preserve empty paragraph 3');
replaceAll(`alamat_tujuan: rawPayload.alamat_tujuan || 'di Tempat',`, `alamat_tujuan: rawPayload.alamat_tujuan !== undefined && rawPayload.alamat_tujuan !== null ? rawPayload.alamat_tujuan : 'di Tempat',`, 'preserve empty address');
replaceAll(`nama_ketua: rawPayload.nama_ketua || stored.nama_ketua || 'H. WAWAN',`, `nama_ketua: rawPayload.nama_ketua !== undefined && rawPayload.nama_ketua !== null ? rawPayload.nama_ketua : (stored.nama_ketua || 'H. WAWAN'),`, 'preserve empty chairman');
replaceAll(`nama_sekretaris: rawPayload.nama_sekretaris || stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',`, `nama_sekretaris: rawPayload.nama_sekretaris !== undefined && rawPayload.nama_sekretaris !== null ? rawPayload.nama_sekretaris : (stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG'),`, 'preserve empty secretary');
replaceAll(`tujuan_instansi: rawPayload.alamat_tujuan || rawPayload.tujuan_instansi || 'di Tempat',`, `tujuan_instansi: rawPayload.alamat_tujuan !== undefined && rawPayload.alamat_tujuan !== null ? rawPayload.alamat_tujuan : (rawPayload.tujuan_instansi !== undefined && rawPayload.tujuan_instansi !== null ? rawPayload.tujuan_instansi : 'di Tempat'),`, 'preserve empty destination');

// The database is the source of truth; ignore legacy server JSON when merging.
replace(`      const serverData: any[] = serverRes?.status === 'fulfilled' ? serverRes.value : [];`, `      const serverData: any[] = []; // Supabase is authoritative; legacy API cache cannot overwrite DB edits.`, 'authoritative fetch source');
replace(`          const isParsedNewer = isLocalSource || parsedTime >= existingTime;`, `          const isParsedNewer = parsedTime >= existingTime;`, 'database wins over local cache');
replaceAll(`            isi_surat: (newer.isi_surat && String(newer.isi_surat).trim()) ? newer.isi_surat : (older.isi_surat || ''),`, `            isi_surat: newer.isi_surat !== undefined && newer.isi_surat !== null ? newer.isi_surat : (older.isi_surat ?? ''),`, 'merge empty body');
replaceAll(`            isi_ringkas: (newer.isi_ringkas && String(newer.isi_ringkas).trim()) ? newer.isi_ringkas : (older.isi_ringkas || ''),`, `            isi_ringkas: newer.isi_ringkas !== undefined && newer.isi_ringkas !== null ? newer.isi_ringkas : (older.isi_ringkas ?? ''),`, 'merge empty summary');
replaceAll(`            perihal: newer.perihal || older.perihal || '',`, `            perihal: newer.perihal !== undefined && newer.perihal !== null ? newer.perihal : (older.perihal ?? ''),`, 'merge empty subject');
replaceAll(`            tempat_tanggal: newer.tempat_tanggal || older.tempat_tanggal || '',`, `            tempat_tanggal: newer.tempat_tanggal !== undefined && newer.tempat_tanggal !== null ? newer.tempat_tanggal : (older.tempat_tanggal ?? ''),`, 'merge empty date');
replaceAll(`            tujuan_yth: newer.tujuan_yth || older.tujuan_yth || '',`, `            tujuan_yth: newer.tujuan_yth !== undefined && newer.tujuan_yth !== null ? newer.tujuan_yth : (older.tujuan_yth ?? ''),`, 'merge empty recipient');
replaceAll(`            lampiran: newer.lampiran || older.lampiran || '-',`, `            lampiran: newer.lampiran !== undefined && newer.lampiran !== null ? newer.lampiran : (older.lampiran ?? ''),`, 'merge empty attachment');

// Preserve empty values while reopening an edited surat.
replaceAll(`      title_override: surat.title_override || '',`, `      title_override: surat.title_override !== undefined && surat.title_override !== null ? surat.title_override : '',`, 'edit empty title');
replaceAll(`      judul_lampiran: surat.judul_lampiran || 'Daftar Lampiran Peserta',`, `      judul_lampiran: surat.judul_lampiran !== undefined && surat.judul_lampiran !== null ? surat.judul_lampiran : 'Daftar Lampiran Peserta',`, 'edit empty attachment title');
replaceAll(`      lampiran_peserta: surat.lampiran_peserta || '',`, `      lampiran_peserta: surat.lampiran_peserta !== undefined && surat.lampiran_peserta !== null ? surat.lampiran_peserta : '',`, 'edit empty participant list');
replaceAll(`      tempat_tanggal: surat.tempat_tanggal || defaultForm.tempat_tanggal,`, `      tempat_tanggal: surat.tempat_tanggal !== undefined && surat.tempat_tanggal !== null ? surat.tempat_tanggal : defaultForm.tempat_tanggal,`, 'edit empty date');
replaceAll(`      lampiran: surat.lampiran || '-',`, `      lampiran: surat.lampiran !== undefined && surat.lampiran !== null ? surat.lampiran : '-',`, 'edit empty attachment');
replaceAll(`      nama_ketua: surat.nama_ketua || storedAssets.nama_ketua || defaultForm.nama_ketua,`, `      nama_ketua: surat.nama_ketua !== undefined && surat.nama_ketua !== null ? surat.nama_ketua : (storedAssets.nama_ketua || defaultForm.nama_ketua),`, 'edit empty chairman');
replaceAll(`      nama_sekretaris: surat.nama_sekretaris || storedAssets.nama_sekretaris || defaultForm.nama_sekretaris,`, `      nama_sekretaris: surat.nama_sekretaris !== undefined && surat.nama_sekretaris !== null ? surat.nama_sekretaris : (storedAssets.nama_sekretaris || defaultForm.nama_sekretaris),`, 'edit empty secretary');

// Replace the dual API/Supabase writer with one authoritative Supabase transaction.
const syncStart = source.indexOf('    const syncPromise = Promise.allSettled([');
const syncEnd = source.indexOf(`\n\n    // Authoritative persistence: wait for the database before reporting success.`, syncStart);
if (syncStart >= 0 && syncEnd > syncStart) {
  const sync = `    const syncPromise = (async () => {\n      if (isUuid) {\n        const { data: updateData, error: updateErr } = await supabase\n          .from('arsip_surat')\n          .update(dbPayload)\n          .eq('id', currentEditId)\n          .select()\n          .single();\n        if (updateErr) {\n          const notFound = /PGRST116|0 rows|No rows/i.test(String(updateErr?.message || updateErr));\n          if (!notFound) throw updateErr;\n          const { data: upsertData, error: upsertErr } = await supabase\n            .from('arsip_surat')\n            .upsert([{ ...dbPayload, id: currentEditId }], { onConflict: 'id' })\n            .select()\n            .single();\n          if (upsertErr) throw upsertErr;\n          resultId = upsertData?.id || currentEditId;\n        } else {\n          if (!updateData) throw new Error('Database tidak mengembalikan surat yang diperbarui.');\n          resultId = updateData.id || currentEditId;\n        }\n      } else {\n        const insertPayload = { ...dbPayload };\n        delete insertPayload.id;\n        const { data: insertData, error: insertErr } = await supabase\n          .from('arsip_surat')\n          .insert([insertPayload])\n          .select()\n          .single();\n        if (insertErr) throw insertErr;\n        resultId = insertData?.id || resultId;\n      }\n      return resultId;\n    })();`;
  source = source.slice(0, syncStart) + sync + source.slice(syncEnd);
  changes++;
  console.log('[KelolaSurat patch] single authoritative Supabase writer');
}

// Local cache is written only after syncPromise succeeds.
const localStart = source.indexOf('    // 1. Immediately Save to LocalStorage for zero-latency local availability');
const localEnd = source.indexOf('    // 2. Broadcast real-time change instantly', localStart);
if (localStart >= 0 && localEnd > localStart) {
  const localFn = `    const persistLocalCache = () => {\n      try {\n        const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');\n        const normTarget = normalizeSuratNomor(localItem.nomor_surat);\n        const filteredLocal = localData.filter((i: any) => i && i.id !== targetId && i.id !== currentEditId && (!normTarget || normalizeSuratNomor(i.nomor_surat) !== normTarget));\n        safeLocalStorageSet('arsip_surat_local', JSON.stringify([localItem, ...filteredLocal]));\n      } catch (e) { console.warn('[KelolaSurat] local cache write failed', e); }\n    };\n\n`;
  source = source.slice(0, localStart) + localFn + source.slice(localEnd);
  // Remove pre-save broadcast; handleSave fetches again after persistence.
  const broadcastEnd = source.indexOf('    // 3. Update global persistent digital assets in local cache', localStart);
  const bStart = source.indexOf('    // 2. Broadcast real-time change instantly', localStart);
  if (bStart >= 0 && broadcastEnd > bStart) source = source.slice(0, bStart) + source.slice(broadcastEnd);
  changes++;
  console.log('[KelolaSurat patch] local cache delayed until DB success');
}

if (changes === 0) {
  console.log('[KelolaSurat patch] already patched');
} else {
  fs.writeFileSync(file, source, 'utf8');
  console.log(`[KelolaSurat patch] applied ${changes} changes`);
}
