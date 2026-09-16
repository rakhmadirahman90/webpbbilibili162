import fs from 'node:fs';
import path from 'node:path';

const navbarFile = path.resolve('src/components/Navbar.tsx');
let navbar = fs.readFileSync(navbarFile, 'utf8');

const legacy = ".channel('navbar_realtime_sync')";
const replacement = ".channel(`navbar_realtime_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)";

if (navbar.includes(legacy)) {
  navbar = navbar.replace(legacy, replacement);
  console.log('[patch-navbar-realtime] replaced static channel name with a unique channel id');
} else if (navbar.includes('navbar_realtime_sync_${Date.now()}')) {
  console.log('[patch-navbar-realtime] channel already patched');
}

// Athlete submenu items use the same /atlet page and select its filter.
// Without this mapping, "Senior" and "Muda" were incorrectly routed to /senior and /muda.
const legacyResolve = `  const resolveNavigationTarget = (path: string, subPath?: string) => {\n    const p = normalizeNavigationPath(path);\n    const s = normalizeNavigationPath(subPath || '');\n    if (s) return { section: s, tab: undefined };\n    return { section: p || 'home', tab: undefined };\n  };`;
const fixedResolve = `  const resolveNavigationTarget = (path: string, subPath?: string) => {\n    const p = normalizeNavigationPath(path);\n    const s = normalizeNavigationPath(subPath || '');\n    if (p === 'atlet' || p === 'players') {\n      if (s === 'senior' || s === 'muda' || s === 'semua') return { section: 'atlet', tab: s };\n      return { section: 'atlet', tab: undefined };\n    }\n    if (s) return { section: s, tab: undefined };\n    return { section: p || 'home', tab: undefined };\n  };`;
if (navbar.includes(legacyResolve)) {
  navbar = navbar.replace(legacyResolve, fixedResolve);
  console.log('[patch-navbar-realtime] fixed athlete submenu route resolution');
} else if (navbar.includes("if (p === 'atlet' || p === 'players')")) {
  console.log('[patch-navbar-realtime] athlete route resolution already patched');
}

const legacyGo = `    const target = section === 'home' || section === 'beranda' ? '/' : \`/\${section}\`;`;
const fixedGo = `    const target = section === 'home' || section === 'beranda'\n      ? '/'\n      : section === 'atlet' && tab\n        ? \`/atlet?filter=\${encodeURIComponent(tab)}\`\n        : \`/\${section}\`;`;
if (navbar.includes(legacyGo)) {
  navbar = navbar.replace(legacyGo, fixedGo);
  console.log('[patch-navbar-realtime] fixed athlete submenu target URL');
} else if (navbar.includes("section === 'atlet' && tab")) {
  console.log('[patch-navbar-realtime] athlete target URL already patched');
}

fs.writeFileSync(navbarFile, navbar, 'utf8');

const playersFile = path.resolve('src/components/Players.tsx');
let players = fs.readFileSync(playersFile, 'utf8');

const legacyPlayersImport = `import { useNavigate } from 'react-router-dom';`;
const fixedPlayersImport = `import { useNavigate, useSearchParams } from 'react-router-dom';`;
if (players.includes(legacyPlayersImport) && !players.includes('useSearchParams')) {
  players = players.replace(legacyPlayersImport, fixedPlayersImport);
  console.log('[patch-navbar-realtime] added athlete filter URL support');
}

const legacyPlayersState = `  const navigate = useNavigate();\n\n  const normalizeFilter = (val: string) => {`;
const fixedPlayersState = `  const navigate = useNavigate();\n  const [searchParams] = useSearchParams();\n\n  const normalizeFilter = (val: string) => {`;
if (players.includes(legacyPlayersState) && !players.includes('const [searchParams] = useSearchParams();')) {
  players = players.replace(legacyPlayersState, fixedPlayersState);
}

const legacyPlayersInitial = `  const [currentAgeGroup, setCurrentAgeGroup] = useState(normalizeFilter(initialFilter));`;
const fixedPlayersInitial = `  const urlFilter = searchParams.get('filter') || '';\n  const [currentAgeGroup, setCurrentAgeGroup] = useState(normalizeFilter(urlFilter || initialFilter));`;
if (players.includes(legacyPlayersInitial) && !players.includes('const urlFilter = searchParams.get(\'filter\')')) {
  players = players.replace(legacyPlayersInitial, fixedPlayersInitial);
}

const legacyPlayersEffect = `  useEffect(() => {\n    setCurrentAgeGroup(normalizeFilter(initialFilter));\n  }, [initialFilter]);`;
const fixedPlayersEffect = `  useEffect(() => {\n    const nextFilter = searchParams.get('filter') || initialFilter;\n    setCurrentAgeGroup(normalizeFilter(nextFilter));\n  }, [initialFilter, searchParams]);`;
if (players.includes(legacyPlayersEffect)) {
  players = players.replace(legacyPlayersEffect, fixedPlayersEffect);
}

fs.writeFileSync(playersFile, players, 'utf8');
console.log('[patch-navbar-realtime] athlete desktop/mobile submenu navigation is canonical');
