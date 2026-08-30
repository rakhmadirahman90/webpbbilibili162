import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';

type SeededRow = {
  id: number;
  source_sheet: string;
  source_no: number | null;
  player_name: string;
  club_name: string | null;
  seeded_quality: string | null;
  division_level: string | null;
  tournament_qualification: string | null;
  region_status: string | null;
  validity_status: string | null;
  archive_category: string | null;
  gender: string | null;
  eligible_category: string | null;
};

type RegistrationRow = {
  id: string;
  created_at: string;
  nama: string;
  whatsapp: string;
  email?: string;
  kategori: string;
  domisili: string;
  pengalaman: string;
  jenis_kelamin: string;
  kategori_atlet: string;
  status?: string;
};

const QUALITY_RANK: Record<string, number> = { A: 1, B: 2, 'C+': 3, C: 4, 'C-': 5, D: 6 };
const clean = (v: unknown) => String(v ?? '').trim();
const normalize = (v: unknown) => clean(v).toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dateId = (v: string) => v ? new Date(v).toLocaleDateString('id-ID') : '-';
const timeId = (v: string) => v ? new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const safeFile = (v: string) => v.replace(/[^a-z0-9_-]+/gi, '_');

const seedComparator = (a: SeededRow, b: SeededRow) => {
  const qa = QUALITY_RANK[clean(a.seeded_quality).toUpperCase()] ?? 99;
  const qb = QUALITY_RANK[clean(b.seeded_quality).toUpperCase()] ?? 99;
  if (qa !== qb) return qa - qb;
  const club = clean(a.club_name).localeCompare(clean(b.club_name), 'id-ID', { sensitivity: 'base' });
  if (club) return club;
  return clean(a.player_name).localeCompare(clean(b.player_name), 'id-ID', { sensitivity: 'base' });
};

const downloadExcel = (rows: Record<string, unknown>[], sheetName: string, filename: string, widths: number[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = widths.map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

const addPdfHeader = (doc: jsPDF, title: string, subtitle: string) => {
  doc.setFillColor(7, 21, 45);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(subtitle, 14, 18);
  doc.setTextColor(80, 90, 105);
  doc.setFontSize(8);
  doc.text(`Dicetak ${new Date().toLocaleString('id-ID')}`, 14, 24);
};

const showToast = (message: string, ok = true) => {
  const old = document.getElementById('admin-export-toast');
  old?.remove();
  const el = document.createElement('div');
  el.id = 'admin-export-toast';
  el.textContent = message;
  el.style.cssText = `position:fixed;right:16px;bottom:16px;z-index:99999;padding:11px 15px;border-radius:12px;background:${ok ? '#0f172a' : '#7f1d1d'};color:#fff;font:700 12px/1.3 system-ui,sans-serif;box-shadow:0 12px 35px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12)`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 2600);
};

async function getSeededRows(): Promise<SeededRow[]> {
  const { data, error } = await supabase.from('seeded_players').select('id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category').limit(5000);
  if (error) throw error;
  return ((data || []) as SeededRow[]).sort(seedComparator);
}

async function getRegistrationRows(): Promise<RegistrationRow[]> {
  const { data, error } = await supabase.from('pendaftaran').select('id,created_at,nama,whatsapp,email,kategori,domisili,pengalaman,jenis_kelamin,kategori_atlet,status').order('created_at', { ascending: false }).limit(5000);
  if (error) throw error;
  return (data || []) as RegistrationRow[];
}

function seededFilterValues(host: HTMLElement) {
  const selects = Array.from(host.querySelectorAll('select')) as HTMLSelectElement[];
  const values = selects.map(s => s.value);
  const input = Array.from(host.querySelectorAll('input')).find(i => clean(i.getAttribute('placeholder')).toLowerCase().includes('cari')) as HTMLInputElement | undefined;
  return { query: normalize(input?.value), gender: values[0] || 'Semua', quality: values[1] || 'Semua', sheet: values[2] || 'Semua', category: values[3] || 'Semua', club: values[4] || 'Semua', region: values[5] || 'Semua' };
}

function applySeededFilters(rows: SeededRow[], host: HTMLElement) {
  const f = seededFilterValues(host);
  return rows.filter(p => {
    const hay = normalize([p.player_name, p.club_name, p.seeded_quality, p.source_sheet, p.region_status, p.eligible_category, p.archive_category, p.division_level, p.tournament_qualification, p.validity_status, p.gender, p.source_no].map(clean).join(' '));
    return (!f.query || hay.includes(f.query)) && (f.gender === 'Semua' || clean(p.gender) === f.gender) && (f.quality === 'Semua' || clean(p.seeded_quality) === f.quality) && (f.sheet === 'Semua' || p.source_sheet === f.sheet) && (f.category === 'Semua' || clean(p.eligible_category) === f.category) && (f.club === 'Semua' || clean(p.club_name) === f.club) && (f.region === 'Semua' || clean(p.region_status) === f.region);
  });
}

async function exportSeeded(host: HTMLElement, format: 'xlsx' | 'pdf') {
  const rows = applySeededFilters(await getSeededRows(), host);
  if (!rows.length) return showToast('Tidak ada data seeded untuk diekspor.', false);
  const mapped = rows.map((p, i) => ({
    No: i + 1,
    ID_Pemain: p.id,
    Nama_Pemain: clean(p.player_name).toUpperCase(),
    Klub: clean(p.club_name) || '-',
    Seeded: clean(p.seeded_quality) || '-',
    Gender: clean(p.gender) || '-',
    Kategori: clean(p.eligible_category) || '-',
    Divisi: clean(p.division_level) || '-',
    Wilayah: clean(p.region_status) || '-',
    Kualifikasi: clean(p.tournament_qualification) || '-',
    Status_Validitas: clean(p.validity_status) || '-',
    Sumber_Data: clean(p.source_sheet) || '-',
    No_Sumber: p.source_no ?? '-'
  }));
  const filename = `Seeded_Pemain_Bilibili_162_${stamp()}`;
  if (format === 'xlsx') {
    downloadExcel(mapped, 'Seeded Pemain', `${safeFile(filename)}.xlsx`, [7, 12, 30, 28, 10, 11, 20, 18, 18, 22, 20, 34, 12]);
    showToast(`Excel berhasil dibuat • ${rows.length} pemain`);
    return;
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'SEEDED PEMAIN — PB BILIBILI 162', `${rows.length} pemain • Urutan A → B → C+ → C → C- → D • Klub & nama A–Z`);
  autoTable(doc, {
    head: [['No', 'ID', 'Nama Pemain', 'Klub', 'Seeded', 'Gender', 'Kategori', 'Divisi', 'Wilayah', 'Validitas']],
    body: mapped.map(r => [r.No, r.ID_Pemain, r.Nama_Pemain, r.Klub, r.Seeded, r.Gender, r.Kategori, r.Divisi, r.Wilayah, r.Status_Validitas]),
    startY: 32,
    margin: { left: 8, right: 8 },
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.2, valign: 'middle' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 13 }, 2: { cellWidth: 38 }, 3: { cellWidth: 34 }, 4: { cellWidth: 15 }, 5: { cellWidth: 14 }, 6: { cellWidth: 27 }, 7: { cellWidth: 24 }, 8: { cellWidth: 24 }, 9: { cellWidth: 25 } },
    didDrawPage: data => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(110, 120, 130); doc.text(`PB Bilibili 162 • Halaman ${data.pageNumber}`, 8, h - 5);
    }
  });
  doc.save(`${safeFile(filename)}.pdf`);
  showToast(`PDF berhasil dibuat • ${rows.length} pemain`);
}

async function exportRegistrations(host: HTMLElement, format: 'xlsx' | 'pdf') {
  const rows = await getRegistrationRows();
  const searchInput = Array.from(host.querySelectorAll('input')).find(i => clean(i.getAttribute('placeholder')).toLowerCase().includes('cari')) as HTMLInputElement | undefined;
  const q = normalize(searchInput?.value);
  const filtered = rows.filter(r => !q || normalize([r.nama, r.whatsapp, r.kategori, r.kategori_atlet, r.domisili, r.jenis_kelamin].join(' ')).includes(q));
  if (!filtered.length) return showToast('Tidak ada data pendaftaran untuk diekspor.', false);
  const mapped = filtered.map((r, i) => ({
    No: i + 1,
    ID_Pendaftaran: r.id,
    Nama: clean(r.nama).toUpperCase(),
    Gender: clean(r.jenis_kelamin) || '-',
    Kategori_Umur: clean(r.kategori) || '-',
    Kategori_Atlet: clean(r.kategori_atlet) || '-',
    WhatsApp: clean(r.whatsapp) || '-',
    Email: clean(r.email) || '-',
    Domisili: clean(r.domisili) || '-',
    Status: clean(r.status) || 'Pending',
    Tanggal_Daftar: dateId(r.created_at),
    Waktu_Daftar: timeId(r.created_at)
  }));
  const filename = `Pendaftaran_Peserta_Bilibili_162_${stamp()}`;
  if (format === 'xlsx') {
    downloadExcel(mapped, 'Pendaftaran Peserta', `${safeFile(filename)}.xlsx`, [7, 28, 28, 11, 22, 18, 17, 30, 24, 14, 16, 14]);
    showToast(`Excel berhasil dibuat • ${filtered.length} pendaftar`);
    return;
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'LAPORAN PENDAFTARAN PESERTA — PB BILIBILI 162', `${filtered.length} pendaftar • Data tersusun profesional dari database`);
  autoTable(doc, {
    head: [['No', 'Nama Peserta', 'Gender', 'Kategori Umur', 'Kategori Atlet', 'WhatsApp', 'Domisili', 'Status', 'Tgl Daftar']],
    body: mapped.map(r => [r.No, r.Nama, r.Gender, r.Kategori_Umur, r.Kategori_Atlet, r.WhatsApp, r.Domisili, r.Status, r.Tanggal_Daftar]),
    startY: 32,
    margin: { left: 8, right: 8 },
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 2.4, valign: 'middle' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 43 }, 2: { cellWidth: 16 }, 3: { cellWidth: 31 }, 4: { cellWidth: 25 }, 5: { cellWidth: 30 }, 6: { cellWidth: 35 }, 7: { cellWidth: 23 }, 8: { cellWidth: 23 } },
    didDrawPage: data => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(110, 120, 130); doc.text(`PB Bilibili 162 • Halaman ${data.pageNumber}`, 8, h - 5);
    }
  });
  doc.save(`${safeFile(filename)}.pdf`);
  showToast(`PDF berhasil dibuat • ${filtered.length} pendaftar`);
}

function makeButton(label: string, icon: string, action: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<span style="font-size:14px;line-height:1">${icon}</span><span>${label}</span>`;
  button.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 13px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:#0b1220;color:#fff;font:800 10px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.12)';
  button.addEventListener('mouseenter', () => { button.style.transform = 'translateY(-1px)'; button.style.borderColor = 'rgba(59,130,246,.55)'; });
  button.addEventListener('mouseleave', () => { button.style.transform = 'none'; button.style.borderColor = 'rgba(255,255,255,.12)'; });
  button.addEventListener('click', () => { void action(); });
  return button;
}

function injectToolbar() {
  if (document.getElementById('admin-export-toolbar')) return;
  const textContent = clean(document.body.innerText);
  const isSeeded = textContent.includes('Seeded Resmi Bilibili 162');
  const isRegistration = textContent.includes('Manajemen Pendaftaran') || textContent.includes('Pendaftaran Peserta');
  if (!isSeeded && !isRegistration) return;
  const host = document.querySelector('main') || document.getElementById('root') || document.body;
  if (!(host instanceof HTMLElement)) return;
  const toolbar = document.createElement('div');
  toolbar.id = 'admin-export-toolbar';
  toolbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(59,130,246,.2);border-radius:15px;background:linear-gradient(135deg,rgba(9,22,43,.96),rgba(5,12,25,.96));box-shadow:0 10px 28px rgba(0,0,0,.12)';
  const info = document.createElement('div');
  info.innerHTML = `<div style="font:900 11px/1.2 system-ui,sans-serif;color:#fff;letter-spacing:.05em;text-transform:uppercase">Export Data</div><div style="margin-top:3px;font:500 10px/1.3 system-ui,sans-serif;color:#94a3b8">Excel & PDF • rapi, siap cetak, mengikuti filter pencarian</div>`;
  const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap';
  if (isSeeded) {
    actions.append(makeButton('Excel', '▣', () => exportSeeded(host, 'xlsx')));
    actions.append(makeButton('PDF', '▤', () => exportSeeded(host, 'pdf')));
  } else {
    actions.append(makeButton('Excel', '▣', () => exportRegistrations(host, 'xlsx')));
    actions.append(makeButton('PDF', '▤', () => exportRegistrations(host, 'pdf')));
  }
  toolbar.append(info, actions);
  const firstSection = host.querySelector('section');
  if (firstSection?.parentElement) firstSection.parentElement.insertBefore(toolbar, firstSection);
  else host.prepend(toolbar);
}

export function installAdminExportEnhancer() {
  if (typeof window === 'undefined') return;
  const run = () => window.setTimeout(injectToolbar, 80);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);
}
