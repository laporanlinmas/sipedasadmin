import { Menu, RefreshCw, Sun, Moon } from 'lucide-react';
import React, { useState } from 'react';
import { useApp, useAuth, useTheme } from '../App';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileSidebar }) => {
  const { activeTab, triggerRefresh, triggerToast } = useApp();
  const { session } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    setIsSpinning(true);
    triggerToast('Memuat ulang data...', 'inf');
    triggerRefresh();
    setTimeout(() => {
      setIsSpinning(false);
    }, 600);
  };

  const getPageMeta = () => {
    switch (activeTab) {
      case 'db':
        return { title: 'Dashboard', subtitle: 'Statistik & grafik data patroli' };
      case 'rk':
        return { title: 'Rekap Laporan', subtitle: 'Data laporan patroli' };
      case 'in':
        return { title: 'Input Laporan', subtitle: 'Form Input Laporan Admin' };
      case 'sl':
        return { title: 'Data Satlinmas', subtitle: 'Daftar anggota' };
      case 'pt':
        return { title: 'Peta Pemetaan Kawasan Pedestrian', subtitle: 'Peta wilayah & rute patroli Satlinmas' };
      case 'kr':
      case 'kerawanan':
        return { title: 'Peta Kerawanan', subtitle: 'Pemetaan tingkat kerawanan pedestrian' };
      case 'cc':
      case 'cctv':
        return { title: 'CCTV Pedestrian', subtitle: 'Pemantauan area pedestrian Ponorogo secara real-time' };
      case 'ad':
      case 'aduan':
        return { title: 'Aduan Masyarakat', subtitle: 'Kelola laporan aduan masyarakat secara real-time' };
      case 'ptk':
        return { title: 'Petunjuk Teknis', subtitle: 'Panduan fitur & penggunaan SI-PEDAS' };
      case 'set':
        return { title: 'Pengaturan Sistem', subtitle: 'Kelola akun, template cetak & konfigurasi' };
      case 'sv':
        return { title: 'Survei Kepuasan', subtitle: 'Analisis & statistik tingkat kepuasan layanan' };
      default:
        return { title: 'Dashboard', subtitle: 'Statistik & grafik data patroli' };
    }
  };

  const { title, subtitle } = getPageMeta();

  const initials = session
    ? (session.namaLengkap || session.username || '?').charAt(0).toUpperCase()
    : '?';

  return (
    <div className="topb">
      <div className="tbl">
        <button className="hmb" onClick={onToggleMobileSidebar}>
          <Menu className="w-4 h-4 inline-block align-middle" />
        </button>
        <div>
          <div className="pgtl" id="pgtl">
            {title}
          </div>
          <div className="pgsb" id="pgsb">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="tbr">
        <button
          id="refresh-btn"
          className={`tb-btn ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4 inline-block align-middle" />
        </button>
        <button
          id="dm-btn"
          className="tb-btn"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 inline-block align-middle" /> : <Moon className="w-4 h-4 inline-block align-middle" />}
        </button>
        {session && (
          <div className="tb-acct" id="tb-acct">
            <div className="tb-av" id="tb-av">
              {initials}
            </div>
            <div className="flex flex-col">
              <div className="tb-un" id="tb-un">
                {session.namaLengkap || session.username}
              </div>
              <div className="tb-rl" id="tb-rl">
                Administrator
              </div>
            </div>
            <span className="rbdg adm" id="tb-bdg">
              Admin
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
