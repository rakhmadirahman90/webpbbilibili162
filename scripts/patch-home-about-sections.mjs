import fs from 'node:fs';

const path = 'src/App.tsx';
let source = fs.readFileSync(path, 'utf8');

const oldBlock = `default:return <><Hero/><SambutanKetua/><Sejarah/><VisiMisi/><Fasilitas/><News/><PrayerTimes/><Contact/></>`;
const newBlock = `default:return <div id="home-landing-content" className="w-full overflow-visible">
      <section id="home-hero" className="w-full block"><Hero/></section>
      <section id="home-sambutan" className="w-full block"><SambutanKetua/></section>
      <section id="home-prayer-times" className="w-full block"><PrayerTimes/></section>
    </div>`;

if (source.includes(newBlock)) {
  console.log('[patch-home-about-sections] homepage landing view already normalized');
} else if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  fs.writeFileSync(path, source, 'utf8');
  console.log('[patch-home-about-sections] hidden Sejarah, Visi Misi, Sarana Prasarana, Berita, and Contact from homepage landing view');
} else if (source.includes("import LandingPage from './components/LandingPage';") && source.includes('default:return <LandingPage onNavigate={handleNavigate}/>')) {
  console.log('[patch-home-about-sections] custom LandingPage homepage already active; no-op');
} else {
  console.warn('[patch-home-about-sections] homepage render block not found; leaving source unchanged');
}
