import { X, Printer, Info, FileText, Maximize2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/* ─── Paper sizes: always landscape ─────────────────── */
const PAPER = {
  a4: { w: 297, h: 210, label: 'A4' },
  f4: { w: 330, h: 215, label: 'F4 / Folio' },
};
type PaperKey = keyof typeof PAPER;

/* ─── Available print tile options ──────────────────── */
const PRINT_TILES = [
  { key: 'osm',        label: 'OpenStreetMap' },
  { key: 'carto',      label: 'CartoDB (bersih)' },
  { key: 'satellite',  label: 'Satelit Esri' },
  { key: 'hybrid',     label: 'Google Hybrid' },
  { key: 'topo',       label: 'Topografi' },
];

/* ── Canonical Tailwind class sets (konversi dari styles/*.css + page style) ── */
const BTN_BG2 =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-[15px] py-2 text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BTN_BP =
  'inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
/** bg2 kecil (asli: style fontSize .62rem, padding 4px 10px) */
const BTN_BG2_SM =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[.62rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
/** .pdf-paper-btn — tanpa justify; ditambah per pemakaian (justify-center / justify-start text-left) */
const PAPER_BTN =
  'flex flex-1 items-center rounded-[7px] px-1 py-[7px] text-[.65rem] font-bold transition-all duration-[130ms]';
const PAPER_BTN_OFF = 'border border-border bg-card text-mid hover:border-blue hover:text-blue';
const PAPER_BTN_ON = 'border border-blueh bg-blue text-white';
/** .pdf-chk — state on/off menentukan border & background (hindari konflik utility) */
const CHK = 'mb-1 flex cursor-pointer select-none items-center gap-[7px] rounded-[7px] px-2 py-1.5 transition-all duration-[120ms]';
const CHK_OFF = 'border border-border bg-card hover:border-blue';
const CHK_ON = 'border border-blue bg-bluelo';
const SECT_LBL =
  'mb-[7px] flex items-center gap-[5px] text-[.58rem] font-extrabold uppercase tracking-[.15em] text-muted';

/* ─── Linmas SVG (inline, no external file needed) ──── */
const LINMAS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="24.57 34.22 234.32 215.03" width="28" height="28"><path d="M258.88,64.21C259.06,87.59 257.29,111.48 251.33,134.15C244.63,159.60 235.02,181.68 218.40,202.29L207.38,214.31C206.29,215.34 205.45,216.19 204.54,216.97C203.73,217.66 202.98,218.42 202.15,219.11C201.27,219.84 200.44,220.63 199.53,221.34C194.18,225.48 189.12,229.52 183.23,232.93C179.33,235.20 175.37,237.35 171.31,239.33C167.01,241.43 162.55,243.20 158.05,244.81C155.73,245.64 153.37,246.35 151.01,247.08C148.01,248.00 143.37,249.63 140.29,249.17L132.40,247.07C116.87,242.54 101.42,234.88 88.65,225.06C84.28,221.70 80.01,218.19 76.08,214.32C75.50,213.75 74.96,213.04 74.35,212.52C73.28,211.60 72.36,210.57 71.41,209.51C69.25,207.09 67.03,204.71 64.99,202.18C34.88,164.88 24.32,115.76 24.58,68.72L33.77,55.62C36.01,55.76 38.30,56.04 40.54,55.96C47.42,55.94 53.95,54.63 59.69,51.31C64.06,48.78 67.45,45.25 68.95,40.35L212.71,34.23L214.55,40.41C217.90,51.62 232.06,55.95 242.54,55.96C244.96,55.96 247.38,55.75 249.80,55.63L258.88,64.21Z" fill="#000"/><path d="M33.23,68.77C33.14,117.48 44.55,163.08 71.72,196.75C73.97,199.53 75.66,201.27 77.87,203.74C78.57,204.53 79.15,205.24 79.99,205.96C80.75,206.61 81.38,207.39 82.15,208.15C85.80,211.74 89.81,215.04 93.92,218.20C105.54,227.12 120.16,234.47 134.75,238.74L141.57,240.61L155.14,236.66C159.43,235.12 163.61,233.46 167.52,231.55C172.25,229.24 174.40,228.05 178.89,225.45C185.70,221.49 188.75,218.74 194.22,214.50C195.08,213.83 195.79,213.14 196.63,212.44C197.45,211.76 198.11,211.07 198.91,210.39C199.71,209.71 200.47,208.93 201.21,208.23L211.66,196.86C227.46,177.27 236.45,156.70 242.96,131.94C248.57,110.58 250.40,87.23 250.23,64.28C247.81,64.40 244.90,64.61 242.54,64.61C227.47,64.60 210.69,57.74 206.26,42.88L77.23,42.87C75.06,49.97 70.22,55.21 64.03,58.80C57.59,62.52 49.85,64.59 40.86,64.61C38.33,64.71 35.78,64.41 33.26,64.26L33.23,68.77Z" fill="#da251d"/><path d="M142.09,142.07C143.43,137.61 146.75,120.26 151.16,140.43C153.20,131.92 159.73,124.76 163.25,142.31C166.64,124.00 173.90,127.75 174.87,139.76C177.16,126.89 184.52,125.61 184.69,140.02C187.72,127.04 190.14,124.14 194.68,142.01L193.75,128.42L193.74,121.69C198.33,112.24 194.12,99.44 182.38,91.97C180.09,81.45 173.64,71.76 158.92,70.41C154.48,64.80 149.20,62.12 142.19,61.34C135.10,62.08 129.75,64.77 125.26,70.43C110.54,71.78 104.09,81.47 101.80,91.99C90.06,99.46 85.85,112.26 90.44,121.71L90.43,128.44L89.50,142.03C94.04,124.16 96.46,127.06 99.49,140.04C99.66,125.63 107.02,126.91 109.31,139.78C110.28,127.77 117.54,124.02 120.93,142.33C124.45,124.78 130.98,131.94 133.02,140.45C138.06,119.24 142.08,141.99 142.09,142.07Z" fill="#fff500"/></svg>`;

interface PrintPdfModalProps {
  show: boolean;
  onClose: () => void;
  pdfOpts: {
    mapMode: string;
    orientation: string;
    paperSize: string;
    showLayers: boolean;
    showDraw: boolean;
    showFoto: boolean;
    dpi: number;
    printTile: string;
  };
  setPdfOpts: React.Dispatch<React.SetStateAction<any>>;
  execPrint: () => void;
  fitPdfMapBounds: () => void;
  pdfRenderBusy: boolean;
  pdfRenderProgress: number;
  pdfRenderTxt: string;
  petaTitle?: string;
  layersList?: any[];
  photosList?: any[];
  allDrawings?: any[];
  SIMBOL_DEF?: any[];
}

/* ─── Legend items builder ───────────────────────────── */
function buildLegend(opts: any, layersList: any[], allDrawings: any[], photosList: any[], SIMBOL_DEF: any[]) {
  const items: { color: string; label: string; type: 'marker' | 'line' | 'area' | 'dot' }[] = [];

  if (opts.showLayers) {
    const seen = new Set<string>();
    layersList.filter(l => l.aktif).forEach(l => {
      const key = `${l.simbol}_${l.warna}`;
      if (seen.has(key)) return;
      seen.add(key);
      const def = SIMBOL_DEF.find((s: any) => s.id === l.simbol);
      items.push({ color: l.warna || def?.warna || '#1e6fd9', label: l.nama || def?.label || l.simbol, type: 'marker' });
    });
  }

  if (opts.showDraw) {
    const seen = new Set<string>();
    allDrawings.forEach(d => {
      const key = `${d.type}_${d.properti?.warna}`;
      if (seen.has(key)) return;
      seen.add(key);
      const col = d.properti?.warna || '#1e6fd9';
      items.push({ color: col, label: d.properti?.nama || (d.type === 'polyline' ? 'Garis / Rute' : 'Area / Zona'), type: d.type === 'polyline' ? 'line' : 'area' });
    });
  }

  if (opts.showFoto && photosList.some(p => p.lat && p.lng)) {
    const KATEGORI_COLORS: Record<string, { label: string; color: string }> = {
      pedestrian: { label: 'Pedestrian', color: '#1e6fd9' },
      poskamling: { label: 'Poskamling', color: '#6366f1' },
      posyandu: { label: 'Posyandu', color: '#ec4899' },
      kebencanaan: { label: 'Kebencanaan', color: '#ef4444' },
      yanmas: { label: 'Pelayanan Masyarakat', color: '#10b981' },
      lainnya: { label: 'Lainnya', color: '#8b5cf6' },
    };
    const presentKats = new Set<string>();
    photosList.forEach(p => {
      if (p.lat && p.lng) {
        const raw = (p.kategori || 'pedestrian').toLowerCase().trim();
        const k = (raw === 'yanmas' || raw.includes('yanmas') || raw.includes('pelayanan')) ? 'yanmas'
          : raw.includes('kamling') ? 'poskamling'
          : raw.includes('yandu') ? 'posyandu'
          : raw.includes('bencana') ? 'kebencanaan'
          : raw.includes('lain') ? 'lainnya'
          : 'pedestrian';
        presentKats.add(k);
      }
    });

    Object.entries(KATEGORI_COLORS).forEach(([k, val]) => {
      if (presentKats.has(k)) {
        items.push({ color: val.color, label: `Kegiatan ${val.label}`, type: 'dot' });
      }
    });
  }

  return items;
}

/* ─── SVG legend icon per type ───────────────────────── */
function LegendIcon({ type, color }: { type: string; color: string }) {
  if (type === 'marker') return (
    <svg width="11" height="15" viewBox="0 0 28 36" className="shrink-0">
      <path d="M14 0C7.37 0 2 5.37 2 12c0 9.5 12 24 12 24s12-14.5 12-24C26 5.37 20.63 0 14 0Z" fill={color} />
      <circle cx="14" cy="12" r="5.5" fill="#fff" />
    </svg>
  );
  if (type === 'line') return (
    <svg width="18" height="5" viewBox="0 0 18 5" className="shrink-0">
      <line x1="0" y1="2.5" x2="18" y2="2.5" stroke={color} strokeWidth="2.2" strokeDasharray="4 2" strokeLinecap="round" />
    </svg>
  );
  if (type === 'area') return (
    <svg width="14" height="9" viewBox="0 0 14 9" className="shrink-0">
      <rect x="0.8" y="0.8" width="12.4" height="7.4" rx="1.5" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="1.4" />
    </svg>
  );
  // dot
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" className="shrink-0">
      <circle cx="4.5" cy="4.5" r="3.8" fill={color} />
    </svg>
  );
}

/* ─── Print Portal ───────────────────────────────────── */
const PrintPortal: React.FC<{
  opts: any;
  petaTitle: string;
  legendItems: ReturnType<typeof buildLegend>;
}> = ({ opts, petaTitle, legendItems }) => {
  const paper = PAPER[(opts.paperSize as PaperKey)] ?? PAPER.a4;
  // Always landscape
  const pw = Math.max(paper.w, paper.h);
  const ph = Math.min(paper.w, paper.h);
  const now = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return createPortal(
    <div id="sipedas-print-section">
      <div className="spp-page">

        {/* HEADER */}
        <div className="spp-header">
          <div className="spp-header-left">
            <div dangerouslySetInnerHTML={{ __html: LINMAS_SVG }} className="shrink-0" />
            <div>
              <div className="spp-title">{petaTitle || 'PETA SATGAS KABUPATEN PONOROGO'}</div>
              <div className="spp-subtitle">Satgas Linmas · Pemerintah Kabupaten Ponorogo</div>
            </div>
          </div>
          <div className="spp-header-right">
            <div className="spp-date-lbl">Dicetak</div>
            <div className="spp-date">{now}</div>
            <div className="spp-paper-lbl">{paper.label} · Landscape</div>
          </div>
        </div>

        {/* BODY: peta kiri + legenda kanan */}
        <div className="spp-body">
          {/* Map — uses spp-map-div, Leaflet map is moved here before print */}
          <div className="spp-map-col">
            <div id="spp-map-div" className="spp-map" />
          </div>

          {/* Legend rightbar */}
          {legendItems.length > 0 && (
            <div className="spp-legend-col">
              <div className="spp-legend-hd">LEGENDA</div>
              <div className="spp-legend-list">
                {legendItems.map((item, i) => (
                  <div key={i} className="spp-legend-row">
                    <LegendIcon type={item.type} color={item.color} />
                    <span className="spp-legend-lbl">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="spp-legend-footer">
                <div className="spp-legend-footer-line">© OpenStreetMap contributors</div>
                <div className="spp-legend-footer-line">Skala 1:50.000 (estimasi)</div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="spp-footer">
          <span>SI-PEDAS — Sistem Pelaporan Digital Satgas Linmas</span>
          <span>Hal 1 dari 1</span>
          <span>Kabupaten Ponorogo</span>
        </div>
      </div>

      <style>{`
        @media screen {
          #sipedas-print-section { display: none !important; }
        }
         @media print {
          @page { size: ${opts.paperSize === 'a4' ? 'A4' : '330mm 215mm'} landscape; margin: 0 !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${pw}mm !important;
            height: ${ph}mm !important;
            overflow: hidden !important;
          }
          body > :not(#sipedas-print-section) { display: none !important; visibility: hidden !important; }
          #sipedas-print-section {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${pw}mm !important;
            height: ${ph}mm !important;
            margin: 0 !important;
            padding: 6mm 8mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            overflow: hidden !important;
            visibility: visible !important;
            opacity: 1 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        /* ── Structural styles (outside @media so native renderers parse them) ── */
        #sipedas-print-section { font-family: Arial, Helvetica, sans-serif; }

        .spp-page {
          display: flex; flex-direction: column;
          width: 100%; height: 100%;
          background: #fff; color: #1e293b; box-sizing: border-box;
        }

        /* Header */
        .spp-header {
          display: flex; justify-content: space-between; align-items: center;
          background: #0f172a; color: #fff;
          padding: 2.5mm 5mm; flex-shrink: 0;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .spp-header-left { display: flex; align-items: center; gap: 3mm; }
        .spp-badge {
          background: #f59e0b; color: #0f172a;
          font-size: 5pt; font-weight: 900; padding: 1mm 2.5mm;
          border-radius: 1mm; letter-spacing: 0.15em; text-transform: uppercase;
          white-space: nowrap;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .spp-title { font-size: 9.5pt; font-weight: 900; color: #fff; }
        .spp-subtitle { font-size: 5.5pt; color: rgba(255,255,255,.72); margin-top: 0.5mm; }
        .spp-header-right { text-align: right; }
        .spp-date-lbl { font-size: 5pt; color: rgba(255,255,255,.6); text-transform: uppercase; }
        .spp-date { font-size: 6.5pt; font-weight: 800; color: #fff; }
        .spp-paper-lbl { font-size: 5pt; color: rgba(255,255,255,.5); margin-top: 0.5mm; }

        /* Body */
        .spp-body {
          display: flex; flex: 1; min-height: 0;
          border: 1.2pt solid #cbd5e1; border-top: none;
        }

        /* Map column */
        .spp-map-col { flex: 1; min-width: 0; overflow: hidden; }
        .spp-map { width: 100%; height: 100%; display: block; min-height: 100mm; }

        /* Legend rightbar */
        .spp-legend-col {
          width: 42mm; flex-shrink: 0;
          border-left: 1.2pt solid #e2e8f0;
          display: flex; flex-direction: column;
          padding: 3mm 3.5mm;
          background: #f8fafc;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .spp-legend-hd {
          font-size: 5pt; font-weight: 900; text-transform: uppercase;
          letter-spacing: 0.2em; color: #64748b;
          border-bottom: 0.8pt solid #e2e8f0;
          padding-bottom: 1.5mm; margin-bottom: 2.5mm;
        }
        .spp-legend-list { display: flex; flex-direction: column; gap: 1.8mm; flex: 1; }
        .spp-legend-row { display: flex; align-items: center; gap: 2.2mm; }
        .spp-legend-lbl {
          font-size: 6pt; font-weight: 600; color: #334155; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis; white-space: normal;
          word-break: break-word; max-width: 30mm;
        }
        .spp-legend-footer {
          border-top: 0.5pt solid #e2e8f0; padding-top: 2mm; margin-top: auto;
        }
        .spp-legend-footer-line { font-size: 5pt; color: #94a3b8; margin-bottom: 0.8mm; }

        /* Footer */
        .spp-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.8mm 5mm;
          border-top: 0.8pt solid #e2e8f0;
          font-size: 5pt; color: #94a3b8;
          background: #f8fafc; flex-shrink: 0;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
      `}</style>
    </div>,
    document.body
  );
};

/* ─── Main Modal ─────────────────────────────────────── */
export const PrintPdfModal: React.FC<PrintPdfModalProps> = ({
  show, onClose, pdfOpts, setPdfOpts, execPrint, fitPdfMapBounds,
  pdfRenderBusy, pdfRenderProgress, pdfRenderTxt,
  petaTitle = 'PETA PEDESTRIAN KABUPATEN PONOROGO',
  layersList = [], photosList = [], allDrawings = [],
  SIMBOL_DEF = [],
}) => {
  // Inject @page rule dynamically
  const styleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    if (!show) { styleRef.current?.remove(); styleRef.current = null; return; }
    const paper = PAPER[(pdfOpts.paperSize as PaperKey)] ?? PAPER.a4;
    const pw = Math.max(paper.w, paper.h);
    const ph = Math.min(paper.w, paper.h);
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'sipedas-page-size';
      document.head.appendChild(styleRef.current);
    }
    styleRef.current.textContent = `
      @media print {
        @page { size: ${pdfOpts.paperSize === 'a4' ? 'A4' : '330mm 215mm'} landscape; margin: 0 !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${pw}mm !important;
          height: ${ph}mm !important;
          overflow: hidden !important;
        }
        body > :not(#sipedas-print-section) { display: none !important; visibility: hidden !important; }
        #sipedas-print-section {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${pw}mm !important;
          height: ${ph}mm !important;
          margin: 0 !important;
          padding: 6mm 8mm !important;
          box-sizing: border-box !important;
          background: #fff !important;
          overflow: hidden !important;
          visibility: visible !important;
          opacity: 1 !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    return () => { styleRef.current?.remove(); styleRef.current = null; };
  }, [show, pdfOpts.paperSize]);

  if (!show) return null;

  const legendItems = buildLegend(pdfOpts, layersList, allDrawings, photosList, SIMBOL_DEF);
  const currentPaper = PAPER[(pdfOpts.paperSize as PaperKey)] ?? PAPER.a4;

  return (
    <>
      <PrintPortal opts={pdfOpts} petaTitle={petaTitle} legendItems={legendItems} />

      <div
        className="fixed inset-0 z-[99900] flex items-center justify-center overflow-y-auto overscroll-contain bg-[rgba(6,16,32,.52)] p-3.5 backdrop-blur-[3px] portrait:max-md:p-3"
        id="pdf-ov"
      >
        <div className="flex h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-[var(--shl)]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-[18px] py-3">
            <div className="flex items-center gap-[7px] text-[.8rem] font-extrabold text-text">
              <FileText className="w-4 h-4 inline-block align-middle mr-1.5 text-[#c0392b]" />
              Cetak Peta &mdash; <span className="ml-1 text-blue">{currentPaper.label} Landscape</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className={BTN_BG2} onClick={onClose}><X className="w-4 h-4 inline-block align-middle" /> Tutup</button>
              <button className={BTN_BP} onClick={execPrint} disabled={pdfRenderBusy}>
                <Printer className="w-4 h-4 inline-block align-middle" /> Cetak PDF
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ── Options sidebar ── */}
            <div className="w-[270px] shrink-0 overflow-y-auto border-r border-border bg-bg">
              <div className="px-3 pt-3">
                <div className={SECT_LBL}>Ukuran Kertas</div>
                <div className="mb-2.5 flex gap-[5px]">
                  {(Object.entries(PAPER) as [PaperKey, { label: string }][]).map(([key, p]) => (
                    <button key={key}
                      className={`${PAPER_BTN} justify-center ${pdfOpts.paperSize === key ? PAPER_BTN_ON : PAPER_BTN_OFF}`}
                      onClick={() => setPdfOpts((prev: any) => ({ ...prev, paperSize: key }))}
                    >{p.label}</button>
                  ))}
                </div>
                <p className="mt-1 text-[.6rem] text-muted">Selalu dicetak landscape ↔</p>
              </div>

              <div className="px-3 pt-3">
                <div className={SECT_LBL}>Tile Peta (Cetak)</div>
                <div className="flex flex-col gap-[3px]">
                  {PRINT_TILES.map(t => (
                    <button key={t.key}
                      className={`${PAPER_BTN} justify-start text-left ${pdfOpts.printTile === t.key ? PAPER_BTN_ON : PAPER_BTN_OFF}`}
                      onClick={() => setPdfOpts((prev: any) => ({ ...prev, printTile: t.key }))}
                    >{t.label}</button>
                  ))}
                </div>
              </div>

              <div className="px-3 pt-3">
                <div className={SECT_LBL}>Konten Peta</div>
                {[
                  { key: 'showLayers', label: 'Point Layer', sub: 'Marker pos jaga, CCTV, titik rawan' },
                  { key: 'showDraw', label: 'Coretan Peta', sub: 'Garis rute & arsir area' },
                  { key: 'showFoto', label: 'Titik Foto Laporan', sub: `${photosList.filter(p => p.lat && p.lng).length} foto dari lapangan` },
                ].map(({ key, label, sub }) => (
                  <div key={key} className={`${CHK} ${(pdfOpts as any)[key] ? CHK_ON : CHK_OFF}`}
                    onClick={() => setPdfOpts((prev: any) => ({ ...prev, [key]: !prev[key] }))}>
                    <input type="checkbox" checked={(pdfOpts as any)[key]} readOnly className="pointer-events-none h-[13px] w-[13px] shrink-0 accent-blue" />
                    <label className="cursor-pointer pointer-events-none text-[.68rem] leading-[1.4] text-text">{label}<small className="block text-[.57rem] text-muted">{sub}</small></label>
                  </div>
                ))}
              </div>

              {/* Legenda preview */}
              <div className="p-3">
                <div className={SECT_LBL}>Legenda (rightbar cetak)</div>
                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2">
                  {legendItems.length === 0 && (
                    <span className="text-[.62rem] text-muted">Tidak ada item legenda</span>
                  )}
                  {legendItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-[7px]">
                      <LegendIcon type={item.type} color={item.color} />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[.65rem] font-semibold text-text">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Map preview ── */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border bg-bluelo px-3.5 py-2">
                <div className="flex items-center gap-1.5 text-[.62rem] text-mid">
                  <Info className="w-4 h-4 inline-block align-middle" />
                  Pan &amp; zoom peta di bawah, lalu klik <strong>Cetak PDF</strong>
                </div>
                <button className={BTN_BG2_SM} onClick={fitPdfMapBounds}>
                  <Maximize2 className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Fit Semua
                </button>
              </div>
              <div className="flex flex-1 overflow-hidden bg-bg">
                <div id="pdf-map-preview" className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {pdfRenderBusy && (
        <div className="print:hidden">
          <div />
          <div>{pdfRenderTxt}</div>
          <div>
            <div style={{ width: `${pdfRenderProgress}%` }} />
          </div>
        </div>
      )}
    </>
  );
};
