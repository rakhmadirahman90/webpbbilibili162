import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function patchKelolaSuratSave(): Plugin {
  return {
    name: 'patch-kelola-surat-save-final',
    buildStart() {
      const file = path.resolve('src/components/KelolaSurat.tsx');
      if (!fs.existsSync(file)) return;
      let source = fs.readFileSync(file, 'utf8');
      let changes = 0;

      // 1) Surat Keluar must use the explicit Save button only.
      const autoRe = /  \/\/ Debounced Realtime Auto-Save for Surat Keluar\n  useEffect\(\(\) => \{[\s\S]*?\n  \}, \[formData, logoPos, stempelPos, ttdKetuaPos, ttdSekretarisPos, isModalOpen, isPreviewOnly\]\);/;
      if (autoRe.test(source)) {
        source = source.replace(autoRe, `  // Surat Keluar: explicit Save only; never save while the user is editing.\n  useEffect(() => {\n    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n    return () => {\n      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);\n    };\n  }, []);`);
        changes++;
      }

      // 2) Make the database writer authoritative and reject real Supabase errors.
      const syncStart = source.indexOf('    const syncPromise = Promise.allSettled([');
      const syncEnd = source.indexOf('\n\n    // Timeout guard so function returns targetId smoothly', syncStart);
      if (syncStart >= 0 && syncEnd > syncStart) {
        const sync = `    const syncPromise = (async () => {\n      if (isUuid) {\n        const { data: updateData, error: updateErr } = await supabase\n          .from('arsip_surat')\n          .update(dbPayload)\n          .eq('id', currentEditId)\n          .select()\n          .single();\n        if (updateErr) {\n          const notFound = /PGRST116|0 rows|No rows/i.test(String(updateErr?.message || updateErr));\n          if (!notFound) throw updateErr;\n          const { data: upsertData, error: upsertErr } = await supabase\n            .from('arsip_surat')\n            .upsert([{ ...dbPayload, id: currentEditId }], { onConflict: 'id' })\n            .select()\n            .single();\n          if (upsertErr) throw upsertErr;\n          resultId = upsertData?.id || currentEditId;\n        } else {\n          if (!updateData) throw new Error('Database tidak mengembalikan data surat yang diperbarui.');\n          resultId = updateData.id || currentEditId;\n        }\n      } else {\n        const insertPayload = { ...dbPayload };\n        delete insertPayload.id;\n        const { data: insertData, error: insertErr } = await supabase\n          .from('arsip_surat')\n          .insert([insertPayload])\n          .select()\n          .single();\n        if (insertErr) throw insertErr;\n        resultId = insertData?.id || resultId;\n      }\n      console.log('[KelolaSurat] Supabase persistence OK', { resultId, currentEditId });\n      return resultId;\n    })();`;
        source = source.slice(0, syncStart) + sync + source.slice(syncEnd);
        // Remove the old 300ms optimistic timeout.
        source = source.replace(/\n    \/\/ Timeout guard so function returns targetId smoothly[\s\S]*?\n    return resultId \|\| targetId;/, `\n    await syncPromise;\n    return resultId || targetId;`);
        changes++;
      }

      // 3) Explicit Save must keep the modal open until persistence succeeds.
      const saveRe = /  const handleSave = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleDelete =/;
      if (saveRe.test(source)) {
        source = source.replace(saveRe, `  const handleSave = async () => {\n    if (isSubmitting) return;\n    setIsSubmitting(true);\n    const targetEditId = editId;\n    try {\n      const dbId = await saveSuratToSupabase(formData, targetEditId, { logoPos, stempelPos, ttdKetuaPos, ttdSekretarisPos });\n      const savedId = dbId || targetEditId || ('local_' + Date.now());\n      setEditId(savedId);\n      setRealtimeSyncStatus('synced');\n      setIsModalOpen(false);\n      // Refresh is best-effort and must never block the Save button.\n      void Promise.race([\n        fetchSurat(),\n        new Promise(resolve => setTimeout(resolve, 5000)),\n      ]).catch(err => console.warn('[KelolaSurat] background refresh failed:', err));\n      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: targetEditId ? 'Surat berhasil diperbarui & tersimpan ke database.' : 'Surat berhasil disimpan ke database.', showConfirmButton: false, timer: 2200 });\n    } catch (err: any) {\n      setRealtimeSyncStatus('offline');\n      console.error('[KelolaSurat] Save failed:', err);\n      Swal.fire({ icon: 'error', title: 'Gagal menyimpan surat', text: err?.message || 'Perubahan belum tersimpan ke database.', confirmButtonColor: '#2563eb' });\n    } finally {\n      setIsSubmitting(false);\n    }\n  };\n\n  const handleDelete =`);
        changes++;
      }

      // 4) The Save button must always be a normal button, never a form submit.
      source = source.replace(/<button onClick=\{handleSave\} disabled=\{isSubmitting\}/g, '<button type="button" onClick={handleSave} disabled={isSubmitting}');

      if (changes > 0) {
        fs.writeFileSync(file, source, 'utf8');
        console.log(`[KelolaSurat] final save patch applied: ${changes} changes`);
      } else {
        console.log('[KelolaSurat] final save patch already applied or target changed');
      }
    },
  };
}

export default defineConfig({
  plugins: [patchKelolaSuratSave(), react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'vendor-docs';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
