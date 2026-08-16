import fs from 'node:fs';

const file = 'src/components/DokumenPenting.tsx';
let src = fs.readFileSync(file, 'utf8');

const start = src.indexOf('    const getDocs = async () => {');
const end = src.indexOf('    getDocs();', start);
if (start < 0 || end < 0) throw new Error('DokumenPenting fetch block not found');

const replacement = `    const getDocs = async () => {
      setLoading(true);
      try {
        // Supabase is the single source of truth for this page.
        // Never use demo/default/localStorage documents when the database is empty
        // because that makes the public page show records that do not exist in DB.
        const { data: sbData, error } = await supabase
          .from('documents')
          .select('id,title,description,file_url,file_type,created_at,file_size')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocs(Array.isArray(sbData) ? sbData : []);
        try {
          localStorage.setItem('documents_local_v3', JSON.stringify(Array.isArray(sbData) ? sbData : []));
        } catch {}
      } catch (e) {
        console.error('[DokumenPenting] Supabase documents read failed:', e);
        // Keep the UI truthful: an unavailable/empty remote dataset must not be
        // replaced by fabricated documents.
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
`;

src = src.slice(0, start) + replacement + src.slice(end);

// Remove the now-unused helper import so the build remains clean.
src = src.replace("import { getSiteSetting } from '../utils/siteSettingsHelper';\n", '');

// Avoid duplicate per-page Supabase channels: the global realtime subscriber
// already broadcasts table_updated_documents and reloads public pages.
const channelStart = src.indexOf("    const channel = supabase\n      .channel('public_docs_realtime')");
if (channelStart >= 0) {
  const channelEnd = src.indexOf("\n\n    return () => {", channelStart);
  if (channelEnd < 0) throw new Error('Documents realtime cleanup block not found');
  src = src.slice(0, channelStart) + src.slice(channelEnd);
}
src = src.replace("      supabase.removeChannel(channel);\n", '');

// Guard malformed/missing timestamps and sizes from producing NaN/undefined.
src = src.replace("{new Date(doc.created_at).toLocaleDateString('id-ID')}", "{doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID') : '-'}");
src = src.replace("{formatFileSize(doc.file_size)}", "{formatFileSize(Number(doc.file_size) || 0)}");

fs.writeFileSync(file, src);
console.log('[patch-documents-supabase] DokumenPenting now reads authoritative Supabase documents.');
