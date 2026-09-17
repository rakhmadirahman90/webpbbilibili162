import React, { useState } from 'react';
import { FileText, MessageSquareText } from 'lucide-react';
import { KelolaSurat } from './KelolaSurat';
import AdminMasukanUsulan from './AdminMasukanUsulan';

export default function KelolaSuratTerintegrasi() {
  const [tab, setTab] = useState<'surat' | 'masukan'>('surat');
  return (
    <div className="min-h-full bg-[#070d1a] text-white">
      <div className="sticky top-0 z-30 px-3 sm:px-5 md:px-8 pt-3 md:pt-5 bg-[#070d1a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
          <button onClick={() => setTab('surat')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${tab === 'surat' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}><FileText size={15}/> Kelola Surat</button>
          <button onClick={() => setTab('masukan')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${tab === 'masukan' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}><MessageSquareText size={15}/> Masukan & Usulan Masuk</button>
        </div>
      </div>
      {tab === 'surat' ? <KelolaSurat /> : <AdminMasukanUsulan />}
    </div>
  );
}
