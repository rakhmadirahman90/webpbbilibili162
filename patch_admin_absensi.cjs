const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAbsensi.tsx', 'utf-8');

// Add import for schedule util
if (!code.includes("import { computeScheduleInfo")) {
  code = code.replace(
    "import { motion } from 'framer-motion';",
    "import { motion } from 'framer-motion';\nimport { computeScheduleInfo, ScheduleInfo } from '../utils/schedule';\nimport { Timer, Zap } from 'lucide-react';"
  );
}

// Add state for schedule inside component
if (!code.includes("const [scheduleInfo, setScheduleInfo]")) {
  code = code.replace(
    "const [search, setSearch] = useState('');",
    "const [search, setSearch] = useState('');\n  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>(() => computeScheduleInfo());\n\n  useEffect(() => {\n    const timer = setInterval(() => {\n      setScheduleInfo(computeScheduleInfo());\n    }, 1000);\n    return () => clearInterval(timer);\n  }, []);"
  );
}

// Add UI banner for schedule under the header
const bannerHTML = `
      {/* Realtime Schedule Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-red-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Timer className="text-amber-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              Status Jadwal Latihan Realtime
              {scheduleInfo.isOngoing && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> LIVE
                </span>
              )}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {scheduleInfo.isOngoing 
                ? \`Sesi sedang berlangsung: \${scheduleInfo.activeSessionName}\` 
                : \`Sesi berikutnya: \${scheduleInfo.nextSessionDay} (\${scheduleInfo.nextSessionName}) \`}
            </p>
          </div>
        </div>
        {!scheduleInfo.isOngoing && (
          <div className="text-right flex gap-3 items-center">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Menuju Sesi:</span>
            <div className="flex gap-2 text-white font-mono text-sm font-bold">
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.days).padStart(2, '0')}d</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.hours).padStart(2, '0')}h</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">{String(scheduleInfo.minutes).padStart(2, '0')}m</span>
              <span className="bg-black/40 px-2 py-1 rounded-lg border border-white/5 text-amber-400">{String(scheduleInfo.seconds).padStart(2, '0')}s</span>
            </div>
          </div>
        )}
      </div>
`;

code = code.replace(
  '<div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">',
  bannerHTML + '\n      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">'
);

fs.writeFileSync('src/components/AdminAbsensi.tsx', code);
