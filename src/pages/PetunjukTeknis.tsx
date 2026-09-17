import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Map, FileText, PlusCircle, Edit, Users, Shield, Info, ChevronRight, MessageCircle } from 'lucide-react';

const getMenuIco = (ico: string, className = "w-4 h-4") => {
  switch (ico) {
    case 'fa-gauge-high':
      return <LayoutDashboard className={className} />;
    case 'fa-map-location-dot':
      return <Map className={className} />;
    case 'fa-table-list':
      return <FileText className={className} />;
    case 'fa-plus-circle':
      return <PlusCircle className={className} />;
    case 'fa-file-pen':
      return <Edit className={className} />;
    case 'fa-users':
      return <Users className={className} />;
    case 'fa-user-shield':
      return <Shield className={className} />;
    case 'fa-circle-info':
      return <Info className={className} />;
    default:
      return <Info className={className} />;
  }
};

interface PtkItem {
  id: string;
  ico: string;
  color: string;
  bg: string;
  title: string;
  desc: string;
  poin: string[];
}

export const PetunjukWidget: React.FC = () => {
  const [waUrl, setWaUrl] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const url = typeof win.getSupportWaChatUrl === 'function' ? win.getSupportWaChatUrl() : '';
      setWaUrl(url);
    }
  }, []);

  const ptkData: PtkItem[] = [
    { id: 'ptk-db', ico: 'fa-gauge-high', color: 'var(--blue)', bg: 'var(--bluelo)', title: 'Dashboard', desc: 'Halaman utama menampilkan statistik ringkasan, grafik laporan patroli, dan monitoring aduan masyarakat secara realtime.', poin: ['Statistik total laporan, pelanggaran, & laporan bulan ini', 'Statistik aduan: total, baru, diproses, selesai, dan persentase penyelesaian', 'Grafik batang laporan per hari (7 hari terakhir)', 'Tren triwulan (doughnut chart) laporan per kuartal', 'Grafik tren bulanan laporan vs aduan dalam satu tahun', 'Grafik kategori aduan masyarakat', 'Jam digital realtime beserta sapaan pengguna'] },
    { id: 'ptk-peta', ico: 'fa-map-location-dot', color: '#0891b2', bg: '#e0f7fa', title: 'Peta Pedestrian', desc: 'Peta interaktif wilayah patroli Satlinmas Pedestrian.', poin: ['Mode Google My Maps: rute patroli, titik rawan, dan pos jaga', 'Mode Peta Realtime: laporan lapangan dengan marker dan foto', 'Klik marker untuk detail lokasi, foto, dan info laporan', 'Tombol Edit Layer untuk administrator (tambah/ubah layer)', 'Cetak PDF peta area patroli dengan kop surat resmi', 'Tombol Refresh untuk memuat ulang data realtime'] },
    { id: 'ptk-rk', ico: 'fa-table-list', color: 'var(--amber)', bg: 'var(--amberl)', title: 'Rekap Laporan', desc: 'Melihat, mencari, dan mencetak seluruh laporan patroli.', poin: ['Filter berdasarkan kata kunci, lokasi, personil, atau rentang tanggal', 'Lihat foto dokumentasi langsung dari tabel', 'Cetak laporan tunggal atau kolektif (PDF rekap)', 'Admin dapat edit dan hapus laporan dari halaman ini'] },
    { id: 'ptk-in', ico: 'fa-plus-circle', color: 'var(--green)', bg: 'var(--greenl)', title: 'Input Laporan (Admin)', desc: 'Menambahkan laporan patroli baru melalui sistem terpusat.', poin: ['Input laporan eksklusif via embed sistem SI-PEDAS terpusat', 'Integrasi otomatis dengan penyimpanan cloud & database', 'Mendukung pengiriman foto dokumentasi beresolusi tinggi dengan watermark', 'Pengamanan data terenkripsi'] },
    { id: 'ptk-ed', ico: 'fa-file-pen', color: 'var(--purple)', bg: 'var(--purplel)', title: 'Edit Laporan', desc: 'Mengelola dan memperbaiki data laporan. Khusus Admin.', poin: ['Edit semua field laporan', 'Tambah atau hapus foto dari laporan', 'Hapus laporan secara permanen'] },
    { id: 'ptk-sl', ico: 'fa-users', color: 'var(--red)', bg: 'var(--redl)', title: 'Data Satlinmas', desc: 'Manajemen data anggota Satlinmas Pedestrian.', poin: ['Tambah, edit, dan hapus data anggota', 'Data mencakup nama, tanggal lahir, unit, dan nomor WhatsApp', 'Usia dihitung otomatis dari tanggal lahir'] },
    { id: 'ptk-aduan', ico: 'fa-circle-info', color: 'var(--purple)', bg: 'var(--purplel)', title: 'Aduan Masyarakat', desc: 'Kelola laporan aduan dari masyarakat melalui aplikasi SAPA Pedestrian.', poin: ['Lihat seluruh aduan dengan filter status dan kategori', 'Status aduan: Baru, Diproses, Selesai', 'Update status aduan dan tambah catatan tindak lanjut', 'Aduan masuk secara realtime via Firebase Firestore', 'Data aduan terintegrasi langsung di chart Dashboard'] },
    { id: 'ptk-survei', ico: 'fa-gauge-high', color: 'var(--green)', bg: 'var(--greenl)', title: 'Survei Kepuasan', desc: 'Monitoring hasil survei kepuasan masyarakat terhadap kinerja Satlinmas Pedestrian.', poin: ['Skor rata-rata kepuasan dari pengisian survei masyarakat', 'Distribusi rating dalam bentuk grafik batang dan doughnut', 'Daftar feedback terbaru dengan nilai dan komentar', 'Filter berdasarkan rentang tanggal dan skor minimum', 'Data survei bersumber dari aplikasi SAPA Pedestrian'] },
    { id: 'ptk-cctv', ico: 'fa-map-location-dot', color: '#0891b2', bg: '#e0f7fa', title: 'CCTV Pedestrian', desc: 'Monitoring live feed CCTV kawasan pedestrian secara langsung.', poin: ['Tampilan embed streaming CCTV area pedestrian', 'Akses pemantauan kawasan secara realtime', 'Khusus untuk petugas dengan akses yang diberikan'] },
    { id: 'ptk-pengaturan', ico: 'fa-user-shield', color: 'var(--amber)', bg: 'var(--amberl)', title: 'Pengaturan (Admin)', desc: 'Konfigurasi sistem dan akun. Hanya dapat diakses oleh Administrator.', poin: ['Manajemen Akun: ganti password dan buat akun pengguna baru', 'Template Cetak PDF Tunggal: atur header, judul, dan penandatangan', 'Template Cetak PDF Kolektif: atur format laporan kolektif', 'Pengaturan Peta: judul dan penandatangan PDF peta', 'No. WA Piket: kelola jadwal dan nomor WhatsApp petugas piket', 'Manajemen Unit: tambah dan hapus unit yang tersedia di form anggota Satlinmas', 'Inisiasi Database: reset dan inisiasi ulang struktur data'] },
    { id: 'ptk-auth', ico: 'fa-circle-info', color: '#34495e', bg: '#f4f7f6', title: 'Informasi Sistem', desc: 'Dikembangkan untuk mendukung efisiensi pelaporan Satlinmas Pedestrian Ponorogo.', poin: ['__PTK_DEV_CARD__'] }
  ];

  const handleToggleMenu = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const renderDevCard = () => {
    return (
      <div className="ptk-dev-card" style={{ marginTop: '14px', padding: '16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'var(--blue)', opacity: 0.05, borderRadius: '50%' }}></div>
        <div className="ptk-dev-photo-wrap" style={{ width: '72px', height: '72px', borderRadius: '16px', border: '2px solid var(--bg)', flexShrink: 0, overflow: 'hidden', boxShadow: '0 0 10px rgba(0,0,0,0.1)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/assets/basith.jpeg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            if (img.nextElementSibling) {
              (img.nextElementSibling as HTMLDivElement).style.display = 'flex';
            }
          }} alt="Basith Dev" />
          <div style={{ display: 'none', fontSize: '1.2rem', fontWeight: 800, color: 'var(--mid)', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>AB</div>
        </div>
        <div className="ptk-dev-info" style={{ flex: 1 }}>
          <div style={{ fontSize: '.6rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Developer</div>
          <div style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Ahmad Abdul Basith, S.Tr.I.P.</div>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#25d366',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '.7rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'transform 0.2s',
                boxShadow: '0 3px 8px rgba(37,211,102,0.3)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <MessageCircle className="w-4 h-4 inline-block align-middle mr-1.5" /> Chat Developer
            </a>
          ) : (
            <span style={{ fontSize: '.65rem', color: 'var(--muted)', lineHeight: '1.45' }}>
              Tautan tidak ditampilkan.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="ptk-menulist on" id="ptk-menulist" style={{ display: 'block', borderTop: 'none' }}>
        {ptkData.map((item) => {
          const isExpanded = expandedSection === item.id;
          const faClass = item.ico.indexOf('fab ') === 0 ? item.ico : 'fas ' + item.ico;

          return (
            <div key={item.id} className="ptk-menu-item">
              <button
                className={`ptk-menu-btn ${isExpanded ? 'open' : ''}`}
                onClick={() => handleToggleMenu(item.id)}
              >
                <div className="ptk-menu-left">
                  <div
                    className="ptk-menu-ico"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    {getMenuIco(item.ico, "w-4 h-4")}
                  </div>
                  <span className="ptk-menu-name">{item.title}</span>
                </div>
                <ChevronRight className="ptk-menu-arr w-4 h-4" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              <div className={`ptk-detail ${isExpanded ? 'on' : ''}`}>
                <p>{item.desc}</p>
                <ul className="ptk-ul">
                  {item.poin.map((p, pIdx) => {
                    if (p === '__PTK_DEV_CARD__') {
                      return (
                        <li key={pIdx} className="ptk-dev-li" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          {renderDevCard()}
                        </li>
                      );
                    }
                    return <li key={pIdx}>{p}</li>;
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PetunjukTeknis: React.FC = () => {
  return (
    <div className="fu">
      <PetunjukWidget />
    </div>
  );
};
export default PetunjukTeknis;
