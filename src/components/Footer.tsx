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
    <footer id="footer-section" className="w-full bg-[#050914] text-slate-400 border-t border-slate-800/80 py-6 px-4 relative z-20 text-center">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-400">
          {footerConfig.copyright || '© 2026 PB Bilibili 162. All Rights Reserved.'}
        </p>
      </div>
    </footer>
  );
}
