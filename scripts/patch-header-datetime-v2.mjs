import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('const LiveClock = memo(() => {');
const endMarker = '\n\ninterface NavbarProps';
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  console.warn('[patch-header-datetime-v2] LiveClock block not found');
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
  const clock = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div
      aria-label={'Waktu saat ini: ' + dayName + ', ' + date + ' ' + month + ' ' + year + ', ' + clock}
      className="flex min-w-0 max-w-[calc(100vw-105px)] sm:max-w-none items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-[#151d30]/90 border border-white/10 text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 shrink-0 whitespace-nowrap"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      <span className="text-slate-200">{dayName}, {date} {month}</span>
      <span className="opacity-40">•</span>
      <span className="text-blue-400">{clock}</span>
      <span className="hidden sm:inline opacity-40">•</span>
      <span className="hidden sm:inline text-slate-500">{year}</span>
    </div>
  );
});`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-header-datetime-v2] Mobile header day/date/time enabled');
