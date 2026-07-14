import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Zap, Loader2 } from 'lucide-react';

export default function Fasilitas() {
  const [loading, setLoading] = useState(true);
  const [dynamicContent, setDynamicContent] = useState<any>({
    fasilitas_title: "Fasilitas Unggulan",
    fasilitas_main_image: "",
    fasilitas_img1: "",
    fasilitas_img2: "",
    fasilitas_list: []
  });

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
            fasilitas_title: val.fasilitas_title,
            fasilitas_main_image: val.fasilitas_img1,
            fasilitas_img1: val.fasilitas_img2,
            fasilitas_img2: val.fasilitas_img3,
            fasilitas_list: Array.isArray(val.fasilitas_list) ? val.fasilitas_list : []
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
    <div className="max-w-6xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-6 bg-[#12141c]/60 rounded-[2.5rem]">
        <div className="text-center mb-12">
            <h3 className="text-3xl font-black text-white uppercase italic mb-2">{dynamicContent.fasilitas_title}</h3>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[dynamicContent.fasilitas_main_image, dynamicContent.fasilitas_img1, dynamicContent.fasilitas_img2].map((img, idx) => (
            img && (
                <div key={idx} className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-lg">
                <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Fasilitas ${idx + 1}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <span className="text-white font-black uppercase text-[10px] tracking-widest">Fasilitas Organisasi</span>
                </div>
                </div>
            )
            ))}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dynamicContent.fasilitas_list.map((item: any, i: number) => (
            <div key={i} className="bg-[#1a1d26] p-6 rounded-3xl border border-white/5 shadow-sm flex flex-col items-center text-center gap-3 hover:border-blue-500/30 transition-all group">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Zap size={20} />
                </div>
                <p className="font-black text-[10px] md:text-[11px] uppercase text-zinc-200 tracking-tight leading-tight">
                {typeof item === 'string' ? item : item.title || item.text}
                </p>
            </div>
            ))}
        </div>
    </div>
  );
}
