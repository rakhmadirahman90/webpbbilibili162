import fs from 'node:fs';

const file = 'src/components/AdminGallery.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-admin-gallery-mobile-responsive] AdminGallery.tsx not found; skipped.');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;

// Give the admin gallery modal its own responsive scope. This prevents global
// mobile form rules from turning labels/fields into a horizontal layout and
// forces every child to respect the phone viewport width.
source = source.replace(
  'fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto',
  'admin-gallery-modal fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]'
);
source = source.replace(
  'className="w-full max-w-4xl rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"',
  'className="admin-gallery-form w-full max-w-4xl min-w-0 rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"'
);
source = source.replace(
  '<div className="p-5 sm:p-7 grid lg:grid-cols-[1fr_1.05fr] gap-7">',
  '<div className="admin-gallery-form-body p-3 sm:p-7 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-5 sm:gap-7 min-w-0">'
);
source = source.replace(
  '<div className="space-y-5">',
  '<div className="space-y-5 min-w-0 w-full">'
);
source = source.replace(
  '<div className="rounded-3xl bg-black/20 border border-white/5 p-4 sm:p-5 min-h-[300px]">',
  '<div className="admin-gallery-preview rounded-3xl bg-black/20 border border-white/5 p-3 sm:p-5 min-h-[260px] min-w-0 w-full overflow-hidden">'
);
source = source.replace(
  '<div className="flex items-center justify-between p-5 sm:p-7 border-b border-white/10">',
  '<div className="flex items-center justify-between gap-3 p-4 sm:p-7 border-b border-white/10 min-w-0">'
);
source = source.replace(
  '<div><h2 className="text-xl sm:text-2xl font-black uppercase">',
  '<div className="min-w-0 flex-1"><h2 className="text-xl sm:text-2xl font-black uppercase break-words">'
);

const styleMarker = '</div>\n  );\n}';
const styleBlock = `</div>\n\n      <style>{\`\n        .admin-gallery-modal, .admin-gallery-modal * { box-sizing: border-box; }\n        .admin-gallery-modal { overscroll-behavior: contain; }\n        .admin-gallery-form, .admin-gallery-form-body, .admin-gallery-form-body > *, .admin-gallery-preview { min-width: 0; max-width: 100%; }\n        .admin-gallery-form input, .admin-gallery-form select, .admin-gallery-form textarea { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }\n        .admin-gallery-form label { display: block !important; width: 100% !important; min-width: 0 !important; }\n        .admin-gallery-form button { max-width: 100%; min-width: 0; }\n        .admin-gallery-form img, .admin-gallery-form video, .admin-gallery-form iframe { max-width: 100%; }\n        @media (max-width: 767px) {\n          .admin-gallery-modal { padding: 8px !important; }\n          .admin-gallery-modal > div { width: 100% !important; padding: 4px 0 16px !important; }\n          .admin-gallery-form { width: 100% !important; max-width: 100% !important; border-radius: 20px !important; }\n          .admin-gallery-form-body { padding: 14px !important; grid-template-columns: minmax(0, 1fr) !important; gap: 16px !important; }\n          .admin-gallery-form-body .grid.grid-cols-2 { grid-template-columns: minmax(0, 1fr) !important; }\n          .admin-gallery-form-body .flex.gap-2 { flex-direction: row !important; }\n          .admin-gallery-form-body textarea { min-height: 96px; }\n          .admin-gallery-preview { min-height: 220px !important; }\n          .admin-gallery-form > .flex { padding: 14px !important; }\n          .admin-gallery-form > .flex button { width: 100% !important; }\n          .admin-gallery-form h2 { line-height: 1.15; }\n        }\n      \`}</style>\n    </div>\n  );\n}`;
if (source.includes(styleMarker) && !source.includes('admin-gallery-modal, .admin-gallery-modal *')) {
  source = source.replace(styleMarker, styleBlock);
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-admin-gallery-mobile-responsive] responsive mobile modal fix applied.');
} else {
  console.log('[patch-admin-gallery-mobile-responsive] no changes needed.');
}
