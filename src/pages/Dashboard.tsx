import { ClipboardList, UserX, Calendar, Users, MessageSquare, MailOpen, CheckCircle, BarChart2, PieChart, LineChart, Clock, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { Chart } from 'chart.js/auto';
import { DashboardSkeleton } from '../components/SkeletonPages';
import { apiGet } from '../services/api';
import { KATEGORI_LIST } from '../utils/kategori';
import { currentYearWIB, parseWIB } from '../utils/wib';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

// Firebase configuration
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

interface DashboardData {
  total: number;
  totalP: number;
  hariIni: number;
  hariIniP: number;
  totalAnggota: number;
  perHari: Array<{ hari: string; n: number }>;
  perLokasi: Array<{ lokasi: string; n: number }>;
  allData?: any[];
}

/* ── Class sets — mantan kelas dashboard.css → Tailwind utilities inline ── */
const SCARD = 'group relative flex flex-col gap-1 overflow-hidden rounded-2xl border-[1.5px] border-[var(--border)] bg-card p-3.5 px-4 shadow-[var(--sh)] transition-all duration-[220ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1 hover:shadow-[var(--shl)] portrait:max-md:flex-row portrait:max-md:items-center portrait:max-md:gap-0 portrait:max-md:rounded-[10px] portrait:max-md:p-[7px] portrait:max-md:px-2.5 portrait:max-md:hover:translate-y-0 portrait:max-md:hover:shadow-[var(--sh)] portrait:max-[480px]:px-[9px]!';
const SCARD_BAR = 'pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl opacity-90 transition-[width] duration-200 [transition-timing-function:ease] group-hover:w-[5px] group-hover:opacity-100';
const SCARD_TONE = {
  cb: { bar: 'bg-[linear-gradient(180deg,var(--blue),var(--blue2))]', ico: 'bg-bluelo text-blue' },
  cr: { bar: 'bg-[linear-gradient(180deg,#EF6C4A,#FF8A6A)]', ico: 'bg-[rgba(239,108,74,.12)] text-[#EF6C4A]' },
  cg: { bar: 'bg-[linear-gradient(180deg,#27AE60,#2ecc71)]', ico: 'bg-[rgba(39,174,96,.12)] text-[#27AE60]' },
  ca: { bar: 'bg-[linear-gradient(180deg,#FFD23F,#FFE47A)]', ico: 'bg-[rgba(255,210,63,.15)] text-[#b8870a]' },
  cp: { bar: 'bg-[linear-gradient(180deg,#5DADE2,#85c1e9)]', ico: 'bg-[rgba(93,173,226,.12)] text-[#5DADE2]' },
};
const SICO = 'mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-[.95rem] shadow-[var(--sh-inner)] transition-all duration-[280ms] group-hover:scale-110 group-hover:-rotate-4 portrait:max-md:h-8 portrait:max-md:w-8 portrait:max-md:rounded-lg portrait:max-md:text-[.78rem] portrait:max-md:mb-0 portrait:max-md:mr-2 portrait:max-md:shrink-0 portrait:max-[480px]:h-7! portrait:max-[480px]:w-7! portrait:max-[480px]:text-[.7rem]! portrait:max-[480px]:mr-[7px]!';
const SCARD_TEXT = 'flex flex-col gap-0.5 portrait:max-md:min-w-0 portrait:max-md:flex-1 portrait:max-md:gap-px portrait:max-md:overflow-hidden';
const SNUM = 'mb-[3px] font-mono text-[1.85rem] font-black leading-[.85] tracking-[-.03em] portrait:max-md:text-[1.1rem] portrait:max-md:leading-[1.1] portrait:max-md:truncate portrait:max-[480px]:text-[1rem]!';
const SLBL = 'mb-0.5 text-[.63rem] font-bold uppercase tracking-[.1em] text-muted portrait:max-md:text-[.54rem] portrait:max-md:truncate portrait:max-[480px]:text-[.52rem]!';
const PANEL = 'max-w-full overflow-hidden rounded-2xl border-[1.5px] border-[var(--border)] bg-card shadow-[var(--sh)] transition-all hover:shadow-[var(--shl)] min-[769px]:overflow-x-auto max-md:landscape:overflow-x-auto';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-[var(--border)] bg-gradient-to-br from-[rgba(27,59,111,.06)] to-transparent px-4 py-3';
const PTL = 'flex items-center gap-2 font-display text-[.82rem] font-extrabold tracking-[-.01em] text-text';
const CG2 = 'mb-3 grid grid-cols-[3fr_2fr] gap-3 max-[980px]:grid-cols-1';
const KATEGORI_COLORS: Record<string, string> = {
  pedestrian: '#1e6fd9',
  poskamling: '#b8870a',
  posyandu: '#e6538c',
  kebencanaan: '#e45b42',
  yanmas: '#168a68',
  lainnya: '#7c3aed',
};

export const Dashboard: React.FC = () => {
  const { cacheGet, cacheRefresh, refreshTrigger } = useApp();
  const { session } = useAuth();
  const { isDarkMode } = useTheme();

  const [data, setData] = useState<DashboardData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [sampahCount, setSampahCount] = useState<number | null>(null);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const twChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<any>(null);
  const twChartInstance = useRef<any>(null);

  // New refs for line and category charts
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const aduanCategoryChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstance = useRef<any>(null);
  const aduanCategoryChartInstance = useRef<any>(null);

  // New state for aduan
  const [aduanList, setAduanList] = useState<any[]>([]);
  const [aduanStats, setAduanStats] = useState({ total: 0, baru: 0, diproses: 0, selesai: 0 });

  // Daftar anggota (sumber sama dengan halaman Data Satlinmas)
  const [satlinmasList, setSatlinmasList] = useState<any[] | null>(null);

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      const cached = cacheGet('dashboard');
      if (cached) {
        setData(cached.data || cached);
        cacheRefresh('dashboard').then(() => {
          const fresh = cacheGet('dashboard');
          if (fresh) setData(fresh.data || fresh);
        });
        return;
      }

      try {
        await cacheRefresh('dashboard', true);
        const fresh = cacheGet('dashboard');
        if (fresh) {
          setData(fresh.data || fresh);
        } else {
          setData({ total: 0, totalP: 0, hariIni: 0, hariIniP: 0, totalAnggota: 0, perHari: [], perLokasi: [], allData: [] });
        }
      } catch (e) {
        console.error('Error fetching dashboard:', e);
        setData({ total: 0, totalP: 0, hariIni: 0, hariIniP: 0, totalAnggota: 0, perHari: [], perLokasi: [], allData: [] });
      }
    };

    fetchData();
  }, [cacheGet, cacheRefresh, refreshTrigger]);

  useEffect(() => {
    let cancelled = false;
    apiGet('getSampah').then((res) => {
      if (!cancelled && res.success && Array.isArray(res.data)) {
        setSampahCount(res.data.length);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Listen to Firestore real-time updates for complaints
  useEffect(() => {
    if (!db) return;

    const colRef = collection(db, 'aduan');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: any[] = [];
        let total = 0, baru = 0, diproses = 0, selesai = 0;
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const item = {
            id: docSnap.id,
            timestamp: d.timestamp || '',
            timestampISO: d.timestampISO || '',
            sortKey: d.sortKey || '',
            status: d.status || 'Baru',
            kategori: d.kategori || 'Lainnya',
          };
          list.push(item);

          total++;
          if (item.status === 'Baru') baru++;
          else if (item.status === 'Diproses') diproses++;
          else if (item.status === 'Selesai') selesai++;
        });

        setAduanList(list);
        setAduanStats({ total, baru, diproses, selesai });
      },
      (error) => {
        console.error('Error fetching aduan for dashboard:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Muat daftar anggota (cache yang sama dipakai halaman Data Satlinmas)
  useEffect(() => {
    let cancelled = false;

    const readCache = () => {
      const cached = cacheGet('satlinmas');
      const list = cached?.data || cached;
      if (!cancelled && Array.isArray(list)) setSatlinmasList(list);
    };

    readCache();
    cacheRefresh('satlinmas')
      .then(readCache)
      .catch((e) => console.error('Error fetching satlinmas for dashboard:', e));

    return () => { cancelled = true; };
  }, [cacheGet, cacheRefresh, refreshTrigger]);

  // Render/Re-render charts
  useEffect(() => {
    if (!data) return;

    // 1. Calculate Laporan per Hari (Last 7 Days) from allData
    const BLN: Record<string, number> = {
      januari: 1, februari: 2, maret: 3, maret_old: 3, april: 4, mei: 5, juni: 6,
      juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
    };
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

    const laporanPerHariMap: Record<string, number> = {};
    const allLaporan = data.allData || [];

    allLaporan.forEach((r: any) => {
      const b = String(r.tanggal || '').replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
      const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
      if (m && BLN[m[2]]) {
         const y = parseInt(m[3], 10);
         const mo = BLN[m[2]] - 1;
         const d = parseInt(m[1], 10);
         const dateKey = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
         laporanPerHariMap[dateKey] = (laporanPerHariMap[dateKey] || 0) + 1;
      }
    });

    const hl: string[] = [];
    const hd: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayLabel = `${d.getDate()} ${months[d.getMonth()]}`;
      hl.push(dayLabel);
      hd.push(laporanPerHariMap[dateKey] || 0);
    }

    // 1. Bar Chart (Laporan per Hari)
    if (barChartRef.current) {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
      }

      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: hl,
          datasets: [
            {
              label: 'Laporan',
              data: hd,
              backgroundColor: isDarkMode ? 'rgba(59,130,246,.30)' : 'rgba(27,59,111,.18)',
              borderColor: isDarkMode ? '#3b82f6' : '#1b3b6f',
              borderWidth: 2.5,
              borderRadius: 7,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      });
    }

    // 2. Triwulan Doughnut Chart
    if (twChartRef.current) {
      if (twChartInstance.current) {
        twChartInstance.current.destroy();
      }

      const tw = calculateTriwulan(data.allData || []);

      twChartInstance.current = new Chart(twChartRef.current, {
        type: 'doughnut',
        data: {
          labels: tw.labels,
          datasets: [
            {
              data: tw.counts,
              backgroundColor: [
                isDarkMode ? 'rgba(59,130,246,.85)' : 'rgba(27,59,111,.85)',
                'rgba(255,210,63,.85)',
                'rgba(239,108,74,.85)',
                'rgba(93,173,226,.85)',
              ],
              borderColor: [isDarkMode ? '#3b82f6' : '#1b3b6f', '#E6B800', '#EF6C4A', '#5DADE2'],
              borderWidth: 2,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.parsed} laporan`,
              },
            },
          },
        },
      });
    }

    // Calculate monthly trend data for Laporan & Aduan
    const laporanCounts = Array(12).fill(0);
    const aduanCounts = Array(12).fill(0);
    const currentYear = currentYearWIB();


    // Parse Laporan
    allLaporan.forEach((r: any) => {
      const b = String(r.tanggal || '').replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
      const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
      if (m && BLN[m[2]]) {
        const mo = BLN[m[2]] - 1; // 0-indexed
        const y = parseInt(m[3], 10);
        if (y === currentYear) {
          laporanCounts[mo]++;
        }
      }
    });

    // Parse Aduan — `timestamp` berformat "DD/MM/YYYY HH:MM:SS" (WIB) sehingga
    // `new Date(raw)` tidak valid; gunakan util WIB yang sama dengan portal.
    aduanList.forEach((a: any) => {
      const dt = parseWIB(a.timestampISO || a.timestamp);
      if (dt && dt.getFullYear() === currentYear) {
        aduanCounts[dt.getMonth()]++;
      }
    });

    // 3. Line Chart (Tren Bulanan Laporan vs Aduan)
    if (lineChartRef.current) {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
      }

      const ctx = lineChartRef.current.getContext('2d');
      let gradLap: string | CanvasGradient = isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(27,59,111,0.1)';
      let gradAdu: string | CanvasGradient = 'rgba(239,108,74,0.1)';
      if (ctx) {
        const gl = ctx.createLinearGradient(0, 0, 0, 300);
        gl.addColorStop(0, isDarkMode ? 'rgba(59,130,246,0.4)' : 'rgba(27,59,111,0.4)');
        gl.addColorStop(1, isDarkMode ? 'rgba(59,130,246,0.01)' : 'rgba(27,59,111,0.01)');
        gradLap = gl;

        const ga = ctx.createLinearGradient(0, 0, 0, 300);
        ga.addColorStop(0, 'rgba(239,108,74,0.4)');
        ga.addColorStop(1, 'rgba(239,108,74,0.01)');
        gradAdu = ga;
      }

      lineChartInstance.current = new Chart(lineChartRef.current, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Laporan Satgas',
              data: laporanCounts,
              borderColor: isDarkMode ? '#3b82f6' : '#1b3b6f',
              backgroundColor: gradLap,
              tension: 0.45,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#fff',
              pointBorderColor: isDarkMode ? '#3b82f6' : '#1b3b6f',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Aduan Masyarakat',
              data: aduanCounts,
              borderColor: '#EF6C4A',
              backgroundColor: gradAdu,
              tension: 0.45,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#EF6C4A',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 10 }
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // Aduan by Category
    const catMap: Record<string, number> = {};
    aduanList.forEach((a: any) => {
      const cat = a.kategori || 'Lainnya';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);

    // 4. Kategori Aduan Doughnut Chart
    if (aduanCategoryChartRef.current) {
      if (aduanCategoryChartInstance.current) {
        aduanCategoryChartInstance.current.destroy();
      }

      aduanCategoryChartInstance.current = new Chart(aduanCategoryChartRef.current, {
        type: 'doughnut',
        data: {
          labels: catLabels.length ? catLabels : ['Belum ada data'],
          datasets: [
            {
              data: catData.length ? catData : [1],
              backgroundColor: [
                isDarkMode ? 'rgba(59,130,246,.85)' : 'rgba(27,59,111,.85)',
                'rgba(239,108,74,.85)',
                'rgba(255,210,63,.85)',
                'rgba(39,174,96,.85)',
                'rgba(93,173,226,.85)',
                isDarkMode ? 'rgba(96,165,250,.85)' : 'rgba(59,130,246,.85)',
              ],
              borderColor: [isDarkMode ? '#3b82f6' : '#1b3b6f', '#EF6C4A', '#E6B800', '#27AE60', '#5DADE2', isDarkMode ? '#3b82f6' : '#1b3b6f'],
              borderWidth: 2,
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                boxWidth: 8,
                font: { size: 9 },
                padding: 8
              }
            }
          }
        }
      });
    }

    return () => {
      if (barChartInstance.current) barChartInstance.current.destroy();
      if (twChartInstance.current) twChartInstance.current.destroy();
      if (lineChartInstance.current) lineChartInstance.current.destroy();
      if (aduanCategoryChartInstance.current) aduanCategoryChartInstance.current.destroy();
    };
  }, [data, aduanList, isDarkMode]);

  // Calculate triwulan counts
  const calculateTriwulan = (allData: any[]) => {
    const labels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Okt–Des'];
    const counts = [0, 0, 0, 0];
    const BLN: Record<string, number> = {
      januari: 1, februari: 2, maret: 3, maret_old: 3, april: 4, mei: 5, juni: 6,
      juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
    };

    const targetData = allData.length ? allData : [];

    targetData.forEach((r) => {
      const b = String(r.tanggal || '').replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
      const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
      if (m && BLN[m[2]]) {
        const mo = BLN[m[2]];
        const qi = Math.floor((mo - 1) / 3);
        if (qi >= 0 && qi <= 3) {
          counts[qi]++;
        }
      }
    });

    return { labels, counts };
  };

  if (!data) {
    return <DashboardSkeleton />;
  }

  // Digital clock calculations
  const pad = (n: number) => String(n).padStart(2, '0');
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const clockHours = pad(currentTime.getHours());
  const clockMinutes = pad(currentTime.getMinutes());
  const clockSeconds = pad(currentTime.getSeconds());
  const clockDay = dayNames[currentTime.getDay()];
  const clockDate = `${currentTime.getDate()} ${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`;

  // Calculate reports for current month
  let bulanIni = 0;
  if (data && data.allData) {
    const currentMonthIndex = new Date().getMonth() + 1; // 1-indexed (1 to 12)
    const currentYearNum = new Date().getFullYear();

    const BLN: Record<string, number> = {
      januari: 1, februari: 2, maret: 3, maret_old: 3, april: 4, mei: 5, juni: 6,
      juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
    };

    data.allData.forEach((r: any) => {
      const b = String(r.tanggal || '').replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
      const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
      if (m && BLN[m[2]]) {
        const mo = BLN[m[2]]; // 1 to 12
        const y = parseInt(m[3], 10);
        if (y === currentYearNum && mo === currentMonthIndex) {
          bulanIni++;
        }
      }
    });
  }

  /**
   * Total anggota memakai sumber yang SAMA dengan halaman Data Satlinmas
   * (cache `satlinmas`), supaya angkanya selalu cocok dengan daftar anggota
   * yang terlihat di halaman tersebut. `data.totalAnggota` hanya cadangan.
   *
   * Perhitungan biasa (bukan hook) agar aman dipanggil setelah `if (!data)`
   * di bawah — memakai hook setelah early return melanggar aturan Hook React.
   */
  const satlinmasTerisi = Array.isArray(satlinmasList)
    ? satlinmasList.filter((m: any) => String(m?.nama || '').trim() !== '').length
    : 0;
  const totalAnggota = satlinmasTerisi > 0 ? satlinmasTerisi : data?.totalAnggota || 0;

  const twData = calculateTriwulan(data.allData || []);
  const reportData = data.allData || [];
  const totalLaporan = reportData.length || data.total || 0;
  const totalPelanggaran = reportData.length
    ? reportData.filter((report: any) => {
        const identitas = String(report.identitas || '').trim();
        return identitas !== '' && identitas.toUpperCase() !== 'NIHIL';
      }).length
    : data.totalP || 0;
  const kategoriCounts: Record<string, number> = Object.fromEntries(
    KATEGORI_LIST.map(({ slug }) => [slug, 0])
  );
  reportData.forEach((report: any) => {
    const rawKategori = String(report.kategori || 'pedestrian').trim().toLowerCase();
    const kategori = Object.prototype.hasOwnProperty.call(kategoriCounts, rawKategori)
      ? rawKategori
      : 'lainnya';
    kategoriCounts[kategori]++;
  });
  const totalKategoriLaporan = Object.values(kategoriCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Realtime Digital Clock Panel */}
      <div className="relative flex min-h-[72px] w-full items-center justify-between gap-6 overflow-hidden rounded-[var(--r)] border border-[var(--border)] bg-card px-5 py-4 mb-4 shadow-sm portrait:max-md:min-h-[58px] portrait:max-md:px-3.5 portrait:max-md:py-2.5">
        {/* Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline font-mono font-extrabold tracking-tight text-4xl md:text-5xl leading-none text-text portrait:max-md:text-[1.8rem]">
            <span>{clockHours}</span>
            <span className="mx-1 text-blue animate-pulse">:</span>
            <span>{clockMinutes}</span>
            <span className="ml-1.5 text-2xl md:text-3xl font-normal text-muted">:<span>{clockSeconds}</span></span>
          </div>
          <div className="hidden h-10 w-px bg-[var(--border)] sm:block" />
          <div className="hidden flex-col justify-center gap-1 sm:flex">
            <div className="font-display font-bold leading-none tracking-tight text-sm md:text-base text-text">{clockDate}</div>
            <div className="text-xs font-black uppercase leading-none tracking-widest text-blue">{clockDay}</div>
          </div>
        </div>
        {/* Greeting — tampil di semua ukuran layar */}
        {session && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-muted">
              {(() => {
                const h = currentTime.getHours();
                if (h < 11) return 'Selamat pagi,';
                if (h < 15) return 'Selamat siang,';
                if (h < 18) return 'Selamat sore,';
                return 'Selamat malam,';
              })()}
            </span>
            <span className="text-sm font-bold tracking-tight text-text">{session.namaLengkap || session.username}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Cards — 5 kartu (Total Laporan, Sampah, Pelanggaran, Bulan Ini, Total Anggota) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* Total Laporan */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cb.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cb.ico}`}><ClipboardList className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalLaporan}</div><div className={SLBL}>Total Laporan</div></div>
        </div>

        {/* Laporan di Sampah */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.ca.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.ca.ico}`}><Trash2 className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{sampahCount ?? '—'}</div><div className={SLBL}>Laporan di Sampah</div></div>
        </div>

        {/* Pelanggaran */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cr.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cr.ico}`}><UserX className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalPelanggaran}</div><div className={SLBL}>Pelanggaran</div></div>
        </div>

        {/* Bulan Ini */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cg.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cg.ico}`}><Calendar className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{bulanIni}</div><div className={SLBL}>Bulan Ini</div></div>
        </div>

        {/* Total Anggota */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cp.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cp.ico}`}><Users className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalAnggota}</div><div className={SLBL}>Total Anggota</div></div>
        </div>
      </div>

      {/* Laporan by category */}
      <div className={`${PANEL} mb-4`}>
        <div className={PHD}>
          <span className={PTL}>
            <ClipboardList className="w-4 h-4 inline-block align-middle text-blue" /> Laporan per Kategori
          </span>
          <span className="font-mono text-[.62rem] font-semibold text-muted">{totalKategoriLaporan} laporan</span>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 sm:grid-cols-3 xl:grid-cols-6">
          {KATEGORI_LIST.map((kategori) => {
            const count = kategoriCounts[kategori.slug] || 0;
            const percentage = totalKategoriLaporan ? (count / totalKategoriLaporan) * 100 : 0;
            return (
              <div key={kategori.slug} className="min-w-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[.68rem] font-semibold text-mid">{kategori.label}</span>
                  <span className="shrink-0 font-mono text-[.72rem] font-bold text-text">{count}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Laporan ${kategori.label}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percentage)}
                  className="h-1.5 overflow-hidden rounded-full bg-bg"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: KATEGORI_COLORS[kategori.slug] || '#64748b' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aduan Summary Cards — 4 kartu (Total, Baru, Diproses, Selesai) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Total Aduan */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cb.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cb.ico}`}><MessageSquare className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{aduanStats.total || 0}</div><div className={SLBL}>Total Aduan</div></div>
        </div>

        {/* Aduan Baru */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.ca.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.ca.ico}`}><MailOpen className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{aduanStats.baru || 0}</div><div className={SLBL}>Aduan Baru</div></div>
        </div>

        {/* Sedang Diproses */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cp.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cp.ico}`}><Clock className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{aduanStats.diproses || 0}</div><div className={SLBL}>Sedang Diproses</div></div>
        </div>

        {/* Selesai Ditindaklanjuti */}
        <div className={SCARD}>
          <span className={`${SCARD_BAR} ${SCARD_TONE.cg.bar}`} />
          <div className={`${SICO} ${SCARD_TONE.cg.ico}`}><CheckCircle className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{aduanStats.selesai || 0}</div><div className={SLBL}>Selesai</div></div>
        </div>
      </div>

      {/* Charts Panels */}
      <div className={CG2}>
        {/* Laporan per Hari Panel */}
        <div className={PANEL}>
          <div className={PHD}>
            <span className={PTL}>
              <BarChart2 className="w-4 h-4 inline-block align-middle" /> Laporan per Hari
            </span>
          </div>
          <div className="p-3.5">
            <div className="relative h-[210px]">
              <canvas ref={barChartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Doughnut Chart (Tren Triwulan) */}
        <div className={PANEL}>
          <div className={PHD}>
            <span className={PTL}>
              <PieChart className="mr-1.5 w-4 h-4 inline-block align-middle text-purple" /> Tren Triwulan
            </span>
            <span id="tw-year-lbl" className="font-mono text-[.58rem] text-muted">
              Tahun {new Date().getFullYear()}
            </span>
          </div>
          <div className="p-3.5 pb-2.5">
            <div className="relative h-[160px]">
              <canvas ref={twChartRef}></canvas>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 px-0.5" id="tw-legend">
              <div className="flex items-center gap-1 text-[.59rem] font-semibold text-mid">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: isDarkMode ? '#3b82f6' : '#1b3b6f' }}></div>
                <span>Q1 Jan–Mar: <strong>{twData.counts[0]}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-[.59rem] font-semibold text-mid">
                <div className="h-2 w-2 shrink-0 rounded-full bg-[#FFD23F]"></div>
                <span>Q2 Apr–Jun: <strong>{twData.counts[1]}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-[.59rem] font-semibold text-mid">
                <div className="h-2 w-2 shrink-0 rounded-full bg-[#EF6C4A]"></div>
                <span>Q3 Jul–Sep: <strong>{twData.counts[2]}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-[.59rem] font-semibold text-mid">
                <div className="h-2 w-2 shrink-0 rounded-full bg-[#5DADE2]"></div>
                <span>Q4 Okt–Des: <strong>{twData.counts[3]}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Panels */}
      <div className={CG2}>
        {/* Tren Bulanan Line Chart */}
        <div className={PANEL}>
          <div className={PHD}>
            <span className={PTL}>
              <LineChart className="mr-1.5 w-4 h-4 inline-block align-middle text-blue" /> Tren Bulanan Laporan vs Aduan
            </span>
          </div>
          <div className="p-3.5">
            <div className="relative h-[210px]">
              <canvas ref={lineChartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Kategori Aduan Doughnut Chart */}
        <div className={PANEL}>
          <div className={PHD}>
            <span className={PTL}>
              <MessageSquare className="mr-1.5 w-4 h-4 inline-block align-middle text-purple" /> Kategori Aduan
            </span>
          </div>
          <div className="p-3.5">
            <div className="relative h-[210px]">
              <canvas ref={aduanCategoryChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
