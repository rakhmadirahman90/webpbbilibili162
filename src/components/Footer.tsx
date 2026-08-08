import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { getSiteSetting } from '../utils/siteSettingsHelper';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

interface FooterData {
  site_name?: string;
  site_name_highlight?: string;
  logo_url?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  copyright?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

export default function Footer() {
  const [footerConfig, setFooterConfig] = useState<FooterData>({
    site_name: 'PB Bilibili',
    site_name_highlight: '162',
    logo_url: '/logo_pb_bilibili_162.svg',
    description: 'Membina legenda masa depan dengan fasilitas standar nasional dan sport-science.',
    address: 'Jl. Andi Makkasau No. 171, Parepare, Indonesia',
    phone: '+62 812 1902 7234',
    email: 'info@pbbilibili162.id',
    copyright: '© 2026 PB BILIBILI 162. ALL RIGHTS RESERVED.',
    socials: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: ''
    }
  });

  const loadFooterData = async () => {
    try {
      const dataConfig = await getSiteSetting('footer_config') || await getSiteSetting('footer_settings');
      if (dataConfig) {
        setFooterConfig(prev => ({
          ...prev,
          ...dataConfig,
          socials: { ...prev.socials, ...(dataConfig.socials || {}) }
        }));
      }

      const branding = await getSiteSetting('navbar_branding');
      if (branding) {
        setFooterConfig(prev => ({
          ...prev,
          logo_url: branding.logo_url || prev.logo_url,
          site_name: branding.brand_name_main || prev.site_name,
          site_name_highlight: branding.brand_name_accent || prev.site_name_highlight
        }));
      }
    } catch (e) {
      console.warn("Footer setting fetch error:", e);
    }
  };

  useEffect(() => {
    loadFooterData();

    const channel = supabase
      .channel('public_footer_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload.new && (payload.new.key === 'footer_config' || payload.new.key === 'footer_settings' || payload.new.key === 'navbar_branding')) {
          loadFooterData();
        }
      })
      .subscribe();

    const handleCustomEvent = (e: any) => {
      if (e.detail?.key === 'footer_config' || e.detail?.key === 'footer_settings' || e.detail?.key === 'navbar_branding') {
        loadFooterData();
      }
    };

    window.addEventListener('site_setting_updated', handleCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomEvent);
    };
  }, []);

  return (
    <footer id="footer-section" className="w-full bg-[#050914] text-slate-400 border-t border-slate-800/80 pt-10 pb-6 px-4 relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Column 1: Brand & Description */}
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <img 
              src={footerConfig.logo_url || "/logo_pb_bilibili_162.svg"} 
              alt="Logo" 
              className="w-10 h-10 object-contain drop-shadow"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/logo_pb_bilibili_162.svg";
              }}
            />
            <span className="text-xl font-bold tracking-tight text-white">
              {footerConfig.site_name || "PB Bilibili"} <span className="text-blue-500">{footerConfig.site_name_highlight || "162"}</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            {footerConfig.description || "Membina legenda masa depan badminton Indonesia dengan pembinaan terpadu dan profesional."}
          </p>
        </div>

        {/* Column 2: Contact Info */}
        <div className="flex flex-col gap-2 text-sm">
          <h4 className="text-white font-semibold mb-1 tracking-wide uppercase text-xs">Kontak Resmi</h4>
          {footerConfig.address && (
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{footerConfig.address}</span>
            </div>
          )}
          {footerConfig.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{footerConfig.phone}</span>
            </div>
          )}
          {footerConfig.email && (
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{footerConfig.email}</span>
            </div>
          )}
        </div>

        {/* Column 3: Social Media */}
        <div className="flex flex-col gap-2">
          <h4 className="text-white font-semibold mb-1 tracking-wide uppercase text-xs">Media Sosial</h4>
          <p className="text-xs text-slate-400 mb-2">Ikuti perkembangan dan jadwal latihan terbaru kami.</p>
          <div className="flex items-center gap-3">
            {footerConfig.socials?.facebook && (
              <a href={footerConfig.socials.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {footerConfig.socials?.instagram && (
              <a href={footerConfig.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-pink-400 hover:bg-pink-600 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {footerConfig.socials?.twitter && (
              <a href={footerConfig.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-sky-400 hover:bg-sky-500 hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {footerConfig.socials?.youtube && (
              <a href={footerConfig.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-red-500 hover:bg-red-600 hover:text-white transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-4 border-t border-slate-800/60 text-center">
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {footerConfig.copyright || '© 2026 PB BILIBILI 162. ALL RIGHTS RESERVED.'}
        </p>
      </div>
    </footer>
  );
}
