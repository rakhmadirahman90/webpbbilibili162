import { supabase } from '../supabase';

type PlayerRecord = { name: string; club?: string; seeded?: string; level?: string; category?: string; source?: string };
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const clean = (value: unknown) => String(value ?? '').trim();

async function loadPlayers(): Promise<PlayerRecord[]> {
  const [seeded, registered] = await Promise.allSettled([
    supabase.from('seeded_players').select('player_name,club_name,seeded_quality,division_level,eligible_category').limit(10000),
    supabase.from('pendaftaran').select('nama,asal_pb,kategori,kategori_atlet').limit(5000),
  ]);

  // Jangan deduplicate berdasarkan nama saja. Satu nama dapat sah muncul pada
  // beberapa PB/Klub dan/atau memiliki seeded berbeda. Kunci unik dibuat dari
  // Nama + Klub + Seeded + Level + Kategori agar seluruh record seeded tetap
  // muncul pada pencarian pendaftaran.
  const map = new Map<string, PlayerRecord>();
  const addSeeded = (row: any) => {
    const name = clean(row.player_name);
    const club = clean(row.club_name);
    const seeded = clean(row.seeded_quality);
    const level = clean(row.division_level);
    const category = clean(row.eligible_category);
    const key = [norm(name), norm(club), norm(seeded), norm(level), norm(category)].join('::');
    if (!norm(name) || map.has(key)) return;
    map.set(key, { name, club, seeded, level, category, source: 'Seeded resmi' });
  };
  const addRegistered = (row: any) => {
    const name = clean(row.nama);
    const club = clean(row.asal_pb);
    const category = clean(row.kategori_atlet || row.kategori);
    const key = [norm(name), norm(club), '', '', norm(category)].join('::');
    if (!norm(name) || map.has(key)) return;
    // Hanya tambahkan dari database atlet jika belum ada record seeded dengan
    // kombinasi yang sama; seeded resmi tetap menjadi sumber utama.
    const hasSeededSameIdentity = Array.from(map.values()).some(p => norm(p.name) === norm(name) && norm(p.club) === norm(club));
    if (hasSeededSameIdentity) return;
    map.set(key, { name, club, category, source: 'Database atlet' });
  };

  if (seeded.status === 'fulfilled' && seeded.value.data) seeded.value.data.forEach(addSeeded);
  if (registered.status === 'fulfilled' && registered.value.data) registered.value.data.forEach(addRegistered);

  return Array.from(map.values()).sort((a, b) => {
    const nameOrder = a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' });
    if (nameOrder !== 0) return nameOrder;
    const clubOrder = norm(a.club).localeCompare(norm(b.club), 'id-ID', { sensitivity: 'base' });
    if (clubOrder !== 0) return clubOrder;
    return norm(a.seeded).localeCompare(norm(b.seeded), 'id-ID', { sensitivity: 'base' });
  });
}

function findInputs(): HTMLInputElement[] {
  const labels = Array.from(document.querySelectorAll('label'));
  const result: HTMLInputElement[] = [];
  labels.forEach((label) => { const text = norm(label.textContent); if (!text.includes('nama pemain')) return; const input = label.querySelector('input'); if (input instanceof HTMLInputElement && !result.includes(input)) result.push(input); });
  if (result.length < 2) Array.from(document.querySelectorAll('input')).filter(input => norm(input.getAttribute('placeholder')).includes('nama pemain')).forEach(input => { if (input instanceof HTMLInputElement && !result.includes(input)) result.push(input); });
  return result.slice(0, 2);
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function attach(input: HTMLInputElement, players: PlayerRecord[], index: number) {
  if (input.dataset.pbPlayerAutocomplete === '1') return;
  input.dataset.pbPlayerAutocomplete = '1'; input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false'); input.placeholder = 'Ketik nama pemain untuk mencari...';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;min-width:0;z-index:20;box-sizing:border-box;';
  input.parentElement?.insertBefore(wrapper, input); wrapper.appendChild(input);

  const status = document.createElement('div');
  status.dataset.pbPlayerStatus = '1';
  status.style.cssText = 'min-height:18px;margin-top:5px;padding:0 2px;font:700 10px/1.35 system-ui,sans-serif;overflow-wrap:anywhere;';
  wrapper.appendChild(status);

  const dropdown = document.createElement('div');
  dropdown.style.cssText = 'display:none;position:relative;left:auto;right:auto;top:auto;width:100%;max-width:100%;max-height:280px;overflow-x:hidden;overflow-y:auto;box-sizing:border-box;margin-top:6px;background:#071225;border:1px solid rgba(96,165,250,.28);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.38);padding:5px;z-index:30;-webkit-overflow-scrolling:touch;';
  wrapper.appendChild(dropdown);

  let active = false; let selectedKey = '';
  const render = () => {
    const query = norm(input.value); dropdown.innerHTML = '';
    if (!query) { dropdown.style.display = 'none'; status.textContent = ''; status.style.color = '#94a3b8'; return; }
    const matches = players.filter(p => norm(p.name).includes(query) || norm(p.club).includes(query)).sort((a,b) => {
      const aq = norm(a.name) === query ? 0 : norm(a.name).startsWith(query) ? 1 : 2, bq = norm(b.name) === query ? 0 : norm(b.name).startsWith(query) ? 1 : 2;
      return aq - bq || a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' }) || norm(a.club).localeCompare(norm(b.club), 'id-ID', { sensitivity: 'base' }) || norm(a.seeded).localeCompare(norm(b.seeded), 'id-ID', { sensitivity: 'base' });
    }).slice(0, 50);
    if (!matches.length) { dropdown.style.display = 'none'; selectedKey = ''; status.textContent = `⚠ Pemain \"${input.value.trim()}\" belum ditemukan di database`; status.style.color = '#fbbf24'; return; }
    status.textContent = `${matches.length}${matches.length === 50 ? '+' : ''} pemain ditemukan di database seeded`; status.style.color = '#60a5fa'; dropdown.style.display = 'block';
    matches.forEach(player => {
      const button = document.createElement('button'); button.type = 'button';
      button.style.cssText = 'display:block;width:100%;max-width:100%;box-sizing:border-box;text-align:left;padding:10px 11px;margin:0;border:0;border-radius:10px;background:transparent;color:#fff;cursor:pointer;touch-action:manipulation;overflow:hidden;';
      button.innerHTML = `<div style=\"font:900 12px/1.3 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;\">${escapeHtml(player.name)}</div><div style=\"margin-top:3px;color:#94a3b8;font:600 9px/1.35 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;\">${escapeHtml([player.club, player.seeded ? `Seeded ${player.seeded}` : '', player.level, player.category].filter(Boolean).join(' • '))}</div>`;
      button.addEventListener('mouseenter', () => { button.style.background = 'rgba(37,99,235,.16)'; });
      button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => { setReactInputValue(input, player.name.toUpperCase()); selectedKey = [norm(player.name), norm(player.club), norm(player.seeded)].join('::'); status.textContent = `✓ Terverifikasi: ${player.source || 'database'}${player.club ? ` • ${player.club}` : ''}${player.seeded ? ` • Seeded ${player.seeded}` : ''}`; status.style.color = '#34d399'; dropdown.style.display = 'none'; });
      dropdown.appendChild(button);
    });
  };
  input.addEventListener('input', () => { selectedKey = ''; render(); });
  input.addEventListener('focus', () => { active = true; if (input.value.trim()) render(); });
  input.addEventListener('blur', () => { window.setTimeout(() => { active = false; dropdown.style.display = 'none'; const key = norm(input.value); const exact = players.filter(p => norm(p.name) === key); if (exact.length) { status.textContent = `✓ ${exact.length} data ditemukan untuk ${input.value.trim()}. Pilih PB/Klub + Seeded yang sesuai.`; status.style.color = '#34d399'; } else if (key) { status.textContent = '⚠ Nama belum cocok dengan database. Pilih dari hasil pencarian untuk memastikan data pemain.'; status.style.color = '#fbbf24'; } }, 150); });
  document.addEventListener('pointerdown', event => { if (active && !wrapper.contains(event.target as Node)) dropdown.style.display = 'none'; });
  input.dataset.pbPlayerIndex = String(index + 1);
}

function escapeHtml(value: string) { return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', \"'\": '&#39;', '\"': '&quot;' }[char] || char)); }

export function installRegistrationPlayerAutocomplete() {
  if (typeof window === 'undefined') return;
  let timer = 0; let cache: PlayerRecord[] | null = null; let loading = false;
  const isRegistrationPage = () => window.location.pathname.toLowerCase().replace(/\/$/, '') === '/pendaftaran-turnamen';
  const attachNow = async () => {
    if (!isRegistrationPage()) return; const inputs = findInputs(); if (!inputs.length || loading) return;
    if (!cache) { loading = true; try { cache = await loadPlayers(); } catch (error) { console.error('Gagal memuat database pemain:', error); cache = []; } finally { loading = false; } }
    inputs.forEach((input, index) => attach(input, cache || [], index));
  };
  const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void attachNow(), 150); };
  schedule(); const observer = new MutationObserver(schedule); observer.observe(document.body, { childList: true, subtree: true }); window.addEventListener('popstate', schedule); window.addEventListener('hashchange', schedule);
}

// Reliability guard for public tournament registration uploads.
// The registration form uploads four identity files together. On mobile/spotty
// connections, concurrent multipart uploads can surface as a generic
// \"Failed to fetch\" even though Supabase Storage itself is healthy. Queue only
// Storage object uploads so each file gets a clean connection, then retry
// transient network failures with exponential backoff.
let storageUploadQueue: Promise<void> = Promise.resolve();
const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const isTransientUploadError = (error: unknown) => {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network error') || message.includes('load failed') || message.includes('fetch failed');
};

function installReliableStorageUploads() {
  if (typeof window === 'undefined') return;
  const storage = supabase.storage as any;
  if (storage.__pbReliableUploadInstalled) return;
  const originalFrom = storage.from.bind(storage);
  storage.from = (bucketId: string) => {
    const bucket = originalFrom(bucketId);
    if (!bucket || typeof bucket.upload !== 'function') return bucket;
    const originalUpload = bucket.upload.bind(bucket);
    bucket.upload = (...args: any[]) => {
      const run = async () => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const result = await originalUpload(...args);
            if (result?.error && isTransientUploadError(result.error) && attempt < 2) {
              lastError = result.error;
              await sleep(700 * (attempt + 1));
              continue;
            }
            return result;
          } catch (error) {
            lastError = error;
            if (!isTransientUploadError(error) || attempt >= 2) throw error;
            await sleep(700 * (attempt + 1));
          }
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Upload gagal karena gangguan jaringan.'));
      };
      const result = storageUploadQueue.then(run, run);
      storageUploadQueue = result.then(() => undefined, () => undefined);
      return result;
    };
    return bucket;
  };
  storage.__pbReliableUploadInstalled = true;
}

installReliableStorageUploads();
