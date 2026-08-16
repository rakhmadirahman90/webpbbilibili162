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
    window.addEventListener('local-db-updated', refreshFromLocalDb);
    window.addEventListener('online', refreshFromLocalDb);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('local-db-updated', refreshFromLocalDb);
      window.removeEventListener('online', refreshFromLocalDb);
    };
  }, []);`;

// The athlete screen may already contain a newer authoritative Supabase effect.
// Build must remain idempotent instead of failing when the legacy pattern is absent.
if (!oldEffect.test(s)) {
  console.log('Athlete local-sync patch skipped: current ManajemenAtlet effect is already newer/compatible.');
  process.exit(0);
}

s = s.replace(oldEffect, newEffect);
fs.writeFileSync(path, s);
console.log('Applied athlete local-first hydration refresh patch.');
