const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Imports
const newImports = `
import AdminAbsensi from './components/AdminAbsensi';
import AdminInventaris from './components/AdminInventaris';
import AdminPrestasi from './components/AdminPrestasi';
import AdminFAQ from './components/AdminFAQ';
import AdminProgram from './components/AdminProgram';
import PublicPrestasi from './components/PublicPrestasi';
import PublicFAQ from './components/PublicFAQ';
import PublicProgram from './components/PublicProgram';
`;

code = code.replace("import AdminFooter from './components/AdminFooter';", "import AdminFooter from './components/AdminFooter';" + newImports);

// Landing page injection
const landingReplacement = `
                    <LandingFeatures onNavigate={handleNavigate} />
                    <PublicProgram onNavigate={handleNavigate} />
                    <PublicPrestasi />
                    <PublicFAQ />
`;

code = code.replace("<LandingFeatures onNavigate={handleNavigate} />", landingReplacement);

// Admin Routes injection
const adminRoutesReplacement = `
            <Route path="sejarah" element={isAdmin ? <AdminSejarah /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="absensi" element={isAdmin ? <AdminAbsensi session={session} /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="inventaris" element={isAdmin ? <AdminInventaris /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="prestasi" element={isAdmin ? <AdminPrestasi /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="faq" element={isAdmin ? <AdminFAQ /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="program" element={isAdmin ? <AdminProgram /> : <Navigate to="/admin/dashboard" replace />} />
`;

code = code.replace('<Route path="sejarah" element={isAdmin ? <AdminSejarah /> : <Navigate to="/admin/dashboard" replace />} />', adminRoutesReplacement);

fs.writeFileSync('src/App.tsx', code);
