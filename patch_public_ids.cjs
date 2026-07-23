const fs = require('fs');

let code = fs.readFileSync('src/components/PublicProgram.tsx', 'utf-8');
code = code.replace(/<section className="py-20 relative overflow-hidden">/, '<section id="program" className="py-20 relative overflow-hidden">');
fs.writeFileSync('src/components/PublicProgram.tsx', code);

code = fs.readFileSync('src/components/PublicPrestasi.tsx', 'utf-8');
code = code.replace(/<section className="py-20 relative overflow-hidden">/, '<section id="prestasi" className="py-20 relative overflow-hidden">');
fs.writeFileSync('src/components/PublicPrestasi.tsx', code);

code = fs.readFileSync('src/components/PublicFAQ.tsx', 'utf-8');
code = code.replace(/<section className="py-20 relative overflow-hidden">/, '<section id="faq" className="py-20 relative overflow-hidden">');
fs.writeFileSync('src/components/PublicFAQ.tsx', code);
