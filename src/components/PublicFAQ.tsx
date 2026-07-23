import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, Plus, Minus } from 'lucide-react';
import { supabase } from '../supabase';

export default function PublicFAQ() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase.from('faq').select('*').order('urutan', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            setFaqs(data);
        } else {
            throw new Error("No data");
        }
      } catch (e) {
        const local = JSON.parse(localStorage.getItem('faq_local_v3') || '[]');
        if (local.length > 0) {
            setFaqs(local);
        } else {
            setFaqs([
              { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman bermain bulutangkis boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula. Pelatih kami akan membimbing mulai dari cara memegang raket (grip), langkah kaki (footwork), hingga teknik pukulan dasar.', urutan: 1 },
              { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan kaos latihan). Untuk iuran bulanan sebesar Rp 100.000 untuk kelas reguler, dan Rp 250.000 untuk kelas prestasi (intensif).', urutan: 2 },
              { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan?', jawaban: 'Anggota wajib membawa raket sendiri, sepatu khusus bulutangkis (non-marking shoes), pakaian olahraga, dan air minum. Shuttlecock sudah disediakan oleh klub.', urutan: 3 },
              { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Rabu (08.00-12.00), Jumat (08.00-12.00), dan Ahad (08.00-12.00 WITA).', urutan: 4 },
              { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (7 tahun) hingga dewasa tanpa batasan usia maksimal, asalkan sehat jasmani.', urutan: 5 },
              { id: 'f6', pertanyaan: 'Apakah PB Bilibili 162 rutin mengikuti turnamen?', jawaban: 'Ya, klub kami rutin mengirimkan atlet untuk mengikuti kejuaraan tingkat kota, provinsi, hingga nasional.', urutan: 6 }
            ]);
        }
      }
    };
    fetchFaqs();
  }, []);

  if (faqs.length === 0) return null;

  return (
    <section className="py-20 bg-[#070d1a] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-black uppercase tracking-widest mb-4">
            <MessageCircleQuestion size={14} /> FAQ
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
            Pertanyaan <span className="text-cyan-500">Umum</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-slate-400">
            Temukan jawaban atas pertanyaan yang sering diajukan seputar pendaftaran, latihan, dan keanggotaan.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <span className={`font-bold text-lg pr-8 transition-colors ${openIndex === index ? 'text-cyan-400' : 'text-white'}`}>
                    {item.pertanyaan}
                </span>
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openIndex === index ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    {openIndex === index ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-white/5 mt-2 pt-4 mx-6">
                      {item.jawaban}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
