import { supabase } from '../supabase';

type ClubRecord = { name: string };

const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const clean = (value: unknown) => String(value ?? '').trim();

async function loadClubs(): Promise<ClubRecord[]> {
  const [seeded, members, tournamentRegistrations] = await Promise.allSettled([
    supabase.from('seeded_players').select('club_name').limit(10000),
    supabase.from('pendaftaran').select('asal_pb').limit(5000),
    supabase.from('pendaftaran_turnamen').select('asal_pb').limit(5000),
  ]);

  const map = new Map<string, string>();
  const add = (value: unknown) => {
    const name = clean(value);
    const key = norm(name);
    if (key && !map.has(key)) map.set(key, name);
  };

  if (seeded.status === 'fulfilled' && seeded.value.data) seeded.value.data.forEach((row: any) => add(row.club_name));
  if (members.status === 'fulfilled' && members.value.data) members.value.data.forEach((row: any) => add(row.asal_pb));
  if (tournamentRegistrations.status === 'fulfilled' && tournamentRegistrations.value.data) tournamentRegistrations.value.data.forEach((row: any) => add(row.asal_pb));

  return Array.from(map.values())
    .sort((a, b) => a.localeCompare(b, 'id-ID', { sensitivity: 'base' }))
    .map(name => ({ name }));
}

function findClubInput(): HTMLInputElement | null {
  const labels = Array.from(document.querySelectorAll('label'));
  for (const label of labels) {
    const text = norm(label.textContent);
    if (!(text.includes('asal pb') && text.includes('klub'))) continue;
    const input = label.querySelector('input');
    if (input instanceof HTMLInputElement) return input;
  }

  const candidates = Array.from(document.querySelectorAll('input'));
  for (const input of candidates) {
    if (!(input instanceof HTMLInputElement)) continue;
    const placeholder = norm(input.getAttribute('placeholder'));
    const parentText = norm(input.parentElement?.parentElement?.textContent);
    if (
      placeholder.includes('pb/klub') ||
      placeholder.includes('pb / klub') ||
      placeholder.includes('asal pb') ||
      placeholder.includes('nama pb') ||
      parentText.includes('asal pb / klub') ||
      parentText.includes('asal pb/klub')
    ) return input;
  }

  return null;
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function attachClubAutocomplete(input: HTMLInputElement, clubs: ClubRecord[]) {
  if (input.dataset.pbClubAutocomplete === '1') return;
  input.dataset.pbClubAutocomplete = '1';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.placeholder = 'Ketik nama PB/Klub untuk mencari...';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;min-width:0;z-index:40;box-sizing:border-box;';
  input.parentElement?.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const status = document.createElement('div');
  status.dataset.pbClubStatus = '1';
  status.style.cssText = 'min-height:18px;margin-top:6px;padding:0 2px;font:700 10px/1.35 system-ui,sans-serif;overflow-wrap:anywhere;';
  wrapper.appendChild(status);

  const dropdown = document.createElement('div');
  dropdown.style.cssText = 'display:none;width:100%;max-width:100%;max-height:240px;overflow-x:hidden;overflow-y:auto;box-sizing:border-box;margin-top:7px;background:#071225;border:1px solid rgba(96,165,250,.30);border-radius:14px;box-shadow:0 16px 36px rgba(0,0,0,.42);padding:5px;z-index:50;-webkit-overflow-scrolling:touch;';
  wrapper.appendChild(dropdown);

  let active = false;
  let selectedKey = '';

  const render = () => {
    const query = norm(input.value);
    dropdown.innerHTML = '';

    if (!query) {
      dropdown.style.display = 'none';
      status.textContent = '';
      status.style.color = '#94a3b8';
      return;
    }

    const matches = clubs
      .filter(club => norm(club.name).includes(query))
      .sort((a, b) => {
        const aq = norm(a.name) === query ? 0 : norm(a.name).startsWith(query) ? 1 : 2;
        const bq = norm(b.name) === query ? 0 : norm(b.name).startsWith(query) ? 1 : 2;
        return aq - bq || a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' });
      })
      .slice(0, 40);

    if (!matches.length) {
      dropdown.style.display = 'none';
      selectedKey = '';
      status.textContent = `⚠ PB/Klub \"${input.value.trim()}\" belum ditemukan di database`;
      status.style.color = '#fbbf24';
      return;
    }

    status.textContent = `${matches.length}${matches.length === 40 ? '+' : ''} PB/Klub ditemukan di database`;
    status.style.color = '#60a5fa';
    dropdown.style.display = 'block';

    matches.forEach(club => {
      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText = 'display:block;width:100%;max-width:100%;box-sizing:border-box;text-align:left;padding:11px 12px;margin:0;border:0;border-radius:10px;background:transparent;color:#fff;cursor:pointer;touch-action:manipulation;overflow:hidden;';
      button.innerHTML = `<div style="font:900 13px/1.35 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;">${escapeHtml(club.name)}</div><div style="margin-top:3px;color:#64748b;font:600 9px/1.35 system-ui,sans-serif;">PB/Klub terdaftar</div>`;
      button.addEventListener('mouseenter', () => { button.style.background = 'rgba(37,99,235,.16)'; });
      button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        setReactInputValue(input, club.name.toUpperCase());
        selectedKey = norm(club.name);
        status.textContent = `✓ PB/Klub terverifikasi: ${club.name}`;
        status.style.color = '#34d399';
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(button);
    });
  };

  input.addEventListener('input', () => {
    selectedKey = '';
    render();
  });
  input.addEventListener('focus', () => {
    active = true;
    if (input.value.trim()) render();
  });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      active = false;
      dropdown.style.display = 'none';
      const key = norm(input.value);
      const exact = clubs.find(club => norm(club.name) === key);
      if (exact && key === selectedKey) return;
      if (exact) {
        status.textContent = `✓ PB/Klub terverifikasi: ${exact.name}`;
        status.style.color = '#34d399';
      } else if (key) {
        status.textContent = '⚠ Nama PB/Klub belum cocok. Pilih dari hasil pencarian untuk memastikan data sesuai database.';
        status.style.color = '#fbbf24';
      }
    }, 150);
  });

  document.addEventListener('pointerdown', event => {
    if (active && !wrapper.contains(event.target as Node)) dropdown.style.display = 'none';
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

export function installRegistrationClubAutocomplete() {
  if (typeof window === 'undefined') return;
  let timer = 0;
  let cache: ClubRecord[] | null = null;
  let loading = false;

  const isRegistrationPage = () => window.location.pathname.toLowerCase().replace(/\/$/, '') === '/pendaftaran-turnamen';

  const attachNow = async () => {
    if (!isRegistrationPage() || loading) return;
    const input = findClubInput();
    if (!input) return;

    if (!cache) {
      loading = true;
      try {
        cache = await loadClubs();
      } catch (error) {
        console.error('Gagal memuat daftar PB/Klub:', error);
        cache = [];
      } finally {
        loading = false;
      }
    }

    attachClubAutocomplete(input, cache || []);
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void attachNow(), 150);
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
}
