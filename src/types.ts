export interface Registrant {
  id: string;
  nama: string;
  whatsapp: string;
  kategori: string;
  domisili: string;
  foto_url: string;
  jenis_kelamin: string;
  rank: number;
  points: number;
  seed: string;
  bio: string;
  prestasi: string;
  status?: string;
  alasan_status?: string | null;
  seeded_cup1?: boolean;
  seeded_participated?: boolean;
  seeded_player_name?: string | null;
  seeded_club_name?: string | null;
  seeded_division?: string | null;
  seeded_partners?: string[];
  seeded_source_no?: number | null;
}
