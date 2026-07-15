import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Target, CheckCircle2, Loader2 } from 'lucide-react';

export default function VisiMisi() {
  const [loading, setLoading] = useState(true);
  const [dynamicContent, setDynamicContent] = useState<any>({ visi: '', misi: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'about_content')
          .maybeSingle();
        if (data?.value) {
          const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setDynamicContent({
            visi: val.vision || val.visi,
            misi: Array.isArray(val.missions || val.misi) ? (val.missions || val.misi) : [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-5xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-6 bg-[#12141c]/60 rounded-[2.5rem]">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Target size={14} /> Visi
          </div>
          <div className="bg-[#1a1d26] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-xl font-normal text-[16px] md:text-[18px] text-zinc-300 leading-relaxed tracking-normal text-justify">
            "{dynamicContent.visi}"
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 size={14} /> Misi
          </div>
          <div className="space-y-4">
            {dynamicContent.misi.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-4 bg-[#1a1d26] p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 shadow-sm group">
                <div className="bg-blue-500/10 p-2 rounded-xl shrink-0 mt-0.5 group-hover:bg-blue-600 transition-colors">
                  <CheckCircle2 size={16} className="text-blue-500 group-hover:text-white" />
                </div>
                <p className="text-zinc-300 text-[14px] md:text-[16px] font-normal leading-relaxed text-justify">
                  {typeof item === 'string' ? item : item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
