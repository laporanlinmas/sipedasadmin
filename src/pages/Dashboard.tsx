import { ClipboardList, UserX, Calendar, AlertTriangle, Users, MessageSquare, MailOpen, Loader2, CheckCircle, Percent, BarChart2, PieChart, LineChart, Clock } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { Chart } from 'chart.js/auto';
import { DashboardSkeleton } from '../components/SkeletonPages';

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

export const Dashboard: React.FC = () => {
  const { cacheGet, cacheSet, cacheRefresh, refreshTrigger, showLoad, hideLoad } = useApp();
  const { session } = useAuth();
  const { isDarkMode } = useTheme();

  const [data, setData] = useState<DashboardData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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
  const [aduanStats, setAduanStats] = useState({ total: 0, baru: 0, diproses: 0, selesai: 0, pct: 0 });

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
            status: d.status || 'Baru',
            kategori: d.kategori || 'Lainnya',
          };
          list.push(item);

          total++;
          if (item.status === 'Baru') baru++;
          else if (item.status === 'Diproses') diproses++;
          else if (item.status === 'Selesai') selesai++;
        });

        const pct = total > 0 ? Math.round((selesai / total) * 100) : 0;
        setAduanList(list);
        setAduanStats({ total, baru, diproses, selesai, pct });
      },
      (error) => {
        console.error('Error fetching aduan for dashboard:', error);
      }
    );

    return () => unsubscribe();
  }, []);

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
    const currentYear = new Date().getFullYear();


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

    // Parse Aduan
    aduanList.forEach((a: any) => {
      if (a.timestamp) {
        const dt = new Date(a.timestamp);
        if (!isNaN(dt.getTime()) && dt.getFullYear() === currentYear) {
          aduanCounts[dt.getMonth()]++;
        }
      }
    });

    // 3. Line Chart (Tren Bulanan Laporan vs Aduan)
    if (lineChartRef.current) {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
      }

      const ctx = lineChartRef.current.getContext('2d');
      let gradLap = isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(27,59,111,0.1)';
      let gradAdu = 'rgba(239,108,74,0.1)';
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
  let bulanIniP = 0;
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
          const identitas = r.identitas || '';
          const isp = identitas.trim() !== '' && identitas.toUpperCase() !== 'NIHIL';
          if (isp) {
            bulanIniP++;
          }
        }
      }
    });
  }

  const twData = calculateTriwulan(data.allData || []);

  return (
    <div className="flex flex-col gap-2">
      {/* Realtime Digital Clock Panel */}
      <div className="dash-clock-panel relative overflow-hidden w-full bg-[var(--card)] border border-[var(--border)] rounded-[var(--r)] mb-4 flex items-center justify-between gap-6 shadow-sm" style={{ minHeight: '72px', padding: '16px 20px' }}>
        {/* Time */}
        <div className="flex items-center gap-4">
          <div className="dash-clock-time flex items-baseline font-mono font-extrabold tracking-tight text-4xl md:text-5xl leading-none text-[var(--text)]">
            <span>{clockHours}</span>
            <span className="text-[var(--blue)] animate-pulse mx-1">:</span>
            <span>{clockMinutes}</span>
            <span className="text-2xl md:text-3xl text-[var(--muted)] ml-1.5 font-normal">:<span>{clockSeconds}</span></span>
          </div>
          <div className="hidden sm:block w-px h-10 bg-[var(--border)]" />
          <div className="hidden sm:flex flex-col justify-center gap-1">
            <div className="text-[var(--text)] font-bold text-sm md:text-base font-display tracking-tight leading-none">{clockDate}</div>
            <div className="text-[var(--blue)] text-xs font-black uppercase tracking-widest leading-none">{clockDay}</div>
          </div>
        </div>
        {/* Greeting — tampil di semua ukuran layar */}
        {session && (
          <div className="dash-greeting-mobile flex flex-col items-end gap-1">
            <span className="text-xs text-[var(--muted)] font-medium">
              {(() => {
                const h = currentTime.getHours();
                if (h < 11) return 'Selamat pagi,';
                if (h < 15) return 'Selamat siang,';
                if (h < 18) return 'Selamat sore,';
                return 'Selamat malam,';
              })()}
            </span>
            <span className="text-sm font-bold text-[var(--text)] tracking-tight">{session.namaLengkap || session.username}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* Total Laporan */}
        <div className="scard cb">
          <div className="sico"><ClipboardList className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{data.total || 0}</div><div className="slbl">Total Laporan</div></div>
        </div>

        {/* Pelanggaran */}
        <div className="scard cr">
          <div className="sico"><UserX className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{data.totalP || 0}</div><div className="slbl">Pelanggaran</div></div>
        </div>

        {/* Bulan Ini */}
        <div className="scard cg">
          <div className="sico"><Calendar className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{bulanIni}</div><div className="slbl">Bulan Ini</div></div>
        </div>

        {/* Pelanggaran Bulan Ini */}
        <div className="scard ca">
          <div className="sico"><AlertTriangle className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{bulanIniP}</div><div className="slbl">Pelanggaran Bulan Ini</div></div>
        </div>

        {/* Total Anggota */}
        <div className="scard cp col-span-2 lg:col-span-1">
          <div className="sico"><Users className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{data.totalAnggota || 0}</div><div className="slbl">Total Anggota</div></div>
        </div>
      </div>

      {/* Aduan Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* Total Aduan */}
        <div className="scard cb">
          <div className="sico"><MessageSquare className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{aduanStats.total || 0}</div><div className="slbl">Total Aduan</div></div>
        </div>

        {/* Aduan Baru */}
        <div className="scard ca">
          <div className="sico"><MailOpen className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{aduanStats.baru || 0}</div><div className="slbl">Aduan Baru</div></div>
        </div>

        {/* Sedang Diproses */}
        <div className="scard cp">
          <div className="sico"><Clock className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{aduanStats.diproses || 0}</div><div className="slbl">Sedang Diproses</div></div>
        </div>

        {/* Selesai Ditindaklanjuti */}
        <div className="scard cg">
          <div className="sico"><CheckCircle className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{aduanStats.selesai || 0}</div><div className="slbl">Selesai</div></div>
        </div>

        {/* Persentase Selesai */}
        <div className="scard cb col-span-2 lg:col-span-1">
          <div className="sico"><Percent className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{aduanStats.pct || 0}%</div><div className="slbl">Persentase Selesai</div></div>
        </div>
      </div>

      {/* Charts Panels */}
      <div className="cg2">
        {/* Laporan per Hari Panel */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl">
              <BarChart2 className="w-4 h-4 inline-block align-middle" /> Laporan per Hari
            </span>
          </div>
          <div className="pbd">
            <div className="chbox">
              <canvas ref={barChartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Doughnut Chart (Tren Triwulan) */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl">
              <PieChart className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--purple)]" /> Tren Triwulan
            </span>
            <span id="tw-year-lbl" style={{ fontSize: '.58rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              Tahun {new Date().getFullYear()}
            </span>
          </div>
          <div className="pbd" style={{ paddingBottom: '10px' }}>
            <div className="chbox-sm">
              <canvas ref={twChartRef}></canvas>
            </div>
            <div className="tw-legend" id="tw-legend">
              <div className="tw-leg-item">
                <div className="tw-leg-dot" style={{ backgroundColor: isDarkMode ? '#3b82f6' : '#1b3b6f' }}></div>
                <span>Q1 Jan–Mar: <strong>{twData.counts[0]}</strong></span>
              </div>
              <div className="tw-leg-item">
                <div className="tw-leg-dot" style={{ backgroundColor: '#FFD23F' }}></div>
                <span>Q2 Apr–Jun: <strong>{twData.counts[1]}</strong></span>
              </div>
              <div className="tw-leg-item">
                <div className="tw-leg-dot" style={{ backgroundColor: '#EF6C4A' }}></div>
                <span>Q3 Jul–Sep: <strong>{twData.counts[2]}</strong></span>
              </div>
              <div className="tw-leg-item">
                <div className="tw-leg-dot" style={{ backgroundColor: '#5DADE2' }}></div>
                <span>Q4 Okt–Des: <strong>{twData.counts[3]}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Panels */}
      <div className="cg2" style={{ marginTop: '0px' }}>
        {/* Tren Bulanan Line Chart */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl">
              <LineChart className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)]" /> Tren Bulanan Laporan vs Aduan
            </span>
          </div>
          <div className="pbd">
            <div className="chbox">
              <canvas ref={lineChartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Kategori Aduan Doughnut Chart */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl">
              <MessageSquare className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--purple)]" /> Kategori Aduan
            </span>
          </div>
          <div className="pbd">
            <div className="chbox">
              <canvas ref={aduanCategoryChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
