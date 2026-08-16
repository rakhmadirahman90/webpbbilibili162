import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

// News must bypass the local-first Supabase proxy. The proxy can return stale,
// partial or empty cached rows, which causes the article detail to show a blank
// image/title/content even though public.berita has the real record.
const importPattern = /import \{\s*supabase\s*\} from ["']\.\.\/supabase["'];/;
if (importPattern.test(source)) {
  source = source.replace(importPattern, "import { remoteSupabase } from '../supabase';");
}

// This file currently uses the `supabase` identifier throughout for article
// reads/writes and realtime. Point every News operation at the authoritative
// remote client. Do not touch already-correct remoteSupabase identifiers.
source = source.replace(/\bsupabase\b/g, 'remoteSupabase');

// Make article image parsing support plain URLs, comma/space separated URLs,
// and JSON arrays stored in public.berita.gambar_url.
const oldImages = /  const getNewsImages = \(news: Berita\): string\[\] => \{[\s\S]*?\n  \};/;
const newImages = `  const getNewsImages = (news: Berita): string[] => {
    const raw = String(news.gambar_url || '').trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .flatMap(item => typeof item === 'string' ? [item] : [])
          .map(u => u.trim())
          .filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {}

    return raw
      .split(/\\s+|,/)
      .map(u => u.trim())
      .filter(Boolean);
  };`;
if (oldImages.test(source)) source = source.replace(oldImages, newImages);

fs.writeFileSync(path, source);
console.log('News patched to use remote Supabase as the source of truth.');
