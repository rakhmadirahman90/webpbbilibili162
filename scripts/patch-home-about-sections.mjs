import fs from 'node:fs';

const path = 'src/App.tsx';
let source = fs.readFileSync(path, 'utf8');

const oldBlock = `default:return <><Hero/><SambutanKetua/><Sejarah/><VisiMisi/><Fasilitas/><News/><PrayerTimes/><Contact/></>`;
const newBlock = `default:return <div id="home-landing-content" className="w-full overflow-visible">
      <section id="home-hero" className="w-full block"><Hero/></section>
      <section id="home-sambutan" className="w-full block"><SambutanKetua/></section>
      <section id="home-sejarah" className="w-full block min-h-[520px] sm:min-h-[600px]"><Sejarah/></section>
      <section id="home-visi-misi" className="w-full block min-h-[520px] sm:min-h-[600px]"><VisiMisi/></section>
      <section id="home-sarana-prasarana" className="w-full block min-h-[520px] sm:min-h-[600px]"><Fasilitas/></section>
      <section id="home-berita" className="w-full block"><News/></section>
      <section id="home-prayer-times" className="w-full block"><PrayerTimes/></section>
      <section id="home-contact" className="w-full block"><Contact/></section>
    </div>`;

if (source.includes(newBlock)) {
  console.log('[patch-home-about-sections] homepage sections already normalized');
} else if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  fs.writeFileSync(path, source, 'utf8');
  console.log('[patch-home-about-sections] restored Sejarah, Visi Misi, and Sarana Prasarana on homepage');
} else {
  throw new Error('[patch-home-about-sections] homepage render block not found');
}
