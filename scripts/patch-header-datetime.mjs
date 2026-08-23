import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

const start = source.indexOf('const LiveClock = memo(() => {');
const endMarker = '\n\ninterface NavbarProps';
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  console.warn('[patch-header-datetime] LiveClock block not found');
  process.exit(0);
}

const replacement = `const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const sync = () => setTime(new Date());
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const dayName = weekdays[time.getDay()];
  const date = time.getDate();
  const month = months[time.getMonth()];
  const year = time.getFullYear();
  const clock = time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div
      aria-label={\`Waktu saat ini: ${dayName}, ${date} ${month} ${year}, ${clock}\`}
      className="flex w-auto max-w-[170px] sm:max-w-none items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full bg-[#151d30]/90 border border-white/10 text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 shrink-0 whitespace-nowrap overflow-hidden"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      <span className="text-slate-200 truncate">{dayName}, {date} {month}</span>
      <span className="opacity-40 shrink-0">•</span>
      <span className="text-blue-400 shrink-0">{clock}</span>
      <span className="hidden sm:inline opacity-40 shrink-0">•</span>
      <span className="hidden sm:inline text-slate-500 shrink-0">{year}</span>
    </div>
  );
});`;

source = source.slice(0, start) + replacement + source.slice(end);

// Keep the mobile header balanced: logo | clock | menu button.
source = source.replace(
  'className="max-w-7xl mx-auto h-full px-3 sm:px-4 md:px-8 flex items-center justify-between gap-3"',
  'className="max-w-7xl mx-auto h-full px-3 sm:px-4 md:px-8 flex items-center gap-2 sm:gap-3"'
);

source = source.replace(
  'className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Beranda PB Bilibili 162"',
  'className="flex items-center gap-2 shrink-0 min-w-0 flex-1 lg:flex-none" aria-label="Beranda PB Bilibili 162"'
);

source = source.replace(
  'className="lg:hidden w-11 h-11 shrink-0 rounded-2xl',
  'className="lg:hidden w-11 h-11 shrink-0 ml-auto rounded-2xl'
);

fs.writeFileSync(file, source, 'utf8');
console.log('[patch-header-datetime] Header date/time enabled with balanced mobile layout');
