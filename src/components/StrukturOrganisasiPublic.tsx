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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
        if (data && data.length > 0) { setMembers(data); } else { const defaultStruktur = [
  { id: 'st1', name: 'H. Andi (Dewan Penasihat)', role: 'Pelindung / Penasihat', category: 'Penasihat', level: 1, sort_order: 1, photo_url: 'https://ui-avatars.com/api/?name=Andi&background=0b1224&color=fff&size=200' },
  { id: 'st2', name: 'Budi Santoso', role: 'Ketua Umum', category: 'Pengurus Inti', level: 2, sort_order: 2, photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0b1224&color=fff&size=200' },
  { id: 'st3', name: 'Cipto', role: 'Wakil Ketua', category: 'Pengurus Inti', level: 3, sort_order: 3, photo_url: 'https://ui-avatars.com/api/?name=Cipto&background=0b1224&color=fff&size=200' },
  { id: 'st4', name: 'Diana', role: 'Sekretaris', category: 'Pengurus Inti', level: 4, sort_order: 4, photo_url: 'https://ui-avatars.com/api/?name=Diana&background=0b1224&color=fff&size=200' },
  { id: 'st5', name: 'Eka', role: 'Bendahara', category: 'Pengurus Inti', level: 5, sort_order: 5, photo_url: 'https://ui-avatars.com/api/?name=Eka&background=0b1224&color=fff&size=200' },
  { id: 'st6', name: 'Fahri', role: 'Kepala Pelatih (Head Coach)', category: 'Kepelatihan', level: 6, sort_order: 6, photo_url: 'https://ui-avatars.com/api/?name=Fahri&background=0b1224&color=fff&size=200' },
  { id: 'st7', name: 'Gani', role: 'Koord. Bidang Pembinaan Prestasi', category: 'Bidang-Bidang', level: 7, sort_order: 7, photo_url: 'https://ui-avatars.com/api/?name=Gani&background=0b1224&color=fff&size=200' },
  { id: 'st8', name: 'Hadi', role: 'Koord. Bidang Sarana & Prasarana', category: 'Bidang-Bidang', level: 7, sort_order: 8, photo_url: 'https://ui-avatars.com/api/?name=Hadi&background=0b1224&color=fff&size=200' },
]; setMembers(defaultStruktur); }
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

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const MemberCard = ({ m, size = 'md' }: { m: Member, size?: 'lg' | 'md' }) => (
    <motion.div 
      variants={itemVariants}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setSelectedMember(m)}
      className={`bg-white rounded-[1.2rem] sm:rounded-[2.5rem] shadow-xl border border-blue-50/50 flex flex-col items-center p-3 sm:p-6 md:p-8 transition-all duration-500 w-[150px] sm:w-64 md:w-72 ${size === 'lg' ? 'w-[200px] sm:w-80' : ''} cursor-pointer`}
    >
      <div className={`w-20 h-20 sm:w-28 sm:h-28 ${size === 'lg' ? 'md:w-36 md:h-36' : ''} rounded-[1.5rem] sm:rounded-[2.2rem] overflow-hidden mb-4 sm:mb-6 bg-slate-50 border-[4px] sm:border-[6px] border-white shadow-inner`}>
        <img 
          src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D8ABC&color=fff`} 
          className="w-full h-full object-cover" 
          alt={m.name} 
        />
      </div>
      <h3 className="text-slate-900 font-black italic uppercase text-center leading-tight tracking-tighter mb-1.5 sm:mb-3 text-[10px] sm:text-[13px] md:text-[15px]" style={{ fontSize: size === 'lg' ? '14px' : undefined }}>{m.name}</h3>
      <div className="bg-amber-500 px-2 py-0.5 sm:px-5 sm:py-2 rounded-full shadow-lg shadow-amber-500/20">
        <span className="text-white font-black uppercase tracking-[0.05em] text-[6px] sm:text-[9px]">{m.role}</span>
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
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 italic uppercase tracking-tighter mb-4">
            Struktur <span className="text-blue-600">Organisasi</span>
          </h1>
          <div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full mb-8" />
        </div>

        <LayoutGroup>
          <div className="relative flex flex-col items-center">
                {/* LEVEL 1: PENANGGUNG JAWAB */}
                <div className="relative z-10 flex flex-col items-center mb-12 w-full">
                  <div className="bg-amber-500 text-white py-1 px-4 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg mb-6 flex items-center gap-2"><ShieldCheck size={12} />Penanggung Jawab</div>
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex justify-center flex-wrap gap-2">
                    {members.filter(m => m.level === 1).map(m => (<MemberCard key={m.id} m={m} size="lg" />))}
                  </motion.div>
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
                    <div key={section.lvl} className="relative z-10 flex flex-col items-center mb-8 w-full">
                      <div className="h-8 w-[2px] bg-slate-200 -mt-8 mb-4"></div>
                      <div className={`${section.color} text-white py-0.5 px-3 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm mb-4`}>
                        {section.label}
                      </div>
                      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-wrap justify-center gap-2">
                        {filtered.map(m => (<MemberCard key={m.id} m={m} size={section.size} />))}
                      </motion.div>
                    </div>
                  );
                })}

                {/* LEVEL 7: KOORDINATOR & ANGGOTA BIDANG */}
                {Object.keys(groupedFields).length > 0 && (
                  <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="h-8 w-[2px] bg-slate-200 -mt-8 mb-4"></div>
                    <div className="bg-slate-500 text-white py-1 px-4 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg mb-8">Koordinator & Anggota</div>
                    <div className="space-y-8 w-full flex flex-col items-center">
                      {Object.entries(groupedFields).map(([fieldName, fieldMembers]) => {
                        const coordinator = fieldMembers.find(m => m.role.toLowerCase().includes("koordinator"));
                        const staffs = fieldMembers.filter(m => !m.role.toLowerCase().includes("koordinator"));
                        return (
                          <div key={fieldName} className="flex flex-col items-center w-full">
                            <div className="h-4 w-[2px] bg-slate-200 mb-2"></div>
                            <div className="bg-white px-4 py-1 rounded-full border border-slate-200 shadow-sm mb-4"><h2 className="text-blue-600 font-black italic uppercase text-[8px] tracking-[0.1em]">{fieldName}</h2></div>
                            {coordinator && (
                              <div className="mb-4">
                                <MemberCard m={coordinator} size="md" />
                              </div>
                            )}
                            <div className="flex flex-wrap justify-center gap-2 px-2 max-w-6xl">
                              {staffs.map(m => (
                                <motion.div key={m.id} variants={itemVariants} onClick={() => setSelectedMember(m)} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 w-full sm:w-60 cursor-pointer hover:bg-slate-50 transition-colors">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 border border-white shadow-sm shrink-0">
                                    <img 
                                      src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                                      className="w-full h-full object-cover" 
                                      alt={m.name}
                                    />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <h4 className="font-black text-slate-900 text-[8px] uppercase italic leading-tight truncate">{m.name}</h4>
                                    <p className="text-blue-600 font-bold text-[6px] uppercase tracking-widest">{m.role}</p>
                                  </div>
                                </motion.div>
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

        {selectedMember && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-xs flex flex-col items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-50 mb-4 shadow-inner">
                <img
                  src={selectedMember.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}`}
                  className="w-full h-full object-cover"
                  alt={selectedMember.name}
                />
              </div>
              <h2 className="text-slate-900 font-black italic uppercase text-center text-xl mb-1">{selectedMember.name}</h2>
              <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full mb-4">{selectedMember.role}</div>
              <p className="text-slate-600 text-sm text-center">Informasi lebih lanjut tentang {selectedMember.name} akan ditampilkan di sini.</p>
              <button
                onClick={() => setSelectedMember(null)}
                className="mt-6 w-full py-2 bg-slate-100 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
