const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    let modified = false;
    if (content.includes("'faq_local_v2'")) {
      content = content.replace(/'faq_local_v2'/g, "'faq_local_v3'");
      modified = true;
    }
    if (content.includes("'program_local_v2'")) {
      content = content.replace(/'program_local_v2'/g, "'program_local_v3'");
      modified = true;
    }
    if (content.includes("'prestasi_local_v2'")) {
      content = content.replace(/'prestasi_local_v2'/g, "'prestasi_local_v3'");
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(path.join(dir, file), content);
      console.log(`Updated ${file}`);
    }
  }
}
