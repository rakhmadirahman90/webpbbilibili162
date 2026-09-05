import fs from 'node:fs';

const file = 'src/components/SeededTurnamen.tsx';
let s = fs.readFileSync(file, 'utf8');
const marker = '/* __SEEDED_TURNAMEN_FORM_DATA_V1__ */';
if (s.includes(marker)) {
  console.log('[patch-seeded-turnamen-form-data] already applied');
  process.exit(0);
}

// Keep the form controlled by React, but enhance the existing text inputs with
// native datalists. This avoids fragile DOM value manipulation while still
// giving the admin a searchable database-backed club list.
const stateNeedle = "  const [form,setForm] = useState<FormState>(emptyForm);";
const stateInsert = `${stateNeedle}\n\n  useEffect(() => {\n    if (!formOpen) return;\n    const root = document.body;\n    const timer = window.setTimeout(() => {\n      const findInput = (labelNeedle: string) => Array.from(root.querySelectorAll('label')).find(label => String(label.textContent || '').toLocaleLowerCase('id-ID').includes(labelNeedle.toLocaleLowerCase('id-ID')))?.querySelector('input');\n      const clubInput = findInput('PB / KLUB') as HTMLInputElement | null;\n      const regionInput = findInput('STATUS WILAYAH') as HTMLInputElement | null;\n\n      const ensureDatalist = (id: string, values: string[]) => {\n        let list = document.getElementById(id) as HTMLDataListElement | null;\n        if (!list) {\n          list = document.createElement('datalist');\n          list.id = id;\n          root.appendChild(list);\n        }\n        list.replaceChildren(...values.map(value => { const option = document.createElement('option'); option.value = value; return option; }));\n        return list;\n      };\n\n      const clubValues = Array.from(new Set(players.map(player => text(player.club_name)).filter(Boolean)))\n        .sort((a, b) => a.localeCompare(b, 'id-ID', { sensitivity: 'base' }));\n      if (clubInput) {\n        const list = ensureDatalist('seeded-club-options', clubValues);\n        clubInput.setAttribute('list', list.id);\n        clubInput.setAttribute('autocomplete', 'off');\n        clubInput.placeholder = 'Pilih / ketik PB / Klub...';\n        const host = clubInput.parentElement;\n        if (host && !host.querySelector('[data-seeded-club-help]')) {\n          const help = document.createElement('div');\n          help.dataset.seededClubHelp = '1';\n          help.style.cssText = 'margin-top:5px;font:600 10px/1.4 system-ui,sans-serif;color:#94a3b8;';\n          help.textContent = 'Daftar diambil otomatis dari database. Jika belum ada, ketik nama klub baru — klub akan tersimpan bersama pemain ini.';\n          host.appendChild(help);\n        }\n      }\n\n      const provinces = [\n        'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau',\n        'DKI Jakarta','Jawa Barat','Jawa Tengah','Daerah Istimewa Yogyakarta','Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur',\n        'Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan',\n        'Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'\n      ];\n      const existingRegions = Array.from(new Set(players.map(player => text(player.region_status)).filter(Boolean)));\n      const regionValues = Array.from(new Set([...provinces, ...existingRegions]))\n        .sort((a, b) => a.localeCompare(b, 'id-ID', { sensitivity: 'base' }));\n      if (regionInput) {\n        const list = ensureDatalist('seeded-region-options', regionValues);\n        regionInput.setAttribute('list', list.id);\n        regionInput.setAttribute('autocomplete', 'off');\n        regionInput.placeholder = 'Pilih wilayah Indonesia...';\n        const host = regionInput.parentElement;\n        if (host && !host.querySelector('[data-seeded-region-help]')) {\n          const help = document.createElement('div');\n          help.dataset.seededRegionHelp = '1';\n          help.style.cssText = 'margin-top:5px;font:600 10px/1.4 system-ui,sans-serif;color:#94a3b8;';\n          help.textContent = '38 provinsi Indonesia tersedia + nilai wilayah yang sudah ada di database.';\n          host.appendChild(help);\n        }\n      }\n    }, 50);\n    return () => window.clearTimeout(timer);\n  }, [formOpen, players]);`;
if (!s.includes(stateNeedle)) throw new Error('[patch-seeded-turnamen-form-data] form state marker not found');
s = s.replace(stateNeedle, stateInsert);

// The generated normalized_name column is handled by the existing generated-column patch.
// This patch only changes the two user-facing fields.
s = s.replace(/\{field\(['"]club_name['"]\s*,\s*['"]PB \/ KLUB['"]\)\}/g, "{field('club_name','PB / KLUB')}");
s = s.replace(/\{field\(['"]region_status['"]\s*,\s*['"]Status Wilayah['"]\)\}/g, "{field('region_status','Status Wilayah')}");

s += `\n${marker}\n`;
fs.writeFileSync(file, s, 'utf8');
console.log('[patch-seeded-turnamen-form-data] database-backed club datalist and complete 38-province Indonesia region list enabled');
