const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const updatedLogic = `
    const targetPath = subPath || path;

    if (['program', 'prestasi', 'faq'].includes(targetPath)) {
      onNavigate('home', targetPath);
      scrollToSection(targetPath);
      return;
    }
    
    if (targetPath === 'inventaris') {
      onNavigate('inventaris');
      return;
    }
`;

code = code.replace(/    if \(\['program', 'prestasi', 'faq'\]\.includes\(path\)\) \{[\s\S]*?return;\n    \}/, updatedLogic);

fs.writeFileSync('src/components/Navbar.tsx', code);
