import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { Loader2, Award, ShieldCheck, Users, Star, Briefcase, Target } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';

interface Member {
  id: string;
  name: string;
  role: string;
  category: string;
  level: number;
  photo_url: string;
  sort_order: number;
}

export default function StrukturOrganisasiPublic() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('organizational_structure')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        if (data) setMembers(data);
      } catch (err) { 
        console.error("Fetch Error:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchMembers();
  }, []);

  const groupedFields = useMemo(() => {
    const fields: { [key: string]: Member[] } = {};
    members.filter(m => m.level === 7).forEach(m => {
      const role = m.role.toLowerCase();
      let fieldName = "Lainnya";
      if (role.includes("humas")) fieldName = "Bidang Humas";
      else if (role.includes("pertandingan") || role.includes("wasit")) fieldName = "Bidang Pertandingan";
      else if (role.includes("sarana") || role.includes("prasarana")) fieldName = "Bidang Sarpras";
      else if (role.includes("prestasi") || role.includes("binpres")) fieldName = "Bidang Pembinaan Prestasi";
      else if (role.includes("pendanaan") || role.includes("usaha")) fieldName = "Bidang Dana & Usaha";
      else if (role.includes("organisasi")) fieldName = "Bidang Organisasi";
      else if (role.includes("umum")) fieldName = "Bidang Umum";
      else if (role.includes("kesehatan") || role.includes("medis")) fieldName = "Bidang Kesehatan";
      
      if (!fields[fieldName]) fields[fieldName] = [];
      fields[fieldName].push(m);
    });
    return fields;
  }, [members]);

  const MemberCard = ({ m, size = 'md' }: { m: Member, size?: 'lg' | 'md' }) => (
    <motion.div 
      className={`bg-white rounded-[2.5rem] shadow-xl border border-blue-50/50 flex flex-col items-center p-8 transition-all duration-500 ${size === 'lg' ? 'w-80' : 'w-72'}`}
    >
      <div className={`${size === 'lg' ? 'w-36 h-36' : 'w-28 h-28'} rounded-[2.2rem] overflow-hidden mb-6 bg-slate-50 border-[6px] border-white shadow-inner`}>
        <img 
          src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D8ABC&color=fff`} 
          className="w-full h-full object-cover" 
          alt={m.name} 
        />
      </div>
      <h3 className="text-slate-900 font-black italic uppercase text-center leading-tight tracking-tighter mb-3" style={{ fontSize: size === 'lg' ? '18px' : '15px' }}>{m.name}</h3>
      <div className="bg-amber-500 px-5 py-2 rounded-full shadow-lg shadow-amber-500/20">
        <span className="text-white font-black uppercase tracking-[0.15em]" style={{ fontSize: '9px' }}>{m.role}</span>
      </div>
    </motion.div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="text-blue-500 animate-spin" size={40} />
      <div className="text-blue-500 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Database...</div>
    </div>
  );

  return (
    <div className="w-full bg-[#FBFCFE] p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter mb-4">
            Struktur <span className="text-blue-600">Organisasi</span>
          </h1>
          <div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full mb-8" />
        </div>

        <LayoutGroup>
          <div className="relative flex flex-col items-center">
            {/* LEVEL 1: PENANGGUNG JAWAB */}
            <div className="relative z-10 flex flex-col items-center mb-24 w-full">
              <div className="bg-amber-500 text-white p-4 rounded-3xl mb-12 shadow-2xl ring-[12px] ring-amber-500/10 flex items-center gap-3"><ShieldCheck size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Penanggung Jawab</span></div>
              <div className="flex justify-center flex-wrap gap-8">
                {members.filter(m => m.level === 1).map(m => (<MemberCard key={m.id} m={m} size="lg" />))}
              </div>
            </div>

            {/* LEVEL 2-6: Hierarki Utama */}
            {[
              { lvl: 2, icon: Award, label: 'Jajaran Penasehat', color: 'bg-blue-600' },
              { lvl: 3, icon: Star, label: 'Jajaran Pembina', color: 'bg-indigo-600' },
              { lvl: 4, icon: Target, label: 'Ketua Umum', color: 'bg-emerald-600', size: 'lg' as const },
              { lvl: 5, icon: Briefcase, label: 'Pengurus Inti', color: 'bg-slate-800' },
              { lvl: 6, icon: Users, label: 'Kepala Pelatih', color: 'bg-orange-600' }
            ].map((section) => {
              const filtered = members.filter(m => m.level === section.lvl);
              if (filtered.length === 0) return null;
              
              return (
                <div key={section.lvl} className="relative z-10 flex flex-col items-center mb-24 w-full">
                  <div className={`${section.color} text-white p-3 rounded-2xl mb-10 shadow-xl ring-8 ring-white flex items-center gap-3`}>
                    <section.icon size={20} /><span className="text-[10px] font-black uppercase tracking-widest">{section.label}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-12">
                    {filtered.map(m => (<MemberCard key={m.id} m={m} size={section.size} />))}
                  </div>
                </div>
              );
            })}

            {/* LEVEL 7: KOORDINATOR & ANGGOTA BIDANG */}
            {Object.keys(groupedFields).length > 0 && (
              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="bg-slate-400 text-white p-3 rounded-2xl mb-20 shadow-xl ring-8 ring-white flex items-center gap-3"><Users size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Koordinator & Anggota Bidang</span></div>
                <div className="space-y-32 w-full flex flex-col items-center">
                  {Object.entries(groupedFields).map(([fieldName, fieldMembers]) => {
                    const coordinator = fieldMembers.find(m => m.role.toLowerCase().includes("koordinator"));
                    const staffs = fieldMembers.filter(m => !m.role.toLowerCase().includes("koordinator"));
                    return (
                      <div key={fieldName} className="flex flex-col items-center w-full">
                        <div className="bg-white px-8 py-2 rounded-full border border-slate-200 shadow-sm mb-12"><h2 className="text-blue-600 font-black italic uppercase text-[12px] tracking-[0.2em]">{fieldName}</h2></div>
                        {coordinator && (
                          <div className="mb-16">
                            <MemberCard m={coordinator} />
                          </div>
                        )}
                        <div className="flex flex-wrap justify-center gap-6 px-4 max-w-6xl">
                          {staffs.map(m => (
                            <div key={m.id} className="bg-white p-4 rounded-[1.8rem] shadow-sm border border-slate-100 flex items-center gap-4 w-72">
                              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 border-2 border-white shadow-sm shrink-0">
                                <img 
                                  src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                                  className="w-full h-full object-cover" 
                                  alt={m.name}
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="font-black text-slate-900 text-[11px] uppercase italic leading-tight truncate">{m.name}</h4>
                                <p className="text-blue-600 font-bold text-[8px] uppercase tracking-widest mt-1">{m.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}
