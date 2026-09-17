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
}

// ── Komponen ─────────────────────────────────────────────────────────────────
export const PdfRekapPeriodeModal: React.FC<Props> = ({ show, onClose, allData, settings }) => {
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
      const dt = parseTglID(r.tanggal);
      if (!dt) return false;
      const m = dt.getMonth() + 1;
      const y = dt.getFullYear();
      if (y !== tahun) return false;
      if (mode === 'bulanan') return m === bulan;
      return TW_MONTHS[triwulan]?.includes(m) ?? false;
    });
  }, [allData, mode, tahun, bulan, triwulan]);

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
    getFilteredRows, mode, tahun, bulan, triwulan, kota,
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
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--card)',
          borderRadius: '14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          width: 'min(1100px, 97vw)',
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '.92rem', color: 'var(--red)' }}>
            <FileText className="w-4 h-4" />
            PDF Rekap Laporan Periodik
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BODY (2-col: panel kiri + preview kanan) ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

          {/* ══ PANEL KIRI ══ */}
          <div style={{
            width: '290px', flexShrink: 0,
            overflowY: 'auto',
            padding: '14px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg)',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>

            {/* Mode Rekap */}
            <section>
              <div style={labelStyle}>📋 Mode Rekap</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['bulanan', 'triwulanan'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: '.73rem', fontWeight: 700,
                      border: '2px solid ' + (mode === m ? 'var(--blue)' : 'var(--border)'),
                      borderRadius: '7px', cursor: 'pointer',
                      background: mode === m ? 'var(--blue)' : 'var(--card)',
                      color: mode === m ? '#fff' : 'var(--text)',
                      transition: 'all .15s',
                    }}
                  >
                    <Calendar className="w-3.5 h-3.5 inline-block align-middle mr-1" />
                    {m === 'bulanan' ? 'Bulanan' : 'Triwulanan'}
                  </button>
                ))}
              </div>
            </section>

            {/* Tahun */}
            <section>
              <div style={labelStyle}>📅 Tahun</div>
              <select className="fctl" value={tahun} onChange={e => setTahun(+e.target.value)}>
                {tahunList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </section>

            {/* Bulan (hanya jika mode bulanan) */}
            {mode === 'bulanan' && (
              <section>
                <div style={labelStyle}>📆 Bulan</div>
                <select className="fctl" value={bulan} onChange={e => setBulan(+e.target.value)}>
                  {BNAME.slice(1).map((n, i) => (
                    <option key={i+1} value={i+1}>{n}</option>
                  ))}
                </select>
              </section>
            )}

            {/* Triwulan (hanya jika mode triwulanan) */}
            {mode === 'triwulanan' && (
              <section>
                <div style={labelStyle}>📆 Triwulan</div>
                <select className="fctl" value={triwulan} onChange={e => setTriwulan(+e.target.value)}>
                  {[1,2,3,4].map(tw => <option key={tw} value={tw}>{TW_LABEL[tw]}</option>)}
                </select>
              </section>
            )}

            {/* Statistik cepat */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '10px 12px',
            }}>
              <div style={labelStyle}><BarChart2 className="w-3.5 h-3.5 inline-block mr-1" />Statistik Periode</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--blue)' }}>{filteredCount}</div>
                  <div style={{ fontSize: '.64rem', color: 'var(--muted)' }}>Total Laporan</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--red)' }}>{pelanggaranCount}</div>
                  <div style={{ fontSize: '.64rem', color: 'var(--muted)' }}>Pelanggaran</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)' }}>{filteredCount - pelanggaranCount}</div>
                  <div style={{ fontSize: '.64rem', color: 'var(--muted)' }}>Nihil</div>
                </div>
              </div>
              {filteredCount === 0 && (
                <div style={{ fontSize: '.68rem', color: 'var(--amber)', marginTop: '6px', fontWeight: 600 }}>
                  <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                  Tidak ada data untuk periode ini.
                </div>
              )}
            </div>

            {/* Kota TTD */}
            <section>
              <div style={labelStyle}>📍 Kota (pada TTD)</div>
              <input className="fctl" value={kota} onChange={e => setKota(e.target.value)} placeholder="Ponorogo" />
            </section>

            {/* Data Pejabat TTD — collapsible */}
            <section>
              <button
                onClick={() => setShowTtdSection(!showTtdSection)}
                style={collapseButtonStyle}
              >
                <span>🖊️ Data Pejabat TTD</span>
                <ChevronDown className="w-4 h-4" style={{ transform: showTtdSection ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
              </button>
              {showTtdSection && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div>
                    <div style={labelStyle}>Jabatan</div>
                    <input className="fctl" value={jabatan} onChange={e => setJabatan(e.target.value)} />
                  </div>
                  <div>
                    <div style={labelStyle}>Nama Lengkap</div>
                    <input className="fctl" value={namaTtd} onChange={e => setNamaTtd(e.target.value)} />
                  </div>
                  <div>
                    <div style={labelStyle}>Pangkat/Gol</div>
                    <input className="fctl" value={pangkat} onChange={e => setPangkat(e.target.value)} />
                  </div>
                  <div>
                    <div style={labelStyle}>NIP</div>
                    <input className="fctl" value={nip} onChange={e => setNip(e.target.value)} />
                  </div>
                </div>
              )}
            </section>

            {/* Kop Surat — collapsible */}
            <section>
              <button
                onClick={() => setShowKopSection(!showKopSection)}
                style={collapseButtonStyle}
              >
                <span>🏛️ Kop Surat</span>
                <ChevronDown className="w-4 h-4" style={{ transform: showKopSection ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
              </button>
              {showKopSection && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={kopAktif} onChange={e => setKopAktif(e.target.checked)} style={{ marginRight: '6px' }} />
                    Tampilkan Kop Surat
                  </label>
                  {kopAktif && (
                    <>
                      <div>
                        <div style={labelStyle}>Instansi (baris 1)</div>
                        <input className="fctl" value={kopInstansi} onChange={e => setKopInstansi(e.target.value)} placeholder="PEMERINTAH KAB. PONOROGO" />
                      </div>
                      <div>
                        <div style={labelStyle}>Dinas (baris 2, tebal)</div>
                        <input className="fctl" value={kopDinas} onChange={e => setKopDinas(e.target.value)} placeholder="SATPOL PP DAN PEMADAM KEBAKARAN" />
                      </div>
                      <div>
                        <div style={labelStyle}>Alamat / Telp</div>
                        <input className="fctl" value={kopJalan} onChange={e => setKopJalan(e.target.value)} placeholder="Jl. Aloon-Aloon No.1 Ponorogo" />
                      </div>
                      <div>
                        <div style={labelStyle}>Logo Kiri (opsional)</div>
                        <input type="file" accept="image/*" onChange={handleLogoUpload(setKopLogoKiri)} style={{ fontSize: '.68rem' }} />
                        {kopLogoKiri && <img src={kopLogoKiri} alt="logo kiri" style={{ height: '36px', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border)' }} />}
                      </div>
                      <div>
                        <div style={labelStyle}>Logo Kanan (opsional)</div>
                        <input type="file" accept="image/*" onChange={handleLogoUpload(setKopLogoKanan)} style={{ fontSize: '.68rem' }} />
                        {kopLogoKanan && <img src={kopLogoKanan} alt="logo kanan" style={{ height: '36px', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border)' }} />}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Tombol Generate */}
            <button
              className="bp"
              onClick={handleGenerate}
              disabled={isLoading || filteredCount === 0}
              style={{ width: '100%', padding: '10px', fontWeight: 700, marginTop: '4px' }}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 inline-block align-middle animate-spin mr-1" /> Membuat...</>
                : <><RefreshCw className="w-4 h-4 inline-block align-middle mr-1" /> Generate Preview</>}
            </button>

          </div>
          {/* ══ END PANEL KIRI ══ */}

          {/* ══ PANEL KANAN: PREVIEW ══ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Preview header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--card)',
              flexShrink: 0,
              flexWrap: 'wrap', gap: '6px',
            }}>
              <span style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <Eye className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)]" />
                Preview — {mode === 'bulanan' ? `${BNAME[bulan]} ${tahun}` : `${TW_LABEL[triwulan]} ${tahun}`}
              </span>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {srcdoc && (
                  <>
                    <button
                      className="bp"
                      onClick={handlePrint}
                      style={{ fontSize: '.67rem', padding: '5px 12px' }}
                    >
                      <Printer className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Cetak
                    </button>
                    <button
                      className="bp"
                      onClick={handleDownloadPdf}
                      style={{ fontSize: '.67rem', padding: '5px 12px', background: 'var(--red)' }}
                    >
                      <FileDown className="w-3.5 h-3.5 inline-block align-middle mr-1" /> PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preview area */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#c8c8c8', padding: '16px' }}>
              {!srcdoc && !isLoading && (
                <div style={{
                  height: '100%', minHeight: '300px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '10px', color: 'var(--muted)', textAlign: 'center',
                }}>
                  <FileText className="w-12 h-12 opacity-20" />
                  <p style={{ fontSize: '.82rem' }}>Klik <strong>Generate Preview</strong> untuk melihat tampilan PDF.</p>
                  {filteredCount === 0 && (
                    <p style={{ fontSize: '.72rem', color: 'var(--amber)', fontWeight: 600 }}>
                      <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                      Tidak ada data untuk periode yang dipilih.
                    </p>
                  )}
                </div>
              )}
              {isLoading && (
                <div style={{
                  height: '300px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '12px', color: 'var(--mid)',
                }}>
                  <Loader2 className="w-10 h-10 animate-spin text-[var(--blue)]" />
                  <span style={{ fontSize: '.8rem' }}>Membuat rekap PDF...</span>
                </div>
              )}
              {srcdoc && !isLoading && (
                /* Wrapper scaled — A4 landscape = 1123px × 794px, scale 0.62 */
                <div style={{
                  width: `${Math.round(1123 * 0.62)}px`,
                  height: `${Math.round(iframeHeight * 0.62)}px`,
                  margin: '0 auto',
                  position: 'relative',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                  borderRadius: '2px',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    transformOrigin: 'top left',
                    transform: 'scale(0.62)',
                  }}>
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
                      style={{
                        width: '1123px',
                        height: `${iframeHeight}px`,
                        border: 'none',
                        display: 'block',
                        background: '#fff',
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
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '.64rem', color: 'var(--muted)', flex: 1 }}>
            {filteredCount} laporan ditemukan untuk periode yang dipilih.
          </span>
          <button className="bg2" onClick={onClose} style={{ fontSize: '.72rem' }}>Tutup</button>
          <button
            className="bp"
            onClick={handleGenerate}
            disabled={isLoading || filteredCount === 0}
            style={{ fontSize: '.72rem' }}
          >
            {isLoading
              ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin mr-1" />Membuat...</>
              : <><RefreshCw className="w-3.5 h-3.5 inline-block align-middle mr-1" />Generate</>}
          </button>
          {srcdoc && (
            <>
              <button
                className="bp"
                onClick={handlePrint}
                style={{ fontSize: '.72rem', background: 'var(--amber)' }}
              >
                <Printer className="w-3.5 h-3.5 inline-block align-middle mr-1" /> Cetak
              </button>
              <button
                className="bp"
                onClick={handleDownloadPdf}
                style={{ fontSize: '.72rem', background: 'var(--red)' }}
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

// ── Style helpers ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '.63rem',
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: '4px',
};

const statBoxStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '6px 8px',
  textAlign: 'center',
  minWidth: '64px',
};

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '7px',
  padding: '7px 10px',
  fontSize: '.72rem',
  fontWeight: 700,
  cursor: 'pointer',
  color: 'var(--text)',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '.74rem',
  fontWeight: 600,
  color: 'var(--text)',
  cursor: 'pointer',
  userSelect: 'none',
};

export default PdfRekapPeriodeModal;
