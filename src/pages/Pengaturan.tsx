import { Key, Save, UserPlus, Plus, Layers, Edit, PlusCircle, Shield, ChevronDown, Eye, EyeOff, UserCheck, FileText, Heading, Hash, PenTool, CheckSquare, MessageCircle, Loader2, Trash2, Database, Table, CheckCircle, Users } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AlertModal } from '../components/common/AlertModal';
import { Modal } from '../components/common/Modal';
import { WaPiket } from '../types';

export const Pengaturan: React.FC = () => {
  const { showLoad, hideLoad, triggerToast } = useApp();
  const { session } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Panels Accordion States (which ones are open)
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    akun: false,
    pdfTunggal: false,
    pdfKolektif: false,
    peta: false,
    database: false,
    nowa: false,
    unit: false,
  });


  // Custom Alert and Confirm Modal States
  const [confirmShow, setConfirmShow] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [alertShow, setAlertShow] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const askConfirm = (msg: string, action: () => void) => {
    setConfirmMsg(msg);
    setConfirmAction(() => action);
    setConfirmShow(true);
  };

  // Account form states
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // PDF Single form states
  const [pdfJudul, setPdfJudul] = useState('');
  const [pdfTujuan, setPdfTujuan] = useState('');
  const [pdfAnggota, setPdfAnggota] = useState('');
  const [pdfPukul, setPdfPukul] = useState('');
  const [pdfJabatan, setPdfJabatan] = useState('');
  const [pdfNama, setPdfNama] = useState('');
  const [pdfPangkat, setPdfPangkat] = useState('');
  const [pdfNip, setPdfNip] = useState('');
  const [pdfSinglePreviewHtml, setPdfSinglePreviewHtml] = useState('');

  // PDF Kolektif form states
  const [kolJudul, setKolJudul] = useState('');
  const [kolSubjudul, setKolSubjudul] = useState('');
  const [kolJabatan, setKolJabatan] = useState('');
  const [kolNama, setKolNama] = useState('');
  const [kolPangkat, setKolPangkat] = useState('');
  const [kolNip, setKolNip] = useState('');
  const [pdfKolektifPreviewHtml, setPdfKolektifPreviewHtml] = useState('');

  // Peta form states
  const [petaJudul, setPetaJudul] = useState('');
  const [petaJabatan, setPetaJabatan] = useState('');
  const [petaNama, setPetaNama] = useState('');

  // WA Piket (NoWA) states
  const [nowaList, setNowaList] = useState<WaPiket[]>([]);
  const [isFetchingNoWa, setIsFetchingNoWa] = useState(false);
  const [nowaModalShow, setNowaModalShow] = useState(false);
  const [nowaFormMode, setNowaFormMode] = useState<'add' | 'edit'>('add');
  const [nowaFormRi, setNowaFormRi] = useState<string | number>('');
  const [nowaFormNama, setNowaFormNama] = useState('');
  const [nowaFormNumber, setNowaFormNumber] = useState('');
  const [nowaFormJadwal, setNowaFormJadwal] = useState('');
  const [nowaFormKeterangan, setNowaFormKeterangan] = useState('');

  // Unit states
  const [unitList, setUnitList] = useState<string[]>(['Satpol PP', 'Satlinmas Desa/Kelurahan', 'Satgas Linmas Pedestrian']);
  const [newUnitInput, setNewUnitInput] = useState('');

  // Timers for live previews debouncing
  const pdfPreviewTimer = useRef<any>(null);
  const kolPreviewTimer = useRef<any>(null);

  // Accordion Toggle
  const togglePanel = (panelKey: string) => {
    setOpenPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey],
    }));
  };

  const fetchNoWa = async () => {
    setIsFetchingNoWa(true);
    try {
      const res = await apiGet('getNoWa');
      if (res.success) {
        setNowaList(res.data || []);
      } else {
        triggerToast('Gagal memuat petugas piket: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      triggerToast('Error memuat petugas piket: ' + e.message, 'er');
    } finally {
      setIsFetchingNoWa(false);
    }
  };

  // Fetch Settings on Mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiGet('getSettings');
        if (res.success) {
          const d = res.data || {};
          // Populate states with fallback values
          setPdfJudul(d.pdf_judul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO');
          setPdfTujuan(d.pdf_tujuan || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian');
          setPdfAnggota(d.pdf_anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP');
          setPdfPukul(d.pdf_pukul || '16.00 – 00.00 WIB');
          setPdfJabatan(d.pdf_jabatan || 'Kepala Bidang SDA dan Linmas');
          setPdfNama(d.pdf_nama || 'Erry Setiyoso Birowo, SP');
          setPdfPangkat(d.pdf_pangkat || 'Pembina');
          setPdfNip(d.pdf_nip || '19751029 200212 1 008');

          setKolJudul(d.kol_judul || 'LAPORAN PATROLI WILAYAH PEDESTRIAN');
          setKolSubjudul(d.kol_subjudul || 'SATGAS LINMAS PEDESTRIAN');
          setKolJabatan(d.kol_jabatan || 'Kepala Bidang SDA dan LINMAS');
          setKolNama(d.kol_nama || 'Erry Setiyoso Birowo, SP');
          setKolPangkat(d.kol_pangkat || 'Pembina');
          setKolNip(d.kol_nip || '19751029 200212 1 008');

          setPetaJudul(d.peta_judul || 'PETA PEDESTRIAN KABUPATEN PONOROGO');
          setPetaJabatan(d.peta_jabatan || 'Kepala Bidang SDA dan Linmas');
          setPetaNama(d.peta_nama || 'Erry Setiyoso Birowo, SP');

          if (d.units) {
            const parsed = d.units.split(',').map((u: string) => u.trim()).filter(Boolean);
            if (parsed.length) setUnitList(parsed);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
    fetchNoWa();
  }, []);

  // Update Single PDF Preview in background
  const loadSinglePdfPreview = async () => {
    try {
      const res = await apiPost('generateLaporanHtml', {
        judulUtama: pdfJudul,
        hari: 'Senin',
        tanggal: '1 Januari 2026',
        tujuan: pdfTujuan,
        nomorSpt: '',
        lokasi: 'Area Pedestrian Kota Ponorogo',
        anggota: pdfAnggota,
        pukul: pdfPukul,
        identitas: '',
        keterangan: 'Contoh uraian laporan untuk preview template dari menu pengaturan.',
        uraian: 'Contoh uraian laporan untuk preview template dari menu pengaturan.',
        tglSurat: '1 Januari 2026',
        jabatanTtd: pdfJabatan,
        namaTtd: pdfNama,
        pangkatTtd: pdfPangkat,
        nipTtd: pdfNip,
        kopAktif: false,
        fotos: [],
      });
      if (res.success) {
        setPdfSinglePreviewHtml(res.data?.html || res.html || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Collective PDF Preview in background
  const loadKolektifPreview = async () => {
    const sampleRows = [
      {
        ts: new Date().toLocaleDateString('id-ID'),
        lokasi: 'Area Pedestrian Kota Ponorogo',
        hari: 'Senin',
        tanggal: '1 Januari 2026',
        identitas: 'NIHIL',
        personil: 'Contoh Personil A, B, C',
        danru: 'Danru 1',
        namaDanru: 'Nama Danru Contoh',
        keterangan: 'Pelaksanaan berjalan aman dan lancar.',
      },
    ];

    try {
      const res = await apiPost('generateKolektifHtml', {
        rows: sampleRows,
        tglFrom: '',
        tglTo: '',
        kopSurat: '',
        judul: kolJudul,
        subjudul: kolSubjudul,
        jabatanTtd: kolJabatan,
        namaTtd: kolNama,
        pangkatTtd: kolPangkat,
        nipTtd: kolNip,
      });
      if (res.success) {
        setPdfKolektifPreviewHtml(res.data?.html || res.html || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced side-effects when form values edit
  useEffect(() => {
    if (!openPanels.pdfTunggal) return;
    clearTimeout(pdfPreviewTimer.current);
    pdfPreviewTimer.current = setTimeout(loadSinglePdfPreview, 1000);
    return () => clearTimeout(pdfPreviewTimer.current);
  }, [pdfJudul, pdfTujuan, pdfAnggota, pdfPukul, pdfJabatan, pdfNama, pdfPangkat, pdfNip, openPanels.pdfTunggal]);

  useEffect(() => {
    if (!openPanels.pdfKolektif) return;
    clearTimeout(kolPreviewTimer.current);
    kolPreviewTimer.current = setTimeout(loadKolektifPreview, 1000);
    return () => clearTimeout(kolPreviewTimer.current);
  }, [kolJudul, kolSubjudul, kolJabatan, kolNama, kolPangkat, kolNip, openPanels.pdfKolektif]);

  // Form Submissions
  const handleChangePassword = async () => {
    if (!oldPass || !newPass) {
      triggerToast('Password lama & baru wajib diisi.', 'er');
      return;
    }
    showLoad('Memperbarui...');
    try {
      const res = await apiPost('changePassword', {
        oldPass,
        newPass,
        username: session?.username || '',
      });
      hideLoad();
      if (res.success) {
        triggerToast('Password berhasil diganti.', 'ok');
        setOldPass('');
        setNewPass('');
      } else {
        triggerToast(res.message || 'Gagal mengubah password.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleCreateAccount = async () => {
    if (!newUsername || !newFullName || !newPassword) {
      triggerToast('Semua field akun baru wajib diisi.', 'er');
      return;
    }
    showLoad('Mendaftarkan...');
    try {
      const res = await apiPost('createAccount', {
        username: newUsername.trim(),
        role: 'admin',
        namaLengkap: newFullName.trim(),
        password: newPassword,
      });
      hideLoad();
      if (res.success) {
        triggerToast(`Akun ${newUsername} berhasil dibuat.`, 'ok');
        setNewUsername('');
        setNewFullName('');
        setNewPassword('');
      } else {
        triggerToast(res.message || 'Gagal membuat akun.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleSavePdfSingleSettings = async () => {
    showLoad('Menyimpan...');
    try {
      const res = await apiPost('saveSettings', {
        pdf_judul: pdfJudul,
        pdf_tujuan: pdfTujuan,
        pdf_anggota: pdfAnggota,
        pdf_pukul: pdfPukul,
        pdf_jabatan: pdfJabatan,
        pdf_nama: pdfNama,
        pdf_pangkat: pdfPangkat,
        pdf_nip: pdfNip,
        pdf_kop_aktif: 'false',
      });
      hideLoad();
      if (res.success) {
        triggerToast('Pengaturan PDF Tunggal disimpan.', 'ok');
      } else {
        triggerToast(res.message || 'Gagal menyimpan.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleSavePdfKolektifSettings = async () => {
    showLoad('Menyimpan...');
    try {
      const res = await apiPost('saveSettings', {
        kol_judul: kolJudul,
        kol_subjudul: kolSubjudul,
        kol_jabatan: kolJabatan,
        kol_nama: kolNama,
        kol_pangkat: kolPangkat,
        kol_nip: kolNip,
      });
      hideLoad();
      if (res.success) {
        triggerToast('Pengaturan PDF Kolektif disimpan.', 'ok');
      } else {
        triggerToast(res.message || 'Gagal menyimpan.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleSavePetaSettings = async () => {
    showLoad('Menyimpan...');
    try {
      const res = await apiPost('saveSettings', {
        peta_judul: petaJudul,
        peta_jabatan: petaJabatan,
        peta_nama: petaNama,
      });
      hideLoad();
      if (res.success) {
        triggerToast('Pengaturan Peta disimpan.', 'ok');
      } else {
        triggerToast(res.message || 'Gagal menyimpan.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  // Google Sheet Initialization (Maintenance)
  const handleInitSheets = (onlySheet: string | null) => {
    const msg = onlySheet
      ? `Perbaiki sheet "${onlySheet}" saja?\n\nHeader baris 1 akan disamakan dengan template bila tidak sama (kolom tidak ditambah). Freeze baris 1 & format header biru. Data baris 2+ tidak dihapus.`
      : 'Perbaiki SEMUA sheet sekaligus?\n\nSama seperti per sheet, untuk setiap tab sheet.';
    
    askConfirm(msg, async () => {
      showLoad(onlySheet ? 'Memproses satu sheet...' : 'Memproses semua sheet...');
      try {
        const res = await apiPost('initAllSheets', onlySheet ? { onlySheet } : {});
        hideLoad();
        if (res.success) {
          triggerToast('Struktur sheet selesai.', 'ok');
          const lines = res.data;
          const detail = Array.isArray(lines) ? lines.join('\n') : String(res.message || '');
          setAlertMsg('Selesai.\n\n' + detail);
          setAlertShow(true);
        } else {
          triggerToast('Gagal inisiasi.', 'er');
          setAlertMsg('Gagal: ' + (res.message || ''));
          setAlertShow(true);
        }
      } catch (e: any) {
        hideLoad();
        triggerToast(e.message || 'Error', 'er');
      }
    });
  };

  // WA Piket (NoWA) CRUD Operations
  const openAddNoWa = () => {
    setNowaFormMode('add');
    setNowaFormRi('');
    setNowaFormNama('');
    setNowaFormNumber('');
    setNowaFormJadwal('');
    setNowaFormKeterangan('');
    setNowaModalShow(true);
  };

  const openEditNoWa = (item: WaPiket) => {
    setNowaFormMode('edit');
    setNowaFormRi(item._ri);
    setNowaFormNama(item.nama);
    setNowaFormNumber(item.number);
    setNowaFormJadwal(item.jadwal);
    setNowaFormKeterangan(item.keterangan || '');
    setNowaModalShow(true);
  };

  const handleSaveNoWa = async () => {
    if (!nowaFormNama.trim() || !nowaFormNumber.trim()) {
      triggerToast('Nama dan nomor petugas wajib diisi.', 'er');
      return;
    }
    const payload: any = {
      nama: nowaFormNama.trim(),
      number: nowaFormNumber.trim(),
      jadwal: nowaFormJadwal.trim(),
      keterangan: nowaFormKeterangan.trim(),
    };
    if (nowaFormMode === 'edit') {
      payload._ri = nowaFormRi;
    }
    showLoad(nowaFormMode === 'edit' ? 'Menyimpan perubahan...' : 'Menambahkan petugas...');
    try {
      const res = await apiPost(nowaFormMode === 'edit' ? 'updateNoWa' : 'addNoWa', payload);
      hideLoad();
      if (res.success) {
        triggerToast(res.message || 'Jadwal piket berhasil disimpan.', 'ok');
        setNowaModalShow(false);
        fetchNoWa();
      } else {
        triggerToast('Gagal menyimpan: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const handleDeleteNoWa = (ri: string | number) => {
    askConfirm('Apakah Anda yakin ingin menghapus petugas piket ini?', async () => {
      showLoad('Menghapus petugas...');
      try {
        const res = await apiPost('deleteNoWa', { ri });
        hideLoad();
        if (res.success) {
          triggerToast(res.message || 'Petugas piket berhasil dihapus.', 'ok');
          fetchNoWa();
        } else {
          triggerToast('Gagal menghapus: ' + (res.message || ''), 'er');
        }
      } catch (e: any) {
        hideLoad();
        triggerToast('Error: ' + e.message, 'er');
      }
    });
  };


  const handleAddUnit = async () => {
    const val = newUnitInput.trim();
    if (!val) return;
    if (unitList.includes(val)) { triggerToast('Unit sudah ada.', 'er'); return; }
    const newList = [...unitList, val];
    setUnitList(newList);
    setNewUnitInput('');
    await apiPost('saveSettings', { units: newList.join(',') });
    triggerToast('Unit ditambahkan.', 'ok');
  };

  const handleDeleteUnit = async (u: string) => {
    const newList = unitList.filter(x => x !== u);
    setUnitList(newList);
    await apiPost('saveSettings', { units: newList.join(',') });
    triggerToast('Unit dihapus.', 'ok');
  };

  const sheetList = [
    { id: 'INPUT', lbl: 'INPUT' },
    { id: 'Detail Foto', lbl: 'Detail Foto' },
    { id: 'Teks Laporan', lbl: 'Teks Laporan' },
    { id: 'Settings', lbl: 'Settings' },
  ];

  return (
    <div className="fu">
      {/* 1. AKUN SECTION PANEL */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('akun')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Manajemen Akun
            </span>
            <ChevronDown
              className="tg-ico w-4 h-4"
              style={{
                color: 'var(--muted)',
                transition: 'transform .3s',
                transform: openPanels.akun ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.akun ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Change Password */}
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p className="set-card-ttl" style={{ color: 'var(--blue)' }}>
              <Key className="w-4 h-4 inline-block align-middle" /> Ganti Password
            </p>
            <div className="fgrp">
              <label className="flbl">Password Lama</label>
              <div className="pw-field-wrap">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  className="fctl"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowOldPass(!showOldPass)}
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="fgrp">
              <label className="flbl">Password Baru</label>
              <div className="pw-field-wrap">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="fctl"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowNewPass(!showNewPass)}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button className="bp" style={{ width: '100%' }} onClick={handleChangePassword}>
              <Save className="w-4 h-4 inline-block align-middle" /> Perbarui Password
            </button>
          </div>

          {/* Create Account */}
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p className="set-card-ttl" style={{ color: 'var(--green)' }}>
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Buat Akun Baru
            </p>
            <div className="fgrp">
              <label className="flbl">Username</label>
              <input
                className="fctl"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <label className="flbl">Nama Lengkap</label>
              <input
                className="fctl"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <label className="flbl">Password</label>
              <div className="pw-field-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="fctl"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              className="bp"
              style={{ width: '100%', background: 'var(--green)' }}
              onClick={handleCreateAccount}
            >
              <UserCheck className="w-4 h-4 inline-block align-middle mr-1.5" /> Daftarkan Akun
            </button>
          </div>

        </div>
      </div>

      {/* 2. TEMPLATE CETAK PDF LAPORAN TUNGGAL */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('pdfTunggal')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--red)]" /> Template Cetak PDF Laporan Tunggal
            </span>
            <ChevronDown
              className="tg-ico w-4 h-4"
              style={{
                color: 'var(--muted)',
                transition: 'transform .3s',
                transform: openPanels.pdfTunggal ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.pdfTunggal ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
          <div className="set-card" style={{ marginBottom: '0px', padding: '16px' }}>
            <p style={{ fontSize: '.65rem', color: 'var(--blue)', fontWeight: 700, marginBottom: '6px' }}>
              <Heading className="w-4 h-4 inline-block align-middle mr-1" /> Header Laporan
            </p>
            <div className="fgrp">
              <label className="flbl">Judul Utama (Header Laporan)</label>
              <input
                className="fctl"
                value={pdfJudul}
                onChange={(e) => setPdfJudul(e.target.value)}
              />
            </div>
          </div>
          
          <div className="set-card" style={{ marginBottom: '0px', padding: '16px' }}>
            <p style={{ fontSize: '.65rem', color: 'var(--blue)', fontWeight: 700, marginBottom: '8px' }}>
              <Hash className="w-4 h-4 inline-block align-middle mr-1" /> Nomor &amp; Isi Standar
            </p>
            <div className="fgrp">
              <label className="flbl">Tujuan Kegiatan</label>
              <input
                className="fctl"
                value={pdfTujuan}
                onChange={(e) => setPdfTujuan(e.target.value)}
              />
            </div>
            <div className="frow">
              <div className="fcol">
                <label className="flbl">Anggota</label>
                <input
                  className="fctl"
                  value={pdfAnggota}
                  onChange={(e) => setPdfAnggota(e.target.value)}
                />
              </div>
              <div className="fcol">
                <label className="flbl">Pukul</label>
                <input
                  className="fctl"
                  value={pdfPukul}
                  onChange={(e) => setPdfPukul(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="set-card" style={{ marginBottom: '0px', padding: '16px' }}>
            <p style={{ fontSize: '.65rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '8px' }}>
              <PenTool className="w-4 h-4 inline-block align-middle mr-1" /> Data Pejabat Penandatangan (TTD)
            </p>
            <div className="frow">
              <div className="fcol">
                <label className="flbl">Jabatan TTD</label>
                <input
                  className="fctl"
                  value={pdfJabatan}
                  onChange={(e) => setPdfJabatan(e.target.value)}
                />
              </div>
              <div className="fcol">
                <label className="flbl">Nama Pejabat</label>
                <input
                  className="fctl"
                  value={pdfNama}
                  onChange={(e) => setPdfNama(e.target.value)}
                />
              </div>
            </div>
            <div className="frow">
              <div className="fcol">
                <label className="flbl">Pangkat / Golongan</label>
                <input
                  className="fctl"
                  value={pdfPangkat}
                  onChange={(e) => setPdfPangkat(e.target.value)}
                />
              </div>
              <div className="fcol">
                <label className="flbl">NIP</label>
                <input
                  className="fctl"
                  value={pdfNip}
                  onChange={(e) => setPdfNip(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button className="bp" style={{ width: '100%' }} onClick={handleSavePdfSingleSettings}>
            <CheckSquare className="w-4 h-4 inline-block align-middle mr-1.5" /> Simpan Pengaturan PDF Tunggal
          </button>
          
          <div className="set-card" style={{ padding: '0px', overflow: 'hidden', marginBottom: '0px' }}>
            <div style={{ padding: '7px 10px', background: 'var(--card)', borderBottom: '1px solid var(--border)', fontSize: '.65rem', fontWeight: 700, color: 'var(--mid)' }}>
              Preview Template Single PDF
            </div>
            <iframe
              id="set-pdf-preview-frame"
              srcDoc={pdfSinglePreviewHtml}
              style={{ width: '100%', height: '380px', border: 'none', display: 'block' }}
            ></iframe>
          </div>
        </div>
      </div>

      {/* 3. WHATSAPP PIKET SECTION PANEL */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('nowa')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[var(--green)]" /> Pengaturan Petugas Piket
            </span>
            <ChevronDown
              className="tg-ico w-4 h-4"
              style={{
                color: 'var(--muted)',
                transition: 'transform .3s',
                transform: openPanels.nowa ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.nowa ? 'block' : 'none' }}>
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', margin: 0, lineHeight: '1.55' }}>
                Atur jadwal petugas piket dan nomor telepon yang aktif di chatbot portal aduan masyarakat.
              </p>
            </div>

            {/* List of WA Piket */}
            {isFetchingNoWa ? (
              <div className="flex items-center justify-center gap-2" style={{ padding: '20px', color: 'var(--muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                  const r = nowaList.find(item => item.jadwal && item.jadwal.toLowerCase().trim() === day.toLowerCase());
                  
                  if (!r) {
                    return (
                      <div key={day} className="ag-card" style={{ border: '1px dashed var(--border)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', opacity: 0.75 }}>
                        <div className="ag-info" style={{ flex: 1 }}>
                          <div className="ag-name" style={{ fontWeight: 'bold', fontSize: '.85rem', color: 'var(--muted)' }}>
                            {day}
                          </div>
                          <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: '6px' }}>
                            Belum ada petugas piket
                          </div>
                        </div>
                        <div className="ag-act" style={{ display: 'flex', gap: '6px', marginLeft: '12px', position: 'static' }}>
                          <button
                            className="bfot"
                            style={{
                              padding: '0',
                              width: '28px',
                              height: '28px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setNowaFormMode('add');
                              setNowaFormRi('');
                              setNowaFormNama('');
                              setNowaFormNumber('');
                              setNowaFormJadwal(day);
                              setNowaFormKeterangan('');
                              setNowaModalShow(true);
                            }}
                            title="Tambah Petugas"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const waClean = r.number ? r.number.replace(/[^0-9]/g, '') : '';
                  const formattedWa = waClean.startsWith('0') ? '62' + waClean.slice(1) : waClean.startsWith('62') ? waClean : '62' + waClean;
                  const waLink = waClean ? `https://wa.me/${formattedWa}` : '';

                  return (
                    <div key={day} className="ag-card" style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
                      <div className="ag-info" style={{ flex: 1 }}>
                        <div className="ag-name" style={{ fontWeight: 'bold', fontSize: '.85rem', color: 'var(--text)' }}>
                          {day}: <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{esc(r.nama)}</span>
                        </div>
                        <div className="ag-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {r.number && (
                            <a
                              className="ag-pill ag-wa"
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ background: 'rgba(40, 167, 69, 0.1)', color: 'var(--green)', fontSize: '.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <MessageCircle className="w-3 h-3 inline-block mr-1 align-text-bottom" /> {esc(r.number)}
                            </a>
                          )}
                        </div>
                        {r.keterangan && (
                          <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: '8px', fontStyle: 'italic' }}>
                            {esc(r.keterangan)}
                          </div>
                        )}
                      </div>
                      <div className="ag-act" style={{ display: 'flex', gap: '6px', marginLeft: '12px', position: 'static' }}>
                        <button
                          className="be"
                          style={{
                            padding: '0',
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setNowaFormMode('edit');
                            setNowaFormRi(r._ri);
                            setNowaFormNama(r.nama);
                            setNowaFormNumber(r.number);
                            setNowaFormJadwal(day);
                            setNowaFormKeterangan(r.keterangan || '');
                            setNowaModalShow(true);
                          }}
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="bd"
                          style={{
                            padding: '0',
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleDeleteNoWa(r._ri)}
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. UNIT SATLINMAS PANEL */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('unit')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--purple)]" /> Manajemen Unit Satlinmas
            </span>
            <ChevronDown className="tg-ico w-4 h-4" style={{ color: 'var(--muted)', transition: 'transform .3s', transform: openPanels.unit ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.unit ? 'block' : 'none' }}>
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.55' }}>
              Kelola daftar unit yang tersedia di dropdown form anggota Satlinmas.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {unitList.map((u) => (
                <div key={u} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px 4px 12px', fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>
                  {u}
                  <button onClick={() => handleDeleteUnit(u)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: 'var(--red)', lineHeight: 1 }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {unitList.length === 0 && <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Belum ada unit.</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="fctl"
                placeholder="Nama unit baru..."
                value={newUnitInput}
                onChange={(e) => setNewUnitInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                style={{ flex: 1 }}
              />
              <button className="bp" onClick={handleAddUnit} style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. DATABASE MAINTENANCE PANEL */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('database')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4" /> Pemeliharaan Struktur Data (Google Sheet)
            </span>
            <ChevronDown
              className="tg-ico w-4 h-4"
              style={{
                color: 'var(--muted)',
                transition: 'transform .3s',
                transform: openPanels.database ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.database ? 'block' : 'none' }}>
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.55' }}>
            Membuat sheet yang belum ada, menyamakan <strong>baris header</strong> dengan template (jumlah kolom mengikuti template, tidak ditambah), <strong>freeze baris 1</strong>, dan <strong>header biru</strong>. Lebar kolom di spreadsheet mengikuti isi (auto). Data baris 2 ke bawah tidak dihapus.
          </p>
          <p style={{ fontSize: '.65rem', fontWeight: 800, color: 'var(--mid)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Per sheet (satu per satu)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(132px,1fr))', gap: '8px', marginBottom: '14px' }}>
            {sheetList.map((r) => (
              <button
                key={r.id}
                type="button"
                className="bg2"
                style={{
                  padding: '10px 8px',
                  fontSize: '.68rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexDirection: 'column',
                  textAlign: 'center',
                  lineHeight: '1.25',
                }}
                onClick={() => handleInitSheets(r.id)}
                title="Perbaiki sheet ini saja"
              >
                <Table className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                <span>{esc(r.lbl)}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '.65rem', fontWeight: 800, color: 'var(--mid)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Semua sekaligus
          </p>
          <button
            className="bp"
            style={{ width: '100%', padding: '14px', marginBottom: '16px' }}
            onClick={() => handleInitSheets(null)}
          >
            <Layers className="w-4 h-4 inline-block align-middle" /> Perbaiki &amp; format <strong>semua sheet</strong> sekaligus
          </button>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        show={confirmShow}
        title="Konfirmasi Tindakan"
        msg={confirmMsg}
        onConfirm={() => {
          setConfirmShow(false);
          if (confirmAction) confirmAction();
        }}
        onCancel={() => setConfirmShow(false)}
        confirmText="Lanjutkan"
        confirmClass="bp"
        confirmIcon={<CheckCircle className="w-4 h-4" />}
      />

      {/* Alert Modal */}
      <AlertModal
        show={alertShow}
        title="Hasil Tindakan"
        msg={alertMsg}
        onClose={() => setAlertShow(false)}
      />

      {/* WA Piket Add/Edit Modal */}
      <Modal
        show={nowaModalShow}
        onClose={() => setNowaModalShow(false)}
        size="sm"
        title={
          nowaFormMode === 'edit' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
              <Edit className="w-4 h-4 inline-block align-middle" /> Edit Petugas Piket - {nowaFormJadwal}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--green)' }}>
              <PlusCircle className="w-4 h-4 inline-block align-middle" /> Tambah Petugas Piket - {nowaFormJadwal}
            </span>
          )
        }
        footer={
          <>
            <button className="bg2" onClick={() => setNowaModalShow(false)}>
              Batal
            </button>
            <button className="bp" onClick={handleSaveNoWa}>
              <Save className="w-4 h-4 inline-block align-middle" /> Simpan
            </button>
          </>
        }
      >
        <div className="fgrp">
          <label className="flbl">
            Nama Petugas <span className="req">*</span>
          </label>
          <input
            className="fctl"
            placeholder="Contoh: Piket Regu A / Nama Petugas"
            value={nowaFormNama}
            onChange={(e) => setNowaFormNama(e.target.value)}
            style={{ borderRadius: '10px' }}
            autoFocus
          />
        </div>
        <div className="frow">
          <div className="fcol">
            <label className="flbl">
              Nomor Telepon <span className="req">*</span>
            </label>
            <input
              className="fctl"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              placeholder="08xxxxxxxxxx"
              value={nowaFormNumber}
              onChange={(e) => {
                const numVal = e.target.value.replace(/[^0-9]/g, '');
                if (numVal.length <= 12) {
                  setNowaFormNumber(numVal);
                }
              }}
              style={{ borderRadius: '10px' }}
            />
          </div>
          <div className="fcol">
            <label className="flbl">
              Jadwal Hari
            </label>
            <input
              className="fctl"
              value={nowaFormJadwal}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', borderRadius: '10px' }}
            />
          </div>
        </div>
        <div className="fgrp">
          <label className="flbl">Keterangan / Catatan</label>
          <input
            className="fctl"
            placeholder="Keterangan tambahan (opsional)"
            value={nowaFormKeterangan}
            onChange={(e) => setNowaFormKeterangan(e.target.value)}
            style={{ borderRadius: '10px' }}
          />
        </div>
      </Modal>
 
    </div>
  );
};
export default Pengaturan;
