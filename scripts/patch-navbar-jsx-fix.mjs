import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let code = fs.readFileSync(path, 'utf8');

const navOpen = (code.match(/<nav\b/g) || []).length;
const navClose = (code.match(/<\/nav>/g) || []).length;

if (navOpen > navClose) {
  const marker = '\n    <div className={`lg:hidden fixed inset-0';
  const index = code.indexOf(marker);
  if (index < 0) {
    throw new Error('[patch-navbar-jsx-fix] mobile overlay marker not found');
  }
  code = code.slice(0, index) + '\n    </nav>' + code.slice(index);
  fs.writeFileSync(path, code, 'utf8');
  console.log(`[patch-navbar-jsx-fix] repaired missing </nav> (${navOpen} opening / ${navClose} closing)`);
} else {
  console.log(`[patch-navbar-jsx-fix] no change needed (${navOpen} opening / ${navClose} closing)`);
}
