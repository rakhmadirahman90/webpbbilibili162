import React, { useState } from 'react';
import { X, User, Edit3 } from 'lucide-react';
import { Registrant } from '../types';

interface Props {
  atlet: Registrant;
  onClose: () => void;
  onEdit: () => void;
}

export default function AthleteProfileModal({ atlet, onClose, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'profil' | 'stats'>('profil');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#070d1a]/95 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-md bg-[#0c1426] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all"
        >
          <X size={20} />
        </button>

        {/* Header/Background with Avatar */}
        <div className="relative pt-8 pb-6 flex flex-col items-center bg-gradient-to-b from-blue-900/20 to-[#0c1426]">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#0c1426] shadow-2xl">
            {atlet.foto_url ? (
              <img src={atlet.foto_url} className="w-full h-full object-cover" alt={atlet.nama} />
            ) : (
              <User className="w-full h-full p-4 bg-slate-800 text-slate-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mt-4">{atlet.nama}</h2>
          <p className="text-sm text-blue-400">{atlet.kategori} | Rank #{atlet.rank}</p>
          
          {/* Tabs */}
          <div className="flex bg-white/5 p-1 rounded-full mt-6 border border-white/5">
            <button onClick={() => setActiveTab('profil')} className={`px-6 py-1.5 text-xs font-bold uppercase rounded-full transition-all ${activeTab === 'profil' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Profil</button>
            <button onClick={() => setActiveTab('stats')} className={`px-6 py-1.5 text-xs font-bold uppercase rounded-full transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Data Diri</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-white scrollbar-hide">
          {activeTab === 'profil' ? (
            <div className="space-y-6">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Biografi Singkat</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{atlet.bio}</p>
              </div>
              <button 
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Edit3 size={14} /> Edit Data Atlet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Domisili</p><p className="text-sm font-semibold mt-1">{atlet.domisili}</p></div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Kategori</p><p className="text-sm font-semibold mt-1">{atlet.kategori}</p></div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Rank</p><p className="text-sm font-semibold mt-1">#{atlet.rank}</p></div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Points</p><p className="text-sm font-semibold mt-1">{atlet.points?.toLocaleString() || 0}</p></div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Seed</p><p className="text-sm font-semibold mt-1">{atlet.seed}</p></div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5"><p className="text-[10px] text-slate-400 uppercase">Gender</p><p className="text-sm font-semibold mt-1">{atlet.jenis_kelamin}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
