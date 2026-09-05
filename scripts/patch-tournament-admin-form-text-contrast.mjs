import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_FORM_TEXT_CONTRAST_V1__ */';
if (src.includes(marker)) {
  console.log('[patch-form-text-contrast] already applied');
  process.exit(0);
}

const css = `
<style>{\`\n${marker}\n.tournament-admin-page input:not([type="file"]),\n.tournament-admin-page textarea,\n.tournament-admin-page select {\n  color: #0f172a !important;\n  -webkit-text-fill-color: #0f172a !important;\n  caret-color: #0f172a !important;\n  opacity: 1 !important;\n}\n.tournament-admin-page input:not([type="file"])::placeholder,\n.tournament-admin-page textarea::placeholder {\n  color: #64748b !important;\n  -webkit-text-fill-color: #64748b !important;\n  opacity: 1 !important;\n}\n.tournament-admin-page input:not([type="file"]):disabled,\n.tournament-admin-page textarea:disabled,\n.tournament-admin-page select:disabled {\n  color: #0f172a !important;\n  -webkit-text-fill-color: #0f172a !important;\n  opacity: 1 !important;\n}\n\`}</style>`;

const anchor = 'return <div className="tournament-admin-page';
if (!src.includes(anchor)) throw new Error('[patch-form-text-contrast] tournament admin root marker not found');
src = src.replace(anchor, `return <>${css}<div className="tournament-admin-page`);
const end = '\n  </div>\n}\n';
const idx = src.lastIndexOf(end);
if (idx < 0) throw new Error('[patch-form-text-contrast] component closing marker not found');
src = src.slice(0, idx) + '\n  </div></>\n}' + src.slice(idx + end.length);
fs.writeFileSync(path, src);
console.log('[patch-form-text-contrast] black text + readable placeholders applied to tournament admin form controls');
