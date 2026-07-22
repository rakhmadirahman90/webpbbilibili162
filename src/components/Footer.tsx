import React from 'react';

interface FooterProps {
  onNavigate?: (sectionId: string, subPath?: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="w-full py-5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-t border-white/5 bg-[#070d1a] flex-shrink-0 z-10 relative flex flex-col sm:flex-row items-center justify-between px-6 lg:px-12 gap-3">
      <p>© 2026 PB BILIBILI 162. ALL RIGHTS RESERVED.</p>
      <p className="text-slate-600 text-[9px] font-mono tracking-widest">SISTEM INFORMASI TERPADU PB BILIBILI 162</p>
    </footer>
  );
}