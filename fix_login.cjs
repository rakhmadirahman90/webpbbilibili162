const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

code = code.replace(
  "Admin Console",
  "Portal Login"
);
code = code.replace(
  "admin@pbbilibili162.com",
  "email@domain.com"
);

fs.writeFileSync('src/components/Login.tsx', code);
