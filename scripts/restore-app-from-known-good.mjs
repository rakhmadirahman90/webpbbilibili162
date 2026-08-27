import fs from 'node:fs';
import https from 'node:https';

const url = 'https://raw.githubusercontent.com/rakhmadirahman90/webpbbilibili162/ea709840da2abaaa784defc8fb777b252ad650ac/src/App.tsx';
const target = 'src/App.tsx';

const fetchText = (input) => new Promise((resolve, reject) => {
  https.get(input, { headers: { 'User-Agent': 'PB-Bilibili-162-build' } }, (res) => {
    if (res.statusCode !== 200) {
      reject(new Error(`Failed to fetch known-good App.tsx: HTTP ${res.statusCode}`));
      res.resume();
      return;
    }
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

const original = await fetchText(url);
const eager = original
  .replace("import PwaInstallNotification from './components/PwaInstallNotification';", "import PwaInstallNotification from './components/PwaInstallNotification';\nimport AdminDashboard from './components/AdminDashboard';")
  .replace("const AdminDashboard = lazy(() => import('./components/AdminDashboard'));\n", '');

if (!eager.includes("import AdminDashboard from './components/AdminDashboard';")) {
  throw new Error('Known-good App.tsx restoration did not produce the expected AdminDashboard import.');
}

fs.writeFileSync(target, eager);
console.log('Restored App.tsx from the last known-good commit and eagerly loaded AdminDashboard.');
