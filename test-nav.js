import fs from 'fs';
const data = [
  { "id": "182ddd33-5836-4efb-b3b7-92717cb5506b", "label": "Berita", "path": "news", "order_index": 3, "type": "link", "parent_id": null },
  { "id": "2d4ab768-c22a-4b71-a76b-c7e30577e3de", "label": "Semua Atlet", "path": "Semua", "order_index": 1, "type": "link", "parent_id": "9209cc42-be89-4086-9041-35f49acfd96e" },
  { "id": "3a852d50-2fce-4050-a416-d6cbbb55ad96", "label": "Beranda", "path": "home", "order_index": 1, "type": "link", "parent_id": null },
  { "id": "42e2739d-9ce8-4506-96bf-5ac763c59e48", "label": "Visi & Misi", "path": "visi-misi", "order_index": 2, "type": "link", "parent_id": "cd3a94c1-a825-44b3-8766-78512eb727bb" },
  { "id": "4fb391bc-f8f8-48a6-9ea4-76dc0b173fb9", "label": "Peringkat", "path": "rankings", "order_index": 5, "type": "link", "parent_id": null },
  { "id": "6a483114-ecb8-4d87-88fd-9fdc71b40216", "label": "Sejarah", "path": "sejarah", "order_index": 1, "type": "link", "parent_id": "cd3a94c1-a825-44b3-8766-78512eb727bb" },
  { "id": "8f9e1002-a537-46af-a4b7-0d2142138279", "label": "Galeri", "path": "gallery", "order_index": 6, "type": "link", "parent_id": null },
  { "id": "9209cc42-be89-4086-9041-35f49acfd96e", "label": "Atlet", "path": "atlet", "order_index": 4, "type": "dropdown", "parent_id": null },
  { "id": "a1856185-8d97-493c-b66d-acccc3643b23", "label": "Fasilitas", "path": "fasilitas", "order_index": 3, "type": "link", "parent_id": "cd3a94c1-a825-44b3-8766-78512eb727bb" },
  { "id": "a959b75b-5b70-4945-a653-a5f09b77d29b", "label": "Atlet Senior", "path": "Senior", "order_index": 2, "type": "link", "parent_id": "9209cc42-be89-4086-9041-35f49acfd96e" },
  { "id": "c70d5e62-dece-4cb4-8358-fe77ac65dcce", "label": "STRUKTUR ORGANISASI", "path": "/STRUKTUR", "order_index": 12, "type": "dropdown", "parent_id": "cd3a94c1-a825-44b3-8766-78512eb727bb" },
  { "id": "cd3a94c1-a825-44b3-8766-78512eb727bb", "label": "Tentang Kami", "path": "about", "order_index": 2, "type": "dropdown", "parent_id": null },
  { "id": "eb6fd70a-733f-4ede-ae94-5fb2c5944957", "label": "Atlet Muda", "path": "Muda", "order_index": 3, "type": "link", "parent_id": "9209cc42-be89-4086-9041-35f49acfd96e" }
];

let finalNav = data;
      finalNav = finalNav.filter((item, index, self) => 
        index === self.findIndex((t) => t.label === item.label) && 
        item.label && item.label.toLowerCase() !== 'berita' && item.path !== 'berita'
      );

        const hasKas = finalNav.some((item) => item.path === 'kas');
        if (!hasKas) {
          finalNav.push({ id: 'kas-dynamic', label: 'Kas', path: 'kas', type: 'link', order_index: 98 });
        }

        const hasBerita = finalNav.some((item) => item.path === 'berita-1');
        if (!hasBerita) {
          finalNav.push({ id: 'berita-dynamic', label: 'Berita 1', path: 'berita-1', type: 'link', order_index: 2.1 });
        }
            
        const parentTentang = finalNav.find((item) => 
          item.path === 'tentang-kami' || item.label.toLowerCase().includes('tentang')
        );
        const hasDocs = finalNav.some((item) => item.path === 'dokumen');
        if (!hasDocs && parentTentang) {
          finalNav.push({ id: 'docs-dynamic', parent_id: parentTentang.id, label: 'Dokumen Penting', path: 'dokumen', order_index: 5 });
        }

        finalNav = finalNav.map((item) => {
          if (item.parent_id === '2' || (parentTentang && item.parent_id === parentTentang.id)) {
            if (item.path === 'sejarah') return { ...item, order_index: 1 };
            if (item.path === 'visi-misi') return { ...item, order_index: 2 };
            if (item.path === 'fasilitas') return { ...item, order_index: 3 };
            if (item.path === 'struktur-organisasi') return { ...item, order_index: 4 };
            if (item.path === 'dokumen') return { ...item, order_index: 5 };
          }
          return item;
        });

        if (parentTentang) {
          finalNav = finalNav.filter((item) => 
            !(item.label && item.label.toLowerCase() === 'struktur organisasi' && item.parent_id === parentTentang.id)
          );
          finalNav.push({ 
            id: 'struktur-dynamic', 
            parent_id: parentTentang.id, 
            label: 'Struktur Organisasi', 
            path: 'struktur-organisasi', 
            order_index: 4,
            type: 'link'
          });
        }

        let parentRanking = finalNav.find((item) => 
          item.path === 'peringkat' || item.path === 'ranking' || item.label.toLowerCase().includes('peringkat')
        );
        if (parentRanking) {
          parentRanking.type = 'dropdown';
          const hasQuiz = finalNav.some((item) => item.path === 'quiz');
          if (!hasQuiz) {
            finalNav.push({ id: 'quiz-dynamic', parent_id: parentRanking.id, label: 'Quiz Badminton', path: 'quiz', order_index: 99 });
          }
          const hasRankingSub = finalNav.some((item) => item.parent_id === parentRanking?.id && item.path === 'peringkat');
          if (!hasRankingSub) {
            finalNav.push({ id: 'ranking-sub-dynamic', parent_id: parentRanking.id, label: 'Ranking Atlet', path: 'peringkat', order_index: 1 });
          }
        }

      const map = new Map();
      finalNav.forEach(item => {
        const label = item.label ? item.label.trim().toLowerCase() : '';
        if (label === 'berita' || item.path === 'berita') return;
        if (!map.has(label) || (item.path && !map.get(label).path)) {
          map.set(label, item);
        }
      });
      finalNav = Array.from(map.values());
console.log("TOP LEVEL:", finalNav.filter(i => !i.parent_id).length);
