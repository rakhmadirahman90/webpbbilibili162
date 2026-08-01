import React from 'react';

const SambutanKetua = () => {
  return (
    <section className="bg-[#070d1a] text-white py-10 md:py-20 border-t border-white/5 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Image side */}
          <div className="relative max-w-xs sm:max-w-sm md:max-w-full mx-auto w-full">
            <img 
              src="https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png" 
              alt="H. Wawan - Ketua Umum PB Bilibili 162"
              className="rounded-2xl shadow-2xl border border-white/10 w-full h-auto object-cover aspect-[4/5]"
              loading="lazy"
              decoding="async"
            />
            {/* Decoration */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-600/20 rounded-full blur-xl -z-10"></div>
          </div>
          
          {/* Text side */}
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
              <span>Sambutan Pimpinan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic">
              Sambutan <span className="text-blue-500">Ketua Umum</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-justify">
                Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.
            </p>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-justify">
                Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.
            </p>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-justify">
                Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.
            </p>
            <div className="pt-2 border-t border-white/10">
                <p className="text-lg font-extrabold text-white">H. Wawan</p>
                <p className="text-blue-400 font-semibold text-xs sm:text-sm">Ketua Umum PB Bilibili 162</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SambutanKetua;
