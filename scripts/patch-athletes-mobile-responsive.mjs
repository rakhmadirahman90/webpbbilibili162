import fs from 'node:fs';

const file = 'src/components/Players.tsx';
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('athletes-mobile-responsive-v1')) {
  const replacements = [
    ['className="w-full flex-grow pt-2 pb-28 sm:pb-36 bg-[#0b0e14] text-white flex flex-col overflow-hidden font-sans"', 'className="athletes-mobile-responsive w-full min-w-0 max-w-none flex-grow pt-2 pb-28 sm:pb-36 bg-[#0b0e14] text-white flex flex-col overflow-hidden font-sans"'],
    ['className="flex flex-col flex-grow max-w-7xl mx-auto px-4 mt-0 relative z-10 w-full gap-3"', 'className="athletes-content flex flex-col flex-grow max-w-7xl mx-auto px-3 sm:px-4 mt-0 relative z-10 w-full min-w-0 gap-3"'],
    ['className="text-2xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter"', 'className="text-2xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none"'],
    ['className="flex bg-[#1a1d26] p-1 rounded-2xl border border-white/10 w-full sm:w-fit overflow-x-auto no-scrollbar backdrop-blur-md shadow-2xl gap-1 shrink-0"', 'className="athletes-filter-tabs flex bg-[#1a1d26] p-1 rounded-2xl border border-white/10 w-full sm:w-fit overflow-x-auto no-scrollbar backdrop-blur-md shadow-2xl gap-1 shrink-0 min-w-0"'],
    ['className="px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0', 'className="px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0'],
    ['className="flex-1 overflow-hidden relative group/slider min-h-0"', 'className="athletes-slider flex-1 overflow-hidden relative group/slider min-h-0 w-full min-w-0"'],
    ['spaceBetween={25}', 'spaceBetween={12}'],
    ['slidesPerView={1.2}', 'slidesPerView={1.08}'],
    ['breakpoints={{ 640: { slidesPerView: 2.5 }, 1024: { slidesPerView: 4 } }}', 'breakpoints={{ 480: { slidesPerView: 1.45 }, 640: { slidesPerView: 2.5 }, 1024: { slidesPerView: 4 } }}'],
    ['className="h-full"', 'className="h-full w-full min-w-0"'],
    ['className="group cursor-pointer relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 transition-all duration-500 shadow-2xl"', 'className="group cursor-pointer relative aspect-[3/4.2] w-full min-w-0 rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 transition-all duration-500 shadow-2xl"'],
    ['className="absolute bottom-8 left-8 right-8 transform group-hover:-translate-y-2 transition-transform duration-500"', 'className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8 transform group-hover:-translate-y-2 transition-transform duration-500"'],
    ['className="text-xl md:text-2xl font-black uppercase italic mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2"', 'className="text-lg sm:text-xl md:text-2xl font-black uppercase italic mb-3 sm:mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2 break-words"'],
    ['className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-12 md:w-14 h-12 md:h-14', 'className="absolute left-2 sm:-left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14'],
    ['className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-12 md:w-14 h-12 md:h-14', 'className="absolute right-2 sm:-right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14']
  ];

  for (const [from, to] of replacements) text = text.replace(from, to);

  const styleBlock = `      <style>{\`\n        /* athletes-mobile-responsive-v1 */\n        .athletes-mobile-responsive,\n        .athletes-mobile-responsive .athletes-content,\n        .athletes-mobile-responsive .athletes-slider,\n        .athletes-mobile-responsive .swiper,\n        .athletes-mobile-responsive .swiper-wrapper {\n          min-width: 0 !important;\n          box-sizing: border-box;\n        }\n        .athletes-mobile-responsive .swiper { width: 100% !important; max-width: 100% !important; overflow: visible; }\n        .athletes-mobile-responsive .swiper-slide { min-width: 0 !important; box-sizing: border-box; }\n        @media (max-width: 639px) {\n          .athletes-mobile-responsive {\n            width: 100vw !important;\n            max-width: 100vw !important;\n            margin-left: calc(50% - 50vw) !important;\n            margin-right: calc(50% - 50vw) !important;\n            padding-left: 0 !important;\n            padding-right: 0 !important;\n          }\n          .athletes-mobile-responsive .athletes-content {\n            width: 100% !important;\n            max-width: none !important;\n            padding-left: 12px !important;\n            padding-right: 12px !important;\n          }\n          .athletes-mobile-responsive .athletes-filter-tabs {\n            scrollbar-width: none;\n            -ms-overflow-style: none;\n          }\n          .athletes-mobile-responsive .athletes-filter-tabs::-webkit-scrollbar { display: none; }\n          .athletes-mobile-responsive .athletes-slider {\n            width: 100% !important;\n            max-width: none !important;\n            overflow: hidden !important;\n          }\n        }\n      \`}</style>\n`;

  const marker = '    </section>\n  );';
  if (text.includes(marker)) text = text.replace(marker, `${styleBlock}    </section>\n  );`);

  fs.writeFileSync(file, text);
}

console.log('[athletes-mobile-responsive] applied responsive athlete layout.');
