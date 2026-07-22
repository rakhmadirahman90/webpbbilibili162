import React, { useEffect, useState } from 'react';
import { supabase } from "../supabase"; 
import { MapPin, Clock, Phone, Mail, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Contact() {
  const [contactData, setContactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Link Embed Statis sebagai fallback
  const defaultMapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.340274291079!2d119.62310187413628!3d-3.929532544265112!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2d95bb1f2c5e6249%3A0xee8a433e727588ca!2sJl.%20Andi%20Makkasau%20No.171%2C%20Ujung%20Lare%2C%20Kec.%20Soreang%2C%20Kota%20Parepare%2C%20Sulawesi%20Selatan%2091131!5e0!3m2!1sid!2sid!4v1716543210987!5m2!1sid!2sid";
  const defaultMapsUrl = "https://www.google.com/maps?q=Jl.+Andi+Makkasau+No.171,+Parepare";

  useEffect(() => {
    fetchContact();
  }, []);

  async function fetchContact() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setContactData(data);
    } catch (err: any) {
      console.error("Error fetching landing page contact:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-6 bg-[#070d1a] text-white relative overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-indigo-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 relative z-10 flex flex-col h-full justify-between">
        {/* Header Section Compact */}
        <div className="text-center mb-2 sm:mb-3 lg:mb-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-0.5 sm:py-1 rounded-full mb-1"
          >
            <MessageSquare size={12} className="text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Hubungi Kami</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase text-white"
          >
            MARKAS <span className="text-blue-500">BESAR</span>
          </motion.h2>
          <p className="text-slate-400 max-w-xl mx-auto uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5">
            Pusat Pelatihan & Administrasi PB Bilibili 162 Parepare
          </p>
        </div>

        {/* Content Layout Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 md:gap-6 min-h-0 items-stretch">
          
          {/* --- INFO CARD (5 COLS ON LG, COMPACT ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 flex flex-col justify-between gap-2 sm:gap-3 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden relative shrink-0"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-white/10">
              <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
              <h3 className="text-xs sm:text-base md:text-lg font-black uppercase tracking-tight italic text-white">
                Informasi Kontak
              </h3>
            </div>

            {/* Info List Items */}
            <div className="space-y-2 sm:space-y-3.5 my-auto">
              {/* Alamat */}
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 shadow-sm">
                  <MapPin size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-400 text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">Alamat Utama</h4>
                  <p className="text-slate-200 font-medium text-[10px] sm:text-xs md:text-sm leading-tight sm:leading-snug line-clamp-2 sm:line-clamp-none">
                    {contactData?.address || "Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulsel 91131"}
                  </p>
                </div>
              </div>

              {/* Jam Operasional */}
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 shadow-sm">
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-400 text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">Jam Operasional</h4>
                  <p className="text-emerald-400 font-black text-[10px] sm:text-xs md:text-sm italic uppercase leading-tight sm:leading-snug">
                    {contactData?.operating_hours || "Senin - Sabtu: 08.00 - 22.00 WITA"}
                  </p>
                </div>
              </div>

              {/* Telepon / WA */}
              {contactData?.phone && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-400 shadow-sm">
                    <Phone size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-400 text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">Telepon / WhatsApp</h4>
                    <a href={`tel:${contactData.phone}`} className="text-slate-200 hover:text-amber-400 font-bold text-[10px] sm:text-xs md:text-sm transition-colors">
                      {contactData.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {contactData?.email && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/20 text-purple-400 shadow-sm">
                    <Mail size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-400 text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">Official Email</h4>
                    <a href={`mailto:${contactData.email}`} className="text-slate-200 hover:text-purple-400 font-bold text-[10px] sm:text-xs md:text-sm transition-colors truncate block">
                      {contactData.email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button Google Maps */}
            <a 
              href={contactData?.maps_url || defaultMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group active:scale-98 cursor-pointer mt-1"
            >
              <span>Navigasi Google Maps</span>
              <ExternalLink size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </motion.div>

          {/* --- GOOGLE MAPS EMBED (7 COLS ON LG, FLEX-1 ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex-1 w-full min-h-[140px] sm:min-h-[200px] md:min-h-[320px] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b1224] relative flex flex-col"
          >
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={28} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Memuat Peta...</span>
              </div>
            ) : (
              <iframe 
                src={contactData?.maps_iframe || defaultMapEmbedUrl}
                width="100%" 
                height="100%" 
                className="w-full h-full flex-1 border-0 min-h-[140px]"
                style={{ 
                  filter: 'grayscale(0.3) contrast(1.15) brightness(0.85)',
                }} 
                allowFullScreen
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Markas PB Bilibili 162"
              ></iframe>
            )}
            
            {/* Map Badge Overlay */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 sm:py-1 rounded-lg border border-white/10 text-[8px] sm:text-[10px] font-bold text-slate-300 flex items-center gap-1.5 shadow-md pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Lokasi Presisi Parepare</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}