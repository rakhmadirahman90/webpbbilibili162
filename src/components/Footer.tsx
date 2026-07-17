interface FooterProps {
  onNavigate?: (sectionId: string, subPath?: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="w-full py-5 text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.25em] border-t border-white/5 bg-[#070d1a] flex-shrink-0 z-10 relative">
      <p>© 2026 PB BILIBILI 162</p>
    </footer>
  );
}