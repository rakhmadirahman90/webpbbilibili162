import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/components');
let total = 0;

function patchFile(fileName, replacements) {
  const file = path.join(root, fileName);
  let source = fs.readFileSync(file, 'utf8');
  let changed = 0;

  for (const [oldText, newText, label] of replacements) {
    if (!source.includes(oldText)) {
      throw new Error(`[about-fast-open] Target not found in ${fileName}: ${label}`);
    }
    source = source.replace(oldText, newText);
    changed++;
  }

  if (changed > 0) {
    fs.writeFileSync(file, source, 'utf8');
    total += changed;
    console.log(`[about-fast-open] ${fileName}: ${changed} changes`);
  }
}

// About pages: render immediately from defaults/cache. Supabase is refreshed in
// the background so network latency never blocks the first paint.
patchFile('Sejarah.tsx', [
  [
    "  const [loading, setLoading] = useState(true);",
    "  const [loading, setLoading] = useState(false);",
    'Sejarah loading gate',
  ],
  [
    "      setLoading(true);\n      try {",
    "      try {",
    'Sejarah remove blocking fetch loading',
  ],
  [
    "      } finally {\n        setLoading(false);\n      }",
    "      }",
    'Sejarah remove blocking fetch finally',
  ],
  [
    "          setDynamicContent({\n            sejarah_title: val.sejarah_title,\n            sejarah: val.sejarah_desc,\n            sejarah_image: val.sejarah_img,\n          });",
    "          try { localStorage.setItem('cached_about_content', JSON.stringify(val)); } catch (e) {}\n          setDynamicContent({\n            sejarah_title: val.sejarah_title,\n            sejarah: val.sejarah_desc,\n            sejarah_image: val.sejarah_img,\n          });",
    'Sejarah cache remote content',
  ],
]);

patchFile('VisiMisi.tsx', [
  [
    "  const [loading, setLoading] = useState(true);",
    "  const [loading, setLoading] = useState(false);",
    'VisiMisi loading gate',
  ],
  [
    "      setLoading(true);\n      try {",
    "      try {",
    'VisiMisi remove blocking fetch loading',
  ],
  [
    "      } finally {\n        setLoading(false);\n      }",
    "      }",
    'VisiMisi remove blocking fetch finally',
  ],
  [
    "          setDynamicContent({\n            visi: val.vision || val.visi || \"Menjadi klub bulutangkis terdepan di Sulawesi Selatan yang mencetak atlet-atlet bertaraf nasional, berkarakter kuat, berprestasi tinggi, serta mengedepankan sportivitas dan kebersamaan.\",",
    "          try { localStorage.setItem('cached_about_content', JSON.stringify(val)); } catch (e) {}\n          setDynamicContent({\n            visi: val.vision || val.visi || \"Menjadi klub bulutangkis terdepan di Sulawesi Selatan yang mencetak atlet-atlet bertaraf nasional, berkarakter kuat, berprestasi tinggi, serta mengedepankan sportivitas dan kebersamaan.\",
    'VisiMisi cache remote content',
  ],
]);

patchFile('Fasilitas.tsx', [
  [
    "  const [loading, setLoading] = useState(true);",
    "  const [loading, setLoading] = useState(false);",
    'Fasilitas loading gate',
  ],
  [
    "      setLoading(true);\n      try {",
    "      try {",
    'Fasilitas remove blocking fetch loading',
  ],
  [
    "      } finally {\n        setLoading(false);\n      }",
    "      }",
    'Fasilitas remove blocking fetch finally',
  ],
  [
    "          setDynamicContent({\n            fasilitas_title: val.fasilitas_title || \"Fasilitas Unggulan\",",
    "          try { localStorage.setItem('cached_about_content', JSON.stringify(val)); } catch (e) {}\n          setDynamicContent({\n            fasilitas_title: val.fasilitas_title || \"Fasilitas Unggulan\",",
    'Fasilitas cache remote content',
  ],
]);

// Structure page: start from the last known local snapshot/default immediately,
// refresh silently, and never re-run entrance animations for database updates.
patchFile('StrukturOrganisasiPublic.tsx', [
  [
    "  const [members, setMembers] = useState<Member[]>([]);\n  const [loading, setLoading] = useState(true);",
    "  const [members, setMembers] = useState<Member[]>(() => {\n    try {\n      const cached = localStorage.getItem('cached_organizational_structure') || localStorage.getItem('structure_local_v3');\n      if (cached) {\n        const parsed = JSON.parse(cached);\n        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Member[];\n      }\n    } catch (e) {}\n    return DEFAULT_STRUKTUR as Member[];\n  });\n  const [loading, setLoading] = useState(false);",
    'Structure instant local snapshot',
  ],
  [
    "    const fetchMembers = async () => {\n      try {",
    "    const fetchMembers = async () => {\n      try {",
    'Structure fetch remains background',
  ],
  [
    "          setMembers(DEFAULT_STRUKTUR);\n        }\n      } catch (err) {",
    "          setMembers(DEFAULT_STRUKTUR as Member[]);\n        }\n      } catch (err) {",
    'Structure default typing',
  ],
  [
    "        setMembers(DEFAULT_STRUKTUR);\n      } finally { \n        setLoading(false); \n      }",
    "        setMembers(DEFAULT_STRUKTUR as Member[]);\n      }",
    'Structure remove blocking loading gate',
  ],
  [
    "    window.addEventListener('site_setting_updated', handleUpdate);\n\n    const channel = supabase",
    "    const channel = supabase",
    'Structure remove unrelated site-setting refresh listener',
  ],
  [
    "      window.removeEventListener('site_setting_updated', handleUpdate);\n      supabase.removeChannel(channel);",
    "      supabase.removeChannel(channel);",
    'Structure remove unrelated site-setting cleanup',
  ],
  [
    'initial="hidden" animate="visible" className="flex justify-center flex-wrap gap-2"',
    'initial={false} animate="visible" className="flex justify-center flex-wrap gap-2"',
    'Structure disable entrance blink level 1',
  ],
  [
    'initial="hidden" animate="visible" className="flex flex-wrap justify-center gap-2"',
    'initial={false} animate="visible" className="flex flex-wrap justify-center gap-2"',
    'Structure disable entrance blink levels 2-6',
  ],
]);

console.log(`[about-fast-open] applied ${total} changes`);
