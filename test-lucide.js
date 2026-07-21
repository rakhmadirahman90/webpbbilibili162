import * as lucide from 'lucide-react';
const icons = [
  'Users', 'Newspaper', 'Trophy', 'Image', 'LogOut', 'LayoutDashboard', 'Zap', 'ChevronRight', 'Circle', 'ShieldCheck', 'Settings', 'Database', 'ExternalLink', 'Phone', 'Menu', 'Star', 'History', 'X', 'BarChart3', 'FileSearch', 'Layout', 'Images', 'Megaphone', 'LayoutGrid', 'Info', 'Network', 'Mail', 'Wallet', 'FileText', 'FileSpreadsheet', 'BookOpen'
];
const missing = icons.filter(i => !lucide[i]);
console.log("Missing:", missing);
