import fs from 'node:fs';

const heroPath = 'src/components/Hero.tsx';
let hero = fs.readFileSync(heroPath, 'utf8');

// Use a real Supabase image as the immediate first-paint fallback instead of a
// video that can leave a black/empty hero while mobile browsers load it.
hero = hero.replace(
  /\{\n    id: 1786206064378,[\s\S]*?active: true\n  \},/,
  `{\n    id: 1784293900169,\n    title: 'PB Bilibili 162',\n    subtitle: 'PB BILIBILI 162 PROFESSIONAL CLUB',\n    image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero/hero-1784293900169-1784294693622.jpg',\n    type: 'image',\n    active: true\n  },`
);

fs.writeFileSync(heroPath, hero);

const helperPath = 'src/utils/siteSettingsHelper.ts';
let helper = fs.readFileSync(helperPath, 'utf8');

// The previous sanitizer forced a legacy default video to become the only
// active slide whenever the current DB config contained image slides. That is
// exactly what produced the black hero on mobile. Keep the DB configuration as
// the source of truth and only fall back when it is genuinely empty.
const start = helper.indexOf("  if (key === 'hero_config') {");
const end = helper.indexOf("\n\n  if (val === null", start);
if (start === -1 || end === -1) throw new Error('hero_config sanitizer block not found');

const replacement = `  if (key === 'hero_config') {
    let parsedBest = val;
    if (typeof val === 'string') {
      try { parsedBest = JSON.parse(val); } catch { parsedBest = val; }
    }

    const rawSlides = parsedBest?.slides || (Array.isArray(parsedBest) ? parsedBest : []);
    const slides = Array.isArray(rawSlides) ? rawSlides.filter((s: any) => s && typeof s === 'object' && s.active !== false) : [];
    const finalSlides = slides.length > 0 ? slides : DEFAULT_HERO_CONFIG.slides;
    const configTs = parsedBest?.updated_at || new Date().toISOString();

    return {
      settings: parsedBest?.settings || DEFAULT_HERO_CONFIG.settings,
      slides: applyCacheBustingToHeroSlides(finalSlides, configTs),
      updated_at: configTs
    };
  }`;

helper = helper.slice(0, start) + replacement + helper.slice(end);
fs.writeFileSync(helperPath, helper);

const sambutanPath = 'src/components/SambutanKetua.tsx';
let sambutan = fs.readFileSync(sambutanPath, 'utf8');

// logos/ketua.png no longer exists in the assets bucket. Keep the section
// visible and replace a failed image with a known-good club/news image rather
// than displaying a broken-image icon and a huge empty block.
sambutan = sambutan.replace(
  `src="https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png"`,
  `src="https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/images/berita/0.3001538882430346.jpg"\n              onError={(e) => {\n                e.currentTarget.src = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero/hero-1784293900169-1784294693622.jpg';\n              }}`
);
fs.writeFileSync(sambutanPath, sambutan);

console.log('Home media fallback and hero sanitizer fixed.');
