const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

// Add new imports
code = code.replace("import { \n  Users", "import { \n  PackageOpen,\n  MessageCircleQuestion,\n  Target,\n  Users");

// Fix Absensi Icon
code = code.replace(
  "{ name: 'Absensi Latihan', path: 'absensi', icon: FileSpreadsheet, adminOnly: true }",
  "{ name: 'Absensi Latihan', path: 'absensi', icon: UserCheck, adminOnly: true }"
);

// Fix Inventaris Icon
code = code.replace(
  "{ name: 'Inventaris', path: 'inventaris', icon: Wallet, adminOnly: true }",
  "{ name: 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: true }"
);

// Fix Program Icon
code = code.replace(
  "{ name: 'Kelola Program', path: 'program', icon: Info, adminOnly: true }",
  "{ name: 'Kelola Program', path: 'program', icon: Target, adminOnly: true }"
);

// Fix Prestasi Icon
code = code.replace(
  "{ name: 'Kelola Prestasi', path: 'prestasi', icon: Info, adminOnly: true }",
  "{ name: 'Kelola Prestasi', path: 'prestasi', icon: Trophy, adminOnly: true }"
);

// Fix FAQ Icon
code = code.replace(
  "{ name: 'Kelola FAQ', path: 'faq', icon: Info, adminOnly: true }",
  "{ name: 'Kelola FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: true }"
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
