import React, { useState, useEffect, useCallback, memo } from 'react';
import { Globe, ChevronDown, Menu, X, MapPin, UserPlus, FileText, Trophy, BrainCircuit, Youtube, Instagram, Facebook, Twitter, Radio, LogIn, LayoutDashboard, LogOut, Timer, HelpCircle, Info, Users, Award, Image as ImageIcon, Building2, Target, Shield, Newspaper, Sparkles } from 'lucide-react';
import { supabase, warmupRouteData } from '../supabase';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export const DEFAULT_NAV_ITEMS = [
  { id: 'home', label: 'Beranda', path: 'home', type: 'link', parent_id: null, order_index: 0 },
  { id: 'about', label: 'Tentang Kami', path: 'about', type: 'dropdown', parent_id: null, order_index: 1 },
  { id: 'sejarah', label: 'Sejarah', path: 'sejarah', type: 'link', parent_id: 'about', order_index: 1 },
  { id: 'visi', label: 'Visi & Misi', path: 'visi-misi', type: 'link', parent_id: 'about', order_index: 2 },
  { id: 'fasilitas', label: 'Fasilitas', path: 'fasilitas', type: 'link', parent_id: 'about', order_index: 3 },
  { id: 'struktur', label: 'Struktur Organisasi', path: 'struktur-organisasi', type: 'link', parent_id: 'about', order_index: 4 },
  { id: 'dokumen', label: 'Dokumen Penting', path: 'dokumen-penting', type: 'link', parent_id: 'about', order_index: 5 },
  { id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },
  { id: 'berita', label: 'Berita', path: 'berita', type: 'link', parent_id: 'informasi', order_index: 1 },
  { id: 'prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', parent_id: 'informasi', order_index: 2 },
  { id: 'atlet', label: 'Atlet', path: 'atlet', type: 'dropdown', parent_id: null, order_index: 3 },
  { id: 'semua-atlet', label: 'Semua Atlet', path: 'Semua', type: 'link', parent_id: 'atlet', order_index: 1 },
  { id: 'senior', label: 'Atlet Senior', path: 'Senior', type: 'link', parent_id: 'atlet', order_index: 2 },
  { id: 'muda', label: 'Atlet Muda / Taruna', path: 'Muda', type: 'link', parent_id: 'atlet', order_index: 3 },
  { id: 'ranking', label: 'Ranking & Poin Atlet', path: 'peringkat', type: 'link', parent_id: 'atlet', order_index: 4 },
  { id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 },
  { id: 'galeri', label: 'Galeri', path: 'gallery', type: 'link', parent_id: null, order_index: 5 },
  { id: 'jadwal', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: null, order_index: 6 },
  { id: 'contact', label: 'Hubungi Kami', path: 'contact', type: 'link', parent_id: null, order_index: 7 },
  { id: 'faq', label: 'FAQ', path: 'faq', type: 'link', parent_id: null, order_index: 8 }
];

export const ATLET_DEFAULT_SUBMENUS = DEFAULT_NAV_ITEMS.filter(i => i.parent_id === 'atlet');
export const isTopLevelMenuItem = (item: any) => !!item && (!item.parent_id || item.parent_id === 'none' || item.parent_id === '');

// Start the next page's network request on pointer-down. On mobile this happens
// before the click event, so the route/chunk/data request is already underway
// while the drawer is closing. Only lazy public views are imported here.
const preloadNavigation = (path: string, subPath?: string) => {
  const p = (path || '').toLowerCase();
  const s = (subPath || '').toLowerCase();
  const target = p === 'atlet' || p === 'players' || ['semua', 'senior', 'muda'].includes(s)
    ? '/atlet'
    : p === 'gallery' || p === 'galeri'
      ? '/galeri'
      : p === 'peringkat' || p === 'ranking' || p === 'rankings'
        ? '/peringkat'
        : p === 'register' || p === 'pendaftaran'
          ? '/register'
          : p === 'prestasi'
            ? '/prestasi'
            : p === 'faq'
              ? '/faq'
              : p === 'berita' || p === 'news'
                ? '/berita'
                : p === 'dokumen' || p === 'dokumen-penting' || p === 'documents'
                  ? '/dokumen-penting'
                  : p === 'struktur' || p === 'struktur-organisasi'
                    ? '/struktur-organisasi'
                    : p === 'sejarah' || p === 'about' || p === 'tentang-kami'
                      ? '/sejarah'
                      : p === 'visi' || p === 'visi-misi' || p === 'misi'
                        ? '/visi-misi'
                        : p === 'fasilitas'
                          ? '/fasilitas'
                          : p === 'jadwal' || p.includes('jadwal')
                            ? '/jadwal'
                            : p === 'contact' || p === 'kontak'
                              ? '/contact'
                              : null;

  if (!target) return;
  warmupRouteData(target);

  switch (target) {
    case '/atlet': void import('./Players'); break;
    case '/galeri': void import('./Gallery'); break;
    case '/peringkat': void import('./Rankings'); break;
    case '/register': void import('./RegistrationForm'); break;
    case '/prestasi': void import('./PublicPrestasi'); break;
    case '/faq': void import('./PublicFAQ'); break;
    case '/dokumen-penting': void import('./DokumenPenting'); break;
    case '/struktur-organisasi': void import('./StrukturOrganisasiPublic'); break;
    default: break;
  }
};

const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = window.setInterval(() => setTime(new Date()), 1000); return () => window.clearInterval(t); }, []);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const d = time.getDate();
  const date = `${d} ${months[time.getMonth()]}`;
  const clock = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151d30]/80 border border-white/10 text-[9px] font-mono font-bold text-slate-300 shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{date}<span className="opacity-40">•</span><span className="text-blue-400">{clock}</span></div>;
});

interface NavbarProps { onNavigate: (sectionId: string, tabId?: string) => void; }

export default function Navbar({ onNavigate }: NavbarProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [navData, setNavData] = useState<any[]>(DEFAULT_NAV_ITEMS);
  const [branding, setBranding] = useState({ logo_url: '/logo_pb_bilibili_162.svg', brand_name_main: 'PB Bilibili', brand_name_accent: '162' });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const syncSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return setSession(data.session);
      const raw = localStorage.getItem('local_admin_session');
      setSession(raw ? JSON.parse(raw) : null);
    } catch { setSession(null); }
  }, []);

  const fetchNav = useCallback(async () => {
    try {
      const { data } = await supabase.from('navbar_settings').select('*').order('order_index', { ascending: true });
      if (Array.isArray(data) && data.length) { setNavData(data); localStorage.setItem('site_setting_navbar_items', JSON.stringify(data)); return; }
      const { data: setting } = await supabase.from('site_settings').select('value').eq('key', 'navbar_items').maybeSingle();
      const value = typeof setting?.value === 'string' ? JSON.parse(setting.value) : setting?.value;
      const list = Array.isArray(value) ? value : value?.items;
      if (Array.isArray(list) && list.length) setNavData(list);
    } catch { /* keep instant defaults */ }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'navbar_branding').maybeSingle();
      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      if (value) setBranding({ logo_url: value.logo_url || '/logo_pb_bilibili_162.svg', brand_name_main: value.brand_name_main || 'PB Bilibili', brand_name_accent: value.brand_name_accent || '162' });
    } catch { /* keep defaults */ }
  }, []);

  useEffect(() => {
    syncSession();
    const { data: auth } = supabase.auth.onAuthStateChange((_event, s) => setSession(s || null));
    const onLocalAuth = () => syncSession();
    window.addEventListener('local-session-changed', onLocalAuth);
    return () => { auth.subscription.unsubscribe(); window.removeEventListener('local-session-changed', onLocalAuth); };
  }, [syncSession]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('site_setting_navbar_items');
      const value = cached ? JSON.parse(cached) : null;
      if (Array.isArray(value) && value.length) setNavData(value);
    } catch {}
    fetchNav(); fetchBranding();

    const channel = supabase.channel(`navbar-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navbar_settings' }, () => fetchNav())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        const key = payload?.new?.key;
        if (key === 'navbar_branding') fetchBranding();
        if (key === 'navbar_items') fetchNav();
      });
    void channel.subscribe();
    const onSetting = (e: any) => { if (e.detail?.key === 'navbar_branding') fetchBranding(); if (e.detail?.key === 'navbar_items') fetchNav(); };
    window.addEventListener('site_setting_updated', onSetting);
    return () => { supabase.removeChannel(channel); window.removeEventListener('site_setting_updated', onSetting); };
  }, [fetchNav, fetchBranding]);

  const getSubMenus = (parentId: string) => {
    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());
    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;
    return list;
  };

  const iconFor = (path = '', label = '') => {
    const p = path.toLowerCase(), l = label.toLowerCase();
    const C = p.includes('jadwal') ? Timer : p.includes('berita') ? Newspaper : p.includes('prestasi') ? Award : p.includes('atlet') || l.includes('atlet') ? Users : p.includes('peringkat') || p.includes('rank') ? Trophy : p.includes('gallery') || p.includes('galeri') ? ImageIcon : p.includes('contact') || l.includes('hubungi') ? MapPin : p.includes('faq') ? HelpCircle : p.includes('fasilitas') ? Building2 : p.includes('visi') ? Target : p.includes('struktur') ? Users : p.includes('dokumen') ? FileText : p.includes('tentang') || p === 'about' ? Shield : p === 'quiz' ? BrainCircuit : p === 'home' ? Globe : Sparkles;
    return <C size={15} className="shrink-0 text-blue-400" />;
  };

  const go = (path: string, subPath?: string) => {
    setOpenMenu(null); setMobileOpen(false);
    const p = (path || '').toLowerCase(); const s = (subPath || '').toLowerCase();
    if (p === 'home' || p === 'beranda') return onNavigate('home');
    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');
    if (p === 'prestasi') return onNavigate('prestasi');
    if (p === 'gallery' || p === 'galeri') return onNavigate('galeri');
    if (p === 'contact' || p === 'kontak') return onNavigate('contact');
    if (p === 'faq') return onNavigate('faq');
    if (p === 'register' || p === 'pendaftaran') return onNavigate('register');
    if (p === 'peringkat' || p === 'ranking' || p === 'rankings') return onNavigate('peringkat');
    if (p === 'jadwal' || p.includes('jadwal')) return onNavigate('jadwal');
    onNavigate(p || s);
  };

  const handleNavigationPointerDown = (path: string, subPath?: string) => {
    preloadNavigation(path, subPath);
  };

  const logout = async () => {
    const result = await Swal.fire({ title: 'Keluar Sistem?', text: 'Anda yakin ingin keluar dari sesi?', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal', background: '#0f172a', color: '#fff' });
    if (!result.isConfirmed) return;
    localStorage.removeItem('local_admin_session');
    try { await supabase.auth.signOut(); } catch {}
    setSession(null); navigate('/login', { replace: true });
  };

  const topMenus = navData.filter(isTopLevelMenuItem).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));

  return <>
    <nav className="fixed top-0 left-0 right-0 h-14 lg:h-16 z-[10000] bg-slate-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-4 md:px-8 flex items-center justify-between gap-3">
        <button type="button" onPointerDown={() => handleNavigationPointerDown('home')} onClick={() => go('home')} className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Beranda PB Bilibili 162">
          <img src={branding.logo_url} alt="PB Bilibili 162" className="w-9 h-9 lg:w-10 lg:h-10 object-contain" loading="eager" decoding="async" onError={e => { e.currentTarget.src = '/logo_pb_bilibili_162.svg'; }} />
          <span className="hidden xs:flex flex-col text-left leading-none"><span className="font-black italic text-xs sm:text-sm lg:text-base uppercase whitespace-nowrap">{branding.brand_name_main} <b className="text-blue-500">{branding.brand_name_accent}</b></span><span className="text-[6px] sm:text-[7px] tracking-[.2em] text-slate-400 uppercase mt-1">Professional Club</span></span>
        </button>
        <LiveClock />
        <div className="hidden lg:flex items-center gap-4 xl:gap-6 ml-auto">
          {topMenus.map(menu => { const subs = getSubMenus(menu.id); const drop = menu.type === 'dropdown' || subs.length > 0; return <div key={menu.id} className="relative" onMouseEnter={() => drop && setOpenMenu(menu.id)} onMouseLeave={() => drop && setOpenMenu(null)}>
            <button type="button" onPointerDown={() => handleNavigationPointerDown(menu.path)} onClick={() => !drop && go(menu.path)} className="h-16 flex items-center gap-1.5 text-[11px] xl:text-xs font-bold uppercase tracking-wide text-slate-300 hover:text-white transition-colors">{menu.label}{drop && <ChevronDown size={12} className={openMenu === menu.id ? 'rotate-180' : ''} />}</button>
            {drop && openMenu === menu.id && <div className="absolute top-full left-0 w-64 pt-2"><div className="rounded-xl border border-white/10 bg-slate-900/98 shadow-2xl overflow-hidden">{subs.map(sub => <button key={sub.id} type="button" onPointerDown={() => handleNavigationPointerDown(menu.path, sub.path)} onClick={() => go(menu.path, sub.path)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-blue-500/10 hover:text-white">{iconFor(sub.path, sub.label)}<span>{sub.label}</span></button>)}</div></div>}
          </div>})}
          {session ? <><button type="button" onClick={() => navigate('/admin/dashboard')} className="px-3 py-2 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase"><LayoutDashboard size={13} className="inline mr-1" />Dashboard</button><button type="button" onClick={logout} className="p-2 rounded-full bg-red-500/10 text-red-300"><LogOut size={15}/></button></> : <button type="button" onClick={() => navigate('/login')} className="px-3 py-2 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase"><LogIn size={13} className="inline mr-1"/>Login</button>}
        </div>
        <button id="mobile-sidebar-toggle-btn" type="button" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'} aria-expanded={mobileOpen} className="lg:hidden w-11 h-11 shrink-0 rounded-2xl bg-slate-800/90 border border-white/15 flex items-center justify-center text-slate-200 shadow-lg active:scale-95 transition-transform"><span className="flex flex-col gap-1.5"><i className={`block w-5 h-0.5 bg-blue-300 rounded ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} /><i className={`block w-4 h-0.5 bg-slate-300 rounded ml-auto ${mobileOpen ? 'opacity-0' : ''}`} /><i className={`block w-5 h-0.5 bg-blue-300 rounded ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} /></span></button>
      </div>
    </nav>

    <div className={`lg:hidden fixed inset-0 z-[99998] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />

    <aside aria-label="Menu navigasi seluler" className={`lg:hidden fixed inset-y-0 left-0 z-[99999] w-[min(86vw,350px)] max-w-[350px] bg-[#0b1224] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-16 min-h-16 shrink-0 px-4 flex items-center justify-between border-b border-white/10 bg-slate-950/95">
        <div className="flex items-center gap-2.5 min-w-0"><img src={branding.logo_url} className="w-9 h-9 object-contain shrink-0" alt="PB Bilibili 162" loading="eager"/><div className="min-w-0 font-black text-sm italic uppercase truncate">{branding.brand_name_main} <span className="text-blue-500">{branding.brand_name_accent}</span><span className="block text-[7px] tracking-[.18em] text-slate-500 not-italic mt-0.5">PROFESSIONAL CLUB</span></div></div>
        <button type="button" onClick={() => setMobileOpen(false)} className="w-10 h-10 min-w-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 active:scale-95" aria-label="Tutup menu"><X size={19}/></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
        <div className="space-y-0.5 pb-2">
          {topMenus.map(menu => {
            const subs = getSubMenus(menu.id);
            const drop = menu.type === 'dropdown' || subs.length > 0;
            const expanded = openMenu === menu.id;
            return <div key={menu.id} className="rounded-xl overflow-hidden">
              <button type="button" onPointerDown={() => handleNavigationPointerDown(menu.path)} onClick={() => drop ? setOpenMenu(expanded ? null : menu.id) : go(menu.path)} className={`w-full min-h-[48px] px-3 flex items-center justify-between gap-3 rounded-xl text-left text-[14px] leading-5 font-bold uppercase tracking-[.01em] transition-colors ${expanded ? 'bg-blue-600/15 text-blue-300' : 'text-slate-200 hover:bg-white/5 active:bg-white/10'}`}>
                <span className="flex items-center gap-3 min-w-0"><span className="w-6 min-w-6 flex justify-center">{iconFor(menu.path, menu.label)}</span><span className="truncate">{menu.label}</span></span>
                {drop && <ChevronDown size={15} className={`shrink-0 transition-transform ${expanded ? 'rotate-180 text-blue-400' : 'text-slate-500'}`}/>}
              </button>
              {drop && expanded && <div className="ml-4 pl-3 border-l border-blue-500/40 py-0.5 my-0.5">{subs.map(sub => <button key={sub.id} type="button" onPointerDown={() => handleNavigationPointerDown(menu.path, sub.path)} onClick={() => go(menu.path, sub.path)} className="w-full min-h-[42px] px-2.5 flex items-center gap-2.5 text-left text-[13px] leading-5 text-slate-300 hover:text-white hover:bg-white/5 active:bg-white/10 rounded-lg"><span className="w-5 min-w-5 flex justify-center">{iconFor(sub.path, sub.label)}</span><span className="truncate">{sub.label}</span></button>)}</div>}
            </div>;
          })}
        </div>
        <div className="border-t border-white/10 pt-2 mt-1 space-y-0.5">
          {session ? <><button type="button" onPointerDown={() => handleNavigationPointerDown('/admin/dashboard')} onClick={() => { setMobileOpen(false); navigate('/admin/dashboard'); }} className="w-full min-h-[46px] px-3 rounded-xl text-emerald-300 hover:bg-emerald-500/10 text-left font-bold"><LayoutDashboard size={16} className="inline mr-3"/>Dashboard</button><button type="button" onClick={logout} className="w-full min-h-[46px] px-3 rounded-xl text-red-300 hover:bg-red-500/10 text-left font-bold"><LogOut size={16} className="inline mr-3"/>Keluar Sesi</button></> : <button type="button" onClick={() => { setMobileOpen(false); navigate('/login'); }} className="w-full min-h-[46px] px-3 rounded-xl bg-blue-500/10 border border-blue-500/15 text-blue-300 text-left font-bold"><LogIn size={16} className="inline mr-3"/>Portal Login</button>}
        </div>
      </div>

      <div className="shrink-0 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-white/10 bg-slate-950/95">
        <button type="button" onPointerDown={() => handleNavigationPointerDown('register')} onClick={() => go('register')} className="w-full min-h-[60px] px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left active:scale-[.99] transition-transform"><span className="block text-[8px] uppercase tracking-[.18em] text-blue-400">Pendaftaran</span><span className="block font-bold text-white text-sm mt-0.5 truncate">Gabung Atlet Baru</span></button>
        <div className="flex justify-center gap-5 mt-2.5 text-slate-500"><Youtube size={15}/><Instagram size={15}/><Facebook size={15}/><Twitter size={15}/></div>
      </div>
    </aside>
  </>;
}
