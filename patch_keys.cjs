const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    let modified = false;
    if (content.includes("'inventaris_local'")) {
      content = content.replace(/'inventaris_local'/g, "'inventaris_local_v2'");
      modified = true;
    }
    if (content.includes("'faq_local'")) {
      content = content.replace(/'faq_local'/g, "'faq_local_v2'");
      modified = true;
    }
    if (content.includes("'program_local'")) {
      content = content.replace(/'program_local'/g, "'program_local_v2'");
      modified = true;
    }
    if (content.includes("'prestasi_local'")) {
      content = content.replace(/'prestasi_local'/g, "'prestasi_local_v2'");
      modified = true;
    }
    if (content.includes("'absensi_local'")) {
      content = content.replace(/'absensi_local'/g, "'absensi_local_v2'");
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(path.join(dir, file), content);
      console.log(`Updated ${file}`);
    }
  }
}
