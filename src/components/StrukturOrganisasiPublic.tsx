import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { DEFAULT_STRUKTUR } from '../data/localDatabase';
import { Award, Briefcase, ShieldCheck, Star, Target, Users, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
  category: string;
  level: number;
  photo_url: string;
  sort_order: number;
}

const CACHE_KEY = 'cached_organizational_structure';
const LEGACY_CACHE_KEY = 'structure_local_v3';

function readCachedMembers(): Member[] {
  if (typeof window === 'undefined') return [];
  for (const key of [CACHE_KEY, LEGACY_CACHE_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as Member[];
    } catch {
      // Ignore malformed local cache.
    }
  }
  return [];
}

function normalizeMembers(rows: unknown): Member[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(Boolean)
    .map((row: any) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? '').trim(),
      role: String(row.role ?? '').trim(),
      category: String(row.category ?? '').trim(),
      level: Number(row.level ?? 0),
      photo_url: String(row.photo_url ?? '').trim(),
      sort_order: Number(row.sort_order ?? row.order_priority ?? 0),
    }))
    .filter((member) => member.id && member.name)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function avatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b1224&color=fff&size=320`;
}

const hierarchy = [
  { level: 2, label: 'Jajaran Penasehat', color: 'bg-blue-600', Icon: Award },
  { level: 3, label: 'Jajaran Pembina', color: 'bg-indigo-600', Icon: Star },
  { level: 4, label: 'Ketua Umum', color: 'bg-emerald-600', Icon: Target },
  { level: 5, label: 'Pengurus Inti', color: 'bg-slate-800', Icon: Briefcase },
  { level: 6, label: 'Kepala Pelatih', color: 'bg-orange-600', Icon: Users },
] as const;

function MemberCard({ member, large = false, compact = false, onSelect }: {
  member: Member;
  large?: boolean;
  compact?: boolean;
  onSelect: (member: Member) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      className={[
        'group w-full text-left bg-white border border-slate-200/90 shadow-sm',
        'rounded-2xl sm:rounded-3xl flex flex-col items-center',
        'transition-colors duration-200 hover:border-blue-300 hover:bg-blue-50/30',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        compact ? 'p-3 sm:p-4' : large ? 'max-w-[220px] sm:max-w-[280px] p-4 sm:p-6' : 'max-w-[210px] sm:max-w-[250px] p-4 sm:p-5',
      ].join(' ')}
    >
      <div className={[
        'overflow-hidden rounded-2xl bg-slate-100 border-4 border-white shadow-sm shrink-0',
        compact ? 'w-14 h-14 sm:w-16 sm:h-16' : large ? 'w-24 h-24 sm:w-32 sm:h-32' : 'w-20 h-20 sm:w-28 sm:h-28',
      ].join(' ')}>
        <img
          src={member.photo_url || avatarUrl(member.name)}
          alt={member.name}
          loading="eager"
          decoding="async"
          fetchPriority={large ? 'high' : 'auto'}
          className="block w-full h-full object-cover"
          onError={(event) => {
            const image = event.currentTarget;
            const fallback = avatarUrl(member.name);
            if (image.src !== fallback) image.src = fallback;
          }}
        />
      </div>
      <div className="mt-3 w-full min-w-0 text-center">
        <h3 className={[
          'font-extrabold uppercase italic text-slate-900 leading-tight break-words',
          compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm',
        ].join(' ')}>{member.name}</h3>
        <span className={[
          'inline-flex max-w-full mt-2 items-center justify-center rounded-full bg-amber-500 text-white font-bold uppercase',
          'tracking-wide leading-tight text-center break-words',
          compact ? 'px-2.5 py-1 text-[8px]' : 'px-3 py-1.5 text-[8px] sm:text-[9px]',
        ].join(' ')}>{member.role}</span>
      </div>
    </button>
  );
}

export default function StrukturOrganisasiPublic() {
  const [members, setMembers] = useState<Member[]>(() => {
    const cached = readCachedMembers();
    return cached.length > 0 ? cached : normalizeMembers(DEFAULT_STRUKTUR);
  });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let requestInFlight = false;

    const applyMembers = (rows: unknown) => {
      const next = normalizeMembers(rows);
      if (!active || next.length === 0) return;
      setMembers((current) => {
        if (JSON.stringify(current) === JSON.stringify(next)) return current;
        try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* optional cache */ }
        return next;
      });
    };

    const loadFromSupabase = async () => {
      if (!active || requestInFlight) return;
      requestInFlight = true;
      try {
        const { data, error } = await supabase
          .from('organizational_structure')
          .select('id,name,role,category,level,photo_url,sort_order,order_priority')
          .order('sort_order', { ascending: true })
          .order('order_priority', { ascending: true });
        if (!error && data && data.length > 0) applyMembers(data);
        else if (error) console.error('Struktur organisasi:', error);
      } catch (error) {
        console.error('Struktur organisasi fetch:', error);
      } finally {
        requestInFlight = false;
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void loadFromSupabase(), 250);
    };

    void loadFromSupabase();
    const handleUpdate = () => scheduleRefresh();
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('table_updated_organizational_structure', handleUpdate);

    const channel = supabase
      .channel('public_structure_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizational_structure' }, scheduleRefresh)
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('app_data_changed', handleUpdate);
      window.removeEventListener('table_updated_organizational_structure', handleUpdate);
      void supabase.removeChannel(channel);
    };
  }, []);

  const groupedFields = useMemo(() => {
    const fields: Record<string, Member[]> = {};
    members.filter((member) => member.level === 7).forEach((member) => {
      const role = member.role.toLowerCase();
      let fieldName = 'Lainnya';
      if (role.includes('humas')) fieldName = 'Bidang Humas';
      else if (role.includes('pertandingan') || role.includes('wasit')) fieldName = 'Bidang Pertandingan';
      else if (role.includes('sarana') || role.includes('prasarana')) fieldName = 'Bidang Sarpras';
      else if (role.includes('prestasi') || role.includes('binpres')) fieldName = 'Bidang Pembinaan Prestasi';
      else if (role.includes('pendanaan') || role.includes('usaha')) fieldName = 'Bidang Dana & Usaha';
      else if (role.includes('organisasi')) fieldName = 'Bidang Organisasi';
      else if (role.includes('umum')) fieldName = 'Bidang Umum';
      else if (role.includes('kesehatan') || role.includes('medis')) fieldName = 'Bidang Kesehatan';
      if (!fields[fieldName]) fields[fieldName] = [];
      fields[fieldName].push(member);
    });
    return Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  }, [members]);

  const levelOne = members.filter((member) => member.level === 1);
  const hasData = members.length > 0;

  return (
    <section className="w-full bg-[#f8fafc] px-3 py-8 sm:px-6 sm:py-12 md:px-10 md:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <header className="text-center mb-10 sm:mb-14 md:mb-16">
          <p className="mb-3 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.25em] text-blue-600">PB Bilibili 162</p>
          <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tight text-slate-900">Struktur <span className="text-blue-600">Organisasi</span></h1>
          <div className="mx-auto mt-4 h-1.5 w-20 rounded-full bg-blue-600 sm:w-24" />
          <p className="mx-auto mt-4 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-500">Susunan pengurus dan bidang PB Bilibili 162 yang tersimpan pada database organisasi.</p>
        </header>

        {!hasData ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <Users className="mx-auto mb-4 text-slate-300" size={42} />
            <h2 className="text-lg font-bold text-slate-700">Data struktur belum tersedia</h2>
            <p className="mt-2 text-sm text-slate-400">Silakan tambahkan struktur organisasi melalui halaman admin.</p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {levelOne.length > 0 && (
              <section className="flex flex-col items-center">
                <SectionBadge color="bg-amber-500" icon={<ShieldCheck size={14} />} label="Penanggung Jawab" />
                <div className="mt-5 flex w-full flex-wrap justify-center gap-3 sm:gap-5">
                  {levelOne.map((member) => <MemberCard key={member.id} member={member} large onSelect={setSelectedMember} />)}
                </div>
              </section>
            )}

            {hierarchy.map(({ level, label, color, Icon }) => {
              const items = members.filter((member) => member.level === level);
              if (items.length === 0) return null;
              return (
                <section key={level} className="flex flex-col items-center">
                  <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
                  <SectionBadge color={color} icon={<Icon size={14} />} label={label} />
                  <div className="mt-5 flex w-full flex-wrap justify-center gap-3 sm:gap-5">
                    {items.map((member) => <MemberCard key={member.id} member={member} large={level === 4} onSelect={setSelectedMember} />)}
                  </div>
                </section>
              );
            })}

            {groupedFields.length > 0 && (
              <section className="flex flex-col items-center">
                <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
                <SectionBadge color="bg-slate-700" icon={<Users size={14} />} label="Koordinator & Anggota Bidang" />
                <div className="mt-6 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {groupedFields.map(([fieldName, fieldMembers]) => {
                    const coordinator = fieldMembers.find((member) => member.role.toLowerCase().includes('koordinator'));
                    const staffs = fieldMembers.filter((member) => member.id !== coordinator?.id);
                    return (
                      <article key={fieldName} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wide text-blue-700 break-words">{fieldName}</h2>
                          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-extrabold text-blue-600">{fieldMembers.length}</span>
                        </div>
                        {coordinator && <div className="mt-4"><MemberCard member={coordinator} compact onSelect={setSelectedMember} /></div>}
                        {staffs.length > 0 && <div className="mt-3 grid grid-cols-1 gap-2">{staffs.map((member) => <MemberCard key={member.id} member={member} compact onSelect={setSelectedMember} />)}</div>}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Dedicated footer: rendered after the complete organization tree, never between cards. */}
      <footer className="mt-12 sm:mt-16 w-full bg-[#050914] text-slate-400 border-t border-slate-800/80 py-6 px-4 text-center rounded-none">
        <div className="mx-auto flex min-h-12 items-center justify-center max-w-7xl">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-400">© 2026 PB Bilibili 162. All Rights Reserved.</p>
        </div>
      </footer>

      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Profil ${selectedMember.name}`} onClick={() => setSelectedMember(null)}>
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedMember(null)} aria-label="Tutup profil" className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={18} /></button>
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
              <img src={selectedMember.photo_url || avatarUrl(selectedMember.name)} alt={selectedMember.name} loading="eager" decoding="async" className="block h-full w-full object-cover" onError={(event) => { const image = event.currentTarget; const fallback = avatarUrl(selectedMember.name); if (image.src !== fallback) image.src = fallback; }} />
            </div>
            <h2 className="mt-5 text-center text-xl font-black uppercase italic text-slate-900">{selectedMember.name}</h2>
            <div className="mx-auto mt-2 w-fit max-w-full rounded-full bg-blue-600 px-4 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-white">{selectedMember.role}</div>
            <p className="mt-5 text-center text-sm leading-relaxed text-slate-500">Informasi struktur organisasi PB Bilibili 162.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SectionBadge({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <div className={`${color} inline-flex max-w-[92%] items-center gap-2 rounded-full px-4 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-sm sm:px-5 sm:text-[10px]`}>
      {icon}<span>{label}</span>
    </div>
  );
}
