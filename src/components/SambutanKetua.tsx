import React from 'react';

const SambutanKetua = () => {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image side */}
          <div className="relative">
            <img 
              src="https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png" 
              alt="H. Wawan - Ketua Umum PB Bilibili 162"
              className="rounded-2xl shadow-xl w-full h-auto object-cover aspect-[4/5]"
            />
            {/* Decoration */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-blue-600 rounded-full opacity-20 -z-10"></div>
          </div>
          
          {/* Text side */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Sambutan Ketua Umum
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed text-justify">
                Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed text-justify">
                Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed text-justify">
                Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.
            </p>
            <div className="pt-4">
                <p className="text-xl font-bold text-slate-900">H. Wawan</p>
                <p className="text-blue-600 font-medium">Ketua Umum PB Bilibili 162</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SambutanKetua;
