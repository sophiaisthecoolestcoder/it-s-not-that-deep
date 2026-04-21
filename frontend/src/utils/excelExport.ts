import type { DailyData, GuestRow, OpsEntry } from '../types/belegung';
import { formatDateGerman, formatDateShort, formatWeekday } from './helpers';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Match reference: Tahoma 8pt, 16 columns (A-P) ─────────────────────────

const FN = 'Tahoma';
const SZ = 8;
const COLS = 16; // A through P

const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
const borders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };
const noBorders: Partial<ExcelJS.Borders> = {};

const f: Partial<ExcelJS.Font> = { name: FN, size: SZ };
const fB: Partial<ExcelJS.Font> = { ...f, bold: true };
const fBI: Partial<ExcelJS.Font> = { ...f, bold: true, italic: true };
const fBIU: Partial<ExcelJS.Font> = { ...f, bold: true, italic: true, underline: true };
const fI: Partial<ExcelJS.Font> = { ...f, italic: true };
const greyFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB0B0B0' } };

// ─── Helpers ────────────────────────────────────────────────────────────────

function sc(cell: ExcelJS.Cell, opts: {
  font?: Partial<ExcelJS.Font>; fill?: ExcelJS.Fill;
  align?: Partial<ExcelJS.Alignment>; border?: Partial<ExcelJS.Borders>;
  value?: ExcelJS.CellValue;
} = {}) {
  if (opts.value !== undefined) cell.value = opts.value;
  cell.font = opts.font ?? f;
  if (opts.fill) cell.fill = opts.fill;
  if (opts.align) cell.alignment = opts.align;
  cell.border = opts.border ?? borders;
}

function mergeAndStyle(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, opts: Parameters<typeof sc>[1] = {}) {
  if (c2 > c1) ws.mergeCells(r, c1, r, c2);
  sc(ws.getCell(r, c1), opts);
}

function fullMerge(ws: ExcelJS.Worksheet, r: number, text: string, opts: Omit<Parameters<typeof sc>[1], 'value'> = {}) {
  ws.mergeCells(r, 1, r, COLS);
  sc(ws.getCell(r, 1), { ...opts, value: text });
}

function fillEmpty(ws: ExcelJS.Worksheet, r: number, start: number, end: number, opts: Parameters<typeof sc>[1] = {}) {
  for (let c = start; c <= end; c++) sc(ws.getCell(r, c), opts);
}

function writeGuest(ws: ExcelJS.Worksheet, r: number, g: GuestRow) {
  // 16 cols: A=#, B=Kat, C=Name, D=E, E=K, F=Gruppe, G=Arr, H=Anr, I=Abr, J=Preis, K=HP, L-M=Booking/FS AE, N=Ort/KFZ, O=Notizen, P=(extra)
  const a = { vertical: 'middle' as const, wrapText: true };
  sc(ws.getCell(r, 1), { value: g.roomNr, align: a });
  sc(ws.getCell(r, 2), { value: g.category, align: a });
  sc(ws.getCell(r, 3), { value: g.name, align: a });
  sc(ws.getCell(r, 4), { value: g.adults || '', align: a });
  sc(ws.getCell(r, 5), { value: g.children || '', align: a });
  sc(ws.getCell(r, 6), { value: g.group, align: a });
  sc(ws.getCell(r, 7), { value: g.arr, align: a });
  sc(ws.getCell(r, 8), { value: g.arrDate, align: a });
  sc(ws.getCell(r, 9), { value: g.depDate, align: a });
  sc(ws.getCell(r, 10), { value: g.price, align: a });
  sc(ws.getCell(r, 11), { value: g.hp, align: a });
  // Booking column (L-M merged) with Booking, HNS, FS, AE
  ws.mergeCells(r, 12, r, 13);
  const bookingParts = [g.booking, g.hns, (g.fs ? `€${g.fs} FS` : '') + (g.ae ? ` €${g.ae} AE` : '')].filter(Boolean);
  sc(ws.getCell(r, 12), { value: bookingParts.join('\n'), align: a });
  // Ort/KFZ
  sc(ws.getCell(r, 14), { value: [g.ort, g.kfz].filter(Boolean).join('\n'), align: a });
  sc(ws.getCell(r, 15), { value: g.notes, align: a });
  // Visit count + last visit
  const visitParts = [];
  if (g.visitCount) visitParts.push(`${g.visitCount}x`);
  if (g.lastVisit) visitParts.push(g.lastVisit);
  sc(ws.getCell(r, 16), { value: visitParts.join('\n'), align: a });
}

function writeOps(ws: ExcelJS.Worksheet, r: number, e: OpsEntry) {
  fullMerge(ws, r, `# ${e.roomNr} ${e.name}${e.status ? ' (' + e.status + ')' : ''} ${e.info}`.trim(), { align: { vertical: 'middle' as const, wrapText: true } });
}

// ─── Main Export ────────────────────────────────────────────────────────────

export async function exportBelegung(data: DailyData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Belegungsliste', {
    pageSetup: { orientation: 'landscape', paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });

  // ── Column widths (match reference exactly) ───────────────────────────
  const widths = [4.71, 6, 12.71, 2, 2, 7.71, 7.14, 6.57, 6.71, 9.71, 5.57, 4, 4, 10.71, 15.29, 4.29];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  let r = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 1: Empty grey bar (like reference)
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, '', { font: { ...fBI, size: 12 }, fill: greyFill });
  ws.getRow(r).height = 15;
  r++; // r=2

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 2: Stand/Uhrzeit (A-C) | empty (D-H) | TK/HSK (I-N) | Chef (O-P)
  // ═══════════════════════════════════════════════════════════════════════════
  mergeAndStyle(ws, r, 1, 3, {
    font: fBI,
    value: `Stand: ${formatDateGerman(data.header.standDate)}\nUhrzeit: ${data.header.standTime}`,
    align: { vertical: 'middle', wrapText: true },
  });
  // D-H empty, merged
  ws.mergeCells(r, 4, r, 8);
  sc(ws.getCell(r, 4), { border: noBorders });
  // I-N: TK + HSK
  mergeAndStyle(ws, r, 9, 14, {
    font: fBI,
    value: `TK: ${data.header.tkName} ${data.header.tkTimeRange}\nHSK: ${data.header.hskName} ${data.header.hskTimeRange}`,
    align: { vertical: 'middle', wrapText: true },
  });
  // O-P: Chef der Nacht
  mergeAndStyle(ws, r, 15, 16, {
    font: fBI,
    value: `Chef der Nacht:\n${data.header.chefDerNacht} ${data.header.chefTimeRange}`,
    align: { vertical: 'middle', wrapText: true },
  });
  ws.getRow(r).height = 30;
  r++; // r=3

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 3: Tagesinformation (A-P merged, grey bg, centered)
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, `Tagesinformation für ${formatWeekday(data.date)}, ${formatDateShort(data.date)}`, {
    font: { ...fBI, size: 12 }, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(r).height = 15;
  r++; // r=4

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 4: Stats headers
  // Anr(A-B), Abr(C), Bleiber(D-F), ÜN(G-H), Früh(I-K), SpätAbr(L-N), SpätAnr(O-P)
  // ═══════════════════════════════════════════════════════════════════════════
  const sh = { font: fB, align: { horizontal: 'center' as const, vertical: 'middle' as const } };
  mergeAndStyle(ws, r, 1, 2, { ...sh, value: 'Anr. Zi/Per' });
  sc(ws.getCell(r, 3), { ...sh, value: 'Abr. Zi/Per' });
  mergeAndStyle(ws, r, 4, 6, { ...sh, value: 'Bleiber Zi/Pers.' });
  mergeAndStyle(ws, r, 7, 8, { ...sh, value: 'ÜN Zi/Per' });
  mergeAndStyle(ws, r, 9, 11, { ...sh, value: 'Frühanreisen' });
  mergeAndStyle(ws, r, 12, 14, { ...sh, value: 'Spätabreisen' });
  mergeAndStyle(ws, r, 15, 16, { ...sh, value: 'Spätanreisen' });
  ws.getRow(r).height = 15;
  r++; // r=5

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 5: Stats values — height ~70
  // ═══════════════════════════════════════════════════════════════════════════
  const sv = { align: { horizontal: 'center' as const, vertical: 'top' as const, wrapText: true } };
  sc(ws.getCell(r, 1), { ...sv, value: data.stats.anrZi });
  sc(ws.getCell(r, 2), { ...sv, value: data.stats.anrPer });
  sc(ws.getCell(r, 3), { ...sv, value: `${data.stats.abrZi}  _  ${data.stats.abrPer}` });
  mergeAndStyle(ws, r, 4, 5, { ...sv, value: data.stats.bleiberZi });
  sc(ws.getCell(r, 6), { ...sv, value: data.stats.bleiberPer });
  sc(ws.getCell(r, 7), { ...sv, value: data.stats.uenZi });
  sc(ws.getCell(r, 8), { ...sv, value: data.stats.uenPer });
  mergeAndStyle(ws, r, 9, 11, { ...sv, value: data.stats.fruehAnreisen });
  mergeAndStyle(ws, r, 12, 14, { ...sv, value: data.stats.spaetAbreisen });
  mergeAndStyle(ws, r, 15, 16, { ...sv, value: data.stats.spaetAnreisen });
  ws.getRow(r).height = 70;
  r++; // r=6

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 6: Weekly — label(A-C) + "Montag...Sonntag" in D-P as single cell
  // ═══════════════════════════════════════════════════════════════════════════
  mergeAndStyle(ws, r, 1, 3, {
    font: fBI, value: 'Wöchentliche \nBelegung-Gäste',
    align: { vertical: 'middle', wrapText: true },
  });
  const occ = data.weeklyOccupancy;
  const days = [
    { label: 'Montag', val: occ.mo },
    { label: 'Dienstag', val: occ.di },
    { label: 'Mittwoch', val: occ.mi },
    { label: 'Donnerstag', val: occ.do_ },
    { label: 'Freitag', val: occ.fr },
    { label: 'Samstag', val: occ.sa },
    { label: 'Sonntag', val: occ.so },
  ];
  // 13 columns (D=4 to P=16) for 7 days: ~2 cols each, last gets remainder
  const dayCols = [[4,5],[6,7],[8,9],[10,11],[12,13],[14,14],[15,16]];
  const ca = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
  days.forEach((d, i) => {
    const [c1, c2] = dayCols[i];
    const isLast = i === days.length - 1;
    const bdr: Partial<ExcelJS.Borders> = isLast ? { right: thin } : {};
    if (c2 > c1) ws.mergeCells(r, c1, r, c2);
    sc(ws.getCell(r, c1), { font: fI, value: `${d.label}\n${d.val || ''}`, align: ca, border: bdr });
  });
  ws.getRow(r).height = 30;
  r++; // r=7

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 7: Anreisen header (A-P merged, grey)
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, `Anreisen (${data.arrivals.length} Zimmer)`, {
    font: { ...fBI, size: 11 }, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(r).height = 15;
  r++; // r=8

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 8: Column headers — height ~50
  // ═══════════════════════════════════════════════════════════════════════════
  const hdr = { font: fBI, align: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true } };
  const headers = ['#', 'Kat', 'Name', 'E', 'K', 'Gruppe', 'Arr', 'Anr', 'Abr', 'Preis', 'HP'];
  headers.forEach((h, i) => sc(ws.getCell(r, i + 1), { ...hdr, value: h }));
  // L-M merged: Booking/HNS/FS AE
  ws.mergeCells(r, 12, r, 13);
  sc(ws.getCell(r, 12), { ...hdr, value: 'Booking\nHNS \n FS     AE' });
  sc(ws.getCell(r, 14), { ...hdr, value: 'Ort/KFZ' });
  sc(ws.getCell(r, 15), { ...hdr, value: 'Notizen / Besuche' });
  sc(ws.getCell(r, 16), { ...hdr, value: '' });
  ws.getRow(r).height = 50;
  r++; // r=9

  // ═══════════════════════════════════════════════════════════════════════════
  // Guest data — Arrivals
  // ═══════════════════════════════════════════════════════════════════════════
  for (const g of data.arrivals) {
    writeGuest(ws, r, g);
    ws.getRow(r).height = 24.75;
    r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bleiber header (no column headers repeated)
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, `Bleiber (${data.stayers.length} Zimmer)`, {
    font: { ...fBI, size: 11 }, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(r).height = 15;
  r++;

  for (const g of data.stayers) {
    writeGuest(ws, r, g);
    ws.getRow(r).height = 24.75;
    r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATIONS — matching reference structure
  // ═══════════════════════════════════════════════════════════════════════════

  // Grey info bar (empty)
  fullMerge(ws, r, '', { fill: greyFill }); r++;
  // Empty line
  fullMerge(ws, r, ''); r++;

  // Frühschicht
  fullMerge(ws, r, 'Frühschicht:', { font: fBIU }); r++;
  fullMerge(ws, r, 'FS extern:', { font: fBI }); r++;
  for (const e of data.fruehOps) { writeOps(ws, r, e); r++; }

  // Empty lines
  fullMerge(ws, r, ''); r++;

  // Spätschicht
  fullMerge(ws, r, 'Spätschicht:', { font: fBIU }); r++;
  fullMerge(ws, r, 'AE extern:', { font: fBI }); r++;
  for (const e of data.spaetOps) { writeOps(ws, r, e); r++; }

  // Empty lines
  fullMerge(ws, r, ''); r++;
  fullMerge(ws, r, ''); r++;
  fullMerge(ws, r, ''); r++;

  // Küche
  fullMerge(ws, r, 'Küche:', { font: fBIU }); r++;
  fullMerge(ws, r, `FS extern: ${data.kuecheFsExtern}`, { font: fBI }); r++;
  fullMerge(ws, r, `AE extern: ${data.kuecheAeExtern}`, { font: fBI }); r++;

  // Laktose/Gluten/Allergien/Unverträglichkeiten/Sonstiges headers
  mergeAndStyle(ws, r, 1, 3, { font: fBI, value: 'Laktose:' });
  mergeAndStyle(ws, r, 4, 7, { font: fBI, value: 'Gluten:' });
  mergeAndStyle(ws, r, 8, 10, { font: fBI, value: 'Allergien:' });
  mergeAndStyle(ws, r, 11, 14, { font: fBI, value: 'Unverträglichkeiten:' });
  mergeAndStyle(ws, r, 15, 16, { font: fBI, value: 'Sonstiges:' });
  r++;

  // Dietary entries — write rows with 5 columns
  const dietaryKeys = ['kuecheLaktose', 'kuecheGluten', 'kuecheAllergien', 'kuecheUnvertraeglichkeiten', 'kuecheSonstiges'] as const;
  const maxDietaryRows = Math.max(1, ...dietaryKeys.map(k => (data[k] as OpsEntry[]).length));
  for (let i = 0; i < maxDietaryRows; i++) {
    const colRanges = [[1,3],[4,7],[8,10],[11,14],[15,16]];
    for (let j = 0; j < 5; j++) {
      const entries = data[dietaryKeys[j]] as OpsEntry[];
      const entry = entries[i];
      const val = entry ? `${entry.roomNr} ${entry.name} ${entry.info}`.trim() : '';
      mergeAndStyle(ws, r, colRanges[j][0], colRanges[j][1], { value: val, border: noBorders });
    }
    r++;
  }

  for (const e of data.kuecheOps) { writeOps(ws, r, e); r++; }

  // Veranstaltungen/Bankett
  fullMerge(ws, r, `Veranstaltungen/Bankett: ${data.veranstaltungenBankett}`, { font: fBIU }); r++;

  // Tischwünsche
  fullMerge(ws, r, 'Tischwünsche:', { font: fBIU }); r++;
  fullMerge(ws, r, 'AE extern:', { font: fBI }); r++;
  for (const e of data.tischwuenscheOps) { writeOps(ws, r, e); r++; }

  // Englische Menükarten
  fullMerge(ws, r, `englische Menükarten: ${data.englischeMenuekarten}`, { font: fBIU, align: { wrapText: true } }); r++;
  fullMerge(ws, r, ''); r++;

  // Geburtstag/besondere Anlässe
  fullMerge(ws, r, 'Geburtstag/Hochzeitstag/Sonstige besondere Anlässe:', { font: fBIU }); r++;
  for (const e of data.geburtstage) { writeOps(ws, r, e); r++; }
  fullMerge(ws, r, ''); r++;

  // Housekeeping
  fullMerge(ws, r, 'Housekeeping:', { font: fBIU }); r++;
  fullMerge(ws, r, 'Liebe Hausdamen, bei Abreisezimmern immer auf WLAN-Cubes achten und an die Rezi bringen! Danke!', { font: fBI }); r++;
  for (const e of data.housekeeping) { writeOps(ws, r, e); r++; }

  // Empfang/Chauffeure
  fullMerge(ws, r, 'Empfang/Chauffeure:', { font: fBIU }); r++;
  for (const e of data.empfangChauffeure) { writeOps(ws, r, e); r++; }
  fullMerge(ws, r, ''); r++;

  // LT extern
  fullMerge(ws, r, 'LT extern:', { font: fBI }); r++;
  fullMerge(ws, r, ''); r++;

  // E-Auto
  fullMerge(ws, r, `E-Auto: ${data.eAuto}`, { font: fBIU }); r++;
  fullMerge(ws, r, ''); r++;

  // Landtherme
  fullMerge(ws, r, 'Landtherme:', { font: fBIU }); r++;
  for (const e of data.landtherme) { writeOps(ws, r, e); r++; }
  fullMerge(ws, r, ''); r++;
  fullMerge(ws, r, 'LT EXTERN:', { font: fBI }); r++;

  // ═══════════════════════════════════════════════════════════════════════════
  // Separator + Zeitungen
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, '', { fill: greyFill }); r++;
  fullMerge(ws, r, '', { fill: greyFill }); r++;

  // Zeitungen headers: Zimmer-Nr(A-B), Zeitung(C-H), WANN?(I-M), Bemerkung(N-P)
  mergeAndStyle(ws, r, 1, 2, { font: fBI, value: 'Zimmer-Nr.' });
  mergeAndStyle(ws, r, 3, 8, { font: fBI, value: 'Zeitung' });
  mergeAndStyle(ws, r, 9, 13, { font: fBI, value: 'WANN?       von --- bis ---' });
  mergeAndStyle(ws, r, 14, 16, { font: fBI, value: 'Bemerkung' });
  r++;

  for (const np of data.newspapers) {
    mergeAndStyle(ws, r, 1, 2, { value: np.roomNr });
    mergeAndStyle(ws, r, 3, 8, { value: np.newspaper, align: { wrapText: true } });
    mergeAndStyle(ws, r, 9, 13, { value: np.dateRange, align: { wrapText: true } });
    mergeAndStyle(ws, r, 14, 16, { value: np.remarks, align: { wrapText: true } });
    r++;
  }
  // Empty rows for newspaper entries
  for (let i = 0; i < Math.max(0, 4 - data.newspapers.length); i++) {
    mergeAndStyle(ws, r, 1, 2, {}); mergeAndStyle(ws, r, 3, 8, {}); mergeAndStyle(ws, r, 9, 13, {}); mergeAndStyle(ws, r, 14, 16, {}); r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Neue Gäste
  // ═══════════════════════════════════════════════════════════════════════════
  fullMerge(ws, r, 'Neue Gäste', { font: { ...fBI, size: 11 }, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' } }); r++;

  // Column headers for new guests (slightly different: Ti.nr. instead of HP, Ort/KfZ merged L-N)
  const ngH = ['#', 'Kat', 'Name', 'E', 'K', 'Gruppe', 'Arr', 'Anr', 'Abr', 'Preis', 'Ti.nr.'];
  ngH.forEach((h, i) => sc(ws.getCell(r, i + 1), { ...hdr, value: h }));
  mergeAndStyle(ws, r, 12, 14, { ...hdr, value: 'Ort / KfZ' });
  mergeAndStyle(ws, r, 15, 16, { ...hdr, value: 'Notizen/Besuche' });
  ws.getRow(r).height = 28;
  r++;

  for (const g of data.newGuests) {
    sc(ws.getCell(r, 1), { value: g.roomNr }); sc(ws.getCell(r, 2), { value: g.category });
    sc(ws.getCell(r, 3), { value: g.name }); sc(ws.getCell(r, 4), { value: g.adults || '' });
    sc(ws.getCell(r, 5), { value: g.children || '' }); sc(ws.getCell(r, 6), { value: g.group });
    sc(ws.getCell(r, 7), { value: g.arr }); sc(ws.getCell(r, 8), { value: g.arrDate });
    sc(ws.getCell(r, 9), { value: g.depDate }); sc(ws.getCell(r, 10), { value: g.price });
    sc(ws.getCell(r, 11), { value: g.tableNr });
    mergeAndStyle(ws, r, 12, 14, { value: g.ortKfz, align: { wrapText: true } });
    mergeAndStyle(ws, r, 15, 16, { value: g.notes, align: { wrapText: true } });
    r++;
  }
  // Empty rows
  for (let i = 0; i < Math.max(0, 7 - data.newGuests.length); i++) {
    for (let c = 1; c <= 11; c++) sc(ws.getCell(r, c));
    mergeAndStyle(ws, r, 12, 14, {}); mergeAndStyle(ws, r, 15, 16, {}); r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Freie Zimmer + Room types + Bottom info
  // ═══════════════════════════════════════════════════════════════════════════
  // Freie Zimmer header row with "out of order" in O-P on the same line
  mergeAndStyle(ws, r, 1, 14, {
    font: { ...fBI, size: 11 }, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' },
    value: 'Freie Zimmer (Eintrag am Freitag & Samstag)',
  });
  mergeAndStyle(ws, r, 15, 16, {
    font: fBI, fill: greyFill, align: { horizontal: 'center', vertical: 'middle' },
    value: 'out of order', border: noBorders,
  });
  r++;

  for (const room of data.freeRooms) {
    sc(ws.getCell(r, 1), { value: room.roomNr }); sc(ws.getCell(r, 2), { value: room.category });
    fillEmpty(ws, r, 3, 14, { border: noBorders });
    mergeAndStyle(ws, r, 15, 16, { value: room.outOfOrder, align: { wrapText: true }, border: { top: thin, bottom: thin, left: thin, right: thin } });
    r++;
  }

  // Room types: DZ, GDZ, SUI+LHS, SPA+GS+GPS
  mergeAndStyle(ws, r, 1, 13, { font: fBI, value: 'DZ:' }); mergeAndStyle(ws, r, 14, 16, {}); r++;
  mergeAndStyle(ws, r, 1, 7, { font: fBI, value: 'GDZ:' }); mergeAndStyle(ws, r, 8, 13, { font: fBI, value: 'GDS:' }); mergeAndStyle(ws, r, 14, 16, {}); r++;
  mergeAndStyle(ws, r, 1, 7, { font: fBI, value: 'SUI:' }); mergeAndStyle(ws, r, 8, 13, { font: fBI, value: 'LHS:' }); mergeAndStyle(ws, r, 14, 16, {}); r++;
  mergeAndStyle(ws, r, 1, 4, { font: fBI, value: 'SPA:' }); mergeAndStyle(ws, r, 5, 8, { font: fBI, value: 'GS:' }); mergeAndStyle(ws, r, 9, 13, { font: fBI, value: 'GPS:' }); mergeAndStyle(ws, r, 14, 16, {}); r++;

  // Grey separator
  fullMerge(ws, r, '', { fill: greyFill }); r++;

  // Bottom info lines
  for (const line of [
    'Folgende Mitarbeiter haben Geburtstag:',
    'Neue Mitarbeiter:',
    'Neue Azubis:',
    'Hausmitteilungen:',
  ]) {
    fullMerge(ws, r, line, { font: fBI }); r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = formatDateGerman(data.date).replace(/\./g, '');
  saveAs(blob, `Belegungsliste_${dateStr}.xlsx`);
}
