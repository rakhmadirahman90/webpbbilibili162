import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserCheck, UserX, Clock, Calendar as CalendarIcon, Save, Search, Filter } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import { computeScheduleInfo, ScheduleInfo } from '../utils/schedule';
import { Timer, Zap } from 'lucide-react';

export default function AdminAbsensi({ session }: { session: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>(() => computeScheduleInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleInfo(computeScheduleInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAbsensi();
  }, [selectedDate]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users_duplicate').select('*');
      if (error) {
         if (error.message.includes('row-level security') || error.code === '42501' || error.code === '42P01') {
            const localUsers = JSON.parse(localStorage.getItem('users_local') || '[]');
            setUsers(localUsers);
         }
      } else if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAbsensi = async () => {
    let localAbsensi = JSON.parse(localStorage.getItem('absensi_local_v2') || '[]');
    if (localAbsensi.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const dummyAbsensi = [
        { id: 'abs_1', user_id: 'admin_1', tanggal: today, status: 'hadir', created_at: new Date().toISOString() },
        { id: 'abs_2', user_id: 'member_1', tanggal: today, status: 'hadir', created_at: new Date().toISOString() },
        { id: 'abs_3', user_id: 'member_2', tanggal: today, status: 'izin', created_at: new Date().toISOString() },
        { id: 'abs_4', user_id: 'member_3', tanggal: today, status: 'alfa', created_at: new Date().toISOString() },
      ];
      localStorage.setItem('absensi_local_v2', JSON.stringify(dummyAbsensi));
      localAbsensi = dummyAbsensi;
    }
    setAbsensi(localAbsensi.filter((a: any) => a.tanggal === selectedDate));
  };

  const handleAttendance = (userId: string, status: 'hadir' | 'izin' | 'alfa') => {
    const localAbsensi = JSON.parse(localStorage.getItem('absensi_local_v2') || '[]');
    const existingIndex = localAbsensi.findIndex((a: any) => a.user_id === userId && a.tanggal === selectedDate);
    
    if (existingIndex >= 0) {
      localAbsensi[existingIndex].status = status;
    } else {
      localAbsensi.push({
        id: 'abs_' + Date.now() + Math.random(),
        user_id: userId,
        tanggal: selectedDate,
        status: status,
        created_at: new Date().toISOString()
      });
    }
    
    localStorage.setItem('absensi_local_v2', JSON.stringify(localAbsensi));
    fetchAbsensi();
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Status absensi diperbarui',
      showConfirmButton: false,
      timer: 1500
    });
  };

  const filteredUsers = users.filter(u => 
    u.nama?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <UserCheck className="text-emerald-500" size={28} />
            Absensi Latihan
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pantau kehadiran atlet dan anggota club</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
            <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                <CalendarIcon size={16} className="text-blue-400" />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white text-sm font-bold focus:outline-none"
                />
            </div>
        </div>
      </div>

      
      {/* Realtime Schedule Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-red-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Timer className="text-amber-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              Status Jadwal Latihan Realtime
              {scheduleInfo.isOngoing && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> LIVE
                </span>
              )}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {scheduleInfo.isOngoing 
                ? `Sesi sedang berlangsung: ${scheduleInfo.activeSessionName}` 
                : `Sesi berikutnya: ${scheduleInfo.nextSessionDay} (${scheduleInfo.nextSessionName}) `}
            </p>
          </div>
        </div>
        {!scheduleInfo.isOngoing && (
          <div className="text-right flex gap-3 items-center">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Menuju Sesi:</span>
            <div className="flex gap-2 text-white font-mono text-sm font-bold">
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.days).padStart(2, '0')}d</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.hours).padStart(2, '0')}h</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.minutes).padStart(2, '0')}m</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5 text-amber-400">{String(scheduleInfo.seconds).padStart(2, '0')}s</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
               type="text"
               placeholder="Cari atlet..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
         </div>
         <div className="flex gap-2 text-xs font-bold w-full sm:w-auto">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-1 sm:flex-none text-center">
                Hadir: {absensi.filter(a => a.status === 'hadir').length}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-1 sm:flex-none text-center">
                Izin: {absensi.filter(a => a.status === 'izin').length}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex-1 sm:flex-none text-center">
                Alfa: {absensi.filter(a => a.status === 'alfa').length}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUsers.map(user => {
            const userAbsen = absensi.find(a => a.user_id === user.id);
            const status = userAbsen?.status;
            
            return (
                <div key={user.id} className="bg-[#0b1224] border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-4">
                        {user.foto_url ? (
                            <img src={user.foto_url} alt={user.nama} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-lg">
                                {user.nama?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm truncate">{user.nama}</h3>
                            <p className="text-xs text-slate-500 truncate">{user.role || 'anggota'}</p>
                        </div>
                    </div>
                    
                    <div className="flex grid grid-cols-3 gap-2 mt-auto">
                        <button 
                            onClick={() => handleAttendance(user.id, 'hadir')}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'hadir' ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                        >
                            Hadir
                        </button>
                        <button 
                            onClick={() => handleAttendance(user.id, 'izin')}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'izin' ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}`}
                        >
                            Izin
                        </button>
                        <button 
                            onClick={() => handleAttendance(user.id, 'alfa')}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'alfa' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        >
                            Alfa
                        </button>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}
