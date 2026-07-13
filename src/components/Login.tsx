import React, { useState } from 'react';
import { supabase } from '../supabase';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert("Akses Ditolak: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <LogIn size={28} />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight uppercase">Admin Login</h2>
          <p className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mt-1.5">PB US 162 Bilibili System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-slate-600 ml-1">Alamat Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
                placeholder="admin@pbus162.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-slate-600 ml-1">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold uppercase tracking-wider shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Masuk Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
