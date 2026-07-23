const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add missing public imports if not present
if (!code.includes("import Sejarah from './components/Sejarah'")) {
  code = code.replace(/import AdminSejarah/, "import Sejarah from './components/Sejarah';\nimport AdminSejarah");
}
if (!code.includes("import VisiMisi from './components/VisiMisi'")) {
  code = code.replace(/import AdminVisiMisi/, "import VisiMisi from './components/VisiMisi';\nimport AdminVisiMisi");
}
if (!code.includes("import Fasilitas from './components/Fasilitas'")) {
  code = code.replace(/import AdminFasilitas/, "import Fasilitas from './components/Fasilitas';\nimport AdminFasilitas");
}
// StrukturOrganisasiPublic is already imported
// PublicFAQ, PublicProgram, PublicPrestasi are already imported

code = code.replace(/<Route path="prestasi" element=\{isAdmin \? <AdminPrestasi \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="prestasi" element={isAdmin ? <AdminPrestasi /> : <div className="p-4 sm:p-6"><PublicPrestasi /></div>} />');

code = code.replace(/<Route path="faq" element=\{isAdmin \? <AdminFAQ \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="faq" element={isAdmin ? <AdminFAQ /> : <div className="p-4 sm:p-6"><PublicFAQ /></div>} />');

code = code.replace(/<Route path="program" element=\{isAdmin \? <AdminProgram \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="program" element={isAdmin ? <AdminProgram /> : <div className="p-4 sm:p-6"><PublicProgram onNavigate={()=>{}} /></div>} />');

code = code.replace(/<Route path="sejarah" element=\{isAdmin \? <AdminSejarah \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="sejarah" element={isAdmin ? <AdminSejarah /> : <div className="p-4 sm:p-6"><Sejarah /></div>} />');

code = code.replace(/<Route path="visi-misi" element=\{isAdmin \? <AdminVisiMisi \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="visi-misi" element={isAdmin ? <AdminVisiMisi /> : <div className="p-4 sm:p-6"><VisiMisi /></div>} />');

code = code.replace(/<Route path="fasilitas" element=\{isAdmin \? <AdminFasilitas \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="fasilitas" element={isAdmin ? <AdminFasilitas /> : <div className="p-4 sm:p-6"><Fasilitas /></div>} />');

code = code.replace(/<Route path="struktur" element=\{isAdmin \? <AdminStructure \/> : <Navigate to="\/admin\/dashboard" replace \/>\} \/>/, 
  '<Route path="struktur" element={isAdmin ? <AdminStructure /> : <div className="p-4 sm:p-6"><StrukturOrganisasiPublic /></div>} />');

fs.writeFileSync('src/App.tsx', code);
