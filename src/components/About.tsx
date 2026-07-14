import React, { useState, useEffect, useMemo } from 'react'; 
import { 
  Target, Rocket, Shield, Award, 
  CheckCircle2, Users2, ArrowRight, User, ShieldCheck, 
  ChevronDown, Star, GraduationCap, History, Eye, Map,
  CheckCircle, Zap, Loader2
} from 'lucide-react'; 
import DokumenPenting from './DokumenPenting';
import { supabase } from '../supabase'; 

// --- IMPORT FALLBACK DATA ---
import pageFallback from '../data/page_contents.json';
import orgFallback from '../data/org_fallback.json';
import siteFallback from '../data/site_fallback.json';

interface AboutProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export default function About({ activeTab: propsActiveTab, onTabChange }: AboutProps) {
  const [internalTab, setInternalTab] = useState('sejarah');
  const [loading, setLoading] = useState(true);
  
  const [dynamicContent, setDynamicContent] = useState<Record<string, any>>({
    sejarah_title: "Jejak Langkah Kami",
    sejarah_accent: "",
    sejarah: `Didirikan dengan semangat dedikasi tinggi...`,
    sejarah_image: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070",
    visi: "Menjadi organisasi terdepan dalam mencetak generasi berprestasi...",
    misi: [], 
    fasilitas_title: "Fasilitas Unggulan",
    fasilitas_main_image: "",
    fasilitas_img1: "",
    fasilitas_img2: "",
    fasilitas_list: [] 
  });
  
  const [orgData, setOrgData] = useState<any[]>([]);
  const activeTab = propsActiveTab || internalTab;

  const fetchOrgData = async () => {
    const { data: structData, error: orgError } = await supabase
      .from('organizational_structure')
      .select('*')
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true });

    if (!orgError && structData) {
      setOrgData(structData);
    } else {
      setOrgData(orgFallback || []);
    }
  };

  useEffect(() => {
    fetchAllData();

    const orgChannel = supabase
      .channel('public:organizational_structure')
      .on('postgres_changes', { 
        event: '*', 
        table: 'organizational_structure', 
        schema: 'public' 
      }, () => {
        fetchOrgData();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { 
        event: '*', 
        table: 'site_settings', 
        schema: 'public' 
      }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(orgChannel); 
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'about_content')
        .maybeSingle();

      let mappedSettings: any = {};
      if (settingsData?.value) {
        const val = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
        mappedSettings = {
          sejarah_title: val.sejarah_title,
          sejarah_accent: val.sejarah_accent,
          sejarah: val.sejarah_desc,
          sejarah_image: val.sejarah_img,
          visi: val.vision || val.visi,
          misi: Array.isArray(val.missions || val.misi) ? (val.missions || val.misi) : [],
          fasilitas_title: val.fasilitas_title,
          fasilitas_main_image: val.fasilitas_img1,
          fasilitas_img1: val.fasilitas_img2,
          fasilitas_img2: val.fasilitas_img3,
          fasilitas_list: Array.isArray(val.fasilitas_list) ? val.fasilitas_list : [] // Mengembalikan data fasilitas
        };
      }

      setDynamicContent(prev => ({ ...prev, ...mappedSettings }));
      await fetchOrgData();

    } catch (err) {
      console.error("Error loading About data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (id: string) => {
    if (onTabChange) onTabChange(id);
    else setInternalTab(id);
  };

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-amber-500', 2: 'bg-emerald-600', 3: 'bg-indigo-600',
      4: 'bg-blue-600', 5: 'bg-rose-500', 6: 'bg-orange-500'
    };
    return colors[level] || 'bg-slate-500';
  };

  // --- RENDERING BIDANG (LEVEL 7) ---
  const renderDepartment = (title: string, roleKey: string) => {
    const members = orgData.filter(m => 
      m.level === 7 && (
        m.role.toLowerCase().includes(roleKey.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(roleKey.toLowerCase()))
      )
    );

    if (members.length === 0) return null;

    const coordinator = members.find(m => m.role.toLowerCase().includes("koordinator"));
    const staffs = members.filter(m => !m.role.toLowerCase().includes("koordinator"));

    return (
      <div className="w-full mb-20 animate-in fade-in duration-1000">
        <div className="flex flex-col items-center mb-10">
           
           {/* HEADER BIDANG: Teks "Bidang XXX" di atas foto */}
           <div className="bg-[#1a1d26] px-6 py-2.5 rounded-full border border-white/5 shadow-md mb-8">
              <h4 className="text-blue-400 font-black italic uppercase text-[10px] md:text-[12px] tracking-[0.2em]">
                {title}
              </h4>
           </div>
           
           {coordinator && (
             <div className="flex flex-col items-center mb-10">
                <div className="bg-[#1a1d26] p-4 rounded-[2rem] border border-blue-500/20 shadow-xl text-center w-56 hover:border-blue-500/50 transition-colors">
                  <div className="w-24 h-24 mx-auto mb-3">
                    <img 
                      src={coordinator.photo_url || `https://ui-avatars.com/api/?name=${coordinator.name}`} 
                      className="w-full h-full rounded-2xl object-cover border-4 border-zinc-800" 
                      alt={coordinator.name}
                    />
                  </div>
                  <p className="font-black text-[13px] uppercase italic text-white leading-tight">{coordinator.name}</p>
                  <p className="text-[9.5px] text-blue-400 font-bold uppercase mt-1.5">{coordinator.role}</p>
                </div>
                {staffs.length > 0 && <div className="w-0.5 h-10 bg-gradient-to-b from-blue-500/20 to-transparent"></div>}
             </div>
           )}

           <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full max-w-5xl">
              {staffs.map(p => (
                <div key={p.id} className="bg-[#1a1d26] p-3 rounded-2xl border border-white/5 shadow-sm flex items-center gap-4 w-64 md:w-72 hover:border-blue-500/30 transition-all">
                  <div className="w-14 h-14 shrink-0">
                    <img 
                      src={p.photo_url || `https://ui-avatars.com/api/?name=${p.name}`} 
                      className="w-full h-full rounded-xl object-cover" 
                      alt={p.name}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="font-black text-xs md:text-[13px] uppercase italic text-white truncate leading-tight">{p.name}</p>
                    <p className="text-blue-400 font-bold text-[9.5px] uppercase mt-1">{p.role}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <section id="tentang-kami" className="relative w-full min-h-screen bg-[#0b0e14] text-white flex flex-col items-center font-sans py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4 w-full flex flex-col">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full mb-4">
            <Users2 size={12} className="animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Profil Organisasi</span>
          </div>
          <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none italic">
            Tentang <span className="text-blue-500">Kami</span>
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { id: 'sejarah', label: 'Sejarah' },
            { id: 'visi-misi', label: 'Visi & Misi' },
            { id: 'fasilitas', label: 'Fasilitas' },
            { id: 'organisasi', label: 'Struktur Organisasi' },
            { id: 'dokumen-penting', label: 'Dokumen Penting' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`px-4 md:px-8 py-3 md:py-4 rounded-xl font-black text-[9px] md:text-[11px] uppercase border transition-all active:scale-95 ${
                activeTab === id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-[#1a1d26] text-zinc-400 border-white/5 hover:border-blue-500/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`w-full rounded-[2.5rem] md:rounded-[3.5rem] border shadow-2xl relative transition-all duration-500 overflow-hidden ${
          activeTab === 'sejarah' 
            ? 'bg-[#E5E7EB] border-zinc-300' 
            : 'bg-[#12141c]/60 p-6 md:p-14 border-white/5'
        }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sinkronisasi Database...</p>
            </div>
          ) : (
            <>
              {activeTab === 'sejarah' && (
                <div className="w-full animate-in fade-in duration-700 flex flex-col">
                  {/* Sejarah Description Section */}
                  <div className="px-6 sm:px-12 py-10 bg-white text-zinc-800 text-left">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-full md:w-1/3 shrink-0">
                        <img 
                          src={dynamicContent.sejarah_image} 
                          alt="Founder PB Bilibili 162" 
                          className="w-full aspect-[4/5] object-cover rounded-3xl shadow-xl border border-zinc-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="w-full md:w-2/3">
                        {dynamicContent.sejarah ? (
                          dynamicContent.sejarah.split('\n').filter((p: string) => p.trim() !== '').map((para: string, idx: number) => (
                            <p key={idx} className="font-sans text-[16px] sm:text-[18px] md:text-[21px] leading-relaxed text-zinc-700 font-medium mb-6 last:mb-0 text-justify">
                              {para}
                            </p>
                          ))
                        ) : (
                          <p className="font-sans text-[16px] sm:text-[18px] md:text-[21px] leading-relaxed text-zinc-400 font-medium italic">
                            Belum ada data sejarah yang ditambahkan.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Era Tabs Selector */}
                  <div className="bg-[#E5E7EB] px-6 sm:px-12 pt-6 pb-2 text-left">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-2xl">
                      {['2020', '2022', '2024', '2026'].map(era => (
                        <button
                          key={era}
                          onClick={() => {}}
                          className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider text-center transition-all cursor-pointer ${
                            era === '2020'
                              ? 'bg-[#A17C17] text-white shadow-md'
                              : 'bg-[#1F2937] text-white hover:bg-[#374151]'
                          }`}
                        >
                          <div className="text-[10px] opacity-80">ERA</div>
                          <div className="text-base sm:text-lg mt-0.5 font-bold">{era}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Content */}
                  <div className="bg-[#E5E7EB] px-6 sm:px-12 pb-12 pt-4 text-left">
                    <div className="w-full flex flex-col gap-6">
                      {[
                        { year: '2020', text: 'PB Bilibili 162 didirikan dengan semangat membina bakat muda lokal.' },
                        { year: '2021', text: 'Mulai menyelenggarakan latihan rutin untuk berbagai kelompok usia.' },
                        { year: '2023', text: 'Meraih prestasi membanggakan pada turnamen bulutangkis tingkat daerah.' },
                        { year: '2024', text: 'PB Bilibili 162 memperluas fasilitas latihan untuk menampung lebih banyak atlet.' },
                        { year: '2025', text: 'Terus berkomitmen mencetak atlet berprestasi untuk masa depan.' },
                        { year: '2026', text: 'PB Bilibili 162 merayakan tahun ke-6 dengan komitmen pengembangan atlet yang lebih profesional.' }
                      ].map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                          <div className="bg-[#27272a] text-white font-extrabold text-[15px] sm:text-[16px] tracking-wider py-2.5 px-4 text-center shrink-0 w-24">
                            {item.year}
                          </div>
                          <div className="text-zinc-800 text-[15px] sm:text-[16px] md:text-[18px] leading-relaxed font-normal text-justify">
                            {item.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visi-misi' && (
                <div className="max-w-5xl mx-auto py-6 md:py-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-6">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                    {/* Visi Section */}
                    <div className="space-y-6">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Target size={14} /> Visi
                      </div>
                      <div className="bg-gradient-to-br from-[#1a1d26] to-[#0b0e14] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-xl font-medium text-xl md:text-3xl text-zinc-100 leading-relaxed tracking-tight text-justify">
                        "{dynamicContent.visi}"
                      </div>
                    </div>
                    
                    {/* Misi Section */}
                    <div className="space-y-6">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Misi
                      </div>
                      <div className="space-y-4">
                        {dynamicContent.misi.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-4 bg-[#1a1d26] p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 shadow-sm group">
                            <div className="bg-blue-500/10 p-2 rounded-xl shrink-0 mt-0.5 group-hover:bg-blue-600 transition-colors">
                              <CheckCircle2 size={16} className="text-blue-500 group-hover:text-white" />
                            </div>
                            <p className="text-zinc-300 text-[14px] md:text-[16px] font-normal leading-relaxed text-justify">
                              {typeof item === 'string' ? item : item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fasilitas' && (
                <div className="max-w-6xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-white uppercase italic mb-2">{dynamicContent.fasilitas_title}</h3>
                    <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full"></div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {[dynamicContent.fasilitas_main_image, dynamicContent.fasilitas_img1, dynamicContent.fasilitas_img2].map((img, idx) => (
                      img && (
                        <div key={idx} className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-lg">
                          <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Fasilitas ${idx + 1}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <span className="text-white font-black uppercase text-[10px] tracking-widest">Fasilitas Organisasi</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dynamicContent.fasilitas_list.map((item: any, i: number) => (
                      <div key={i} className="bg-[#1a1d26] p-6 rounded-3xl border border-white/5 shadow-sm flex flex-col items-center text-center gap-3 hover:border-blue-500/30 transition-all group">
                        <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Zap size={20} />
                        </div>
                        <p className="font-black text-[10px] md:text-[11px] uppercase text-zinc-200 tracking-tight leading-tight">
                          {typeof item === 'string' ? item : item.title || item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'dokumen-penting' && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 p-6 md:p-12">
                  <DokumenPenting />
                </div>
              )}

              {activeTab === 'organisasi' && (
                <div className="w-full flex flex-col items-center py-10 animate-in slide-in-from-bottom-10 duration-1000 pb-40">
                  {[1, 2, 3, 4, 5, 6].map(lvl => {
                    const levelMembers = orgData.filter(m => m.level === lvl);
                    if (levelMembers.length === 0) return null;
                    
                    return (
                      <div key={lvl} className="flex flex-col items-center w-full mb-16 relative">
                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 relative z-10">
                          {levelMembers.map(p => (
                            <div key={p.id} className="flex flex-col items-center">
                              <div className={`bg-[#1a1d26] p-4 rounded-[2.5rem] border shadow-2xl text-center transition-transform hover:scale-105 ${lvl === 4 ? 'w-64 md:w-72 border-blue-500 shadow-[0_0_35px_rgba(37,99,235,0.15)]' : 'w-48 md:w-56 border-white/5'}`}>
                                <div className={`${lvl === 4 ? 'w-32 h-32' : 'w-24 h-24'} mx-auto mb-4`}>
                                  <img src={p.photo_url || `https://ui-avatars.com/api/?name=${p.name}`} className="w-full h-full rounded-[2rem] object-cover border-4 border-zinc-800 shadow-inner" alt={p.name} />
                                </div>
                                <p className="font-black text-xs md:text-[14px] uppercase italic text-white leading-tight mb-2 truncate">{p.name}</p>
                                <span className={`text-[9.5px] text-white px-4 py-1 rounded-full font-black uppercase tracking-widest ${getLevelColor(p.level)}`}>{p.role}</span>
                              </div>
                              <div className="w-0.5 h-16 bg-gradient-to-b from-blue-500/20 to-transparent"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="w-full max-w-6xl mt-10">
                    <div className="text-center mb-20">
                      <div className="inline-block h-1 w-20 bg-blue-600 rounded-full mb-4"></div>
                      <h3 className="text-2xl font-black uppercase italic text-white tracking-widest">Koordinator & Anggota Bidang</h3>
                    </div>
                    
                    {renderDepartment("Bidang Pertandingan", "Pertandingan")}
                    {renderDepartment("Bidang Pembinaan Prestasi", "Prestasi")}
                    {renderDepartment("Bidang Humas", "Humas")}
                    {renderDepartment("Bidang Dana & Usaha", "Dana")}
                    {renderDepartment("Bidang Sarana & Prasarana", "Sarpras")}
                    {renderDepartment("Bidang Umum", "Umum")}
                    {renderDepartment("Bidang Rohani", "Rohani")}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </section>
  );
}