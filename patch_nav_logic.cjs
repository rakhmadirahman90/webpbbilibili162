const fs = require('fs');

let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const additionalLogic = `
    if (['program', 'prestasi', 'faq'].includes(path)) {
      onNavigate('home', path);
      scrollToSection(path);
      return;
    }
    
    if (path === 'inventaris') {
      onNavigate('inventaris');
      return;
    }
`;

code = code.replace(/\/\/ 3. Quiz Badminton/, additionalLogic + '\n    // 3. Quiz Badminton');

fs.writeFileSync('src/components/Navbar.tsx', code);
