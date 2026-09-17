export function installAdminAgendaMenu() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const install = () => {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar || sidebar.querySelector('[data-admin-agenda-link="true"]')) return;
    const groups = Array.from(sidebar.querySelectorAll('button'));
    const sectionButton = groups.find(b => /informasi\s*&\s*kegiatan/i.test(b.textContent || ''));
    if (!sectionButton) return;
    const section = sectionButton.parentElement?.parentElement;
    const linkHost = section?.querySelector('nav') || section?.querySelector('div:last-child');
    if (!linkHost) return;
    const a = document.createElement('a');
    a.href = '/admin/agenda';
    a.setAttribute('data-admin-agenda-link','true');
    a.className = 'flex items-center gap-3 w-full min-h-[42px] px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors';
    a.innerHTML = '<span class="w-5 min-w-5 flex justify-center text-blue-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span><span>Agenda PB Bilibili 162</span>';
    linkHost.appendChild(a);
  };
  const observer = new MutationObserver(install);
  observer.observe(document.body, { childList: true, subtree: true });
  install();
  return () => observer.disconnect();
}
