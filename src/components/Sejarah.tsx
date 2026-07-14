import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader2 } from 'lucide-react';

export default function Sejarah() {
  const [loading, setLoading] = useState(true);
  const [dynamicContent, setDynamicContent] = useState<any>({});

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
            sejarah_title: val.sejarah_title,
            sejarah: val.sejarah_desc,
            sejarah_image: val.sejarah_img,
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
    <div className="w-full animate-in fade-in duration-700 flex flex-col bg-white text-zinc-800 rounded-[2.5rem] p-6 sm:p-12">
        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-center mb-10">{dynamicContent.sejarah_title || "Jejak Langkah Kami"}</h2>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 shrink-0">
            <img 
                src={dynamicContent.sejarah_image || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070"} 
                alt="Founder PB Bilibili 162" 
                className="w-full aspect-[4/5] object-cover rounded-3xl shadow-xl border border-zinc-200"
                referrerPolicy="no-referrer"
            />
            </div>
            <div className="w-full md:w-2/3">
            {dynamicContent.sejarah ? (
                dynamicContent.sejarah.split('\n').filter((p: string) => p.trim() !== '').map((para: string, idx: number) => (
                <p key={idx} className="font-sans text-[16px] sm:text-[18px] md:text-[21px] leading-relaxed text-zinc-700 font-medium mb-6 last:mb-0 text-justify">
                    {para}
                </p>
                ))
            ) : (
                <p className="font-sans text-[16px] sm:text-[18px] md:text-[21px] leading-relaxed text-zinc-400 font-medium italic">
                Belum ada data sejarah yang ditambahkan.
                </p>
            )}
            </div>
        </div>
    </div>
  );
}
