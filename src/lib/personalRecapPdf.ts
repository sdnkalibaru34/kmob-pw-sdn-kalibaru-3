import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { Attendance, DailyReport, Employee, WorkPattern } from './types';

type RecapPdfInput = {
  month: string;
  employee: Employee;
  attendance: Attendance[];
  reports: DailyReport[];
  workPattern: WorkPattern;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const TABLE_WIDTHS = [88, 70, 70, PAGE_WIDTH - MARGIN * 2 - 228];

const printable = (value: string | null | undefined) => (value ?? '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/…/g, '...')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

const monthName = (month: string) => new Intl.DateTimeFormat('id-ID', {
  month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
}).format(new Date(`${month}-15T12:00:00+07:00`));

const fitLines = (text: string, font: PDFFont, size: number, maxWidth: number) => {
  const words = printable(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    let remainder = word;
    while (font.widthOfTextAtSize(remainder, size) > maxWidth && remainder.length > 1) {
      let cut = remainder.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(remainder.slice(0, cut), size) > maxWidth) cut--;
      lines.push(remainder.slice(0, cut));
      remainder = remainder.slice(cut);
    }
    line = remainder;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
};

const centered = (page: PDFPage, text: string, y: number, font: PDFFont, size: number) => {
  const value = printable(text);
  page.drawText(value, { x: (PAGE_WIDTH - font.widthOfTextAtSize(value, size)) / 2, y, font, size });
};

export async function createPersonalRecapPdf(input: RecapPdfInput) {
  const { month, employee, attendance, reports, workPattern } = input;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const attendanceMap = new Map(attendance.map(row => [row.attendance_date, row]));
  const reportMap = new Map(reports.map(row => [row.report_date, row]));
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 42;

  centered(page, 'REKAP ABSENSI PPPK PARUH WAKTU', y, bold, 15);
  y -= 19;
  centered(page, employee.unit_name, y, bold, 11);
  y -= 25;

  const meta: Array<[string, string]> = [
    ['Bulan', monthName(month)],
    ['Nama Pegawai', employee.full_name],
    ['NI PPPK', employee.ni_pppk || '-'],
    ['Jabatan', employee.position],
    ['Unit Dinas', employee.unit_name],
  ];
  for (const [label, value] of meta) {
    page.drawText(printable(label), { x: MARGIN, y, font: regular, size: 9 });
    page.drawText(`: ${printable(value)}`, { x: MARGIN + 78, y, font: bold, size: 9 });
    y -= 14;
  }
  y -= 6;

  const drawTableHeader = () => {
    const headers = ['Tanggal', 'Jam Masuk', 'Jam Pulang', 'Kegiatan'];
    let x = MARGIN;
    page.drawRectangle({ x, y: y - 20, width: PAGE_WIDTH - MARGIN * 2, height: 20, color: rgb(.87, .94, .89), borderColor: rgb(.25, .34, .28), borderWidth: .7 });
    headers.forEach((header, index) => {
      if (index > 0) page.drawLine({ start: { x, y }, end: { x, y: y - 20 }, thickness: .7, color: rgb(.25, .34, .28) });
      const width = TABLE_WIDTHS[index];
      const textWidth = bold.widthOfTextAtSize(header, 8);
      page.drawText(header, { x: x + (width - textWidth) / 2, y: y - 13, font: bold, size: 8, color: rgb(.07, .3, .18) });
      x += width;
    });
    y -= 20;
  };

  drawTableHeader();
  for (let index = 0; index < lastDay; index++) {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const day = new Date(`${date}T12:00:00+07:00`);
    const sunday = day.getDay() === 0;
    const saturdayOff = workPattern === 'Opsi 1' && day.getDay() === 6;
    const attendanceRow = attendanceMap.get(date);
    const report = reportMap.get(date);
    let activity = sunday ? 'Hari Minggu' : saturdayOff ? 'Sabtu (libur)' : report?.activity ?? '';
    if (!activity && attendanceRow && ['Izin', 'Sakit', 'Cuti', 'Dinas Luar'].includes(attendanceRow.status)) {
      activity = `Pengajuan Tidak Hadir: ${attendanceRow.status}`;
    }
    const activityLines = fitLines(activity || '-', regular, 7.5, TABLE_WIDTHS[3] - 8);
    const rowHeight = Math.max(18, activityLines.length * 9 + 7);
    if (y - rowHeight < 66) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 42;
      centered(page, `REKAP ABSENSI - ${monthName(month)} (lanjutan)`, y, bold, 11);
      y -= 22;
      drawTableHeader();
    }
    let x = MARGIN;
    page.drawRectangle({ x, y: y - rowHeight, width: PAGE_WIDTH - MARGIN * 2, height: rowHeight, color: sunday ? rgb(.98, .91, .91) : rgb(1, 1, 1), borderColor: rgb(.35, .4, .37), borderWidth: .55 });
    const values = [
      new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(day),
      attendanceRow?.check_in?.slice(0, 5) ?? '-',
      attendanceRow?.check_out?.slice(0, 5) ?? '-',
    ];
    values.forEach((value, cell) => {
      const width = TABLE_WIDTHS[cell];
      const textWidth = regular.widthOfTextAtSize(value, 7.5);
      page.drawText(value, { x: x + (width - textWidth) / 2, y: y - rowHeight / 2 - 2.5, font: regular, size: 7.5 });
      x += width;
      page.drawLine({ start: { x, y }, end: { x, y: y - rowHeight }, thickness: .55, color: rgb(.35, .4, .37) });
    });
    activityLines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: y - 11 - lineIndex * 9, font: regular, size: 7.5 }));
    y -= rowHeight;
  }

  if (y < 145) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - 70;
  } else {
    y -= 24;
  }
  const signatureDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(year, monthNumber, 0, 12));
  const signatureX = PAGE_WIDTH - MARGIN - 205;
  page.drawText(`Depok, ${printable(signatureDate)}`, { x: signatureX, y, font: regular, size: 9 });
  page.drawText('Kepala Sekolah', { x: signatureX, y: y - 14, font: regular, size: 9 });
  page.drawText(printable(employee.principal_name), { x: signatureX, y: y - 76, font: bold, size: 9 });
  page.drawLine({ start: { x: signatureX, y: y - 78 }, end: { x: signatureX + Math.min(190, bold.widthOfTextAtSize(printable(employee.principal_name), 9)), y: y - 78 }, thickness: .6 });
  page.drawText(`NIP. ${printable(employee.principal_nip)}`, { x: signatureX, y: y - 91, font: regular, size: 9 });
  page.drawText('Dibuat dari KEMOB KW', { x: PAGE_WIDTH - MARGIN - 94, y: 20, font: regular, size: 6.5, color: rgb(.4, .45, .42) });

  const base64 = await pdf.saveAsBase64({ dataUri: false });
  const employeeName = employee.full_name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const monthYear = monthName(month).toLowerCase().replace(/\s+/g, '-');
  const fileName = `rekap-pegawai-${employeeName}-${monthYear}.pdf`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, base64, fileName };
}
