/**
 * PdfRekapPeriodeModal
 *
 * Modal untuk generate & cetak PDF Rekap Laporan Periodik (Bulanan / Triwulanan).
 * Fitur:
 *  - Pilih mode: Bulanan atau Triwulanan
 *  - Pilih bulan/tahun (bulanan) atau triwulan/tahun (triwulanan)
 *  - Kop surat resmi dengan logo instansi
 *  - Data pejabat TTD (jabatan, nama, pangkat, NIP)
 *  - Preview langsung di iframe (scale fit)
 *  - Tombol Cetak, Download PDF, serta ringkasan statistik
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Printer, FileDown, RefreshCw, Loader2, Eye,
  Calendar, ChevronDown, AlertTriangle, BarChart2, X,
} from 'lucide-react';
import { Laporan, Settings } from '../../types';
import { parseTglID } from '../../utils/helpers';
import { apiPost } from '../../services/api';
import { prepareHtmlWithEmbeddedFotos } from '../../utils/foto-embed';
import { CustomDropdown } from './CustomDropdown';

// ── Helpers ─────────────────────────────────────────────────────────────────
const BNAME = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const TW_LABEL: Record<number, string> = {
  1: 'Triwulan I (Jan–Mar)',
  2: 'Triwulan II (Apr–Jun)',
  3: 'Triwulan III (Jul–Sep)',
  4: 'Triwulan IV (Okt–Des)',
};

const TW_MONTHS: Record<number, number[]> = {
  1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12],
};

function getQuarterForMonth(m: number): number {
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  show: boolean;
  onClose: () => void;
  allData: Laporan[];
  settings: Settings;
  kategori?: string;
}

// ── Style helpers (canonical Tailwind class sets, konversi dari inline style) ──
const LBL =
  'mb-1 text-[.63rem] font-extrabold uppercase tracking-[.05em] text-muted';
const STATBOX =
  'min-w-[64px] flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-center';
const COLLAPSE_BTN =
  'flex w-full cursor-pointer items-center justify-between rounded-[7px] border border-border bg-card px-2.5 py-[7px] text-[.72rem] font-bold text-text';
const CHECK_LBL =
  'flex cursor-pointer select-none items-center text-[.74rem] font-semibold text-text';
const BTN_BG2 =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-[15px] py-2 text-[.72rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BTN_BP =
  'inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-[.72rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
/** bp kecil (asli: fontSize .67rem, padding 5px 12px) */
const BTN_BP_SM =
  'inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-[5px] text-[.67rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
/** bp kecil warna aksen (inline style asli menimpa hover:bg-blueh) */
const BTN_BP_SM_RED =
  'inline-flex items-center gap-1.5 rounded-md bg-red px-3 py-[5px] text-[.67rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0';
const BTN_BP_AMBER =
  'inline-flex items-center gap-1.5 rounded-md bg-amber px-4 py-2 text-[.72rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0';
const BTN_BP_RED =
  'inline-flex items-center gap-1.5 rounded-md bg-red px-4 py-2 text-[.72rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0';
/** bp full-width (asli: width 100%, padding 10px, marginTop 4px) */
const BTN_BP_FULL =
  'mt-1 inline-flex w-full items-center gap-1.5 rounded-md bg-blue px-2.5 py-2.5 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
const FCTL =
  'w-full rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';

// ── Komponen ─────────────────────────────────────────────────────────────────
export const PdfRekapPeriodeModal: React.FC<Props> = ({ show, onClose, allData, settings, kategori }) => {
  const isPedestrian = !kategori || kategori === 'pedestrian';

  // ── State: Mode & Periode ─────────────────────────────────────────────────
  const now = new Date();
  const [mode, setMode]         = useState<'bulanan' | 'triwulanan'>('bulanan');
  const [tahun, setTahun]       = useState(now.getFullYear());
  const [bulan, setBulan]       = useState(now.getMonth() + 1);
  const [triwulan, setTriwulan] = useState(getQuarterForMonth(now.getMonth() + 1));

  // ── State: Data Pejabat TTD ──────────────────────────────────────────────
  const [jabatan, setJabatan]   = useState('');
  const [namaTtd, setNamaTtd]   = useState('');
  const [pangkat, setPangkat]   = useState('');
  const [nip, setNip]           = useState('');
  const [kota, setKota]         = useState('Ponorogo');

  // ── State: Kop Surat ─────────────────────────────────────────────────────
  const [kopAktif, setKopAktif]           = useState(false);
  const [kopInstansi, setKopInstansi]     = useState('');
  const [kopDinas, setKopDinas]           = useState('');
  const [kopJalan, setKopJalan]           = useState('');
  const [kopLogoKiri, setKopLogoKiri]     = useState('');
  const [kopLogoKanan, setKopLogoKanan]   = useState('');
  const [showKopSection, setShowKopSection] = useState(false);
  const [showTtdSection, setShowTtdSection] = useState(false);

  // ── State: Preview ────────────────────────────────────────────────────────
  const [srcdoc, setSrcdoc]               = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [iframeHeight, setIframeHeight]   = useState(700);
  const [filteredCount, setFilteredCount] = useState(0);

  // ── Populate settings saat modal dibuka ──────────────────────────────────
  useEffect(() => {
    if (!show) return;
    setJabatan(settings.pdf_jabatan || 'Kepala Bidang SDA dan Linmas');
    setNamaTtd(settings.pdf_nama    || 'Erry Setiyoso Birowo, SP');
    setPangkat(settings.pdf_pangkat || 'Pembina');
    setNip(settings.pdf_nip         || '19751029 200212 1 008');
    if (settings.kop_instansi) setKopInstansi(settings.kop_instansi);
    if (settings.kop_dinas)    setKopDinas(settings.kop_dinas);
    if (settings.kop_jalan)    setKopJalan(settings.kop_jalan);
  }, [show, settings]);

  // ── Filter data berdasarkan periode ──────────────────────────────────────
  const getFilteredRows = useCallback(() => {
    return allData.filter(r => {
      if (kategori) {
        if (kategori === 'pedestrian') {
          if (r.kategori && r.kategori !== 'pedestrian') return false;
        } else if (kategori === 'yanmas') {
          if (r.kategori !== 'yanmas') return false;
        } else {
          if (r.kategori !== kategori) return false;
        }
      }
      const dt = parseTglID(r.tanggal);
      if (!dt) return false;
      const m = dt.getMonth() + 1;
      const y = dt.getFullYear();
      if (y !== tahun) return false;
      if (mode === 'bulanan') return m === bulan;
      return TW_MONTHS[triwulan]?.includes(m) ?? false;
    });
  }, [allData, kategori, mode, tahun, bulan, triwulan]);

  // ── Update counter saat filter berubah ───────────────────────────────────
  useEffect(() => {
    setFilteredCount(getFilteredRows().length);
  }, [getFilteredRows]);

  // ── Generate preview HTML ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const rows = getFilteredRows();
    setIsLoading(true);
    try {
      const res = await apiPost('generateRekapPeriodeHtml', {
        kategori,
        mode, tahun, bulan, triwulan, rows, kota,
        jabatanTtd: jabatan, namaTtd, pangkatTtd: pangkat, nipTtd: nip,
        kopAktif, kopInstansi, kopDinas, kopJalan, kopLogoKiri, kopLogoKanan,
      });
      if (res.success) {
        const rawHtml: string = res.data?.html || '';
        const readyHtml = await prepareHtmlWithEmbeddedFotos(rawHtml);
        setSrcdoc(readyHtml);
      }
    } catch (e) {
      console.error('generateRekapPeriodeHtml error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [
    getFilteredRows, kategori, mode, tahun, bulan, triwulan, kota,
    jabatan, namaTtd, pangkat, nip,
    kopAktif, kopInstansi, kopDinas, kopJalan, kopLogoKiri, kopLogoKanan,
  ]);

  // ── Auto-generate ketika periode berubah (jika srcdoc sudah ada) ─────────
  useEffect(() => {
    if (srcdoc) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tahun, bulan, triwulan]);

  // ── Cetak ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!srcdoc) return;
    const iframe = document.getElementById('rekap-periode-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!srcdoc) { await handleGenerate(); }
    const html = srcdoc || '';
    if (!html) return;
    const printHtml = html.replace(
      '</head>',
      '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script></head>'
    );
    const blob = new Blob([printHtml], { type: 'text/html; charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) alert('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // ── Upload logo ───────────────────────────────────────────────────────────
  const handleLogoUpload = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Daftar tahun untuk dropdown ───────────────────────────────────────────
  const tahunList = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  // ── Statistik cepat ───────────────────────────────────────────────────────
  const rows = getFilteredRows();
  const pelanggaranCount = rows.filter(r =>
    r.identitas && r.identitas.toUpperCase() !== 'NIHIL' && r.identitas.trim() !== ''
  ).length;

  if (!show) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(0,0,0,0.55)] p-4 backdrop-blur-[3px] print:hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex max-h-[96vh] w-[min(1100px,97vw)] flex-col overflow-hidden rounded-[14px] bg-card shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      >
        {/* ── HEADER ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-[18px] pb-3 pt-3.5">
          <span className="flex items-center gap-2 text-[.92rem] font-extrabold text-red">
            <FileText className="w-4 h-4" />
            PDF Rekap Laporan Periodik {!isPedestrian && kategori ? `(${kategori.toUpperCase()})` : ''}
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-1 text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BODY (2-col: panel kiri + preview kanan) ── */}
        <div className="flex flex-1 overflow-hidden gap-0">

          {/* ══ PANEL KIRI ══ */}
          <div className="flex w-[290px] shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-border bg-bg p-3.5">

            {/* Mode Rekap */}
            <section>
              <div className={LBL}>📋 Mode Rekap</div>
              <div className="flex gap-1.5">
                {(['bulanan', 'triwulanan'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 cursor-pointer rounded-[7px] border-2 px-1 py-2 text-[.73rem] font-bold transition-all duration-150 ${
                      mode === m
                        ? 'border-blue bg-blue text-white'
                        : 'border-border bg-card text-text'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 inline-block align-middle mr-1" />
                    {m === 'bulanan' ? 'Bulanan' : 'Triwulanan'}
                  </button>
                ))}
              </div>
            </section>

            {/* Tahun */}
            <section>
              <div className={LBL}>📅 Tahun</div>
              <CustomDropdown className="w-full" value={tahun} onChange={(v) => setTahun(Number(v))} options={tahunList.map(y => ({ value: y, label: String(y) }))} />
            </section>

            {/* Bulan (hanya jika mode bulanan) */}
            {mode === 'bulanan' && (
              <section>
                <div className={LBL}>📆 Bulan</div>
                <CustomDropdown className="w-full" value={bulan} onChange={(v) => setBulan(Number(v))} options={BNAME.slice(1).map((n, i) => ({ value: i + 1, label: n }))} />
              </section>
            )}

            {/* Triwulan (hanya jika mode triwulanan) */}
            {mode === 'triwulanan' && (
              <section>
                <div className={LBL}>📆 Triwulan</div>
                <CustomDropdown className="w-full" value={triwulan} onChange={(v) => setTriwulan(Number(v))} options={[1,2,3,4].map(tw => ({ value: tw, label: TW_LABEL[tw] }))} />
              </section>
            )}

            {/* Statistik cepat */}
            <div className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className={LBL}><BarChart2 className="w-3.5 h-3.5 inline-block mr-1" />Statistik Periode</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {isPedestrian ? (
                  <>
                    <div className={STATBOX}>
                      <div className="text-[1.3rem] font-extrabold text-blue">{filteredCount}</div>
                      <div className="text-[.64rem] text-muted">Total Laporan</div>
                    </div>
                    <div className={STATBOX}>
                      <div className="text-[1.3rem] font-extrabold text-red">{pelanggaranCount}</div>
                      <div className="text-[.64rem] text-muted">Pelanggaran</div>
                    </div>
                    <div className={STATBOX}>
                      <div className="text-[1.3rem] font-extrabold text-green">{filteredCount - pelanggaranCount}</div>
                      <div className="text-[.64rem] text-muted">Nihil</div>
                    </div>
                  </>
                ) : (
                  <div className={STATBOX}>
                    <div className="text-[1.3rem] font-extrabold text-blue">{filteredCount}</div>
                    <div className="text-[.64rem] text-muted">Total Kegiatan</div>
                  </div>
                )}
              </div>
              {filteredCount === 0 && (
                <div className="mt-1.5 text-[.68rem] font-semibold text-amber">
                  <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                  Tidak ada data untuk periode ini.
                </div>
              )}
            </div>

            {/* Kota TTD */}
            <section>
              <div className={LBL}>📍 Kota (pada TTD)</div>
              <input className={FCTL} value={kota} onChange={e => setKota(e.target.value)} placeholder="Ponorogo" />
            </section>

            {/* Data Pejabat TTD — collapsible */}
            <section>
              <button
                onClick={() => setShowTtdSection(!showTtdSection)}
                className={COLLAPSE_BTN}
              >
                <span>🖊️ Data Pejabat TTD</span>
                <ChevronDown className={`w-4 h-4 transition-all duration-200 ${showTtdSection ? 'rotate-180' : ''}`} />
              </button>
              {showTtdSection && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div>
                    <div className={LBL}>Jabatan</div>
                    <input className={FCTL} value={jabatan} onChange={e => setJabatan(e.target.value)} />
                  </div>
                  <div>
                    <div className={LBL}>Nama Lengkap</div>
                    <input className={FCTL} value={namaTtd} onChange={e => setNamaTtd(e.target.value)} />
                  </div>
                  <div>
                    <div className={LBL}>Pangkat/Gol</div>
                    <input className={FCTL} value={pangkat} onChange={e => setPangkat(e.target.value)} />
                  </div>
                  <div>
                    <div className={LBL}>NIP</div>
                    <input className={FCTL} value={nip} onChange={e => setNip(e.target.value)} />
                  </div>
                </div>
              )}
            </section>

            {/* Kop Surat — collapsible */}
            <section>
              <button
                onClick={() => setShowKopSection(!showKopSection)}
                className={COLLAPSE_BTN}
              >
                <span>🏛️ Kop Surat</span>
                <ChevronDown className={`w-4 h-4 transition-all duration-200 ${showKopSection ? 'rotate-180' : ''}`} />
              </button>
              {showKopSection && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <label className={CHECK_LBL}>
                    <input type="checkbox" checked={kopAktif} onChange={e => setKopAktif(e.target.checked)} className="mr-1.5" />
                    Tampilkan Kop Surat
                  </label>
                  {kopAktif && (
                    <>
                      <div>
                        <div className={LBL}>Instansi (baris 1)</div>
                        <input className={FCTL} value={kopInstansi} onChange={e => setKopInstansi(e.target.value)} placeholder="PEMERINTAH KAB. PONOROGO" />
                      </div>
                      <div>
                        <div className={LBL}>Dinas (baris 2, tebal)</div>
                        <input className={FCTL} value={kopDinas} onChange={e => setKopDinas(e.target.value)} placeholder="SATPOL PP DAN PEMADAM KEBAKARAN" />
                      </div>
                      <div>
                        <div className={LBL}>Alamat / Telp</div>
                        <input className={FCTL} value={kopJalan} onChange={e => setKopJalan(e.target.value)} placeholder="Jl. Aloon-Aloon No.1 Ponorogo" />
                      </div>
                      <div>
                        <div className={LBL}>Logo Kiri (opsional)</div>
                        <input type="file" accept="image/*" onChange={handleLogoUpload(setKopLogoKiri)} className="text-[.68rem]" />
                        {kopLogoKiri && <img src={kopLogoKiri} alt="logo kiri" className="mt-1 h-9 rounded border border-border" />}
                      </div>
                      <div>
                        <div className={LBL}>Logo Kanan (opsional)</div>
                        <input type="file" accept="image/*" onChange={handleLogoUpload(setKopLogoKanan)} className="text-[.68rem]" />
                        {kopLogoKanan && <img src={kopLogoKanan} alt="logo kanan" className="mt-1 h-9 rounded border border-border" />}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Tombol Generate */}
            <button
              className={BTN_BP_FULL}
              onClick={handleGenerate}
              disabled={isLoading || filteredCount === 0}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 inline-block align-middle animate-spin mr-1" /> Membuat...</>
                : <><RefreshCw className="w-4 h-4 inline-block align-middle mr-1" /> Generate Preview</>}
            </button>

          </div>
          {/* ══ END PANEL KIRI ══ */}

          {/* ══ PANEL KANAN: PREVIEW ══ */}
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* Preview header */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-border bg-card px-3.5 py-2">
              <span className="text-[.67rem] font-extrabold uppercase tracking-[.06em] text-mid">
                <Eye className="w-4 h-4 inline-block align-middle mr-1.5 text-blue" />
                Preview — {mode === 'bulanan' ? `${BNAME[bulan]} ${tahun}` : `${TW_LABEL[triwulan]} ${tahun}`}
              </span>
              <div className="flex flex-wrap gap-[5px]">
                {srcdoc && (
                  <>
                    <button
                      className={BTN_BP_SM}
                      onClick={handlePrint}
                    >
                      <Printer className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Cetak
                    </button>
                    <button
                      className={BTN_BP_SM_RED}
                      onClick={handleDownloadPdf}
                    >
                      <FileDown className="w-3.5 h-3.5 inline-block align-middle mr-1" /> PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-y-auto bg-[#c8c8c8] p-4">
              {!srcdoc && !isLoading && (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2.5 text-center text-muted">
                  <FileText className="w-12 h-12 opacity-20" />
                  <p className="text-[.82rem]">Klik <strong>Generate Preview</strong> untuk melihat tampilan PDF.</p>
                  {filteredCount === 0 && (
                    <p className="text-[.72rem] font-semibold text-amber">
                      <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                      Tidak ada data untuk periode yang dipilih.
                    </p>
                  )}
                </div>
              )}
              {isLoading && (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-mid">
                  <Loader2 className="w-10 h-10 animate-spin text-blue" />
                  <span className="text-[.8rem]">Membuat rekap PDF...</span>
                </div>
              )}
              {srcdoc && !isLoading && (
                /* Wrapper scaled — A4 landscape = 1123px × 794px, scale 0.62 */
                <div
                  className="relative mx-auto w-[696px] rounded-[2px] shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                  style={{
                    height: `${Math.round(iframeHeight * 0.62)}px`,
                  }}
                >
                  <div className="absolute left-0 top-0 origin-top-left scale-[0.62]">
                    <iframe
                      id="rekap-periode-frame"
                      srcDoc={srcdoc}
                      scrolling="no"
                      onLoad={(e) => {
                        const fr = e.target as HTMLIFrameElement;
                        fr.style.height = '10px';
                        requestAnimationFrame(() => {
                          try {
                            const doc = fr.contentDocument;
                            if (doc) {
                              const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0);
                              if (h > 100) {
                                setIframeHeight(h);
                                fr.style.height = `${h}px`;
                              }
                            }
                          } catch { /* cross-origin safety */ }
                        });
                      }}
                      className="block w-[1123px] border-none bg-white"
                      style={{
                        height: `${iframeHeight}px`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
          {/* ══ END PANEL KANAN ══ */}

        </div>

        {/* ── FOOTER ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-bg px-4 py-2.5">
          <span className="flex-1 text-[.64rem] text-muted">
            {filteredCount} laporan ditemukan untuk periode yang dipilih.
          </span>
          <button className={BTN_BG2} onClick={onClose}>Tutup</button>
          <button
            className={BTN_BP}
            onClick={handleGenerate}
            disabled={isLoading || filteredCount === 0}
          >
            {isLoading
              ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin mr-1" />Membuat...</>
              : <><RefreshCw className="w-3.5 h-3.5 inline-block align-middle mr-1" />Generate</>}
          </button>
          {srcdoc && (
            <>
              <button
                className={BTN_BP_AMBER}
                onClick={handlePrint}
              >
                <Printer className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Cetak
              </button>
              <button
                className={BTN_BP_RED}
                onClick={handleDownloadPdf}
              >
                <FileDown className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Download PDF
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default PdfRekapPeriodeModal;
