import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

const oldHelper = `  // public.berita.gambar_url is the only source for article images.\n  const getNewsImages = (news: Berita): string[] => {\n    if (!news.gambar_url) return [];\n    return news.gambar_url\n      .split(/[\\s,]+/)\n      .map(u => u.trim())\n      .filter(Boolean);\n  };`;

const newHelper = `  // Normalize public.berita.gambar_url from Supabase.\n  // Supports plain URLs, whitespace/comma-separated URLs, and JSON arrays.\n  const getNewsImages = (news: Berita): string[] => {\n    const raw = String(news.gambar_url ?? '').trim();\n    if (!raw) return [];\n\n    try {\n      const parsed = JSON.parse(raw);\n      if (Array.isArray(parsed)) {\n        return parsed\n          .flatMap((item: any) => typeof item === 'string' ? [item] : (item?.url ? [item.url] : []))\n          .map((u: string) => u.trim())\n          .filter(Boolean);\n      }\n      if (parsed && typeof parsed === 'object' && typeof parsed.url === 'string') {\n        return [parsed.url.trim()].filter(Boolean);\n      }\n    } catch {\n      // Not JSON; continue with normal URL parsing.\n    }\n\n    return raw\n      .split(/[\\s,]+/)\n      .map(u => u.replace(/^['\"\\[\\]]+|['\"\\[\\],]+$/g, '').trim())\n      .filter(Boolean);\n  };`;

if (!source.includes('PB_NEWS_IMAGE_FALLBACK_V2')) {
  if (!source.includes(oldHelper)) {
    throw new Error('News image helper block not found; refusing unsafe patch.');
  }
  source = source.replace(oldHelper, `  // PB_NEWS_IMAGE_FALLBACK_V2\n${newHelper}`);
}

const oldHeaderSrc = 'src={getOptimizedImageUrl(img, 1200)}';
const newHeaderSrc = 'src={getOptimizedImageUrl(img, 1200) || \'/logo_pb_bilibili_162.png\'}';
if (source.includes(oldHeaderSrc)) {
  source = source.replace(oldHeaderSrc, newHeaderSrc);
}

const oldReferrer = 'referrerPolicy="no-referrer"\n                        className="w-full h-full object-cover object-center"';
const newReferrer = `referrerPolicy="no-referrer"\n                          onError={(e) => {\n                            const target = e.currentTarget;\n                            if (target.dataset.fallbackStage === '1') {\n                              target.dataset.fallbackStage = '2';\n                              target.src = '/logo_pb_bilibili_162.png';\n                              return;\n                            }\n                            target.dataset.fallbackStage = '1';\n                            target.src = '/api/news-image?id=' + encodeURIComponent(selectedNews.id);\n                          }}\n                        className="w-full h-full object-cover object-center"`;

if (source.includes(oldReferrer) && !source.includes("target.dataset.fallbackStage")) {
  source = source.replace(oldReferrer, newReferrer);
}

fs.writeFileSync(path, source);
console.log('Applied robust news image parsing and header fallback.');
