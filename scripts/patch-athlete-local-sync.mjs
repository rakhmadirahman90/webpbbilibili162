import fs from 'node:fs';

const path = 'src/ManajemenAtlet.tsx';
let s = fs.readFileSync(path, 'utf8');

const oldEffect = /  useEffect\(\(\) => \{\n    fetchAtlets\(\);\n\n    const channel = supabase[\s\S]*?    return \(\) => \{\n      supabase\.removeChannel\(channel\);\n    \};\n  \}, \[\]\);/;

const newEffect = `  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshFromLocalDb = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void fetchAtlets(); }, 50);
    };

    void fetchAtlets();
    // Local-first remote SELECTs hydrate IndexedDB in the background and
    // emit local-db-updated. Refresh the screen when that hydration arrives.
    window.addEventListener('local-db-updated', refreshFromLocalDb);
    window.addEventListener('online', refreshFromLocalDb);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('local-db-updated', refreshFromLocalDb);
      window.removeEventListener('online', refreshFromLocalDb);
    };
  }, []);`;

if (!oldEffect.test(s)) throw new Error('ManajemenAtlet realtime effect not found');
s = s.replace(oldEffect, newEffect);

fs.writeFileSync(path, s);
console.log('Applied athlete local-first hydration refresh patch.');
