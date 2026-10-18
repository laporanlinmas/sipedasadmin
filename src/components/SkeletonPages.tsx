import React from 'react';

/* ─── Primitive Blocks ─────────────────────────────── */
const Sk: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`skeleton rounded-lg ${className}`} style={style} />
);

/* ── Class sets — mantan kelas dashboard.css/peta-shell.css → Tailwind utilities inline ── */
const SCARD = 'group relative flex flex-col gap-1 overflow-hidden rounded-2xl border-[1.5px] border-[var(--border)] bg-card p-3.5 px-4 shadow-[var(--sh)] transition-all duration-[220ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1 hover:shadow-[var(--shl)] portrait:max-md:flex-row portrait:max-md:items-center portrait:max-md:gap-0 portrait:max-md:rounded-[10px] portrait:max-md:p-[7px] portrait:max-md:px-2.5 portrait:max-md:hover:translate-y-0 portrait:max-md:hover:shadow-[var(--sh)] portrait:max-[480px]:px-[9px]!';
const SCARD_BAR = 'pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl opacity-90 transition-[width] duration-200 [transition-timing-function:ease] group-hover:w-[5px] group-hover:opacity-100 bg-[linear-gradient(180deg,var(--blue),var(--blue2))]';
const SICO = 'mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-[.95rem] shadow-[var(--sh-inner)] transition-all duration-[280ms] group-hover:scale-110 group-hover:-rotate-4 portrait:max-md:h-8 portrait:max-md:w-8 portrait:max-md:rounded-lg portrait:max-md:text-[.78rem] portrait:max-md:mb-0 portrait:max-md:mr-2 portrait:max-md:shrink-0 portrait:max-[480px]:h-7! portrait:max-[480px]:w-7! portrait:max-[480px]:text-[.7rem]! portrait:max-[480px]:mr-[7px]!';
const SICO_CB = `${SICO} bg-bluelo text-blue`;
const SCARD_TEXT = 'flex flex-col gap-0.5 portrait:max-md:min-w-0 portrait:max-md:flex-1 portrait:max-md:gap-px portrait:max-md:overflow-hidden';
const PANEL = 'max-w-full overflow-hidden rounded-2xl border-[1.5px] border-[var(--border)] bg-card shadow-[var(--sh)] transition-all hover:shadow-[var(--shl)] min-[769px]:overflow-x-auto max-md:landscape:overflow-x-auto';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-[var(--border)] bg-gradient-to-br from-[rgba(27,59,111,.06)] to-transparent px-4 py-3';
const CG2 = 'mb-3 grid grid-cols-[3fr_2fr] gap-3 max-[980px]:grid-cols-1';
const FU = 'flex flex-col gap-0';
const FBAR = 'flex flex-wrap items-center gap-[7px] border-b border-[var(--border)] bg-bg px-[15px] py-2.5 portrait:max-md:flex-col portrait:max-md:items-stretch portrait:max-md:gap-2.5 portrait:max-md:px-3.5 portrait:max-md:py-3';
const FBAR_RIGHT = 'ml-auto flex shrink-0 items-center gap-1.5 portrait:max-md:ml-0 portrait:max-md:w-full';
const FSRCH_150 = 'relative flex min-w-[130px] flex-[2_1_150px] items-center portrait:max-md:w-full portrait:max-md:flex-auto';
const FSRCH_180 = 'relative flex min-w-[130px] flex-[2_1_180px] items-center portrait:max-md:w-full portrait:max-md:flex-auto';
const FBAR_DATES_ROW = 'flex items-center gap-1.5 flex-[3_1_200px] portrait:max-md:w-full portrait:max-md:flex-auto';
const FBAR_DATES = 'flex items-center gap-1.5 flex-1 portrait:max-md:w-full portrait:max-md:gap-2';
const RTBL_WRAP = 'mb-3 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] [&>table]:min-w-[684px] portrait:max-md:hidden';
const DTBL = 'w-full border-separate border-spacing-0 text-[.73rem]';
const TH = 'sticky top-0 z-[1] whitespace-nowrap border-b-2 border-[var(--border)] bg-bg px-2.5 py-2 text-left text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TH_SP = 'sticky top-0 z-[1] whitespace-nowrap border-b-2 border-[var(--border)] bg-bg px-3 py-2.5 text-left text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TD = 'border-b border-[var(--border)] px-2.5 py-[7px] align-middle transition-colors duration-100';
const TD_SP = 'border-b border-[var(--border)] px-3 py-[11px] align-middle transition-colors duration-100';
const TR_HOVER = 'hover:[&>td]:bg-[rgba(30,111,217,.035)]';
const MCARD_LIST = 'hidden w-full min-w-0 overflow-x-hidden portrait:max-md:block';
const MCARD_ITEM = 'relative mb-3 w-full rounded-[var(--r)] border border-[var(--border)] bg-card p-3 shadow-[var(--sh)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shl)]';
const MCARD_ITEM_14 = 'relative mb-3 w-full rounded-[var(--r)] border border-[var(--border)] bg-card p-[14px] shadow-[var(--sh)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shl)]';
const MCARD_ROW = 'mb-1 flex w-full min-w-0 items-start justify-between gap-1.5';
const MCARD_META = 'text-[.64rem] leading-[1.55] text-muted';
const MCARD_ACTS = 'mt-[7px] flex flex-wrap gap-1';
const PGW = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-[var(--border)] px-3.5 py-[9px] text-[.67rem] text-muted';
const PGW_14 = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-[var(--border)] p-[14px] text-[.67rem] text-muted';
const PBS = 'flex gap-[3px]';
const AG_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5 portrait:max-md:grid-cols-2 portrait:max-md:gap-2 portrait:max-[480px]:grid-cols-1!';
const AG_CARD = 'relative flex items-start gap-2.5 rounded-[14px] border border-[var(--border)] bg-card py-3 pl-3.5 pr-[72px] shadow-[var(--sh)] transition-all duration-200 hover:-translate-y-0.5 hover:border-bdark hover:shadow-[var(--shl)] portrait:max-md:rounded-xl portrait:max-md:py-2.5 portrait:max-md:px-3 portrait:max-md:pr-[66px]';

/* ─── 1. DASHBOARD ─────────────────────────────────── */
export const DashboardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2">
    {/* Clock Panel Skeleton */}
    <div className="min-h-[72px] border border-[var(--border)] rounded-[var(--r)] mb-4 flex items-center justify-between gap-6 bg-card px-5 py-4 shadow-sm portrait:max-md:min-h-[58px] portrait:max-md:px-3.5 portrait:max-md:py-2.5">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-baseline gap-1">
          <Sk className="h-10 w-14 md:h-12 md:w-16" />
          <div className="mx-1 text-blue">:</div>
          <Sk className="h-10 w-14 md:h-12 md:w-16" />
          <div className="hidden md:flex items-baseline gap-1 ml-1.5">
            <div className="text-muted">:</div>
            <Sk className="h-6 w-10" />
          </div>
        </div>
        <div className="hidden sm:block w-px h-10 bg-[var(--border)] mx-2" />
        <div className="hidden sm:flex flex-col gap-1.5">
          <Sk className="h-4 w-32" />
          <Sk className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Sk className="h-3 w-20" />
        <Sk className="h-4 w-28" />
      </div>
    </div>

    {/* Metrics Summary Cards — 4 kartu (Total Laporan, Pelanggaran, Bulan Ini, Total Anggota) */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={SCARD}>
          <span className={SCARD_BAR} />
          <div className={SICO}><Sk className="h-4 w-4 rounded-full" /></div>
          <div className={SCARD_TEXT}>
            <Sk className="h-7 w-12 mb-1.5" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Aduan Summary Cards — 4 kartu (Total, Baru, Diproses, Selesai) */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={SCARD}>
          <span className={SCARD_BAR} />
          <div className={SICO}><Sk className="h-4 w-4 rounded-full" /></div>
          <div className={SCARD_TEXT}>
            <Sk className="h-7 w-12 mb-1.5" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Charts Panels - Row 1 */}
    <div className={CG2}>
      <div className={PANEL}>
        <div className={PHD}>
          <Sk className="h-4 w-32" />
        </div>
        <div className="flex items-end gap-3 h-[300px] p-3.5">
          {[...Array(7)].map((_, i) => (
            <Sk key={i} className="flex-1 rounded-t-lg" style={{ height: `${30 + i * 10}%` }} />
          ))}
        </div>
      </div>
      <div className={PANEL}>
        <div className={PHD}>
          <Sk className="h-4 w-28" />
        </div>
        <div className="flex gap-5 items-center p-3.5">
          <Sk className="h-28 w-28 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            {[...Array(4)].map((_, i) => <Sk key={i} className="h-3 w-full" />)}
          </div>
        </div>
      </div>
    </div>

    {/* Charts Panels - Row 2 */}
    <div className={CG2}>
      <div className={PANEL}>
        <div className={PHD}>
          <Sk className="h-4 w-40" />
        </div>
        <div className="flex items-end gap-3 h-[300px] p-3.5">
          {[...Array(12)].map((_, i) => (
            <Sk key={i} className="flex-1" style={{ height: `${20 + (i % 5) * 15}%` }} />
          ))}
        </div>
      </div>
      <div className={PANEL}>
        <div className={PHD}>
          <Sk className="h-4 w-36" />
        </div>
        <div className="flex gap-5 items-center h-[300px] p-3.5">
          <Sk className="h-32 w-32 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            {[...Array(4)].map((_, i) => <Sk key={i} className="h-3 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── 2. REKAP LAPORAN ─────────────────────────────── */
export const RekapSkeleton: React.FC = () => (
  <div className={FU}>
    <div className={`${PANEL} mb-3`}>
      <div className={PHD}>
        <Sk className="h-4 w-32" />
        <div className={FBAR_RIGHT}><Sk className="h-3 w-8" /></div>
      </div>
      <div className={FBAR}>
        <div className={FSRCH_150}><Sk className="h-9 w-full rounded-md" /></div>
        <div className={FBAR_DATES_ROW}>
          <div className={FBAR_DATES}>
            <div className="flex-1"><Sk className="h-9 w-full rounded-md" /></div>
            <div className="flex-1"><Sk className="h-9 w-full rounded-md" /></div>
          </div>
          <Sk className="h-9 w-10 rounded-md shrink-0" />
        </div>
      </div>
      <div className={RTBL_WRAP}>
        <table className={`${DTBL} table-fixed`}>
          <thead>
            <tr>
              {[5, 10, 10, 15, 20, 15, 10, 5, 10].map((w, i) => (
                <th key={i} className={TH} style={{ width: `${w}%` }}><Sk className="h-3 w-full rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} className={TR_HOVER}>
                {[5, 10, 10, 15, 20, 15, 10, 5, 10].map((_w, j) => (
                  <td key={j} className={TD}><Sk className="h-3 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={MCARD_LIST}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={MCARD_ITEM}>
            <div className={MCARD_ROW}>
              <Sk className="h-4 w-[60%]" />
              <Sk className="h-5 w-16 rounded-full" />
            </div>
            <div className={`${MCARD_META} flex flex-col gap-2 mt-2`}>
              <Sk className="h-3 w-[80%]" />
              <Sk className="h-3 w-[90%]" />
              <Sk className="h-3 w-[50%]" />
            </div>
            <div className={`${MCARD_ACTS} border-t border-[var(--border)] pt-2`}>
              <Sk className="h-6 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className={PGW}>
        <Sk className="h-3 w-32" />
        <div className={PBS}>
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-7 rounded" />)}
        </div>
      </div>
    </div>
  </div>
);

/* ─── 3. DATA SATLINMAS ─────────────────────────────── */
export const SatlinmasSkeleton: React.FC = () => (
  <div className={FU}>
    <div className={FBAR}>
      <div className={FSRCH_180}>
        <Sk className="h-9 w-full rounded-md" />
      </div>
      <div className="flex items-center gap-1.5 flex-[1_1_160px]">
        <Sk className="h-9 flex-1 rounded-md min-w-[100px]" />
        <Sk className="h-9 w-10 rounded-md shrink-0" />
      </div>
      <Sk className="h-9 w-20 rounded-md shrink-0" />
    </div>
    <div className={AG_GRID}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className={AG_CARD}>
          <Sk className="mx-auto h-[38px] w-[38px] shrink-0 rounded-[9px]" />
          <div className="flex flex-1 flex-col items-center gap-2 mt-3">
            <Sk className="h-4 w-[80%] rounded" />
            <Sk className="h-3 w-[60%] rounded" />
            <div className="flex flex-wrap justify-center gap-[5px] mt-2">
              <Sk className="h-5 w-14 rounded-full" />
              <Sk className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="absolute top-3 right-3 flex gap-[5px]">
            <Sk className="h-7 w-7 rounded" />
            <Sk className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── 4. INPUT LAPORAN ─────────────────────────────── */
export const InputSkeleton: React.FC = () => (
  <div className="flex h-full min-h-[320px] w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-card" role="status" aria-live="polite">
    <div className="relative h-11 w-11">
      <div className="h-11 w-11 animate-spin-custom rounded-full border-[3px] border-[var(--border)] border-t-blue" />
      <div className="absolute inset-[9px] animate-spin-reverse rounded-full border-2 border-[var(--border)] border-b-gold" />
    </div>
    <span className="text-xs font-semibold text-mid">Memuat Formulir Laporan...</span>
  </div>
);

/* ─── 5. PETA PEDESTRIAN ────────────────────────────── */
export const PetaSkeleton: React.FC = () => (
  <div className="relative w-full rounded-xl overflow-hidden border border-[var(--border)] bg-card h-[calc(100vh_-_96px)]">
    {/* Toolbar strip */}
    <div className="absolute top-3 left-3 z-10 flex gap-2">
      <Sk className="h-8 w-28 rounded-lg" />
      <Sk className="h-8 w-28 rounded-lg" />
    </div>
    {/* Map area */}
    <Sk className="h-full w-full rounded-none" />
    {/* Right toolbar */}
    <div className="absolute top-14 right-3 z-10 flex flex-col gap-1.5">
      {[...Array(5)].map((_, i) => <Sk key={i} className="h-8 w-8 rounded-lg" />)}
    </div>
  </div>
);

/* ─── 6. ADUAN ──────────────────────────────────────── */
export const AduanSkeleton: React.FC = () => (
  <div className={FU}>
    <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={SCARD}>
          <span className={SCARD_BAR} />
          <div className={SICO_CB}><Sk className="h-5 w-5 rounded-full" /></div>
          <div className={SCARD_TEXT}>
            <Sk className="h-6 w-12 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <div className={`${PANEL} mb-3`}>
      <div className={PHD}>
        <Sk className="h-4 w-40" />
        <Sk className="h-2 w-32 mt-1" />
      </div>
      <div className={FBAR}>
        <div className={FSRCH_180}>
          <Sk className="h-9 w-full rounded-md" />
        </div>
        <Sk className="h-9 flex-[1_1_120px] rounded-md min-w-[120px]" />
        <Sk className="h-9 w-10 rounded-md shrink-0" />
      </div>
      <div className={RTBL_WRAP}>
        <table className={DTBL}>
          <thead>
            <tr>
              {[5, 15, 15, 15, 10, 15, 10, 5, 10].map((w, i) => (
                <th key={i} className={TH_SP} style={{ width: `${w}%` }}><Sk className="h-3 w-full rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} className={TR_HOVER}>
                {[5, 15, 15, 15, 10, 15, 10, 5, 10].map((_w, j) => (
                  <td key={j} className={TD_SP}><Sk className="h-3 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={MCARD_LIST}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={MCARD_ITEM_14}>
            <div className="mb-2 flex justify-between">
              <Sk className="h-4 w-24" />
              <Sk className="h-5 w-16 rounded-full" />
            </div>
            <div className="mb-2.5 flex flex-col gap-1.5">
              <Sk className="h-3 w-32" />
              <Sk className="h-3 w-40" />
              <Sk className="h-3 w-[90%]" />
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2.5">
              <Sk className="h-8 w-8 rounded" />
              <Sk className="h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className={PGW_14}>
        <Sk className="h-3 w-32" />
        <div className={PBS}>
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-7 rounded" />)}
        </div>
      </div>
    </div>
  </div>
);

/* ─── 7. RATING LAYANAN ─────────────────────────────── */
export const SurveiSkeleton: React.FC = () => (
  <div className={FU}>
    {/* Ringkasan — Total Rating · Rata-rata Bintang · Masukan Terisi */}
    <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-card px-4 py-[14px] shadow-[var(--sh)]">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bluelo shadow-[var(--sh-inner)]">
            <Sk className="h-5 w-5 rounded-full" />
          </div>
          <Sk className="h-8 w-14 mb-1.5" />
          <Sk className="h-2.5 w-24" />
        </div>
      ))}
    </div>

    {/* Distribusi Rating — 5 baris bintang */}
    <div className={`${PANEL} mb-3`}>
      <div className={PHD}><Sk className="h-4 w-36" /></div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex w-[104px] shrink-0 flex-col items-end gap-1">
              <Sk className="h-3 w-12" />
              <Sk className="h-2 w-16" />
            </div>
            <Sk className="h-2.5 flex-1 rounded-full" />
            <Sk className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>

    {/* Tabel Rating Masyarakat */}
    <div className={PANEL}>
      <div className={PHD}>
        <Sk className="h-4 w-40" />
        <Sk className="h-3 w-32" />
      </div>
      <div className={RTBL_WRAP}>
        <table className={DTBL}>
          <thead>
            <tr>
              {[5, 12, 14, 14, 12, 43].map((w, i) => (
                <th key={i} className={TH} style={{ width: `${w}%` }}><Sk className="h-3 w-full rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className={TR_HOVER}>
                {[5, 12, 14, 14, 12, 43].map((_w, j) => (
                  <td key={j} className={TD_SP}><Sk className="h-3 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-[7px] border-t border-[var(--border)] p-[14px]">
        <Sk className="h-3 w-40" />
        <div className="flex gap-[3px]">
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-7 rounded-md" />)}
        </div>
      </div>
    </div>
  </div>
);

/* ─── 8. PENGATURAN ─────────────────────────────────── */
export const PengaturanSkeleton: React.FC = () => (
  <div className="flex flex-col gap-0">
    {[...Array(7)].map((_, i) => (
      <div key={i} className={`${PANEL} mb-4`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-1 items-center gap-2">
            <Sk className="h-4 w-4 rounded shrink-0" />
            <Sk className="h-3.5 rounded" style={{ width: `${90 + i * 18}px` }} />
          </div>
          <Sk className="h-4 w-4 rounded shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── 10. CCTV ──────────────────────────────────────── */
export const CctvSkeleton: React.FC = () => (
  <div className="w-full rounded-xl overflow-hidden border border-[var(--border)] bg-card flex items-center justify-center gap-3 h-[calc(100vh_-_96px)]">
    <div className="relative h-11 w-11">
      <div className="h-11 w-11 rounded-full border-[3px] border-[var(--border)] border-t-blue animate-spin-custom"></div>
      <div className="absolute inset-[9px] rounded-full border-2 border-[var(--border)] border-b-gold animate-spin-reverse"></div>
    </div>
    <span className="text-mid text-xs font-semibold">Memuat CCTV Pedestrian...</span>
  </div>
);
