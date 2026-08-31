/**
 * docx-generator.ts
 * Layout DOCX identik dengan HTML preview laporan.
 *
 * HTML preview key styles (yang harus di-mirror di DOCX):
 *  - Judul       : center, Times New Roman 11.5pt, bold, uppercase
 *  - Tabel data  : border top+bottom pada setiap row, .lbl border-left, .val+.sep border-right
 *                  padding 7px 10px, font 10.5pt, line-height 1.6
 *  - TTD         : .ttd-wrap {display:flex; justify-content:flex-end}  → BOX di kanan
 *                  .ttd-box  {text-align:left}                          → isi rata KIRI di dalam box
 *                  DOCX implementasi: Table 2 col → [kolom kiri kosong | kolom kanan isi TTD LEFT]
 *  - Identitas   : nested table (key | : | value) tanpa border di dalam sel .val
 *  - Lampiran    : bold+underline, margin-top ~7mm
 *  - Foto        : tabel N kolom, border 1px solid #000, caption uppercase
 */

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, AlignmentType, BorderStyle, WidthType,
  TableLayoutType, VerticalAlign, PageOrientation,
  UnderlineType, LineRuleType, convertMillimetersToTwip,
} from 'docx';

// ─────────────────────────────────────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────────────────────────────────────
export interface DocxLaporanPayload {
  judulUtama:  string;
  hari:        string;
  tanggal:     string;
  tujuan:      string;
  nomorSpt:    string;
  lokasi:      string;
  anggota:     string;
  pukul:       string;
  identitas:   string;
  uraian:      string;
  tglSurat:    string;
  jabatanTtd:  string;
  namaTtd:     string;
  pangkatTtd:  string;
  nipTtd:      string;
  fotosBase64: string[];
  layout?: {
    fontFamily?:       string;
    fontSizeBody?:     number;   // pt — default 10.5 (sama dengan HTML)
    fontSizeTitle?:    number;   // pt — default 11.5
    photoColumns?:     number;   // default 2
    photoMaxHeightCm?: number;   // cm — default 8.5
    lineHeight?:       number;   // default 1.6 (sama dengan HTML)
    signatureAlign?:   'left' | 'center' | 'right';
    showBorderTable?:  boolean;  // default true
    marginTop?:        number;   // mm default 20
    marginBottom?:     number;   // mm default 20
    marginLeft?:       number;   // mm default 25
    marginRight?:      number;   // mm default 20
    photoBorder?:      boolean;  // default true — border pada setiap sel foto
    photoGapPx?:       number;   // default 0 — gap antar baris foto (px, diabaikan di DOCX karena table)
    photoWidthPct?:    number;   // default 100 — lebar foto saat 1 kolom (%)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit helpers
// ─────────────────────────────────────────────────────────────────────────────
const TW    = (mm: number) => convertMillimetersToTwip(mm); // mm → twip
const PT2   = (pt: number) => Math.round(pt * 2);           // pt → half-points
const PX2TW = (px: number) => Math.round(px * 15);          // px@96dpi → twip (~1px=15.1twip)

// ─────────────────────────────────────────────────────────────────────────────
// Border helpers
// ─────────────────────────────────────────────────────────────────────────────
const BDR_ON  = { style: BorderStyle.SINGLE, size: 6,  color: '000000' } as const;
const BDR_OFF = { style: BorderStyle.NIL,    size: 0,  color: 'FFFFFF' } as const;
const mkB     = (on: boolean) => on ? BDR_ON : BDR_OFF;
const bNone   = {
  top: BDR_OFF, bottom: BDR_OFF,
  left: BDR_OFF, right: BDR_OFF,
  insideH: BDR_OFF, insideV: BDR_OFF,
};

// ─────────────────────────────────────────────────────────────────────────────
// base64 URI → bytes
// ─────────────────────────────────────────────────────────────────────────────
function b64toBytes(uri: string): { data: Uint8Array; type: 'jpg'|'png'|'gif'|'bmp' } {
  const i    = uri.indexOf(',');
  const mime = uri.slice(0, i).match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const bin  = atob(uri.slice(i + 1));
  const arr  = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
  const map: Record<string, 'jpg'|'png'|'gif'|'bmp'> = {
    'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png',
    'image/gif':'gif','image/bmp':'bmp',
  };
  return { data: arr, type: map[mime] || 'jpg' };
}

// ─────────────────────────────────────────────────────────────────────────────
// mkRow — baris tabel data: Label | : | Nilai
// Identik dengan HTML: .lbl border-left, .sep border-right, .val border-right
// ─────────────────────────────────────────────────────────────────────────────
interface MkRowOpts {
  label:      string;
  /** Array baris teks biasa — untuk sel .val non-identitas */
  lines:      string[];
  font:       string;
  sz:         number;       // half-points
  lhLine:     number;       // twip line-height
  wLbl:       number;       // twip lebar kolom label
  wSep:       number;       // twip lebar kolom ":"
  wVal:       number;       // twip lebar kolom nilai
  showBorder: boolean;
  uraian?:    boolean;      // baris uraian: sedikit lebih longgar
  /** Jika diisi, sel .val berisi nested table (identitas pelanggar) */
  nestedTable?: Table;
}

function mkRow(o: MkRowOpts): TableRow {
  const BK  = mkB(o.showBorder);
  const OFF = BDR_OFF;
  const PV  = PX2TW(7);   // padding vertical  7px → twip
  const PH  = PX2TW(10);  // padding horizontal 10px → twip

  // line-height: uraian pakai 1.75× agar lebih terbaca (sama dg HTML .uraian-cell)
  const lhNorm: number = o.lhLine;
  const lhUra:  number = Math.round(1.75 * 240);
  const spNorm  = { line: lhNorm, lineRule: LineRuleType.AUTO };
  const spUra   = { line: lhUra,  lineRule: LineRuleType.AUTO };
  const sp      = o.uraian ? spUra : spNorm;

  // Sel .val: konten normal atau nested table
  const valChildren: (Paragraph | Table)[] = o.nestedTable
    ? [o.nestedTable]
    : (o.lines.length ? o.lines : ['']).map(l =>
        new Paragraph({
          spacing: sp,
          children: [new TextRun({ text: l, font: o.font, size: o.sz })],
        })
      );

  return new TableRow({
    cantSplit: true,
    children: [
      // .lbl — border: top bottom left
      new TableCell({
        width:   { size: o.wLbl, type: WidthType.DXA },
        borders: { top: BK, bottom: BK, left: BK, right: OFF, insideH: OFF, insideV: OFF },
        margins: { top: PV, bottom: PV, left: PH, right: PH },
        children: [new Paragraph({
          spacing: spNorm,
          children: [new TextRun({ text: o.label, bold: true, font: o.font, size: o.sz })],
        })],
      }),
      // .sep — border: top bottom right
      new TableCell({
        width:   { size: o.wSep, type: WidthType.DXA },
        borders: { top: BK, bottom: BK, left: OFF, right: BK, insideH: OFF, insideV: OFF },
        margins: { top: PV, bottom: PV, left: 0, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: spNorm,
          children: [new TextRun({ text: ':', font: o.font, size: o.sz })],
        })],
      }),
      // .val — border: top bottom right
      new TableCell({
        width:   { size: o.wVal, type: WidthType.DXA },
        borders: { top: BK, bottom: BK, left: OFF, right: BK, insideH: OFF, insideV: OFF },
        margins: { top: PV, bottom: PV, left: PH, right: PH },
        children: valChildren,
      }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// mkIdentitasTable — nested table key:value di dalam sel .val
// Identik dengan HTML: table {border:none} kolom key | : | value
// ─────────────────────────────────────────────────────────────────────────────
function mkIdentitasTable(
  identitas: string,
  font: string,
  sz: number,
  lhLine: number,
  valWidth: number,
): Table {
  const lines = identitas.split('\n').filter(l => l.trim());
  const spN   = { line: lhLine, lineRule: LineRuleType.AUTO };

  // Lebar estimasi kolom key: 35% dari val, sep: tetap 20px twip, value: sisa
  const W_KEY = Math.round(valWidth * 0.38);
  const W_ISEP = PX2TW(20);
  const W_IVAL = valWidth - W_KEY - W_ISEP;

  const rows = lines.map(line => {
    const colonIdx = line.indexOf(':');
    const hasColon = colonIdx !== -1;
    const keyText  = hasColon ? line.substring(0, colonIdx).trim() : line.trim();
    const valText  = hasColon ? line.substring(colonIdx + 1).trim() : '';

    if (!hasColon) {
      // Baris tanpa titik dua: span seluruh lebar
      return new TableRow({
        children: [new TableCell({
          columnSpan: 3,
          width:      { size: valWidth, type: WidthType.DXA },
          borders:    bNone,
          margins:    { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({
            spacing: spN,
            children: [new TextRun({ text: keyText, font, size: sz })],
          })],
        })],
      });
    }

    return new TableRow({
      children: [
        new TableCell({
          width:   { size: W_KEY, type: WidthType.DXA },
          borders: bNone,
          margins: { top: 0, bottom: 0, left: 0, right: PX2TW(4) },
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({
            spacing: spN,
            children: [new TextRun({ text: keyText, font, size: sz })],
          })],
        }),
        new TableCell({
          width:   { size: W_ISEP, type: WidthType.DXA },
          borders: bNone,
          margins: { top: 0, bottom: 0, left: 0, right: PX2TW(4) },
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({
            spacing: spN,
            children: [new TextRun({ text: ':', font, size: sz })],
          })],
        }),
        new TableCell({
          width:   { size: W_IVAL, type: WidthType.DXA },
          borders: bNone,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({
            spacing: spN,
            children: [new TextRun({ text: valText, font, size: sz })],
          })],
        }),
      ],
    });
  });

  return new Table({
    width:        { size: valWidth, type: WidthType.DXA },
    layout:       TableLayoutType.FIXED,
    columnWidths: [W_KEY, W_ISEP, W_IVAL],
    borders:      bNone,
    rows: rows.length ? rows : [new TableRow({
      children: [new TableCell({
        borders: bNone,
        children: [new Paragraph({ children: [] })],
      })],
    })],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// mkTtdTable — TTD identik dengan HTML preview
//
// HTML:  .ttd-wrap { display:flex; justify-content:flex-end }  → blok di KANAN
//        .ttd-box  { text-align:left; min-width:240px }         → isi rata KIRI di dalam blok
//
// DOCX implementasi:
//   Table 2 kolom tanpa border:
//     [kolom kiri — lebar sisanya, kosong] | [kolom kanan — min 240px, isi TTD rata KIRI]
//
// Dengan begitu teks TTD rata kiri (LEFT) tapi posisi blok di kanan halaman.
// Ini persis sama dengan flex justify-content:flex-end + text-align:left di HTML.
// ─────────────────────────────────────────────────────────────────────────────
function mkTtdTable(opts: {
  tglSurat:    string;
  jabatanTtd:  string;
  namaTtd:     string;
  pangkatTtd:  string;
  nipTtd:      string;
  font:        string;
  sz:          number;
  lhLine:      number;
  usable:      number;
  marginTopMm: number;
  sig:         'left' | 'center' | 'right';
}): Table {
  const { font, sz, lhLine, usable, marginTopMm, sig } = opts;

  const W_RIGHT = Math.max(PX2TW(260), Math.round(usable * 0.55));
  const W_LEFT  = usable - W_RIGHT;

  const spN      = { line: lhLine,    lineRule: LineRuleType.AUTO  };
  const spSpacer = { line: PX2TW(16), lineRule: LineRuleType.EXACT };
  const aL       = AlignmentType.LEFT;

  const spacerParas = Array.from({ length: 4 }, () =>
    new Paragraph({ spacing: spSpacer, children: [] })
  );

  const ttdContent: Paragraph[] = [
    new Paragraph({ alignment: aL, spacing: spN,
      children: [new TextRun({ text: `Ponorogo, ${opts.tglSurat}`, font, size: sz })],
    }),
    new Paragraph({ alignment: aL, spacing: spN,
      children: [new TextRun({ text: opts.jabatanTtd || '', font, size: sz })],
    }),
    ...spacerParas,
    new Paragraph({ alignment: aL, spacing: spN,
      children: [new TextRun({
        text: opts.namaTtd || '', bold: true,
        underline: { type: UnderlineType.SINGLE }, font, size: sz,
      })],
    }),
    new Paragraph({ alignment: aL, spacing: spN,
      children: [new TextRun({ text: opts.pangkatTtd || '', font, size: sz })],
    }),
    new Paragraph({ alignment: aL, spacing: spN,
      children: [new TextRun({ text: `NIP. ${opts.nipTtd || ''}`, font, size: sz })],
    }),
  ];

  const mTop = TW(marginTopMm);
  const mkEmpty = (w: number) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: bNone,
    margins: { top: mTop, bottom: 0, left: 0, right: 0 },
    children: [new Paragraph({ children: [] })],
  });
  const mkFilled = (w: number) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: bNone,
    margins: { top: mTop, bottom: 0, left: 0, right: 0 },
    children: ttdContent,
  });

  if (sig === 'left') {
    return new Table({
      width: { size: usable, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
      columnWidths: [W_RIGHT, W_LEFT], borders: bNone,
      rows: [new TableRow({ cantSplit: true,
        children: [mkFilled(W_RIGHT), mkEmpty(W_LEFT)] })],
    });
  }

  if (sig === 'center') {
    const W_SIDE  = Math.floor(W_LEFT / 2);
    const W_SIDE2 = W_LEFT - W_SIDE;
    return new Table({
      width: { size: usable, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
      columnWidths: [W_SIDE, W_RIGHT, W_SIDE2], borders: bNone,
      rows: [new TableRow({ cantSplit: true,
        children: [mkEmpty(W_SIDE), mkFilled(W_RIGHT), mkEmpty(W_SIDE2)] })],
    });
  }

  // default: right
  return new Table({
    width: { size: usable, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [W_LEFT, W_RIGHT], borders: bNone,
    rows: [new TableRow({ cantSplit: true,
      children: [mkEmpty(W_LEFT), mkFilled(W_RIGHT)] })],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// wrapCantSplit — bungkus children dalam Table 1×1 cantSplit (tidak terpotong halaman)
// ─────────────────────────────────────────────────────────────────────────────
function wrapCantSplit(
  children: (Paragraph | Table)[],
  usable: number,
  marginTopMm = 0
): Table {
  return new Table({
    width:        { size: usable, type: WidthType.DXA },
    layout:       TableLayoutType.FIXED,
    columnWidths: [usable],
    borders:      bNone,
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        width:   { size: usable, type: WidthType.DXA },
        borders: bNone,
        margins: { top: TW(marginTopMm), bottom: 0, left: 0, right: 0 },
        children,
      })],
    })],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDocxLaporan — entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDocxLaporan(payload: DocxLaporanPayload): Promise<Blob> {
  const lc  = payload.layout || {};

  // ── Nilai default identik dengan HTML template ─────────────────────────────
  const font       = lc.fontFamily      || 'Times New Roman';
  const fsB        = lc.fontSizeBody    ?? 10.5;   // HTML body: 10.5pt
  const fsT        = lc.fontSizeTitle   ?? 11.5;   // HTML h1:   11.5pt
  const cols       = Math.max(1, lc.photoColumns  ?? 2);
  const lh         = lc.lineHeight      ?? 1.6;    // HTML line-height: 1.6
  const sig        = lc.signatureAlign  ?? 'right';
  const showBorder  = lc.showBorderTable !== false;
  const photoBorder = lc.photoBorder !== false;  // default true

  // ── Margin — default Word "normal" mirip HTML preview ──────────────────────
  const mTopMm = lc.marginTop    ?? 20;
  const mBotMm = lc.marginBottom ?? 20;
  const mLftMm = lc.marginLeft   ?? 25;   // HTML preview kiri 25mm
  const mRgtMm = lc.marginRight  ?? 20;   // HTML preview kanan 20mm

  // ── Unit conversions ───────────────────────────────────────────────────────
  const sz      = PT2(fsB);
  const lhLine  = Math.round(lh * 240);   // twip line-height

  // ── Lebar kolom tabel data — identik dengan HTML ───────────────────────────
  // HTML: .lbl { width:4.2cm } .sep { width:25px } .val = sisa
  const usableMm = 210 - mLftMm - mRgtMm;
  const USABLE   = TW(usableMm);
  const W_LBL    = TW(42);                   // 4.2cm = 42mm
  const W_SEP    = PX2TW(25);               // 25px
  const W_VAL    = USABLE - W_LBL - W_SEP;  // sisa

  // ── Lebar kolom foto ───────────────────────────────────────────────────────
  const colWtwip     = Math.floor(USABLE / cols);
  const colWtwipLast = USABLE - colWtwip * (cols - 1);
  const colWpx       = Math.round(colWtwip * 96 / 1440);
  const colWpxLast   = Math.round(colWtwipLast * 96 / 1440);
  const imgWpx       = colWpx - 8;
  const imgWpxLast   = colWpxLast - 8;

  const photoMaxPx = Math.round((lc.photoMaxHeightCm ?? 8.5) * 96 / 2.54);
  const rowHpx     = photoMaxPx;  // tidak di-cap — ikuti setting user

  // ── Page properties ────────────────────────────────────────────────────────
  const pageProp = {
    page: {
      size: { width: TW(210), height: TW(297), orientation: PageOrientation.PORTRAIT },
      margin: { top: TW(mTopMm), bottom: TW(mBotMm), left: TW(mLftMm), right: TW(mRgtMm) },
    },
  };

  // ── Doc-level styles (default run & paragraph) ────────────────────────────
  const spNorm = { line: lhLine, lineRule: LineRuleType.AUTO };
  const docStyles = {
    default: {
      document: {
        run:       { font, size: sz, color: '000000' },
        paragraph: { spacing: spNorm },
      },
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. JUDUL — identik dengan HTML <h1>: center, bold, uppercase, 11.5pt
  // ─────────────────────────────────────────────────────────────────────────────
  const judulPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { after: TW(5), line: Math.round(1.5 * 240), lineRule: LineRuleType.AUTO },
    children:  [new TextRun({
      text: (payload.judulUtama || '').toUpperCase(),
      bold: true, font, size: PT2(fsT),
    })],
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TABEL DATA — identik dengan HTML table.main-data
  // ─────────────────────────────────────────────────────────────────────────────
  const adaPelanggar = !!payload.identitas?.trim()
    && payload.identitas.toUpperCase() !== 'NIHIL';

  const ro = { font, sz, lhLine, wLbl: W_LBL, wSep: W_SEP, wVal: W_VAL, showBorder };

  // Identitas pelanggar — nested table jika ada colon (key:value), plain text jika tidak
  let identitasNode: Table | undefined;
  if (adaPelanggar) {
    const hasColon = payload.identitas.includes(':');
    if (hasColon) {
      identitasNode = mkIdentitasTable(payload.identitas, font, sz, lhLine, W_VAL);
    }
    // jika tidak ada colon → pakai lines biasa (nestedTable undefined)
  }

  const dataTbl = new Table({
    width:        { size: USABLE, type: WidthType.DXA },
    layout:       TableLayoutType.FIXED,
    columnWidths: [W_LBL, W_SEP, W_VAL],
    borders:      bNone,
    rows: [
      mkRow({ ...ro, label: 'Hari / Tanggal', lines: [`${payload.hari}, ${payload.tanggal}`] }),
      mkRow({ ...ro, label: 'Tujuan',          lines: [payload.tujuan    || ''] }),
      mkRow({ ...ro, label: 'Nomor SPT',       lines: [payload.nomorSpt  || ''] }),
      mkRow({ ...ro, label: 'Lokasi',          lines: [payload.lokasi    || ''] }),
      mkRow({ ...ro, label: 'Anggota',         lines: [payload.anggota   || ''] }),
      mkRow({ ...ro, label: 'Pukul',           lines: [payload.pukul     || ''] }),
      ...(adaPelanggar ? [mkRow({
        ...ro,
        label: 'Identitas Pelanggar',
        lines: identitasNode ? [] : payload.identitas.split('\n').filter(l => l.trim()),
        nestedTable: identitasNode,
      })] : []),
      mkRow({ ...ro, label: 'Uraian Laporan',
        lines: (payload.uraian || '—').split('\n'),
        uraian: true,
      }),
    ],
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TTD — identik dengan HTML .ttd-wrap (flex-end) + .ttd-box (text-left)
  //    Implementasi: Table 2 kolom [kosong | isi-rata-kiri]
  //    sig override dari layoutConfig (default: right = mepet kanan)
  // ─────────────────────────────────────────────────────────────────────────────
  const ttdTable = mkTtdTable({
    tglSurat:    payload.tglSurat    || '',
    jabatanTtd:  payload.jabatanTtd  || '',
    namaTtd:     payload.namaTtd     || '',
    pangkatTtd:  payload.pangkatTtd  || '',
    nipTtd:      payload.nipTtd      || '',
    font, sz, lhLine,
    usable:      USABLE,
    marginTopMm: 7,
    sig,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KASUS 1: Tidak ada foto
  // ─────────────────────────────────────────────────────────────────────────────
  const validFotos = (payload.fotosBase64 || []).filter(f => f?.startsWith('data:'));

  if (validFotos.length === 0) {
    const doc = new Document({
      styles: docStyles,
      sections: [{
        properties: pageProp,
        children: [
          judulPara,
          dataTbl,
          new Paragraph({ spacing: { after: TW(2) }, children: [] }),
          ttdTable,
        ],
      }],
    });
    return await Packer.toBlob(doc);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KASUS 2: Ada foto — buat grid foto identik dengan HTML .foto-table
  // ─────────────────────────────────────────────────────────────────────────────
  const PAD      = PX2TW(4);                  // padding sel foto: 4px → twip
  const fotoGrid = Array.from({ length: cols }, (_, k) =>
    k === cols - 1 ? colWtwipLast : colWtwip
  );

  const allFotoRows: TableRow[] = [];

  for (let i = 0; i < validFotos.length; i += cols) {
    const slice = validFotos.slice(i, i + cols);
    const cells: TableCell[] = slice.map((uri, idx) => {
      const isLast = idx === cols - 1;
      const cellW  = isLast ? colWtwipLast : colWtwip;
      const iW     = isLast ? imgWpxLast   : imgWpx;

      let imgPara: Paragraph;
      try {
        const { data, type } = b64toBytes(uri);
        imgPara = new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: PX2TW(2) },
          children: [new ImageRun({
            data, transformation: { width: iW, height: rowHpx }, type,
          } as any)],
        });
      } catch {
        imgPara = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `[Foto ${i + idx + 1}]`, color: '999999', font, size: PT2(8),
          })],
        });
      }

      // Caption — identik HTML: uppercase, 8pt, bold
      const capPara = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: PX2TW(2), after: 0 },
        children: [new TextRun({ text: `FOTO ${i + idx + 1}`, bold: true, font, size: PT2(8) })],
      });

      const cellBdr = photoBorder ? BDR_ON : BDR_OFF;
      return new TableCell({
        width:         { size: cellW, type: WidthType.DXA },
        borders:       { top: cellBdr, bottom: cellBdr, left: cellBdr, right: cellBdr },
        margins:       { top: PAD, bottom: PAD, left: PAD, right: PAD },
        verticalAlign: VerticalAlign.TOP,
        children:      [imgPara, capPara],
      });
    });

    // Sel kosong untuk baris terakhir jika foto ganjil
    while (cells.length < cols) {
      const isLast = cells.length === cols - 1;
      const eBdr = photoBorder ? BDR_ON : BDR_OFF;
      cells.push(new TableCell({
        width:   { size: isLast ? colWtwipLast : colWtwip, type: WidthType.DXA },
        borders: { top: eBdr, bottom: eBdr, left: eBdr, right: eBdr },
        margins: { top: PAD, bottom: PAD, left: PAD, right: PAD },
        children: [new Paragraph({ children: [] })],
      }));
    }

    allFotoRows.push(new TableRow({ cantSplit: true, children: cells }));
  }

  // Tabel foto — 1 table dengan semua baris (tidak ada spasi antar baris)
  const fotoTable = new Table({
    width:        { size: USABLE, type: WidthType.DXA },
    layout:       TableLayoutType.FIXED,
    columnWidths: fotoGrid,
    borders:      bNone,
    rows:         allFotoRows,
  });

  // Judul LAMPIRAN DOKUMENTASI — identik HTML .lamp-judul (bold, underline, margin-top 20px)
  // keepNext:true → Word tidak meletakkan judul ini sendirian di akhir halaman
  const judulLampiran = new Paragraph({
    spacing: { before: TW(7), after: TW(3), line: lhLine, lineRule: LineRuleType.AUTO },
    keepNext: true,
    children: [new TextRun({
      text: 'LAMPIRAN DOKUMENTASI',
      bold: true, underline: { type: UnderlineType.SINGLE },
      font, size: PT2(11),
    })],
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Assembly final dokumen
  // ─────────────────────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: docStyles,
    sections: [{
      properties: pageProp,
      children: [
        judulPara,
        dataTbl,
        new Paragraph({ spacing: { after: TW(2) }, children: [] }),
        judulLampiran,   // keepNext:true — selalu ikut ke halaman yang sama dengan foto
        fotoTable,       // tabel foto (bisa multi-halaman jika foto banyak)
        ttdTable,        // TTD cantSplit — blok di kanan, teks rata kiri
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
