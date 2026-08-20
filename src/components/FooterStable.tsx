import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { getSiteSetting } from '../utils/siteSettingsHelper';

interface FooterData {
  copyright?: string;
  logo_url?: string;
}

const DEFAULT_COPYRIGHT = '© 2026 PB BILIBILI 162. ALL RIGHTS RESERVED.';

export default function FooterStable() {
  const [footerConfig, setFooterConfig] = useState<FooterData>({ copyright: DEFAULT_COPYRIGHT });

  const isStructurePage = typeof window !== 'undefined' &&
    ['/struktur', '/struktur-organisasi'].includes(window.location.pathname.toLowerCase());

  useEffect(() => {
    if (isStructurePage) return;

    let disposed = false;

    const load = async () => {
      try {
        const dataConfig = await getSiteSetting('footer_config') || await getSiteSetting('footer_settings');
        const branding = await getSiteSetting('navbar_branding');
        if (disposed) return;
        setFooterConfig({
          copyright: dataConfig?.copyright || DEFAULT_COPYRIGHT,
          logo_url: branding?.logo_url,
        });
      } catch (error) {
        console.warn('[Footer] setting fetch skipped:', error);
      }
    };

    void load();

    const channel = supabase
      .channel('public_footer_stable_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload.new && ['footer_config', 'footer_settings', 'navbar_branding'].includes(payload.new.key)) {
          void load();
        }
      })
      .subscribe();

    const handleUpdate = (event: Event) => {
      const key = (event as CustomEvent).detail?.key;
      if (!key || ['footer_config', 'footer_settings', 'navbar_branding'].includes(key)) void load();
    };

    window.addEventListener('site_setting_updated', handleUpdate);
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleUpdate);
    };
  }, [isStructurePage]);

  if (isStructurePage) return null;

  return (
    <footer
      id="footer-section"
      className="w-full bg-[#050914] text-slate-400 border-t border-slate-800/80 relative z-20 shrink-0"
    >
      <div className="mx-auto w-full max-w-7xl min-h-[72px] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-center text-center">
        <p className="m-0 max-w-full text-[10px] leading-5 sm:text-sm sm:leading-6 font-semibold tracking-[0.04em] text-slate-400 break-words [overflow-wrap:anywhere]">
          {footerConfig.copyright || DEFAULT_COPYRIGHT}
        </p>
      </div>
    </footer>
  );
}
