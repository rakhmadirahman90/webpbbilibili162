import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

// Agenda must always have a real import in the build output. Do not depend on
// a particular neighboring import because App.tsx is normalized by other
// production preparation scripts before this patch runs.
if (!s.includes("from './components/AgendaPB162'")) {
  const importAnchors = [
    "import Navbar from './components/Navbar';",
    "import React, { useState, useEffect, useRef, lazy, Suspense, startTransition } from 'react';",
  ];
  const anchor = importAnchors.find((x) => s.includes(x));
  if (!anchor) throw new Error('[patch-agenda-integration] stable App import anchor not found');
  s = s.replace(anchor, `${anchor}\nimport AgendaPB162 from './components/AgendaPB162';`);
}

// Keep the route recognized by the compact App navigation contract.
s = s.replace("['jadwal','jadwal-latihan','schedule'", "['agenda','jadwal','jadwal-latihan','schedule'");
s = s.replace("{beranda:'home',home:'home',gallery:", "{beranda:'home',home:'home',agenda:'agenda',gallery:");

// Add the dedicated public Agenda view only once.
if (!s.includes("case'agenda':return <AgendaPB162/>;")) {
  const marker = "const renderPublicView=()=>{switch(activeView){";
  if (!s.includes(marker)) throw new Error('[patch-agenda-integration] renderPublicView marker not found');
  s = s.replace(marker, `${marker}case'agenda':return <AgendaPB162/>;`);
}

// Show a compact realtime agenda section on the landing page only once.
if (!s.includes('<News/><AgendaPB162 compact/><PrayerTimes/>')) {
  s = s.replace('<News/><PrayerTimes/>', '<News/><AgendaPB162 compact/><PrayerTimes/>');
}

fs.writeFileSync(path, s);
console.log('[patch-agenda-integration] realtime agenda integrated into public App with guaranteed import.');
