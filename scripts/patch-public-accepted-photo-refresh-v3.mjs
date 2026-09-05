import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __PUBLIC_ACCEPTED_PHOTO_REFRESH_V3__ */';
if (src.includes(marker)) {
  console.log('[patch-public-accepted-photo-refresh-v3] already applied');
  process.exit(0);
}

const startNeedle = "  useEffect(() => {\n    let cancelled = false;\n    const CACHE_KEY = 'pb_accepted_photo_cache_v2';";
const start = src.indexOf(startNeedle);
if (start < 0) throw new Error('[patch-public-accepted-photo-refresh-v3] V2 photo resolver not found');
const endNeedle = "  }, [rows]);";
const end = src.indexOf(endNeedle, start);
if (end < 0) throw new Error('[patch-public-accepted-photo-refresh-v3] V2 photo resolver end not found');

const replacement = `  useEffect(() => {
    let cancelled = false;
    const resolvePhotos = async () => {
      const next: Record<string, { foto1: string; foto2: string }> = {};
      const pathToTargets = new Map<string, Array<{ id: string; key: 'foto1' | 'foto2' }>>();

      // Always resolve the current database value. Do not reuse a row-id cache:
      // the admin uploader intentionally creates a new storage path for every replacement.
      for (const row of rows) {
        const id = String(row.id);
        const result = {
          foto1: directUrl(row.foto_pemain_1_url),
          foto2: directUrl(row.foto_pemain_2_url)
        };
        next[id] = result;
        const fields: Array<[keyof Registration, 'foto1' | 'foto2']> = [
          ['foto_pemain_1_url', 'foto1'],
          ['foto_pemain_2_url', 'foto2']
        ];
        for (const [field, key] of fields) {
          if (result[key]) continue;
          const raw = clean(row[field]);
          if (!raw || !/^pendaftaran\\//i.test(raw)) continue;
          const targets = pathToTargets.get(raw) || [];
          targets.push({ id, key });
          pathToTargets.set(raw, targets);
        }
      }

      const paths = Array.from(pathToTargets.keys());
      const applySignedByIndex = (chunk: string[], items: any[] | null | undefined) => {
        // Supabase returns createSignedUrls results in request order.
        for (let index = 0; index < chunk.length; index++) {
          const item = items?.[index];
          const signedUrl = item?.signedUrl || item?.signedURL;
          if (!signedUrl) continue;
          for (const target of pathToTargets.get(chunk[index]) || []) {
            next[target.id][target.key] = signedUrl;
          }
        }
      };

      // No persistent photo URL cache: after an admin edit, the next realtime/database
      // refresh signs the newly stored path immediately instead of showing the old photo.
      for (let i = 0; i < paths.length; i += 100) {
        if (cancelled) return;
        const chunk = paths.slice(i, i + 100);
        try {
          const { data, error: batchError } = await supabase.storage
            .from('turnamen-dokumen')
            .createSignedUrls(chunk, 23 * 60 * 60);
          if (!batchError && data) {
            applySignedByIndex(chunk, data);
          } else {
            const fallback = await Promise.all(chunk.map(async raw => {
              try {
                const { data: one, error: oneError } = await supabase.storage
                  .from('turnamen-dokumen')
                  .createSignedUrl(raw, 23 * 60 * 60);
                return oneError ? null : one?.signedUrl || null;
              } catch { return null; }
            }));
            applySignedByIndex(chunk, fallback.map(signedUrl => signedUrl ? { signedUrl } : null));
          }
        } catch {}
      }

      if (cancelled) return;
      try { localStorage.removeItem('pb_accepted_photo_cache_v2'); } catch {}
      setPhotoUrls(next);
    };
    void resolvePhotos();
    return () => { cancelled = true; };
  }, [rows]);`;

src = src.slice(0, start) + replacement + src.slice(end + endNeedle.length);
src += `\n\n${marker}\n`;
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-accepted-photo-refresh-v3] disabled stale row-id photo cache and always signs current database photo paths');
