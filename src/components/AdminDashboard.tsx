import React from 'react';
import { Users, User, Zap, Activity } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminDashboard() {
  const [stats, setStats] = React.useState({
    totalAtlets: 0,
    totalMuda: 0,
    totalSenior: 0,
    totalPendaftaran: 0
  });

  React.useEffect(() => {
    async function fetchStats() {
      const { count: atletCount } = await supabase.from('rankings').select('id', { count: 'exact', head: true });
      const { count: daftarCount } = await supabase.from('pendaftaran').select('id', { count: 'exact', head: true });
      const { data: muda } = await supabase.from('atlet_stats').select('id').eq('kategori', 'MUDA');
      const { data: senior } = await supabase.from('atlet_stats').select('id').eq('kategori', 'SENIOR');
      
      setStats({
        totalAtlets: atletCount || 0,
        totalPendaftaran: daftarCount || 0,
        totalMuda: muda?.length || 0,
        totalSenior: senior?.length || 0
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black text-white mb-8 italic uppercase tracking-tighter">System <span className="text-blue-600">Dashboard</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Atlet Terdaftar', value: stats.totalAtlets, icon: Users, color: 'text-blue-500' },
          { title: 'Pendaftaran Baru', value: stats.totalPendaftaran, icon: User, color: 'text-emerald-500' },
          { title: 'Atlet Kategori Muda', value: stats.totalMuda, icon: Zap, color: 'text-indigo-500' },
          { title: 'Atlet Kategori Senior', value: stats.totalSenior, icon: Activity, color: 'text-rose-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 p-6 rounded-3xl border border-white/5 shadow-xl">
            <stat.icon className={`mb-4 ${stat.color}`} size={32} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.title}</p>
            <p className="text-4xl font-black text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
