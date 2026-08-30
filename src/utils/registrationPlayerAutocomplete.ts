import { supabase } from '../supabase';

type PlayerRecord = { name: string; club?: string; seeded?: string; level?: string; category?: string; source?: string };
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const clean = (value: unknown) => String(value ?? '').trim();

async function loadPlayers(): Promise<PlayerRecord[]> {
  const [seeded, registered] = await Promise.allSettled([
    supabase.from('seeded_players').select('player_name,club_name,seeded_quality,division_level,eligible_category').limit(5000),
    supabase.from('pendaftaran').select('nama,asal_pb,kategori,kategori_atlet').limit(5000),
  ]);
  const map = new Map<string, PlayerRecord>();
  if (seeded.status === 'fulfilled' && seeded.value.data) seeded.value.data.forEach((row: any) => {
    const name = clean(row.player_name), key = norm(name); if (!key || map.has(key)) return;
    map.set(key, { name, club: clean(row.club_name), seeded: clean(row.seeded_quality), level: clean(row.division_level), category: clean(row.eligible_category), source: 'Seeded resmi' });
  });
  if (registered.status === 'fulfilled' && registered.value.data) registered.value.data.forEach((row: any) => {
    const name = clean(row.nama), key = norm(name); if (!key) return;
    const existing = map.get(key);
    if (existing) { if (!existing.club) existing.club = clean(row.asal_pb); if (!existing.category) existing.category = clean(row.kategori_atlet || row.kategori); return; }
    map.set(key, { name, club: clean(row.asal_pb), category: clean(row.kategori_atlet || row.kategori), source: 'Database atlet' });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' }));
}

function findInputs(): HTMLInputElement[] {
  const labels = Array.from(document.querySelectorAll('label'));
  const result: HTMLInputElement[] = [];
  labels.forEach((label) => { const text = norm(label.textContent); if (!text.includes('nama pemain')) return; const input = label.querySelector('input'); if (input instanceof HTMLInputElement) result.push(input); });
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
  dropdown.style.cssText = 'display:none;position:relative;left:auto;right:auto;top:auto;width:100%;max-width:100%;max-height:190px;overflow-x:hidden;overflow-y:auto;box-sizing:border-box;margin-top:6px;background:#071225;border:1px solid rgba(96,165,250,.28);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.38);padding:5px;z-index:30;-webkit-overflow-scrolling:touch;';
  wrapper.appendChild(dropdown);

  let active = false; let selectedKey = '';
  const render = () => {
    const query = norm(input.value); dropdown.innerHTML = '';
    if (!query) { dropdown.style.display = 'none'; status.textContent = ''; status.style.color = '#94a3b8'; return; }
    const matches = players.filter(p => norm(p.name).includes(query) || norm(p.club).includes(query)).sort((a,b) => {
      const aq = norm(a.name) === query ? 0 : norm(a.name).startsWith(query) ? 1 : 2, bq = norm(b.name) === query ? 0 : norm(b.name).startsWith(query) ? 1 : 2;
      return aq - bq || a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' });
    }).slice(0, 30);
    if (!matches.length) { dropdown.style.display = 'none'; selectedKey = ''; status.textContent = `⚠ Pemain "${input.value.trim()}" belum ditemukan di database`; status.style.color = '#fbbf24'; return; }
    status.textContent = `${matches.length}${matches.length === 30 ? '+' : ''} pemain ditemukan di database`; status.style.color = '#60a5fa'; dropdown.style.display = 'block';
    matches.forEach(player => {
      const button = document.createElement('button'); button.type = 'button';
      button.style.cssText = 'display:block;width:100%;max-width:100%;box-sizing:border-box;text-align:left;padding:9px 10px;margin:0;border:0;border-radius:10px;background:transparent;color:#fff;cursor:pointer;touch-action:manipulation;overflow:hidden;';
      button.innerHTML = `<div style="font:900 12px/1.3 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;">${escapeHtml(player.name)}</div><div style="margin-top:3px;color:#94a3b8;font:600 9px/1.35 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;">${escapeHtml([player.club, player.seeded ? `Seeded ${player.seeded}` : '', player.level, player.category].filter(Boolean).join(' • '))}</div>`;
      button.addEventListener('mouseenter', () => { button.style.background = 'rgba(37,99,235,.16)'; });
      button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => { setReactInputValue(input, player.name.toUpperCase()); selectedKey = norm(player.name); status.textContent = `✓ Terverifikasi: ${player.source || 'database'}${player.club ? ` • ${player.club}` : ''}`; status.style.color = '#34d399'; dropdown.style.display = 'none'; });
      dropdown.appendChild(button);
    });
  };
  input.addEventListener('input', () => { selectedKey = ''; render(); });
  input.addEventListener('focus', () => { active = true; if (input.value.trim()) render(); });
  input.addEventListener('blur', () => { window.setTimeout(() => { active = false; dropdown.style.display = 'none'; const key = norm(input.value); const exact = players.find(p => norm(p.name) === key); if (exact && key === selectedKey) return; if (exact) { status.textContent = `✓ Ditemukan di database: ${exact.source || 'database'}${exact.club ? ` • ${exact.club}` : ''}`; status.style.color = '#34d399'; } else if (key) { status.textContent = '⚠ Nama belum cocok dengan database. Pilih dari hasil pencarian untuk memastikan data pemain.'; status.style.color = '#fbbf24'; } }, 150); });
  document.addEventListener('pointerdown', event => { if (active && !wrapper.contains(event.target as Node)) dropdown.style.display = 'none'; });
  input.dataset.pbPlayerIndex = String(index + 1);
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char)); }

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
