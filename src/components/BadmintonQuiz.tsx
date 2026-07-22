import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  ChevronRight, 
  Lock, 
  RotateCcw, 
  Lightbulb, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Star, 
  Zap, 
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Volume2,
  RefreshCw,
  Medal
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Clue {
  num: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
  startR: number;
  startC: number;
}

interface LevelData {
  level: number;
  title: string;
  description: string;
  grid: string[][];
  numbers: Record<string, string>;
  clues: {
    across: string[];
    down: string[];
  };
  details?: Clue[];
}

// DATABASE KURSUS & QUIZ CROSSWORD LEVEL 1 - 10
const LEVELS_DATA: LevelData[] = [
  {
    level: 1,
    title: "Dasar Permainan",
    description: "Kuasai istilah-istilah paling mendasar dalam olahraga bulutangkis.",
    grid: [
      ['S', 'E', 'R', 'V', 'I', 'C', 'E', 'X', 'X', 'X'],
      ['X', 'X', 'A', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'K', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'E', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'T', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['S', 'M', 'A', 'S', 'H', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'E', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['N', 'E', 'T', 'T', 'I', 'N', 'G', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['D', 'E', 'U', 'C', 'E', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "0-2": "2", 
      "5-0": "3", 
      "5-3": "4", 
      "7-0": "5", 
      "9-0": "6" 
    },
    clues: {
      across: [
        "1. Pukulan awal untuk memulai reli permainan.",
        "3. Pukulan menukik tajam berkecepatan tinggi.",
        "5. Pukulan halus dan tipis di dekat jaring/net.",
        "6. Situasi poin sama kuat 20-20 (perlu selisih 2 poin)."
      ],
      down: [
        "2. Alat pemukul bola/kok dalam bulutangkis.",
        "4. Bagian babak permainan (Satu ... terdiri dari 21 poin)."
      ]
    }
  },
  {
    level: 2,
    title: "Area & Garis Lapangan",
    description: "Pahami nama-nama area dan batas garis resmi lapangan bulutangkis.",
    grid: [
      ['B', 'A', 'S', 'E', 'L', 'I', 'N', 'E', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'I', 'X', 'X', 'X', 'X', 'X'],
      ['S', 'I', 'D', 'E', 'L', 'I', 'N', 'E', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'E', 'X', 'X', 'X', 'X', 'X'],
      ['C', 'O', 'U', 'R', 'T', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['N', 'E', 'T', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "0-4": "2", 
      "2-0": "3", 
      "4-0": "4", 
      "6-0": "5" 
    },
    clues: {
      across: [
        "1. Garis paling belakang pada lapangan.",
        "3. Garis batas bagian samping lapangan.",
        "4. Istilah resmi lapangan permainan bulutangkis.",
        "5. Jaring pembatas di tengah area lapangan."
      ],
      down: [
        "2. Kata dalam Bahasa Inggris untuk garis pembatas."
      ]
    }
  },
  {
    level: 3,
    title: "Teknik Pegangan Raket",
    description: "Kenali variasi teknik pegangan raket (Grip) yang benar.",
    grid: [
      ['F', 'O', 'R', 'E', 'H', 'A', 'N', 'D', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['B', 'A', 'C', 'K', 'H', 'A', 'N', 'D', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['P', 'A', 'N', 'H', 'A', 'N', 'D', 'L', 'E', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['V', 'G', 'R', 'I', 'P', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Pegangan raket alami seperti saat berjabat tangan.",
        "2. Pegangan raket untuk memukul bola dari arah samping belakang.",
        "3. Pegangan gebuk kasur untuk drive dan smash depan.",
        "4. Pegangan raket dengan membentuk sudut V pada jari."
      ],
      down: []
    }
  },
  {
    level: 4,
    title: "Turnamen & Kejuaraan",
    description: "Kejuaraan bergengsi beregu dan perorangan internasional.",
    grid: [
      ['S', 'U', 'D', 'I', 'R', 'M', 'A', 'N', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'L', 'X', 'X', 'X'],
      ['T', 'H', 'O', 'M', 'A', 'S', 'L', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'E', 'X', 'X', 'X'],
      ['U', 'B', 'E', 'R', 'X', 'X', 'N', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'G', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'L', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'A', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'N', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'D', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "0-6": "2", 
      "2-0": "3", 
      "4-0": "4" 
    },
    clues: {
      across: [
        "1. Piala kejuaraan beregu campuran dunia (Nama tokoh Indonesia).",
        "3. Kejuaraan beregu putra bulutangkis dunia.",
        "4. Kejuaraan beregu putri bulutangkis dunia."
      ],
      down: [
        "2. Turnamen bulutangkis tertua dan paling prestisius di Inggris."
      ]
    }
  },
  {
    level: 5,
    title: "Perlengkapan Atlet",
    description: "Atribut dan perlengkapan wajib para pemain bulutangkis.",
    grid: [
      ['S', 'H', 'U', 'T', 'T', 'L', 'E', 'C', 'O', 'C', 'K'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'O', 'X', 'X', 'X'],
      ['S', 'T', 'R', 'I', 'N', 'G', 'X', 'N', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'E', 'X', 'X', 'X'],
      ['G', 'R', 'I', 'P', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['S', 'H', 'O', 'E', 'S', 'X', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "0-7": "2", 
      "2-0": "3", 
      "4-0": "4", 
      "6-0": "5" 
    },
    clues: {
      across: [
        "1. Bola bulutangkis terbuat dari bulu unggas.",
        "3. Senar raket yang terikat kencang.",
        "4. Lapisan pembungkus pegangan raket.",
        "5. Sepatu khusus dengan sol karet lapis non-marking."
      ],
      down: [
        "2. Kerucut bagian pangkal bawah pegangan raket."
      ]
    }
  },
  {
    level: 6,
    title: "Sanksi & Kepemimpinan Wasit",
    description: "Aturan kedisiplinan dan peran pengawas pertandingan.",
    grid: [
      ['U', 'M', 'P', 'I', 'R', 'E', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['F', 'A', 'U', 'L', 'T', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['C', 'H', 'A', 'L', 'L', 'E', 'N', 'G', 'E', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['C', 'A', 'R', 'D', 'X', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Wasit utama yang memimpin jalannya laga di atas lapangan.",
        "2. Pelanggaran aturan yang berakibat poin untuk lawan.",
        "3. Hak pemain mengajukan tayangan ulang Hawk-Eye.",
        "4. Kartu sanksi peringatan dari wasit (Kuning/Merah/Hitam)."
      ],
      down: []
    }
  },
  {
    level: 7,
    title: "Legenda Bulutangkis Indonesia",
    description: "Tokoh-tokoh juara dunia kebanggaan tanah air.",
    grid: [
      ['S', 'U', 'S', 'I', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['R', 'U', 'D', 'Y', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['M', 'A', 'R', 'C', 'U', 'S', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['G', 'I', 'D', 'E', 'O', 'N', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Legenda tunggal putri peraih Emas Olimpiade Barcelona 1992 (Susi Susanti).",
        "2. Juara All England 8 kali dari Indonesia (Rudy Hartono).",
        "3. Nama depan atlet ganda putra pasangan Kevin Sanjaya.",
        "4. Nama belakang pasangan ganda putra julukan 'The Minions'."
      ],
      down: []
    }
  },
  {
    level: 8,
    title: "Durasi & Skor Pertandingan",
    description: "Sistem perhitungan angka dan ritme laga.",
    grid: [
      ['I', 'N', 'T', 'E', 'R', 'V', 'A', 'L', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['R', 'U', 'B', 'B', 'E', 'R', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['R', 'A', 'L', 'L', 'Y', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['S', 'C', 'O', 'R', 'E', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Jeda istirahat 60 detik saat salah satu pemain mencapai 11 poin.",
        "2. Set ketiga sebagai game penentu kemenangan (Game ...).",
        "3. Rangkaian saling balik pukulan dalam satu rally.",
        "4. Perolehan angka poin pertandingan."
      ],
      down: []
    }
  },
  {
    level: 9,
    title: "Organisasi Bulutangkis",
    description: "Induk wadah olahraga nasional dan internasional.",
    grid: [
      ['P', 'B', 'S', 'I', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['B', 'W', 'F', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['I', 'O', 'C', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['B', 'I', 'L', 'I', 'B', 'I', 'L', 'I', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Induk organisasi bulutangkis Indonesia (Persatuan Bulutangkis Seluruh Indonesia).",
        "2. Induk organisasi bulutangkis dunia (Badminton World Federation).",
        "3. Komite Olimpiade Internasional penyelenggara laga dunia.",
        "4. Nama klub bulutangkis kebanggaan kita (PB ... 162)."
      ],
      down: []
    }
  },
  {
    level: 10,
    title: "Strategi & Pukulan Spesial",
    description: "Taktik mematikan dan variasi pukulan tingkat lanjut.",
    grid: [
      ['A', 'T', 'T', 'A', 'C', 'K', 'I', 'N', 'G', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['D', 'E', 'F', 'E', 'N', 'S', 'I', 'V', 'E', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['D', 'R', 'O', 'P', 'S', 'H', 'O', 'T', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['D', 'R', 'I', 'V', 'E', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { 
      "0-0": "1", 
      "2-0": "2", 
      "4-0": "3", 
      "6-0": "4" 
    },
    clues: {
      across: [
        "1. Pola permainan ofensif gempur menyerang.",
        "2. Pola permainan defensif dengan benteng pertahanan rapat.",
        "3. Pukulan tipuan halus menepis tepat di atas net.",
        "4. Pukulan mendatar cepat sejajar pita net."
      ],
      down: []
    }
  }
];

export default function BadmintonQuiz() {
  const [currentLevel, setCurrentLevel] = useState<number>(() => {
    const saved = localStorage.getItem('pb_quiz_unlocked_level');
    return saved ? Math.min(parseInt(saved, 10), 10) : 1;
  });

  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    const saved = localStorage.getItem('pb_quiz_unlocked_level');
    return saved ? Math.min(parseInt(saved, 10), 10) : 1;
  });

  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [checkedGrid, setCheckedGrid] = useState<boolean[][]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(() => {
    const saved = localStorage.getItem('pb_quiz_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  const activeLevelData = LEVELS_DATA.find(l => l.level === currentLevel) || LEVELS_DATA[0];
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Inisialisasi Grid saat level berubah
  useEffect(() => {
    const newGrid = activeLevelData.grid.map(row =>
      row.map(cell => (cell === 'X' ? 'X' : ''))
    );
    const newChecked = activeLevelData.grid.map(row =>
      row.map(() => false)
    );
    setUserGrid(newGrid);
    setCheckedGrid(newChecked);
    setIsFinished(false);
    setSelectedCell(null);

    // Otomatis pilih sel pertama yang bukan 'X'
    for (let r = 0; r < activeLevelData.grid.length; r++) {
      for (let c = 0; c < activeLevelData.grid[r].length; c++) {
        if (activeLevelData.grid[r][c] !== 'X') {
          setSelectedCell({ r, c });
          return;
        }
      }
    }
  }, [currentLevel, activeLevelData]);

  // Simpan progres ke LocalStorage
  useEffect(() => {
    localStorage.setItem('pb_quiz_unlocked_level', unlockedLevel.toString());
    localStorage.setItem('pb_quiz_score', totalScore.toString());
  }, [unlockedLevel, totalScore]);

  // Cek apakah seluruh grid sudah benar
  const checkAutoCompletion = (gridToTest: string[][]) => {
    if (gridToTest.length === 0) return false;

    for (let r = 0; r < activeLevelData.grid.length; r++) {
      for (let c = 0; c < activeLevelData.grid[r].length; c++) {
        if (activeLevelData.grid[r][c] !== 'X' && gridToTest[r][c] !== activeLevelData.grid[r][c]) {
          return false;
        }
      }
    }
    return true;
  };

  // Navigasi Otomatis ke Sel Berikutnya saat mengetik
  const focusNextCell = (r: number, c: number) => {
    let nextR = r;
    let nextC = c;

    if (direction === 'across') {
      nextC = c + 1;
      while (nextC < activeLevelData.grid[0].length && activeLevelData.grid[nextR][nextC] === 'X') {
        nextC++;
      }
      if (nextC >= activeLevelData.grid[0].length) {
        // cari baris berikutnya
        nextR = r + 1;
        nextC = 0;
        while (nextR < activeLevelData.grid.length && (nextC >= activeLevelData.grid[0].length || activeLevelData.grid[nextR][nextC] === 'X')) {
          if (nextC >= activeLevelData.grid[0].length) {
            nextR++;
            nextC = 0;
          } else {
            nextC++;
          }
        }
      }
    } else {
      nextR = r + 1;
      while (nextR < activeLevelData.grid.length && activeLevelData.grid[nextR][nextC] === 'X') {
        nextR++;
      }
    }

    if (nextR < activeLevelData.grid.length && nextC < activeLevelData.grid[0].length && activeLevelData.grid[nextR][nextC] !== 'X') {
      setSelectedCell({ r: nextR, c: nextC });
      const refKey = `${nextR}-${nextC}`;
      inputRefs.current[refKey]?.focus();
    }
  };

  // Focus ke Sel Sebelumnya saat Menekan Backspace
  const focusPrevCell = (r: number, c: number) => {
    let prevR = r;
    let prevC = c;

    if (direction === 'across') {
      prevC = c - 1;
      while (prevC >= 0 && activeLevelData.grid[prevR][prevC] === 'X') {
        prevC--;
      }
    } else {
      prevR = r - 1;
      while (prevR >= 0 && activeLevelData.grid[prevR][prevC] === 'X') {
        prevR--;
      }
    }

    if (prevR >= 0 && prevC >= 0 && activeLevelData.grid[prevR][prevC] !== 'X') {
      setSelectedCell({ r: prevR, c: prevC });
      const refKey = `${prevR}-${prevC}`;
      inputRefs.current[refKey]?.focus();
    }
  };

  const handleInput = (r: number, c: number, val: string) => {
    if (isFinished) return;

    const char = val.toUpperCase().slice(-1);
    const newGrid = userGrid.map(row => [...row]);
    newGrid[r][c] = char;
    setUserGrid(newGrid);

    // Reset status periksa sel saat diedit
    const newChecked = checkedGrid.map(row => [...row]);
    newChecked[r][c] = false;
    setCheckedGrid(newChecked);

    if (char !== '') {
      // Cek kemenangan
      if (checkAutoCompletion(newGrid)) {
        triggerLevelVictory();
      } else {
        focusNextCell(r, c);
      }
    }
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && userGrid[r][c] === '') {
      focusPrevCell(r, c);
    } else if (e.key === 'ArrowRight') {
      setDirection('across');
      focusNextCell(r, c);
    } else if (e.key === 'ArrowDown') {
      setDirection('down');
      focusNextCell(r, c);
    } else if (e.key === 'ArrowLeft') {
      focusPrevCell(r, c);
    }
  };

  const triggerLevelVictory = () => {
    setIsFinished(true);
    const bonusScore = 100 * currentLevel;
    setTotalScore(prev => prev + bonusScore);

    if (currentLevel === unlockedLevel && unlockedLevel < 10) {
      setUnlockedLevel(prev => prev + 1);
    }

    if (currentLevel === 10) {
      setShowCertificateModal(true);
    } else {
      Swal.fire({
        icon: 'success',
        title: `Selamat! Level ${currentLevel} Selesai! 🎉`,
        text: `Jawaban Anda 100% Benar! Skor bertambah +${bonusScore} PTS.`,
        background: '#0b1224',
        color: '#fff',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Lanjut Level Berikutnya 🚀'
      }).then(() => {
        handleNextLevel();
      });
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < 10) {
      setCurrentLevel(prev => prev + 1);
    }
  };

  // FITUR BANTUAN 1 HURUF (HINT)
  const handleGiveHint = () => {
    if (isFinished) return;

    // Cari sel kosong / salah
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < activeLevelData.grid.length; r++) {
      for (let c = 0; c < activeLevelData.grid[r].length; c++) {
        if (activeLevelData.grid[r][c] !== 'X' && userGrid[r][c] !== activeLevelData.grid[r][c]) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return;

    // Pilih 1 sel acak
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctChar = activeLevelData.grid[randomCell.r][randomCell.c];

    const newGrid = userGrid.map(row => [...row]);
    newGrid[randomCell.r][randomCell.c] = correctChar;
    setUserGrid(newGrid);

    if (checkAutoCompletion(newGrid)) {
      triggerLevelVictory();
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Petunjuk: Huruf '${correctChar}' ditambahkan!`,
        showConfirmButton: false,
        timer: 2000,
        background: '#0f172a',
        color: '#38bdf8'
      });
    }
  };

  // FITUR CEK JAWABAN MANUAL
  const handleCheckAnswers = () => {
    const newChecked = activeLevelData.grid.map((row, r) =>
      row.map((cell, c) => cell !== 'X' && userGrid[r][c] !== '')
    );
    setCheckedGrid(newChecked);

    if (checkAutoCompletion(userGrid)) {
      triggerLevelVictory();
    } else {
      let correctCount = 0;
      let totalCells = 0;

      for (let r = 0; r < activeLevelData.grid.length; r++) {
        for (let c = 0; c < activeLevelData.grid[r].length; c++) {
          if (activeLevelData.grid[r][c] !== 'X') {
            totalCells++;
            if (userGrid[r][c] === activeLevelData.grid[r][c]) {
              correctCount++;
            }
          }
        }
      }

      Swal.fire({
        icon: 'info',
        title: 'Hasil Evaluasi TTS',
        html: `<p class="text-slate-300 text-sm">Progres Kebenaran: <b class="text-blue-400">${correctCount}</b> dari <b>${totalCells}</b> kotak terisi tepat.</p>`,
        background: '#0b1224',
        color: '#fff',
        confirmButtonColor: '#2563eb'
      });
    }
  };

  // BUKA SEMUA KUNCI JAWABAN LEVEL INI
  const handleSolveLevel = () => {
    Swal.fire({
      title: 'Tampilkan Kunci Jawaban?',
      text: 'Jawaban lengkap level ini akan terisi otomatis.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Tampilkan',
      cancelButtonText: 'Batal',
      background: '#0b1224',
      color: '#fff',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b'
    }).then((res) => {
      if (res.isConfirmed) {
        const fullGrid = activeLevelData.grid.map(row => [...row]);
        setUserGrid(fullGrid);
        triggerLevelVictory();
      }
    });
  };

  // RESET LEVEL CURRENT
  const handleResetLevel = () => {
    const newGrid = activeLevelData.grid.map(row =>
      row.map(cell => (cell === 'X' ? 'X' : ''))
    );
    setUserGrid(newGrid);
    setCheckedGrid(activeLevelData.grid.map(row => row.map(() => false)));
    setIsFinished(false);
  };

  return (
    <section className="py-8 sm:py-12 bg-[#070d1a] text-white min-h-screen relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-6 sm:space-y-8 relative z-10">
        {/* HEADER JUDUL & TOTAL SKOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b1224]/90 border border-white/10 p-4 sm:p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest">
              <BrainCircuit size={14} className="text-amber-400" />
              <span>Modul Game & Wawasan PB Bilibili 162</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">
              Quiz & Teka-Teki <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Bulutangkis</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              Selesaikan 10 level teka-teki silang interaktif untuk meraih sertifikat Master Bulutangkis.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#070d1a] border border-white/10 p-3 sm:p-4 rounded-2xl shrink-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Akumulasi Skor</p>
              <p className="text-lg sm:text-xl font-black italic text-amber-400">{totalScore} <span className="text-xs font-normal text-slate-300">PTS</span></p>
            </div>
          </div>
        </div>

        {/* LEVEL SELECTOR (LEVEL 1 - 10) */}
        <div className="bg-[#0b1224]/80 border border-white/10 p-3 sm:p-4 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span>Pilih Level Tantangan ({unlockedLevel}/10 Terbuka)</span>
            </span>
            <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Level {currentLevel} Aktif
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => {
              const isUnlocked = lvl <= unlockedLevel;
              const isCurrent = currentLevel === lvl;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => isUnlocked && setCurrentLevel(lvl)}
                  disabled={!isUnlocked}
                  className={`py-2.5 sm:py-3 rounded-2xl flex flex-col items-center justify-center font-black text-xs transition-all duration-300 relative overflow-hidden cursor-pointer ${
                    isCurrent
                      ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white scale-105 shadow-lg shadow-blue-600/40 border-2 border-blue-400'
                      : isUnlocked
                      ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-white/10'
                      : 'bg-slate-900/60 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 mb-0.5">Lvl</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black italic">{lvl}</span>
                    {!isUnlocked && <Lock size={10} className="text-slate-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* JUDUL LEVEL SAAT INI */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900/40 border border-blue-500/20 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <span>Level {activeLevelData.level}: {activeLevelData.title}</span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              {activeLevelData.description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleGiveHint}
              disabled={isFinished}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              title="Tambahkan 1 Huruf Petunjuk"
            >
              <Lightbulb size={14} />
              <span>Hint</span>
            </button>

            <button
              type="button"
              onClick={handleResetLevel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Reset Isian Level Ini"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleCheckAnswers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Cek Jawaban</span>
            </button>
          </div>
        </div>

        {/* LAYOUT UTAMA: GRID TTS (KIRI/ATAS) & SOAL PETUNJUK (KANAN/BAWAH) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLEKSI GRID CROSSWORD */}
          <div className="lg:col-span-7 bg-[#0b1224] border border-white/10 p-3 sm:p-6 rounded-3xl shadow-2xl flex flex-col items-center justify-center relative overflow-x-auto">
            <div className="mb-3 text-[11px] font-bold text-slate-400 flex items-center justify-between w-full px-1">
              <span>Klik kotak untuk mulai mengetik</span>
              <span className="text-blue-400 uppercase font-mono">Arah: {direction === 'across' ? 'Mendatar (→)' : 'Menurun (↓)'}</span>
            </div>

            <div 
              className="grid gap-1 sm:gap-1.5 p-2 bg-[#070d1a] rounded-2xl border border-white/5 max-w-full overflow-x-auto"
              style={{ 
                gridTemplateColumns: `repeat(${activeLevelData.grid[0].length}, minmax(0, 1fr))` 
              }}
            >
              {userGrid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const cellKey = `${rIdx}-${cIdx}`;
                  const number = activeLevelData.numbers[cellKey];
                  const targetChar = activeLevelData.grid[rIdx][cIdx];
                  const isBlock = targetChar === 'X';
                  const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;
                  const isCorrect = cell !== '' && cell === targetChar;
                  const isCheckedWrong = checkedGrid[rIdx] && checkedGrid[rIdx][cIdx] && cell !== '' && cell !== targetChar;

                  return (
                    <div
                      key={cellKey}
                      onClick={() => {
                        if (!isBlock) {
                          if (selectedCell?.r === rIdx && selectedCell?.c === cIdx) {
                            setDirection(prev => prev === 'across' ? 'down' : 'across');
                          } else {
                            setSelectedCell({ r: rIdx, c: cIdx });
                          }
                          inputRefs.current[cellKey]?.focus();
                        }
                      }}
                      className={`relative w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all duration-200 select-none ${
                        isBlock
                          ? 'bg-[#030712] border border-transparent opacity-60'
                          : isSelected
                          ? 'bg-blue-600/30 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 z-20'
                          : isCorrect
                          ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-400'
                          : isCheckedWrong
                          ? 'bg-rose-950/40 border border-rose-500/50 text-rose-400'
                          : cell !== ''
                          ? 'bg-slate-800 border border-slate-600 text-white'
                          : 'bg-[#0f172a] border border-slate-700/80 hover:border-slate-500'
                      }`}
                    >
                      {/* NOMOR SOAL DI SUDUT KIRI ATAS KOTAK */}
                      {number && (
                        <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-black text-blue-400 z-10 pointer-events-none">
                          {number}
                        </span>
                      )}

                      {!isBlock && (
                        <input
                          ref={(el) => (inputRefs.current[cellKey] = el)}
                          type="text"
                          maxLength={1}
                          value={cell}
                          onChange={(e) => handleInput(rIdx, cIdx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(rIdx, cIdx, e)}
                          disabled={isFinished}
                          className="w-full h-full bg-transparent text-center focus:outline-none font-black uppercase text-sm sm:text-base md:text-lg cursor-pointer"
                          style={{ caretColor: '#3b82f6' }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* STATUS DAN AKSI BANNER */}
            {isFinished && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 w-full bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-lg shadow-emerald-600/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/20 text-white shrink-0">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase italic text-white text-sm sm:text-base">Level {currentLevel} Selesai Sempurna!</h3>
                    <p className="text-emerald-100 text-xs">Seluruh kata teka-teki terisi dengan tepat.</p>
                  </div>
                </div>

                {currentLevel < 10 ? (
                  <button
                    type="button"
                    onClick={handleNextLevel}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>Lanjut Level {currentLevel + 1}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Award size={16} />
                    <span>Lihat Sertifikat Kelulusan</span>
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* PANEL SOAL PETUNJUK (MENDATAR & MENURUN) */}
          <div className="lg:col-span-5 bg-[#0b1224] border border-white/10 p-4 sm:p-6 rounded-3xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-300 flex items-center gap-2">
                <HelpCircle size={16} className="text-blue-400" />
                <span>Petunjuk Pertanyaan TTS</span>
              </h3>

              <button
                type="button"
                onClick={handleSolveLevel}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg"
              >
                <Eye size={12} />
                <span>Kunci Jawaban</span>
              </button>
            </div>

            <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
              {/* MENDATAR */}
              {activeLevelData.clues.across.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
                    <div className="h-1.5 w-4 bg-blue-500 rounded-full" />
                    <span>Mendatar (→)</span>
                  </div>
                  <ul className="space-y-2.5">
                    {activeLevelData.clues.across.map((clueText, idx) => (
                      <li 
                        key={idx}
                        className="text-xs text-slate-300 bg-[#070d1a] border border-white/5 p-3 rounded-2xl leading-relaxed font-medium hover:border-blue-500/30 transition-all"
                      >
                        {clueText}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* MENURUN */}
              {activeLevelData.clues.down.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
                    <div className="h-1.5 w-4 bg-indigo-500 rounded-full" />
                    <span>Menurun (↓)</span>
                  </div>
                  <ul className="space-y-2.5">
                    {activeLevelData.clues.down.map((clueText, idx) => (
                      <li 
                        key={idx}
                        className="text-xs text-slate-300 bg-[#070d1a] border border-white/5 p-3 rounded-2xl leading-relaxed font-medium hover:border-indigo-500/30 transition-all"
                      >
                        {clueText}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SERTIFIKAT KELULUSAN QUIZ (LEVEL 10 MASTER) */}
      <AnimatePresence>
        {showCertificateModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0b1224] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative text-center overflow-hidden my-auto"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
                <Medal size={36} />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-amber-400 text-xs font-black uppercase tracking-widest">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="ml-1">Sertifikat Kelulusan Resmi</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                  Master Quiz Bulutangkis <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                    PB Bilibili 162
                  </span>
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  Selamat! Anda telah menyelesaikan seluruh 10 Level Teka-Teki Silang Badminton dengan sempurna.
                </p>
              </div>

              <div className="bg-[#070d1a] border border-white/10 p-4 rounded-2xl grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Skor Akhir</p>
                  <p className="text-xl font-black italic text-amber-400">{totalScore} PTS</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Gelar Kelulusan</p>
                  <p className="text-sm font-black italic text-emerald-400">Pakar Bulutangkis</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  Tutup & Simpan Pencapaian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
