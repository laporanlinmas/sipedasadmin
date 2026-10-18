import { Star, MessageSquare, Calendar, Briefcase, Inbox, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { useApp } from '../App';
import { esc } from '../utils/helpers';
import { SurveiSkeleton } from '../components/SkeletonPages';

/* ── Design system ── */
const PANEL = 'mb-3 max-w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[var(--sh)]';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3';
const PTL = 'flex items-center gap-2 font-display text-[.82rem] font-extrabold tracking-[-.01em] text-text';
const TD = 'border-b border-[var(--border)] px-3 py-[11px] align-middle';
const TH = 'whitespace-nowrap border-b-2 border-[var(--border)] px-3 py-2.5 text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TR_HOVER = 'hover:[&>td]:bg-[rgba(30,111,217,.035)]';
const EMPTY = 'px-[18px] py-10 text-center text-muted';
const PBN = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-card text-[.66rem] font-bold text-muted transition-all duration-[130ms] hover:border-blue hover:bg-bluelo hover:text-blue disabled:pointer-events-none disabled:opacity-[.22]';
const PBN_ON = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-blue bg-blue text-[.66rem] font-bold text-white';
const MCARD = 'mb-3 w-full rounded-[var(--r)] border border-[var(--border)] bg-card p-[14px] shadow-[var(--sh)]';
const PGW = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-[var(--border)] p-[14px] text-[.67rem] text-muted';

const LABEL = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat Baik'];

/**
 * Bentuk dokumen pada koleksi `survey_kepuasan` — identik dengan yang ditulis
 * portal Sapa Pedestrian (`/api/submit-survey`):
 * nama, pekerjaan, rating (1–5), saran, timestamp, createdAt.
 */
interface SurveyResponse {
  id: string;
  nama: string;
  pekerjaan: string;
  rating?: number;
  saran: string;
  createdAt: string;
}

/** Nilai 1–5 dari satu dokumen; 0 bila belum ada penilaian valid. */
function scoreOf(d: SurveyResponse): number {
  const r = Number(d.rating);
  return Number.isFinite(r) && r >= 1 && r <= 5 ? Math.round(r) : 0;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= value ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[var(--border)]'}
        />
      ))}
    </span>
  );
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const isFirebaseConfigured = !!process.env.FIREBASE_PROJECT_ID;
const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;
const db = app ? getFirestore(app) : null;

export const Survei: React.FC = () => {
  const { triggerToast } = useApp();
  const [list, setList] = useState<SurveyResponse[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!db) { setIsFetching(false); return; }

    const unsub = onSnapshot(
      collection(db, 'survey_kepuasan'),
      (snapshot) => {
        const rows: SurveyResponse[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nama: data.nama || '',
            pekerjaan: data.pekerjaan || '',
            rating: Number(data.rating) || undefined,
            saran: data.saran || '',
            createdAt: data.createdAt || '',
          };
        });
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setList(rows);
        setIsFetching(false);
      },
      (error) => {
        console.error('Error onSnapshot survey_kepuasan:', error);
        triggerToast('Gagal memuat data rating.', 'er');
        setIsFetching(false);
      },
    );
    return () => unsub();
  }, [triggerToast]);

  const total = list.length;
  const scored = useMemo(() => list.map((r) => ({ r, s: scoreOf(r) })).filter((x) => x.s > 0), [list]);
  const average = useMemo(
    () => (scored.length ? scored.reduce((a, b) => a + b.s, 0) / scored.length : 0),
    [scored],
  );
  const totalMasukan = useMemo(() => list.filter((r) => (r.saran || '').trim() !== '').length, [list]);

  const distribution = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: scored.filter((x) => x.s === star).length,
    }));
    return buckets;
  }, [scored]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, total);
  const currentItems = list.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [total]);

  const formatTanggal = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
    } catch {
      return iso;
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const btns: React.ReactNode[] = [];
    btns.push(
      <button key="first" className={PBN} disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} aria-label="Halaman pertama" title="Halaman pertama">
        <ChevronsLeft className="h-4 w-4" />
      </button>,
    );
    btns.push(
      <button key="prev" className={PBN} disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>,
    );
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
      btns.push(
        <button key={p} className={p === currentPage ? PBN_ON : PBN} onClick={() => setCurrentPage(p)}>{p}</button>,
      );
    }
    btns.push(
      <button key="next" className={PBN} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
        <ChevronRight className="h-4 w-4" />
      </button>,
    );
    btns.push(
      <button key="last" className={PBN} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Halaman terakhir" title="Halaman terakhir">
        <ChevronsRight className="h-4 w-4" />
      </button>,
    );
    return <div className="flex gap-[3px]">{btns}</div>;
  };

  if (isFetching && total === 0) return <SurveiSkeleton />;

  return (
    <div className="flex flex-col">
      {/* ── Ringkasan ── */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-card px-4 py-[14px] shadow-[var(--sh)]">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bluelo text-blue shadow-[var(--sh-inner)]">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="font-mono text-[1.85rem] font-black leading-[.85] tracking-[-.03em]">{total}</div>
          <div className="mt-0.5 text-[.63rem] font-bold uppercase tracking-[.1em] text-muted">Total Rating</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-card px-4 py-[14px] shadow-[var(--sh)]">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(245,158,11,.15)] text-[#b8870a] shadow-[var(--sh-inner)]">
            <Star className="h-5 w-5 fill-[#f59e0b] text-[#f59e0b]" />
          </div>
          <div className="font-mono text-[1.85rem] font-black leading-[.85] tracking-[-.03em]">
            {average ? average.toFixed(1) : '—'}
          </div>
          <div className="mt-0.5 text-[.63rem] font-bold uppercase tracking-[.1em] text-muted">Rata-rata Bintang</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-card px-4 py-[14px] shadow-[var(--sh)] lg:col-span-1">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(16,185,129,.14)] text-[#10b981] shadow-[var(--sh-inner)]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="font-mono text-[1.85rem] font-black leading-[.85] tracking-[-.03em]">{totalMasukan}</div>
          <div className="mt-0.5 text-[.63rem] font-bold uppercase tracking-[.1em] text-muted">Masukan Terisi</div>
        </div>
      </div>

      {/* ── Distribusi ── */}
      <div className={PANEL}>
        <div className={PHD}>
          <span className={PTL}><Star className="h-4 w-4 inline-block align-middle" /> Distribusi Rating</span>
        </div>
        <div className="space-y-2.5 px-4 py-4">
          {distribution.map(({ star, count }) => {
            const pct = scored.length ? Math.round((count / scored.length) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="flex w-[104px] shrink-0 flex-col items-end gap-px">
                  <span className="flex items-center gap-1 text-[.7rem] font-bold text-text">
                    {star} <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                  </span>
                  <span className="text-[.58rem] font-semibold uppercase tracking-[.06em] text-muted">{LABEL[star]}</span>
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-[#f59e0b] transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[.68rem] font-bold text-mid">{count} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className={PANEL}>
        <div className={PHD}>
          <span className={PTL}><Star className="h-4 w-4 inline-block align-middle" /> Rating Masyarakat</span>
          <span className="text-[.64rem] text-muted">Real-time dari portal Sapa Pedestrian</span>
        </div>

        {/* Desktop */}
        <div className="mb-3 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] portrait:max-md:hidden">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[.73rem]">
            <thead>
              <tr>
                <th className={`${TH} w-[40px] text-left`}>No</th>
                <th className={`${TH} w-[130px] text-left`}>Tanggal</th>
                <th className={`${TH} w-[130px] text-left`}>Nama</th>
                <th className={`${TH} w-[130px] text-left`}>Pekerjaan</th>
                <th className={`${TH} w-[120px] text-center`}>Rating</th>
                <th className={TH}>Masukan</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr className={TR_HOVER}>
                  <td className={TD} colSpan={6}>
                    <div className={EMPTY}>
                      <Inbox className="mx-auto mb-2 block h-8 w-8 opacity-[.17]" />
                      <p className="text-[.74rem]">Belum ada rating masuk.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r, i) => {
                  const score = scoreOf(r);
                  return (
                    <tr key={r.id} className={TR_HOVER}>
                      <td className={`${TD} text-center`}>{startIndex + i + 1}</td>
                      <td className={`${TD} whitespace-nowrap text-[.72rem]`}>{formatTanggal(r.createdAt)}</td>
                      <td className={TD}><strong>{esc(r.nama || '—')}</strong></td>
                      <td className={TD}>{esc(r.pekerjaan || '—')}</td>
                      <td className={`${TD} text-center`}>
                        {score ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <Stars value={score} />
                            <span className="text-[.62rem] font-bold text-mid">{LABEL[score]}</span>
                          </span>
                        ) : (
                          <span className="text-[.7rem] text-muted">—</span>
                        )}
                      </td>
                      <td className={`${TD} max-w-[320px] text-[.74rem]`}>
                        {r.saran ? esc(r.saran) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="hidden w-full min-w-0 overflow-x-hidden portrait:max-md:block">
          {currentItems.length === 0 ? (
            <div className={EMPTY}>
              <Inbox className="mx-auto mb-2 block h-8 w-8 opacity-[.17]" />
              <p className="text-[.74rem]">Belum ada rating masuk.</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const score = scoreOf(r);
              return (
                <div key={r.id} className={MCARD}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[.76rem] font-bold text-text">{esc(r.nama || 'Anonim')}</span>
                    {score ? <Stars value={score} size={13} /> : <span className="text-[.68rem] text-muted">—</span>}
                  </div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[.68rem] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatTanggal(r.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {esc(r.pekerjaan || '—')}
                    </span>
                  </div>
                  {r.saran && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-bg px-2.5 py-1.5 text-[.72rem] text-mid">
                      <MessageSquare className="mt-[2px] h-3 w-3 shrink-0 text-blue" />
                      <span className="min-w-0 break-words">{esc(r.saran)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={`${PGW} print:hidden`}>
          <span>{total === 0 ? 'Tidak ada data' : `Menampilkan ${startIndex + 1}–${endIndex} dari ${total} rating`}</span>
          {renderPagination()}
        </div>
      </div>
    </div>
  );
};

export default Survei;