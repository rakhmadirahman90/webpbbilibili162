import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';

export default function PublicProgram({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase.from('program_latihan').select('*').order('nama_program', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            setPrograms(data);
        } else {
            throw new Error("No data");
        }
      } catch (e) {
        const local = JSON.parse(localStorage.getItem('program_local_v3') || '[]');
        if (local.length > 0) {
            setPrograms(local);
        } else {
            setPrograms([
              { id: 'prog_1', nama_program: 'Kelas Reguler (Hobi & Pemula)', deskripsi: 'Program untuk pemula dan umum yang ingin berolahraga bulutangkis. Fokus pada kebugaran, pengenalan teknik dasar, dan sparring santai.', hari_latihan: 'Rabu & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
              { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi atlet yang dipersiapkan untuk turnamen/kejuaraan. Fokus pada drill teknik, ketahanan fisik, agility, dan strategi pertandingan.', hari_latihan: 'Jumat & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
              { id: 'prog_3', nama_program: 'Kelas Pembinaan Usia Dini', deskripsi: 'Program khusus pembinaan anak-anak (7-12 tahun). Melatih koordinasi motorik, teknik dasar bulutangkis yang benar, dan kedisiplinan sejak dini.', hari_latihan: 'Rabu & Jumat', jam_latihan: '08:00 - 10:00 WITA' },
              { id: 'prog_4', nama_program: 'Private Training (1 on 1)', deskripsi: 'Latihan eksklusif dengan pelatih untuk fokus memperbaiki teknik spesifik dan mempercepat progres secara individual.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' },
              { id: 'prog_5', nama_program: 'Mabar Klub (Sparring Day)', deskripsi: 'Sesi pertandingan internal atau mengundang klub lain untuk mengasah mental bertanding seluruh anggota dalam suasana kompetitif namun bersahabat.', hari_latihan: 'Ahad (Akhir Bulan)', jam_latihan: '08:00 - 14:00 WITA' }
            ]);
        }
      }
    };
    fetchPrograms();
  }, []);

  if (programs.length === 0) return null;

  return (
    <section id="program" className="py-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full max-w-2xl h-full bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-black uppercase tracking-widest mb-4">
            <Target size={14} /> Program Kelas
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
            Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600">Program Latihan</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-slate-400">
            Kami menyediakan beberapa pilihan kelas yang dapat disesuaikan dengan tujuan dan kemampuan Anda.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {programs.map((item, index) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: index * 0.1 }}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-fuchsia-500/30 transition-colors flex flex-col"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-colors" />
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 flex items-center justify-center border border-fuchsia-500/20 mb-6">
                  <Target size={28} className="text-fuchsia-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">{item.nama_program}</h3>
              <p className="text-slate-400 leading-relaxed mb-8 flex-grow">{item.deskripsi}</p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 shrink-0"><CalendarDays size={20} /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Hari</div>
                        <div className="text-sm font-bold text-white">{item.hari_latihan}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 shrink-0"><Clock size={20} /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Jam</div>
                        <div className="text-sm font-bold text-white">{item.jam_latihan}</div>
                    </div>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('contact')}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-fuchsia-600 border border-white/10 hover:border-fuchsia-500 text-white font-bold transition-all flex items-center justify-center gap-2 group/btn"
              >
                Gabung Kelas Ini
                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
