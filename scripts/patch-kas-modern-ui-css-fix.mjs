import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const cssPath = 'src/index.css';
const css = fs.readFileSync(cssPath, 'utf8');
const fixed = css.replace(/\.border-blue-900\/30/g, '.border-blue-900\\/30');

if (fixed !== css) {
  fs.writeFileSync(cssPath, fixed, 'utf8');
  console.log('[patch-kas-modern-ui-css-fix] escaped Tailwind slash selector for PostCSS');
} else {
  console.log('[patch-kas-modern-ui-css-fix] no slash selector fix needed');
}

execFileSync(process.execPath, ['scripts/patch-kas-responsive-transaction-switch.mjs'], { stdio: 'inherit' });
