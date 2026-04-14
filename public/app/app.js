// ══════════════════════════════════════════════════════════
//  API CLIENT — Semua panggilan ke Vercel API Route
//  BASE_URL otomatis deteksi (dev vs prod)
// ══════════════════════════════════════════════════════════
var BASE_URL = (function () {
  var host = window.location.origin;
  if (host.startsWith('file://')) return 'http://localhost:3000';
  return host;
})();

async function callAPI(action, payload) {
  try {
    var res = await fetch(BASE_URL + '/api/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    });

    var data = null;
    try { data = await res.json(); } catch (e) { }

    if (!res.ok) {
      if (data && data.message) throw new Error(data.message);
      throw new Error('HTTP ' + res.status);
    }
    return data;
  } catch (err) {
    var badge = document.getElementById('api-status-badge');
    if (badge) { badge.className = 'api-status error'; badge.innerHTML = '<i class="bi bi-circle-fill"></i> Offline'; }
    throw err;
  }
}

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
var APP = { user: null, currentPage: 'dashboard' };
var currentEditData = null;

// ══════════════════════════════════════════════════════════
//  SPINNER & TOAST
// ══════════════════════════════════════════════════════════
function showSpinner(label) {
  document.getElementById('spinner-label').textContent = label || 'Memproses...';
  document.getElementById('spinner-overlay').classList.add('active');
}
function hideSpinner() {
  document.getElementById('spinner-overlay').classList.remove('active');
}
function showToast(msg, type) {
  var icons = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' };
  var el = document.createElement('div');
  el.className = 'toast-msg ' + (type || 'info');
  el.innerHTML = '<i class="bi bi-' + (icons[type] || icons.info) + '"></i><span>' + esc(msg) + '</span>';
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function () { el.remove(); }, 4500);
}

// ══════════════════════════════════════════════════════════
//  THEME (DARK MODE)
// ══════════════════════════════════════════════════════════
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('senapati_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function initTheme() {
  const savedTheme = localStorage.getItem('senapati_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const ti = document.getElementById('theme-icon');
    if (ti) ti.className = 'bi bi-sun-fill';
  }
}

// ══════════════════════════════════════════════════════════
//  CLOCK
// ══════════════════════════════════════════════════════════
function startClock() {
  function tick() {
    var now = new Date();
    var el = document.getElementById('clock');
    if (el) el.textContent = now.toLocaleTimeString('id-ID');
    var dt = document.getElementById('info-date');
    if (dt) dt.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
var PAGE_TITLES = {
  dashboard:     'Dashboard',
  agenda:        'Agenda Kegiatan',
  undangan:      'Kelola Undangan',
  'surat-masuk': 'Surat Masuk',
  'surat-keluar':'Surat Keluar',
  disposisi:     'Sistem Disposisi',
  arsip:         'Arsip Digital',
  peta:          'Peta Agenda Kegiatan',
  panduan:       'Panduan Teknis SENAPATI',
  pengaturan:    'Pengaturan Sistem'
};

var PAGE_SUBS = {
  dashboard:     'Ringkasan data agenda dan tata informasi',
  agenda:        'Jadwal kegiatan Bupati Ponorogo per tanggal',
  undangan:      'Manajemen undangan & konversi ke agenda',
  'surat-masuk': 'Manajemen Arsip Surat Masuk',
  'surat-keluar':'Manajemen Arsip Surat Keluar',
  disposisi:     'Aliran disposisi pimpinan',
  arsip:         'Upload & kelola dokumen arsip digital',
  peta:          'Visualisasi lokasi agenda secara interaktif',
  panduan:       'Dokumentasi lengkap fitur SENAPATI',
  pengaturan:    'Konfigurasi akun & sistem'
};

// Role-based menu visibility
function applyRoleVisibility(role) {
  // Semua menu di-show dulu
  document.querySelectorAll('.nav-link-item').forEach(function(el) { el.style.display = ''; });
  
  if (role === 'PROTOKOL') {
    // PROTOKOL: Fokus pada Agenda & Undangan. Bisa lihat surat tapi tidak bisa hapus/pengaturan.
    var hidenForProtokol = ['pengaturan', 'users-mgmt']; // assume users-mgmt is a sub-selector or logic
    document.querySelector('[data-page="pengaturan"]').style.display = 'none';
    
    // Sembunyikan tombol hapus di tabel-tabel utama (opsional, bisa lebih granular)
    // Untuk saat ini cukup sembunyikan Pengaturan sesuai request.
  } else if (role === 'USER') {
    // USER: Hanya bisa melihat, tidak bisa tambah/edit/hapus/pengaturan
    document.querySelector('[data-page="pengaturan"]').style.display = 'none';
    document.querySelectorAll('.btn-primary-custom, .btn-warning-custom, .btn-danger-custom').forEach(function(btn) {
      // Kecuali tombol login/logout/search/refresh/preview
      if (!btn.closest('.page-header') && !btn.onclick?.toString().includes('load') && !btn.onclick?.toString().includes('Preview') && !btn.onclick?.toString().includes('print')) {
         // ini logic kasar, sebaiknya di masing-masing render function
      }
    });
  }
}

function navigateTo(page) {
  // Cek hak akses role sederhana
  var role = APP.user ? APP.user.role : 'USER';
  var adminOnly = ['pengaturan'];
  if (adminOnly.indexOf(page) !== -1 && role !== 'ADMIN') {
    showToast('Anda tidak memiliki akses ke halaman ini.', 'error'); return;
  }

  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });

  // Semua page ID sekarang langsung 1:1
  var targetPageId = page;
  // Legacy redirect: 'surat' → dashboard
  if (page === 'surat') { targetPageId = 'dashboard'; }

  var target = document.getElementById('page-' + targetPageId);
  if (target) target.classList.add('active');
  
  document.querySelectorAll('.nav-link-item, .sub-nav-item').forEach(function (l) { l.classList.remove('active'); });
  var activeLink = document.querySelector('[data-page="' + page + '"]');
  if (activeLink) {
    activeLink.classList.add('active');
    // Jika itu sub-menu, pastikan parent tetap terbuka
    var subMenu = activeLink.closest('.sub-menu');
    if (subMenu) subMenu.classList.add('open');
  }

  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;
  document.getElementById('topbar-sub').textContent = PAGE_SUBS[page] || '';
  APP.currentPage = page;
  closeSidebar();
  
  if (page === 'dashboard') loadDashboard();
  if (page === 'agenda')    loadAgenda();
  if (page === 'undangan')  { loadUndangan(); setTimeout(initUdMapPicker, 300); }
  if (page === 'surat-masuk')  loadSuratMasuk();
  if (page === 'surat-keluar') loadSuratKeluar();
  if (page === 'disposisi') loadDisposisi();
  if (page === 'arsip')     loadArsip();
  if (page === 'peta')      loadPeta();
  if (page === 'pengaturan') {
    loadUsers();
    loadKopSettings();
    var chgEl = document.getElementById('chg-username');
    if (chgEl) chgEl.value = APP.user ? APP.user.username : '';
  }
}

function toggleSubMenu(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// Tab helper untuk sub-navigasi Surat Keluar
function setSkTab(activeTabId) {
  document.querySelectorAll('#tab-sk-arsip, #tab-sk-tugas, #tab-sk-perintah').forEach(function(t) {
    t.classList.remove('active');
  });
  var active = document.getElementById(activeTabId);
  if (active) active.classList.add('active');
}

// Navigate sub-menu Surat Keluar ke halaman terpisah
function navigateSkSub(page) {
  navigateTo(page);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

function toggleCollapse(contentId, trigger) {
  var el = document.getElementById(contentId);
  if (!el) return;
  el.classList.toggle('collapsed');
  if (trigger) trigger.classList.toggle('collapsed');
}

function togglePanduanAccordion(header) {
  var body = header.nextElementSibling;
  var isOpen = body.classList.contains('open');
  // close all first
  document.querySelectorAll('.panduan-accordion-body').forEach(function(b) { b.classList.remove('open'); });
  document.querySelectorAll('.panduan-accordion-header').forEach(function(h) { h.classList.remove('open'); });
  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('open');
  }
}

function togglePwd(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = '<i class="bi bi-eye-slash"></i>'; }
  else { inp.type = 'password'; btn.innerHTML = '<i class="bi bi-eye"></i>'; }
}

// ══════════════════════════════════════════════════════════
//  LOGIN / LOGOUT
// ══════════════════════════════════════════════════════════
async function doLogin() {
  var u = document.getElementById('login-username').value.trim();
  var p = document.getElementById('login-password').value;
  if (!u || !p) { showToast('Username dan password wajib diisi.', 'error'); return; }
  showSpinner('Memverifikasi...');
  try {
    var res = await callAPI('login', { username: u, password: p });
    hideSpinner();
    if (res.success) {
      APP.user = res.user;
      document.getElementById('view-login').style.display = 'none';
      document.getElementById('app-shell').style.display = 'block';
      document.getElementById('user-nama').textContent = res.user.nama;
      document.getElementById('user-role').textContent = res.user.role;
      document.getElementById('user-avatar').textContent = res.user.nama.charAt(0).toUpperCase();
      document.getElementById('info-user').textContent = res.user.nama;
      document.getElementById('chg-username').value = res.user.username;
      applyRoleVisibility(res.user.role);
      startClock();
      navigateTo('dashboard');
      showToast('Selamat datang, ' + res.user.nama + '!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    hideSpinner();
    showToast('Gagal terhubung ke server: ' + err.message, 'error');
  }
}

function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  APP.user = null;
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('view-login').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showToast('Berhasil keluar.', 'info');
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    var res = await callAPI('getDashboard', {});
    if (res.success) {
      animateCount('stat-masuk',    res.suratMasuk   || 0);
      animateCount('stat-keluar',   res.suratKeluar  || 0);
      animateCount('stat-undangan', res.undangan     || 0);
      animateCount('stat-agenda',   res.agenda       || 0);
      animateCount('stat-disposisi',res.disposisi    || 0);
      animateCount('stat-arsip',    res.arsip        || 0);
      // Arsip detail breakdown
      animateCount('stat-kpt',    res.countKpt    || 0);
      animateCount('stat-ins',    res.countIns    || 0);
      animateCount('stat-perbup', res.countPerbup || 0);
      animateCount('stat-perda',  res.countPerda  || 0);
      animateCount('stat-seb',    res.countSeb    || 0);
      animateCount('stat-ndi',    res.countNdi    || 0);
      animateCount('stat-mem',    res.countMem    || 0);
      animateCount('stat-misc',   res.countMisc   || 0);
    }
  } catch (err) { /* silent */ }
}

function animateCount(id, target) {
  var el = document.getElementById(id);
  if (!el) return;
  var start = 0;
  var step = Math.max(1, Math.ceil(target / 30));
  var timer = setInterval(function () {
    start = Math.min(start + step, target);
    el.textContent = start;
    if (start >= target) clearInterval(timer);
  }, 20);
}

// ══════════════════════════════════════════════════════════
//  FILE HANDLING
// ══════════════════════════════════════════════════════════
function handleFileSelect(inputId, infoId) {
  var file = document.getElementById(inputId).files[0];
  if (!file) return;
  document.getElementById(infoId).textContent = '📎 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
}

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var base64 = e.target.result.split(',')[1];
      resolve({
        content: base64,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      document.getElementById('spinner-label').textContent = 'Memproses unggahan (File siap)...';
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════════
//  ARSIP
// ══════════════════════════════════════════════════════════
async function submitArsip() {
  var nama = document.getElementById('arsip-nama').value.trim();
  var kategori = document.getElementById('arsip-kategori').value;
  var deskripsi = document.getElementById('arsip-deskripsi').value.trim();
  var tglArsip = document.getElementById('arsip-tgl').value;
  var fileEl = document.getElementById('arsip-file');
  if (!nama) { showToast('Nama file wajib diisi.', 'error'); return; }
  if (!kategori) { showToast('Kategori wajib dipilih.', 'error'); return; }
  if (!tglArsip) { showToast('Tanggal arsip wajib diisi.', 'error'); return; }
  if (!fileEl.files[0]) { showToast('File wajib diunggah.', 'error'); return; }
  showSpinner('Mengunggah arsip ke Google Drive...');
  try {
    var fd = await readFileAsBase64(fileEl.files[0]);
    var res = await callAPI('saveArsip', { data: { namaFile: nama, kategori: kategori, deskripsi: deskripsi, tglArsip: tglArsip }, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['arsip-nama', 'arsip-deskripsi']);
      document.getElementById('arsip-kategori').value = '';
      fileEl.value = '';
      document.getElementById('arsip-file-info').textContent = '';
      togglePanel('arsip-form-panel');
      loadArsip();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadArsip() {
  try {
    var res = await callAPI('getArsip', {});
    var tbody = document.getElementById('arsip-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="9"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data arsip</td></tr>'; return;
    }
    tbody.innerHTML = res.data.map(function (d, i) {
      var safeData = encodeURIComponent(JSON.stringify(d));
      var tglArs = d['Tanggal Arsip'] ? fmtDate(d['Tanggal Arsip']) : '-';
      var url = d['URL'] || d['File URL'];
      var actBtn = url ? '<button class="btn-link-custom" onclick="openPreview(\'' + url + '\')"><i class="bi bi-eye"></i> Lihat</button>' : '';
      return '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(d['Nama File']) + '</strong></td><td><span class="badge-cat arsip">' + esc(d['Kategori']) + '</span></td><td>' + esc(d['Folder']) + '</td><td>' + esc(d['Deskripsi']) + '</td><td>' + esc(d['Ukuran']) + '</td><td>' + tglArs + '</td><td>' + fmtDate(d['DibuatPada'] || d['CreatedAt']) + '</td><td class="action-col" style="display:flex;gap:6px">' + actBtn + '<button class="btn-warning-custom" onclick="openEditModal(\'Arsip\', \'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'deleteArsip\',\'' + d['ID'] + '\',loadArsip)"><i class="bi bi-trash"></i></button></td></tr>';
    }).join('');
  } catch (err) { showToast('Gagal memuat arsip: ' + err.message, 'error'); }
}

// ══════════════════════════════════════════════════════════
//  SURAT MASUK
// ══════════════════════════════════════════════════════════
async function submitSuratMasuk() {
  var data = { nomorSurat: v('sm-nomor'), tanggal: v('sm-tanggal'), pengirim: v('sm-pengirim'), perihal: v('sm-perihal'), kategori: v('sm-kategori'), catatan: v('sm-catatan') };
  if (!data.nomorSurat || !data.tanggal || !data.pengirim || !data.perihal) { showToast('Lengkapi field yang wajib diisi.', 'error'); return; }
  showSpinner('Menyimpan surat masuk...');
  try {
    var fileEl = document.getElementById('sm-file');
    var fd = fileEl.files[0] ? await readFileAsBase64(fileEl.files[0]) : null;
    var res = await callAPI('saveSuratMasuk', { data: data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['sm-nomor', 'sm-tanggal', 'sm-pengirim', 'sm-perihal', 'sm-catatan']);
      fileEl.value = ''; document.getElementById('sm-file-info').textContent = '';
      togglePanel('form-masuk'); loadSuratMasuk();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadSuratMasuk() {
  try {
    var res = await callAPI('getSuratMasuk', {});
    renderSuratTable('tbody-sm', res, ['Nomor Surat', 'Tanggal', 'Pengirim', 'Perihal', 'Kategori'], 'masuk', 'deleteSuratMasuk', loadSuratMasuk);
  } catch (err) { /* silent */ }
}

// ══════════════════════════════════════════════════════════
//  SURAT KELUAR
// ══════════════════════════════════════════════════════════
async function submitSuratKeluar() {
  var data = { nomorSurat: v('sk-nomor'), tanggal: v('sk-tanggal'), tujuan: v('sk-tujuan'), perihal: v('sk-perihal'), kategori: v('sk-kategori'), catatan: v('sk-catatan') };
  if (!data.nomorSurat || !data.tanggal || !data.tujuan || !data.perihal) { showToast('Lengkapi field yang wajib diisi.', 'error'); return; }
  showSpinner('Menyimpan surat keluar...');
  try {
    var fileEl = document.getElementById('sk-file');
    var fd = fileEl.files[0] ? await readFileAsBase64(fileEl.files[0]) : null;
    var res = await callAPI('saveSuratKeluar', { data: data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['sk-nomor', 'sk-tanggal', 'sk-tujuan', 'sk-perihal', 'sk-catatan']);
      fileEl.value = ''; document.getElementById('sk-file-info').textContent = '';
      togglePanel('form-keluar'); loadSuratKeluar();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadSuratKeluar() {
  try {
    var res = await callAPI('getSuratKeluar', {});
    renderSuratTable('tbody-sk', res, ['Nomor Surat', 'Tanggal', 'Tujuan', 'Perihal', 'Kategori'], 'keluar', 'deleteSuratKeluar', loadSuratKeluar);
  } catch (err) { /* silent */ }
}

// ══════════════════════════════════════════════════════════
//  UNDANGAN
// ══════════════════════════════════════════════════════════
async function submitUndangan() {
  var nomorSurat = v('ud-nomor'), tanggalSurat = v('ud-tanggal');
  var penyelenggara = v('ud-penyelenggara'), pj = v('ud-pj');
  var perihal = v('ud-perihal'), tglPelaksanaan = v('ud-tglpelaksanaan');
  var lokasi = v('ud-lokasi');
  if (!nomorSurat || !penyelenggara || !perihal || !tglPelaksanaan || !lokasi) {
    showToast('Lengkapi field yang wajib diisi: Nomor, Penyelenggara, Perihal, Tanggal Pelaksanaan, Lokasi.', 'error'); return;
  }
  var data = {
    nomorSurat: nomorSurat, tanggalSurat: tanggalSurat,
    penyelenggara: penyelenggara, penanggungJawab: pj,
    perihal: perihal, tanggalPelaksanaan: tglPelaksanaan,
    waktu: v('ud-waktu'), lokasi: lokasi,
    latitude: v('ud-lat'), longitude: v('ud-lng'),
    catatan: v('ud-catatan')
  };
  showSpinner('Menyimpan undangan...');
  try {
    var fileEl = document.getElementById('ud-file');
    var fd = fileEl && fileEl.files[0] ? await readFileAsBase64(fileEl.files[0]) : null;
    var res = await callAPI('saveUndangan', { data: data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['ud-nomor','ud-tanggal','ud-penyelenggara','ud-pj','ud-perihal','ud-tglpelaksanaan','ud-waktu','ud-lokasi','ud-lat','ud-lng','ud-catatan']);
      if (fileEl) { fileEl.value = ''; }
      var fi = document.getElementById('ud-file-info'); if(fi) fi.textContent = '';
      togglePanel('form-undangan'); loadUndangan();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadUndangan() {
  try {
    var res = await callAPI('getUndangan', {});
    var tbody = document.getElementById('tbody-ud');
    if (!tbody) return;
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="10"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada undangan</td></tr>'; return;
    }
    tbody.innerHTML = res.data.map(function(d, i) {
      var safeData = encodeURIComponent(JSON.stringify(d));
      var url = d['URL'] || d['File URL'];
      var pdf = url ? '<a href="' + url + '" target="_blank" style="color:#e11d48" title="Lihat PDF"><i class="bi bi-file-earmark-pdf-fill"></i></a>' : '<span style="color:var(--text-muted)">-</span>';
      var lat = d['Latitude']; var lng = d['Longitude'];
      var lokasiBtn = (lat && lng) ? ' <a href="https://maps.google.com/?q=' + lat + ',' + lng + '" target="_blank" title="Buka di Maps"><i class="bi bi-geo-alt-fill" style="color:#16a34a"></i></a>' : '';
      return '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td><strong>' + esc(d['Nomor Surat'] || '-') + '</strong></td>' +
        '<td>' + esc(d['Penyelenggara'] || '-') + '</td>' +
        '<td>' + esc(d['Perihal'] || '-') + '</td>' +
        '<td>' + fmtDate(d['Tanggal Pelaksanaan'] || d['Tanggal'] || '-') + '</td>' +
        '<td style="font-size:.8rem">' + esc(d['Waktu'] || '-') + '</td>' +
        '<td style="font-size:.8rem">' + esc(d['Lokasi'] || '-') + lokasiBtn + '</td>' +
        '<td style="font-size:.8rem">' + esc(d['Penanggung Jawab'] || '-') + '</td>' +
        '<td style="text-align:center">' + pdf + '</td>' +
        '<td class="action-col" style="display:flex;gap:5px">' +
          '<button class="btn-primary-custom" style="padding:4px 10px;font-size:.78rem" onclick="buatAgendaDariUndangan(\'' + safeData + '\')"><i class="bi bi-calendar-plus"></i></button>' +
          '<button class="btn-warning-custom" onclick="openEditModal(\'Undangan\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn-danger-custom" onclick="deleteItem(\'deleteUndangan\',\'' + d['ID'] + '\',loadUndangan)"><i class="bi bi-trash"></i></button>' +
        '</td></tr>';
    }).join('');
  } catch(err) { /* silent */ }
}

function buatAgendaDariUndangan(encodedData) {
  var d = JSON.parse(decodeURIComponent(encodedData));
  navigateTo('agenda');
  setTimeout(function() {
    togglePanel('form-agenda');
    var nomor = document.getElementById('ag-nomor'); if (nomor) nomor.value = d['Nomor Surat'] || '';
    var tgl = document.getElementById('ag-tanggal'); if (tgl) tgl.value = d['Tanggal Pelaksanaan'] || d['Tanggal'] || '';
    var nama = document.getElementById('ag-nama'); if (nama) nama.value = d['Perihal'] || '';
    var lokasi = document.getElementById('ag-lokasi'); if (lokasi) lokasi.value = d['Lokasi'] || '';
    var waktu = document.getElementById('ag-waktu'); if (waktu) waktu.value = d['Waktu'] || '';
  }, 250);
}

// Agenda
function toggleDisposisiField() {
  var status = document.getElementById('ag-status');
  var card = document.getElementById('ag-disposisi-card');
  if (!status || !card) return;
  card.style.display = (status.value === 'Disposisi') ? 'block' : 'none';
}

async function submitAgenda() {
  var namaKegiatan = v('ag-nama');
  var tanggal = v('ag-tanggal');
  if (!namaKegiatan || !tanggal) { showToast('Nama Kegiatan dan Tanggal wajib diisi.', 'error'); return; }
  var status = v('ag-status') || 'Hadir';
  if (status === 'Disposisi' && !v('ag-disposisikepada')) { showToast('Field Didisposisikan Kepada wajib diisi!', 'error'); return; }
  var data = {
    nomorSuratRef: v('ag-nomor'), namaKegiatan: namaKegiatan, tanggal: tanggal,
    lokasi: v('ag-lokasi'), waktu: v('ag-waktu'), pakaian: v('ag-pakaian'),
    transit: v('ag-transit'), keterangan: v('ag-keterangan'),
    statusKehadiran: status, disposisiKepada: v('ag-disposisikepada'),
    instruksi: v('ag-instruksi'), disposisiDari: 'Bupati'
  };
  showSpinner('Menyimpan Agenda...');
  try {
    var res = await callAPI('saveAgenda', { data: data });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['ag-nomor','ag-tanggal','ag-nama','ag-lokasi','ag-waktu','ag-pakaian','ag-transit','ag-keterangan','ag-disposisikepada','ag-instruksi']);
      if (document.getElementById('ag-status')) document.getElementById('ag-status').value = 'Hadir';
      if (document.getElementById('ag-disposisi-card')) document.getElementById('ag-disposisi-card').style.display = 'none';
      togglePanel('form-agenda'); loadAgenda();
    } else showToast(res.message, 'error');
  } catch(err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadAgenda() {
  try {
    var res = await callAPI('getAgenda', {});
    var timeline = document.getElementById('agenda-timeline');
    var emptyPanel = document.getElementById('agenda-empty-panel');
    if (!timeline) return;
    if (!res.success || !res.data.length) {
      timeline.innerHTML = '';
      if (emptyPanel) emptyPanel.style.display = 'block';
      return;
    }
    if (emptyPanel) emptyPanel.style.display = 'none';

    // Group by tanggal
    var groups = {};
    res.data.forEach(function(d) {
      var tgl = d['Tanggal'] || 'Tanpa Tanggal';
      if (!groups[tgl]) groups[tgl] = [];
      groups[tgl].push(d);
    });

    // Sort tanggal descending
    var sortedDates = Object.keys(groups).sort(function(a, b) {
      return new Date(b) - new Date(a);
    });

    timeline.innerHTML = sortedDates.map(function(tgl) {
      var items = groups[tgl];
      var tglLabel = tgl === 'Tanpa Tanggal' ? tgl : new Date(tgl).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var cards = items.map(function(d) {
        var safeData = encodeURIComponent(JSON.stringify(d));
        var status = d['Status Kehadiran'] || '-';
        var statusColor = status === 'Hadir' ? '#16a34a' : (status === 'Disposisi' ? '#b45309' : '#e11d48');
        var statusIcon = status === 'Hadir' ? 'check-circle-fill' : (status === 'Disposisi' ? 'arrow-right-circle-fill' : 'x-circle-fill');
        return '<div style="background:var(--panel-bg);border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
            '<div style="font-weight:700;font-size:.95rem;color:var(--text-main)">' + esc(d['Nama Kegiatan'] || '-') + '</div>' +
            '<span style="font-size:.75rem;color:' + statusColor + ';background:' + statusColor + '22;padding:3px 9px;border-radius:20px;white-space:nowrap;display:flex;align-items:center;gap:4px"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:.82rem;color:var(--text-muted)">' +
            (d['Waktu'] ? '<span><i class="bi bi-clock"></i> ' + esc(d['Waktu']) + '</span>' : '') +
            (d['Lokasi'] ? '<span><i class="bi bi-geo-alt"></i> ' + esc(d['Lokasi']) + '</span>' : '') +
            (d['Pakaian'] ? '<span><i class="bi bi-person-bounding-box"></i> ' + esc(d['Pakaian']) + '</span>' : '') +
          '</div>' +
          (d['Keterangan'] && d['Keterangan'] !== '-' ? '<div style="font-size:.8rem;color:var(--text-muted);font-style:italic">' + esc(d['Keterangan']) + '</div>' : '') +
          '<div style="display:flex;gap:6px;margin-top:4px;justify-content:flex-end">' +
            '<button class="btn-warning-custom" style="padding:4px 10px;font-size:.75rem" onclick="openEditModal(\'Agenda\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn-danger-custom" style="padding:4px 10px;font-size:.75rem" onclick="deleteItem(\'deleteAgenda\',\'' + d['ID'] + '\',loadAgenda)"><i class="bi bi-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');

      return '<div style="margin-bottom:24px">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
          '<div style="background:var(--primary);color:#fff;border-radius:8px;padding:8px 14px;font-weight:700;font-size:.85rem;white-space:nowrap">' +
            '<i class="bi bi-calendar3"></i> ' + tglLabel +
          '</div>' +
          '<div style="flex:1;height:2px;background:var(--border)"></div>' +
          '<div style="font-size:.78rem;color:var(--text-muted)">' + items.length + ' agenda</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' + cards + '</div>' +
      '</div>';
    }).join('');
  } catch(err) { console.error('loadAgenda error:', err); }
}

// ══════════════════════════════════════════════════════════
//  MAP — UNDANGAN PICKER
// ══════════════════════════════════════════════════════════
var _udPickerMap = null, _udPickerMarker = null;

function initUdMapPicker() {
  var container = document.getElementById('ud-map-picker');
  if (!container || !window.L) return;
  if (_udPickerMap) { _udPickerMap.invalidateSize(); return; }

  var lat = parseFloat(document.getElementById('ud-lat').value) || -7.8797;
  var lng = parseFloat(document.getElementById('ud-lng').value) || 111.4638;

  _udPickerMap = L.map('ud-map-picker').setView([lat, lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(_udPickerMap);

  _udPickerMarker = L.marker([lat, lng], { draggable: true }).addTo(_udPickerMap);
  _udPickerMarker.bindPopup('Geser untuk pindah lokasi').openPopup();

  _udPickerMap.on('click', function(e) {
    _udPickerMarker.setLatLng(e.latlng);
    document.getElementById('ud-lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('ud-lng').value = e.latlng.lng.toFixed(6);
  });
  _udPickerMarker.on('dragend', function(e) {
    var pos = e.target.getLatLng();
    document.getElementById('ud-lat').value = pos.lat.toFixed(6);
    document.getElementById('ud-lng').value = pos.lng.toFixed(6);
  });
}

function updateUdMarker() {
  var lat = parseFloat(document.getElementById('ud-lat').value);
  var lng = parseFloat(document.getElementById('ud-lng').value);
  if (!_udPickerMap || !_udPickerMarker || isNaN(lat) || isNaN(lng)) return;
  _udPickerMarker.setLatLng([lat, lng]);
  _udPickerMap.setView([lat, lng], 15);
}

// ══════════════════════════════════════════════════════════
//  PETA AGENDA
// ══════════════════════════════════════════════════════════
var _petaMap = null, _petaMarkers = [];

async function loadPeta() {
  try {
    showSpinner('Memuat data peta...');
    var res = await callAPI('getUndangan', {});
    hideSpinner();
    if (!res.success) return;

    var data = res.data.filter(function(d) {
      return d['Latitude'] && d['Longitude'] &&
             parseFloat(d['Latitude']) !== 0 &&
             parseFloat(d['Longitude']) !== 0;
    });

    // Update count
    var countEl = document.getElementById('peta-count');
    if (countEl) countEl.textContent = data.length + ' lokasi ditemukan dari ' + res.data.length + ' undangan';

    // Init map
    if (!_petaMap) {
      _petaMap = L.map('peta-map').setView([-7.8797, 111.4638], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
      }).addTo(_petaMap);
    } else {
      _petaMarkers.forEach(function(m) { _petaMap.removeLayer(m); });
      _petaMarkers = [];
      _petaMap.invalidateSize();
    }

    if (data.length === 0) {
      L.popup().setLatLng([-7.8797, 111.4638]).setContent('<b>Tidak ada undangan berkoordinat.</b><br>Isi koordinat pada form undangan.').openOn(_petaMap);
    }

    data.forEach(function(d) {
      var lat = parseFloat(d['Latitude']);
      var lng = parseFloat(d['Longitude']);
      var color = '#0891b2';

      var svgIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
        iconSize: [16, 16], iconAnchor: [8, 8]
      });

      var popup = '<div style="min-width:200px;font-family:sans-serif">' +
        '<div style="font-weight:700;font-size:.95rem;margin-bottom:6px;color:#0f4c81">' + esc(d['Perihal'] || 'Agenda') + '</div>' +
        '<table style="font-size:.8rem;width:100%;border-collapse:collapse">' +
          (d['Penyelenggara'] ? '<tr><td style="color:gray;padding:2px 6px 2px 0">Penyelenggara</td><td><strong>' + esc(d['Penyelenggara']) + '</strong></td></tr>' : '') +
          (d['Tanggal Pelaksanaan'] ? '<tr><td style="color:gray;padding:2px 6px 2px 0">Tgl Pelaksanaan</td><td>' + fmtDate(d['Tanggal Pelaksanaan']) + '</td></tr>' : '') +
          (d['Waktu'] ? '<tr><td style="color:gray;padding:2px 6px 2px 0">Waktu</td><td>' + esc(d['Waktu']) + '</td></tr>' : '') +
          (d['Lokasi'] ? '<tr><td style="color:gray;padding:2px 6px 2px 0">Lokasi</td><td>' + esc(d['Lokasi']) + '</td></tr>' : '') +
          (d['Penanggung Jawab'] ? '<tr><td style="color:gray;padding:2px 6px 2px 0">PJ</td><td>' + esc(d['Penanggung Jawab']) + '</td></tr>' : '') +
        '</table>' +
        (d['URL'] ? '<a href="' + d['URL'] + '" target="_blank" style="display:block;margin-top:8px;font-size:.78rem;color:#e11d48"><i class="bi bi-file-earmark-pdf-fill"></i> Lihat PDF Undangan</a>' : '') +
      '</div>';

      var marker = L.marker([lat, lng], { icon: svgIcon }).addTo(_petaMap);
      marker.bindPopup(popup, { maxWidth: 280 });
      _petaMarkers.push(marker);
    });

    // Fit bounds
    if (_petaMarkers.length > 0) {
      var group = L.featureGroup(_petaMarkers);
      _petaMap.fitBounds(group.getBounds().pad(0.2));
    }

    // Render list cards
    var listEl = document.getElementById('peta-list');
    if (listEl) {
      if (data.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:20px"><i class="bi bi-geo-alt"></i> Belum ada undangan yang memiliki koordinat. Tambahkan koordinat pada form undangan.</p>';
      } else {
        listEl.innerHTML = data.map(function(d, idx) {
          return '<div style="background:var(--panel-bg);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer" onclick="focusPetaMarker(' + idx + ')">' +
            '<div style="font-weight:700;font-size:.88rem;color:var(--text-main);margin-bottom:4px">' + esc(d['Perihal'] || 'Agenda') + '</div>' +
            '<div style="font-size:.78rem;color:var(--text-muted)">' + esc(d['Lokasi'] || '-') + '</div>' +
            '<div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">' + fmtDate(d['Tanggal Pelaksanaan'] || d['Tanggal']) + '</div>' +
          '</div>';
        }).join('');
      }
    }
  } catch(err) { hideSpinner(); showToast('Gagal memuat peta: ' + err.message, 'error'); }
}

function focusPetaMarker(idx) {
  if (!_petaMarkers[idx]) return;
  var latlng = _petaMarkers[idx].getLatLng();
  _petaMap.setView(latlng, 16, { animate: true });
  _petaMarkers[idx].openPopup();
}

// Disposisi
async function submitDisposisi() {
  var kepada = v('disp-kepada'), instruksi = v('disp-instruksi');
  if (!kepada || !instruksi) { showToast('Field Kepada dan Instruksi wajib diisi.', 'error'); return; }
  var data = { agendaId: v('disp-ref') || '-', dari: v('disp-dari') || 'Bupati', kepada: kepada, instruksi: instruksi };
  showSpinner('Menyimpan Disposisi...');
  try {
    var res = await callAPI('saveDisposisi', { data: data });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['disp-ref','disp-kepada','disp-instruksi']);
      var dari = document.getElementById('disp-dari'); if(dari) dari.value = 'Bupati';
      togglePanel('form-disposisi'); loadDisposisi();
    } else showToast(res.message, 'error');
  } catch(err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadDisposisi() {
  try {
    var res = await callAPI('getDisposisi', {});
    var tbody = document.getElementById('tbody-disp');
    if (!tbody) return;
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="8"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada disposisi</td></tr>';
      animateCount('disp-stat-total', 0); animateCount('disp-stat-proses', 0); animateCount('disp-stat-selesai', 0);
      return;
    }
    tbody.innerHTML = res.data.map(function(d, i) {
      var safeData = encodeURIComponent(JSON.stringify(d));
      var status = d['Status'] || 'Diproses';
      var statusClass = status === 'Selesai' ? 'badge-cat masuk' : 'badge-cat sk';
      return '<tr><td>' + (i+1) + '</td><td style="font-size:.8rem">' + fmtDate(d['Tanggal']) + '</td><td>' + esc(d['Dari'] || 'Bupati') + '</td><td><strong>' + esc(d['Kepada'] || '-') + '</strong></td><td style="font-size:.82rem;max-width:200px;word-break:break-word">' + esc(d['Isi Disposisi'] || d['Instruksi'] || '-') + '</td><td style="font-size:.78rem;color:var(--text-muted)">' + esc(d['Referensi Agenda ID'] || d['Referensi'] || '-') + '</td><td><span class="' + statusClass + '">' + esc(status) + '</span></td><td class="action-col" style="display:flex;gap:5px"><button class="btn-warning-custom" onclick="openEditModal(\'Disposisi\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'deleteDisposisi\',\'' + d['ID'] + '\',loadDisposisi)"><i class="bi bi-trash"></i></button></td></tr>';
    }).join('');
    var total = res.data.length;
    var selesai = res.data.filter(function(d){ return d['Status'] === 'Selesai'; }).length;
    animateCount('disp-stat-total', total);
    animateCount('disp-stat-proses', total - selesai);
    animateCount('disp-stat-selesai', selesai);
  } catch(err) { /* silent */ }
}

// Surat Tugas & Perintah
async function submitSPTUpload(jenis) {
  var prefix = jenis === 'SURAT_TUGAS' ? 'st' : 'sp';
  var data = { nomorSpt: v(prefix+'-nomor'), nama: v(prefix+'-nama'), nip: v(prefix+'-nip'), jabatan: v(prefix+'-jabatan'), tujuan: v(prefix+'-tujuan'), keperluan: '-', tglBerangkat: v(prefix+'-mulai'), tglKembali: v(prefix+'-selesai'), keterangan: '-' };
  if (!data.nomorSpt || !data.nama || !data.tujuan) { showToast('Nomor, Nama, dan Tujuan wajib diisi.', 'error'); return; }
  var fileEl = document.getElementById(prefix+'-file');
  var apiAction = jenis === 'SURAT_TUGAS' ? 'saveSuratTugas' : 'saveSuratPerintah';
  showSpinner('Menyimpan & Mengunggah...');
  try {
    var fd = fileEl && fileEl.files[0] ? await readFileAsBase64(fileEl.files[0]) : null;
    var res = await callAPI(apiAction, { data: data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields([prefix+'-nomor',prefix+'-nama',prefix+'-nip',prefix+'-jabatan',prefix+'-tujuan',prefix+'-mulai',prefix+'-selesai']);
      if (fileEl) { fileEl.value = ''; var fi = document.getElementById(prefix+'-file-info'); if (fi) fi.textContent = ''; }
      togglePanel('form-'+prefix);
      if (jenis === 'SURAT_TUGAS') loadSuratTugas(); else loadSuratPerintah();
    } else showToast(res.message, 'error');
  } catch(err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function submitCreateSPT(jenis) {
  if (!jenis) jenis = 'SURAT_TUGAS'; // fallback ke SURAT_TUGAS
  var prefix = jenis === 'SURAT_TUGAS' ? 'st' : 'sp';
  var data = { nomorSpt: v(prefix+'-nomor'), nama: v(prefix+'-nama'), nip: v(prefix+'-nip'), jabatan: v(prefix+'-jabatan'), tujuan: v(prefix+'-tujuan'), keperluan: '-', tglBerangkat: v(prefix+'-mulai'), tglKembali: v(prefix+'-selesai'), keterangan: '-' };
  if (!data.nomorSpt || !data.nama || !data.tujuan) { showToast('Nomor, Nama, dan Tujuan wajib diisi sebelum cetak.', 'error'); return; }
  var apiAction = jenis === 'SURAT_TUGAS' ? 'saveSuratTugas' : 'saveSuratPerintah';
  var judulSurat = jenis === 'SURAT_TUGAS' ? 'SURAT TUGAS' : 'SURAT PERINTAH';
  showSpinner('Menyimpan & Membuka Preview Cetak...');
  try {
    var res = await callAPI(apiAction, { data: data, fileData: null });
    hideSpinner();
    if (res.success) {
      showToast('Tersimpan. Membuka dokumen cetak...', 'success');
      data['Nomor SPT'] = data.nomorSpt; data['Nama'] = data.nama; data['NIP'] = data.nip;
      data['Jabatan'] = data.jabatan; data['Tujuan'] = data.tujuan; data['Keperluan'] = data.keperluan;
      data['Tgl Berangkat'] = data.tglBerangkat; data['Tgl Kembali'] = data.tglKembali;
      printDocSPT(encodeURIComponent(JSON.stringify(data)), judulSurat);
    } else showToast(res.message, 'error');
  } catch(err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadSuratTugas() {
  try {
    var res = await callAPI('getSuratTugas', {});
    var tbody = document.getElementById('tbody-st');
    if (!tbody) return;
    if (!res.success || !res.data.length) { tbody.innerHTML = '<tr class="no-data"><td colspan="6"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data</td></tr>'; return; }
    tbody.innerHTML = renderSPTRows(res.data, 'deleteSuratTugas', loadSuratTugas, 'SURAT_TUGAS', 'Surat Tugas');
  } catch(err) { /* silent */ }
}

async function loadSuratPerintah() {
  try {
    var res = await callAPI('getSuratPerintah', {});
    var tbody = document.getElementById('tbody-sp');
    if (!tbody) return;
    if (!res.success || !res.data.length) { tbody.innerHTML = '<tr class="no-data"><td colspan="6"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data</td></tr>'; return; }
    tbody.innerHTML = renderSPTRows(res.data, 'deleteSuratPerintah', loadSuratPerintah, 'SURAT_PERINTAH', 'Surat Perintah');
  } catch(err) { /* silent */ }
}

function renderSPTRows(data, deleteAction, reloadFn, jenis, shName) {
  return data.map(function(d, i) {
    var safeData = encodeURIComponent(JSON.stringify(d));
    var url = d['URL'] || d['File URL'];
    var lampiran = url ? '<button class="btn-link-custom" style="padding:4px 8px;font-size:.75rem" onclick="openPreview(\'' + url + '\')"><i class="bi bi-eye"></i></button>' : '-';
    var judulCetak = jenis === 'SURAT_TUGAS' ? 'SURAT TUGAS' : 'SURAT PERINTAH';
    return '<tr><td>' + (i+1) + '</td><td><strong>' + esc(d['Nomor SPT'] || '-') + '</strong></td><td>' + esc(d['Nama'] || '-') + '</td><td>' + esc(d['Tujuan'] || '-') + '</td><td style="font-size:.8rem">' + fmtDate(d['Tgl Berangkat'] || '-') + '<br>s/d ' + fmtDate(d['Tgl Kembali'] || '-') + '</td><td class="action-col" style="display:flex;gap:5px">' + lampiran + '<button class="btn-primary-custom" style="padding:4px 10px" onclick="printDocSPT(\'' + safeData + '\',\'' + judulCetak + '\')"><i class="bi bi-printer"></i></button><button class="btn-warning-custom" onclick="openEditModal(\'' + shName + '\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'' + deleteAction + '\',\'' + d['ID'] + '\',loadSuratTugas)"><i class="bi bi-trash"></i></button></td></tr>';
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  RENDER SURAT TABLE
// ══════════════════════════════════════════════════════════
function renderSuratTable(tbodyId, res, cols, badgeClass, deleteAction, reloadFn) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var colCount = cols.length + 3;
  if (!res.success || !res.data.length) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="' + colCount + '"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data</td></tr>'; return;
  }
  tbody.innerHTML = res.data.map(function (d, i) {
    var cells = cols.map(function (col) {
      var val = d[col] || '-';
      if (col === 'Kategori') return '<td><span class="badge-cat ' + badgeClass + '">' + esc(val) + '</span></td>';
      if (col === 'Tanggal') return '<td>' + fmtDate(val) + '</td>';
      return '<td>' + esc(val) + '</td>';
    }).join('');

    // Mapping Sheet Name for Edit Modal depending on deleteAction
    var shName = 'Surat Masuk';
    if(deleteAction === 'deleteSuratKeluar') shName = 'Surat Keluar';
    if(deleteAction === 'deleteUndangan') shName = 'Undangan';

    var safeData = encodeURIComponent(JSON.stringify(d));
    var url = d['URL'] || d['File URL'];
    var lampiran = url ? '<button class="btn-link-custom" style="padding:4px 8px;font-size:0.75rem" onclick="openPreview(\'' + url + '\')"><i class="bi bi-eye"></i></button>' : '<span style="color:var(--text-muted);font-size:.78rem">-</span>';
    return '<tr><td>' + (i + 1) + '</td>' + cells + '<td>' + lampiran + '</td><td class="action-col" style="display:flex;gap:5px"><button class="btn-warning-custom" onclick="openEditModal(\''+shName+'\', \'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'' + deleteAction + '\',\'' + d['ID'] + '\',' + reloadFn.name + ')"><i class="bi bi-trash"></i></button></td></tr>';
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  SPT - LEGACY CLEANUP (Kept for reference if needed, but logic moved to jenis-based)
// ══════════════════════════════════════════════════════════

function printDocSPT(encodedData, judulSurat) {
  var d = JSON.parse(decodeURIComponent(encodedData));
  if (!judulSurat) judulSurat = 'SURAT PERINTAH TUGAS';
  var k1 = localStorage.getItem('senapati_kop1') || 'PEMERINTAH KABUPATEN PONOROGO';
  var k2 = localStorage.getItem('senapati_kop2') || 'BUPATI PONOROGO';
  var k3 = localStorage.getItem('senapati_kop3') || 'Jl. Alun-Alun Utara No. 1, Ponorogo';
  var tKota = localStorage.getItem('senapati_ttd_kota') || 'Ponorogo';
  var tJab = localStorage.getItem('senapati_ttd_jabatan') || 'Bupati Ponorogo,';
  var tNama = localStorage.getItem('senapati_ttd_nama') || '________________________';
  var tNip = localStorage.getItem('senapati_ttd_nip') || '........................................';

  var w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Cetak SPT - ${d['Nomor SPT'] || ''}</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.5; color: #000; }
      .kop { display: flex; align-items: center; justify-content: center; border-bottom: 4px solid #000; padding-bottom: 12px; margin-bottom: 2px; }
      .kop-border { border-top: 1px solid #000; width: 100%; height: 1px; margin-bottom: 30px; }
      .kop img { width: 90px; margin-right: 20px; }
      .kop-text { text-align: center; line-height: 1.2; }
      .kop-text h2 { margin: 0; font-size: 16pt; font-weight: normal; }
      .kop-text h1 { margin: 4px 0; font-size: 20pt; font-weight: bold; }
      .kop-text p { margin: 0; font-size: 11pt; }
      .title { text-align: center; margin-bottom: 30px; }
      .title h3 { margin: 0; text-decoration: underline; font-size: 14pt; }
      .title p { margin: 4px 0 0; font-size: 12pt; }
      .content { font-size: 12pt; margin-left: 20px; margin-right: 20px; }
      .row { display: flex; margin-bottom: 8px; }
      .label { width: 150px; font-weight: normal; }
      .colon { width: 20px; }
      .val { flex: 1; text-align: justify; }
      .sig { margin-top: 60px; display: flex; justify-content: flex-end; }
      .sig-box { text-align: left; width: 330px; }
      @media print { body { padding: 0; } }
    </style></head><body>
      <div class="kop">
        <img src="${BASE_URL}/assets/icon-512.png" />
        <div class="kop-text">
          <h2>${k1}</h2>
          <h1>${k2}</h1>
          <p>${k3}</p>
        </div>
      </div>
      <div class="kop-border"></div>
      
      <div class="title">
        <h3>${judulSurat}</h3>
        <p>Nomor: ${d['Nomor SPT'] || '-'}</p>
      </div>

      <div class="content">
        <p style="margin-bottom: 16px;">Yang bertanda tangan di bawah ini, menginstruksikan kepada:</p>
        <div class="row"><div class="label">Nama</div><div class="colon">:</div><div class="val"><strong>${d['Nama'] || '-'}</strong></div></div>
        <div class="row"><div class="label">NIP</div><div class="colon">:</div><div class="val">${d['NIP'] || '-'}</div></div>
        <div class="row"><div class="label">Jabatan</div><div class="colon">:</div><div class="val">${d['Jabatan'] || '-'}</div></div>
        
        <p style="margin-top:20px; margin-bottom: 12px;">Untuk melaksanakan tugas:</p>
        <div class="row"><div class="label">Tujuan</div><div class="colon">:</div><div class="val">${d['Tujuan'] || '-'}</div></div>
        <div class="row"><div class="label">Keperluan</div><div class="colon">:</div><div class="val">${d['Keperluan'] || '-'}</div></div>
        <div class="row"><div class="label">Waktu Tunda</div><div class="colon">:</div><div class="val">${fmtDate(d['Tgl Berangkat'] || d['Tanggal Berangkat'])} s/d ${fmtDate(d['Tgl Kembali'] || d['Tanggal Kembali'])}</div></div>
        <div class="row"><div class="label">Keterangan</div><div class="colon">:</div><div class="val">${d['Keterangan'] || '-'}</div></div>

        <p style="margin-top: 24px;">Demikian Surat Perintah Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>
      </div>

      <div class="sig">
        <div class="sig-box">
          <p>${tKota}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
          <span style="font-weight:bold;">${tJab}</span></p>
          <br/><br/><br/><br/>
          <p style="text-decoration: underline; font-weight: bold; margin: 0;">${tNama}</p>
          <p style="margin: 0;">NIP. ${tNip}</p>
        </div>
      </div>
    </body></html>
  `);
  w.document.close();
  setTimeout(() => { w.print(); }, 800);
}

function printPage() {
  var currentPage = APP.currentPage;
  var title = 'Laporan Dokumen';
  var tableIdStr = '';
  
  if (currentPage === 'arsip') {
    title = 'LAPORAN REKAPITULASI ARSIP DOKUMEN'; tableIdStr = 'arsip-table';
  } else if (currentPage === 'surat-masuk') {
    title = 'LAPORAN REKAPITULASI SURAT MASUK'; tableIdStr = 'table-sm';
  } else if (currentPage === 'surat-keluar') {
    title = 'LAPORAN REKAPITULASI SURAT KELUAR'; tableIdStr = 'table-sk';
  } else if (currentPage === 'undangan') {
    title = 'LAPORAN REKAPITULASI UNDANGAN'; tableIdStr = 'table-ud';
  } else if (currentPage === 'agenda') {
    // Agenda uses timeline — generate simple print from timeline
    window.print(); return;
  } else if (currentPage === 'disposisi') {
    title = 'LAPORAN REKAPITULASI DISPOSISI'; tableIdStr = 'table-disp';
  } else {
    showToast('Tidak ada data yang dapat dicetak pada halaman ini.', 'error'); return;
  }
  
  var tableEl = document.getElementById(tableIdStr);
  if (!tableEl) { showToast('Tabel tidak ditemukan.', 'error'); return; }
  
  var clone = tableEl.cloneNode(true);
  // Remove Aksi column (last column)
  var thr = clone.querySelector('thead tr');
  if (thr && thr.lastElementChild) thr.removeChild(thr.lastElementChild);
  clone.querySelectorAll('tbody tr').forEach(function(tr) {
    if (!tr.classList.contains('no-data') && tr.lastElementChild) tr.removeChild(tr.lastElementChild);
  });
  
  var k1 = localStorage.getItem('senapati_kop1') || 'PEMERINTAH KABUPATEN PONOROGO';
  var k2 = localStorage.getItem('senapati_kop2') || 'BUPATI PONOROGO';
  var k3 = localStorage.getItem('senapati_kop3') || 'Jl. Alun-Alun Utara No. 1, Ponorogo';
  var kTelp = localStorage.getItem('senapati_kop_telp') || '';
  var logoKiri = localStorage.getItem('senapati_logo_kiri_data') || '';
  var logoKanan = localStorage.getItem('senapati_logo_kanan_data') || '';
  var logoKiriSize = localStorage.getItem('senapati_logo_kiri_size') || '70';
  var logoKananSize = localStorage.getItem('senapati_logo_kanan_size') || '70';
  var defaultLogo = BASE_URL + '/assets/icon-512.png';
  
  var leftImg = logoKiri ? ('<img src="' + logoKiri + '" style="width:' + logoKiriSize + 'px;margin-right:16px;">') 
                        : ('<img src="' + defaultLogo + '" style="width:70px;margin-right:16px;">');
  var rightImg = logoKanan ? ('<img src="' + logoKanan + '" style="width:' + logoKananSize + 'px;margin-left:16px;">') : '';

  var now = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  var w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Cetak Laporan - SENAPATI</title>
    <style>
      @page { size: A4 landscape; margin: 15mm 15mm 15mm 15mm; }
      body { font-family: 'Times New Roman', Times, serif; padding: 0; color: #000; font-size: 10pt; }
      .kop { display: flex; align-items: center; justify-content: center; border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 2px; }
      .kop-border { border-top: 1px solid #000; margin-bottom: 16px; }
      .kop-text { text-align: center; line-height: 1.2; flex: 1; }
      .kop-text h2 { margin: 0; font-size: 12pt; font-weight: normal; }
      .kop-text h1 { margin: 3px 0; font-size: 16pt; font-weight: bold; }
      .kop-text p { margin: 0; font-size: 9pt; }
      .title { text-align: center; margin-bottom: 14px; }
      .title h3 { margin: 0; font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; }
      .title p { font-size: 9pt; margin: 4px 0 0; }
      table { width: 100%; border-collapse: collapse; font-size: 9pt; }
      th { border: 1px solid #000; padding: 6px 8px; text-align: center; background: #e8e8e8; font-weight: bold; white-space: nowrap; }
      td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; word-break: break-word; }
      tr:nth-child(even) td { background: #fafafa; }
      @media print { 
        body { margin: 0; padding: 0; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
      }
    </style></head><body>
      <div class="kop">
        ${leftImg}
        <div class="kop-text">
          <h2>${k1}</h2>
          <h1>${k2}</h1>
          <p>${k3}${kTelp ? ' &mdash; Telp: ' + kTelp : ''}</p>
        </div>
        ${rightImg}
      </div>
      <div class="kop-border"></div>
      <div class="title">
        <h3>${title}</h3>
        <p>Dicetak pada: ${now}</p>
      </div>
      ${clone.outerHTML}
    </body></html>
  `);
  w.document.close();
  setTimeout(() => { w.print(); }, 800);
}

// ══════════════════════════════════════════════════════════
//  UNIVERSAL EDIT
// ══════════════════════════════════════════════════════════
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  currentEditData = null;
  document.getElementById('edit-file').value = '';
  document.getElementById('edit-file-info').textContent = '';
}

function openEditModal(sheetType, dataEnc) {
  var d = JSON.parse(decodeURIComponent(dataEnc));
  currentEditData = { sheet: sheetType, id: d['ID'], oriData: d };
  document.getElementById('edit-modal-title').textContent = 'Edit Data ' + sheetType;
  
  var c = document.getElementById('edit-form-container');
  var html = '';
  
  if (sheetType === 'Arsip') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nama File</label><input type="text" id="ed-arsip-nama" class="form-control-custom" value="${esc(d['Nama File'])}"></div>
        <div class="form-group"><label>Kategori</label><input type="text" id="ed-arsip-kat" class="form-control-custom" value="${esc(d['Kategori'])}"></div>
      </div>
      <div class="form-group"><label>Deskripsi</label><input type="text" id="ed-arsip-desk" class="form-control-custom" value="${esc(d['Deskripsi'])}"></div>
      <div class="form-group"><label>Tanggal Arsip Asli</label><input type="date" id="ed-arsip-tgl" class="form-control-custom" value="${d['Tanggal Arsip'] ? d['Tanggal Arsip'].substring(0,10) : ''}"></div>`;
  } else if (sheetType === 'Surat Masuk') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Surat</label><input type="text" id="ed-sm-nomor" class="form-control-custom" value="${esc(d['Nomor Surat'])}"></div>
        <div class="form-group"><label>Tanggal</label><input type="date" id="ed-sm-tgl" class="form-control-custom" value="${d['Tanggal']}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Pengirim</label><input type="text" id="ed-sm-pengirim" class="form-control-custom" value="${esc(d['Pengirim'])}"></div>
        <div class="form-group"><label>Kategori</label><input type="text" id="ed-sm-kat" class="form-control-custom" value="${esc(d['Kategori'])}"></div>
      </div>
      <div class="form-group"><label>Perihal</label><input type="text" id="ed-sm-perihal" class="form-control-custom" value="${esc(d['Perihal'])}"></div>
      <div class="form-group"><label>Catatan</label><input type="text" id="ed-sm-catatan" class="form-control-custom" value="${esc(d['Catatan'])}"></div>`;
  } else if (sheetType === 'Surat Keluar') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Surat</label><input type="text" id="ed-sk-nomor" class="form-control-custom" value="${esc(d['Nomor Surat'])}"></div>
        <div class="form-group"><label>Tanggal</label><input type="date" id="ed-sk-tgl" class="form-control-custom" value="${d['Tanggal']}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Tujuan</label><input type="text" id="ed-sk-tujuan" class="form-control-custom" value="${esc(d['Tujuan'])}"></div>
        <div class="form-group"><label>Kategori</label><input type="text" id="ed-sk-kat" class="form-control-custom" value="${esc(d['Kategori'])}"></div>
      </div>
      <div class="form-group"><label>Perihal</label><input type="text" id="ed-sk-perihal" class="form-control-custom" value="${esc(d['Perihal'])}"></div>
      <div class="form-group"><label>Catatan</label><input type="text" id="ed-sk-catatan" class="form-control-custom" value="${esc(d['Catatan'])}"></div>`;
  } else if (sheetType === 'Undangan') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Surat</label><input type="text" id="ed-ud-nomor" class="form-control-custom" value="${esc(d['Nomor Surat'])}"></div>
        <div class="form-group"><label>Tanggal</label><input type="date" id="ed-ud-tgl" class="form-control-custom" value="${d['Tanggal']}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Penyelenggara</label><input type="text" id="ed-ud-peny" class="form-control-custom" value="${esc(d['Penyelenggara'])}"></div>
        <div class="form-group"><label>Lokasi</label><input type="text" id="ed-ud-lokasi" class="form-control-custom" value="${esc(d['Lokasi'])}"></div>
      </div>
      <div class="form-group"><label>Perihal</label><input type="text" id="ed-ud-perihal" class="form-control-custom" value="${esc(d['Perihal'])}"></div>
      <div class="form-group"><label>Catatan</label><input type="text" id="ed-ud-catatan" class="form-control-custom" value="${esc(d['Catatan'])}"></div>`;
  } else if (sheetType === 'Agenda') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Surat Ref</label><input type="text" id="ed-ag-nomor" class="form-control-custom" value="${esc(d['Nomor Surat Ref'])}"></div>
        <div class="form-group"><label>Nama Kegiatan</label><input type="text" id="ed-ag-nama" class="form-control-custom" value="${esc(d['Nama Kegiatan'])}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Lokasi</label><input type="text" id="ed-ag-lokasi" class="form-control-custom" value="${esc(d['Lokasi'])}"></div>
        <div class="form-group"><label>Waktu</label><input type="text" id="ed-ag-waktu" class="form-control-custom" value="${esc(d['Waktu'])}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Pakaian</label><input type="text" id="ed-ag-pakaian" class="form-control-custom" value="${esc(d['Pakaian'])}"></div>
        <div class="form-group"><label>Transit</label><input type="text" id="ed-ag-transit" class="form-control-custom" value="${esc(d['Transit'])}"></div>
      </div>
      <div class="form-group"><label>Keterangan</label><textarea id="ed-ag-ket" class="form-control-custom" rows="2">${esc(d['Keterangan'])}</textarea></div>
      <div class="form-group"><label>Status Kehadiran</label>
        <select id="ed-ag-status" class="form-control-custom">
          <option value="Hadir" ${d['Status Kehadiran'] === 'Hadir' ? 'selected' : ''}>Hadir</option>
          <option value="Tidak Hadir" ${d['Status Kehadiran'] === 'Tidak Hadir' ? 'selected' : ''}>Tidak Hadir</option>
          <option value="Disposisi" ${d['Status Kehadiran'] === 'Disposisi' ? 'selected' : ''}>Disposisi</option>
        </select>
      </div>`;
  } else if (sheetType === 'Disposisi') {
    html = `<div class="form-group"><label>Referensi Agenda ID</label><input type="text" id="ed-disp-ref" class="form-control-custom" value="${esc(d['Referensi Agenda ID'])}" readonly></div>
      <div class="grid-2">
        <div class="form-group"><label>Dari</label><input type="text" id="ed-disp-dari" class="form-control-custom" value="${esc(d['Dari'])}"></div>
        <div class="form-group"><label>Kepada</label><input type="text" id="ed-disp-kepada" class="form-control-custom" value="${esc(d['Kepada'])}"></div>
      </div>
      <div class="form-group"><label>Isi Disposisi</label><textarea id="ed-disp-inst" class="form-control-custom" rows="3">${esc(d['Isi Disposisi'])}</textarea></div>
      <div class="form-group"><label>Status</label>
        <select id="ed-disp-status" class="form-control-custom">
          <option value="Menunggu" ${d['Status'] === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
          <option value="Proses" ${d['Status'] === 'Proses' ? 'selected' : ''}>Proses</option>
          <option value="Selesai" ${d['Status'] === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </div>`;
  } else if (sheetType === 'Surat Tugas' || sheetType === 'Surat Perintah' || sheetType === 'SPT') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Dokumen</label><input type="text" id="ed-spt-nomor" class="form-control-custom" value="${esc(d['Nomor SPT'])}"></div>
        <div class="form-group"><label>Tujuan / Lokasi</label><input type="text" id="ed-spt-tujuan" class="form-control-custom" value="${esc(d['Tujuan'])}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Nama Personel</label><input type="text" id="ed-spt-nama" class="form-control-custom" value="${esc(d['Nama'])}"></div>
        <div class="form-group"><label>NIP</label><input type="text" id="ed-spt-nip" class="form-control-custom" value="${esc(d['NIP'])}"></div>
      </div>
      <div class="form-group"><label>Jabatan</label><input type="text" id="ed-spt-jab" class="form-control-custom" value="${esc(d['Jabatan'])}"></div>
      <div class="grid-2">
        <div class="form-group"><label>Tgl Berangkat</label><input type="date" id="ed-spt-mulai" class="form-control-custom" value="${d['Tgl Berangkat'] || ''}"></div>
        <div class="form-group"><label>Tgl Selesai</label><input type="date" id="ed-spt-selesai" class="form-control-custom" value="${d['Tgl Kembali'] || ''}"></div>
      </div>`;
  }
  
  c.innerHTML = html;
  document.getElementById('edit-modal').style.display = 'flex';
}

async function submitEditData() {
  if (!currentEditData) return;
  var payload = { id: currentEditData.id, sheetName: currentEditData.sheet, data: {} };
  var t = currentEditData.sheet;
  
  if (t === 'Arsip') { payload.data = { namaFile: v('ed-arsip-nama'), kategori: v('ed-arsip-kat'), deskripsi: v('ed-arsip-desk'), tglArsip: v('ed-arsip-tgl') }; }
  else if (t === 'Surat Masuk') { payload.data = { nomorSurat: v('ed-sm-nomor'), tanggal: v('ed-sm-tgl'), pengirim: v('ed-sm-pengirim'), perihal: v('ed-sm-perihal'), catatan: v('ed-sm-catatan'), kategori: v('ed-sm-kat') }; }
  else if (t === 'Surat Keluar') { payload.data = { nomorSurat: v('ed-sk-nomor'), tanggal: v('ed-sk-tgl'), tujuan: v('ed-sk-tujuan'), perihal: v('ed-sk-perihal'), catatan: v('ed-sk-catatan'), kategori: v('ed-sk-kat') }; }
  else if (t === 'Undangan') { payload.data = { nomorSurat: v('ed-ud-nomor'), tanggal: v('ed-ud-tgl'), penyelenggara: v('ed-ud-peny'), perihal: v('ed-ud-perihal'), catatan: v('ed-ud-catatan'), lokasi: v('ed-ud-lokasi') }; }
  else if (t === 'Agenda') { payload.data = { nomorSuratRef: v('ed-ag-nomor'), namaKegiatan: v('ed-ag-nama'), lokasi: v('ed-ag-lokasi'), waktu: v('ed-ag-waktu'), pakaian: v('ed-ag-pakaian'), transit: v('ed-ag-transit'), keterangan: v('ed-ag-ket'), statusKehadiran: v('ed-ag-status') }; }
  else if (t === 'Disposisi') { payload.data = { agendaId: v('ed-disp-ref'), dari: v('ed-disp-dari'), kepada: v('ed-disp-kepada'), instruksi: v('ed-disp-inst'), status: v('ed-disp-status') }; }
  else if (t === 'Surat Tugas' || t === 'Surat Perintah' || t === 'SPT') { payload.data = { nomorSpt: v('ed-spt-nomor'), nama: v('ed-spt-nama'), nip: v('ed-spt-nip'), jabatan: v('ed-spt-jab'), tujuan: v('ed-spt-tujuan'), tglBerangkat: v('ed-spt-mulai'), tglKembali: v( 'ed-spt-selesai') }; }
  
  var fileEl = document.getElementById('edit-file');
  var fd = null;
  if (fileEl && fileEl.files[0]) fd = await readFileAsBase64(fileEl.files[0]);
  
  showSpinner('Menyimpan perubahan data...');
  try {
    var realSheetName = t;
    // Map to canonical sheet names if needed
    var res = await callAPI('updateRow', { sheetName: realSheetName, id: payload.id, data: payload.data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast('Data berhasil diperbarui!', 'success');
      closeEditModal();
      if (t === 'Arsip') loadArsip();
      else if (t === 'Surat Masuk') loadSuratMasuk();
      else if (t === 'Surat Keluar') loadSuratKeluar();
      else if (t === 'Undangan') loadUndangan();
      else if (t === 'Agenda') loadAgenda();
      else if (t === 'Disposisi') loadDisposisi();
      else if (t === 'Surat Tugas') loadSuratTugas();
      else if (t === 'Surat Perintah' || t==='SPT') loadSuratPerintah();
    } else {
      showToast(res.message, 'error');
    }
  } catch(e) {
    hideSpinner(); showToast('Error: ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  PENGATURAN (Setup DB, Users & Cetak)
// ══════════════════════════════════════════════════════════
function setPgTab(tabId) {
  document.querySelectorAll('#page-pengaturan .custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('#page-pengaturan .tab-content').forEach(function (c) { c.style.display = 'none'; });
  
  var activeBtn = document.getElementById('tab-' + tabId);
  var contentBlock = document.getElementById('content-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');
  if (contentBlock) contentBlock.style.display = 'block';
  
  if (tabId === 'pg-cetak') loadKopSettings();
}

function loadKopSettings() {
  var fields = {
    'set-kop1': ['senapati_kop1', 'PEMERINTAH KABUPATEN PONOROGO'],
    'set-kop2': ['senapati_kop2', 'BUPATI PONOROGO'],
    'set-kop3': ['senapati_kop3', 'Jl. Alun-Alun Utara No. 1, Ponorogo'],
    'set-kop-telp': ['senapati_kop_telp', ''],
    'set-ttd-kota': ['senapati_ttd_kota', 'Ponorogo'],
    'set-ttd-jabatan': ['senapati_ttd_jabatan', 'Bupati Ponorogo,'],
    'set-ttd-nama': ['senapati_ttd_nama', '________________________'],
    'set-ttd-nip': ['senapati_ttd_nip', '........................................'],
    'set-logo-kiri-size': ['senapati_logo_kiri_size', '90'],
    'set-logo-kanan-size': ['senapati_logo_kanan_size', '90'],
    'set-logo-size': ['senapati_logo_size', '90'],
    'set-font-size': ['senapati_font_size', '12'],
    'set-penutup': ['senapati_penutup', 'Demikian Surat ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.']
  };
  Object.keys(fields).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = localStorage.getItem(fields[id][0]) || fields[id][1];
  });
  // Select fields
  var logoPos = document.getElementById('set-logo-pos');
  if (logoPos) logoPos.value = localStorage.getItem('senapati_logo_pos') || 'left';
  // Restore logo previews
  var kiriData = localStorage.getItem('senapati_logo_kiri_data');
  if (kiriData) {
    var kiriPrev = document.getElementById('set-logo-kiri-preview');
    var kiriImg = document.getElementById('logo-kiri-img');
    if (kiriImg) kiriImg.src = kiriData;
    if (kiriPrev) kiriPrev.style.display = 'block';
  }
  var kananData = localStorage.getItem('senapati_logo_kanan_data');
  if (kananData) {
    var kananPrev = document.getElementById('set-logo-kanan-preview');
    var kananImg = document.getElementById('logo-kanan-img');
    if (kananImg) kananImg.src = kananData;
    if (kananPrev) kananPrev.style.display = 'block';
  }
  updateSptPreview();
}

function handleLogoUpload(side, inputEl) {
  var file = inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Ukuran logo maksimal 2MB.', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    localStorage.setItem('senapati_logo_' + side + '_data', dataUrl);
    var sizeEl = document.getElementById('set-logo-' + side + '-size');
    if (sizeEl) localStorage.setItem('senapati_logo_' + side + '_size', sizeEl.value || '90');
    var prevContainer = document.getElementById('set-logo-' + side + '-preview');
    var prevImg = document.getElementById('logo-' + side + '-img');
    if (prevImg) prevImg.src = dataUrl;
    if (prevContainer) prevContainer.style.display = 'block';
    showToast('Logo ' + side + ' berhasil dimuat!', 'success');
    updateSptPreview();
  };
  reader.readAsDataURL(file);
}

function clearLogo(side) {
  localStorage.removeItem('senapati_logo_' + side + '_data');
  localStorage.removeItem('senapati_logo_' + side + '_size');
  var fileInput = document.getElementById('set-logo-' + side + '-file');
  if (fileInput) fileInput.value = '';
  var prevContainer = document.getElementById('set-logo-' + side + '-preview');
  var prevImg = document.getElementById('logo-' + side + '-img');
  if (prevImg) prevImg.src = '';
  if (prevContainer) prevContainer.style.display = 'none';
  showToast('Logo ' + side + ' berhasil dihapus.', 'info');
  updateSptPreview();
}


function saveKopSettings() {
  localStorage.setItem('senapati_kop1', v('set-kop1'));
  localStorage.setItem('senapati_kop2', v('set-kop2'));
  localStorage.setItem('senapati_kop3', v('set-kop3'));
  localStorage.setItem('senapati_kop_telp', v('set-kop-telp'));
  localStorage.setItem('senapati_ttd_kota', v('set-ttd-kota'));
  localStorage.setItem('senapati_ttd_jabatan', v('set-ttd-jabatan'));
  localStorage.setItem('senapati_ttd_nama', v('set-ttd-nama'));
  localStorage.setItem('senapati_ttd_nip', v('set-ttd-nip'));
  localStorage.setItem('senapati_logo_pos', v('set-logo-pos'));
  localStorage.setItem('senapati_logo_size', v('set-logo-size'));
  localStorage.setItem('senapati_font_size', v('set-font-size'));
  localStorage.setItem('senapati_penutup', v('set-penutup'));
  showToast('Pengaturan format Kop Surat & TTD berhasil disimpan.', 'success');
  updateSptPreview();
}

function resetKopSettings() {
  if (!confirm('Reset semua pengaturan ke default?')) return;
  ['senapati_kop1','senapati_kop2','senapati_kop3','senapati_kop_telp','senapati_ttd_kota','senapati_ttd_jabatan','senapati_ttd_nama','senapati_ttd_nip','senapati_logo_pos','senapati_logo_size','senapati_font_size','senapati_penutup'].forEach(function(k) { localStorage.removeItem(k); });
  loadKopSettings();
  updateSptPreview();
  showToast('Pengaturan dikembalikan ke default.', 'info');
}

function updateSptPreview() {
  var k1 = v('set-kop1') || 'PEMERINTAH KABUPATEN MADIUN';
  var k2 = v('set-kop2') || 'INSPEKTORAT';
  var k3 = v('set-kop3') || 'Pusat Pemerintahan Mejayan, Jl. Alun-Alun Utara No. 4, Caruban';
  var kTelp = v('set-kop-telp') || '';
  var tKota = v('set-ttd-kota') || 'Madiun';
  var tJab = v('set-ttd-jabatan') || 'Inspektur Kabupaten Madiun,';
  var tNama = v('set-ttd-nama') || '________________________';
  var tNip = v('set-ttd-nip') || '........................................';
  var logoPos = (document.getElementById('set-logo-pos') ? document.getElementById('set-logo-pos').value : 'left');
  var logoSize = v('set-logo-size') || '90';
  var fontSize = v('set-font-size') || '12';
  var penutup = v('set-penutup') || 'Demikian Surat Perintah Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.';

  var kopHtml;
  var logoKiri = localStorage.getItem('senapati_logo_kiri_data');
  var logoKanan = localStorage.getItem('senapati_logo_kanan_data');
  var logoKiriSize = v('set-logo-kiri-size') || localStorage.getItem('senapati_logo_kiri_size') || logoSize;
  var logoKananSize = v('set-logo-kanan-size') || localStorage.getItem('senapati_logo_kanan_size') || logoSize;
  var defaultLogo = BASE_URL + '/assets/icon-512.png';

  var leftImgSrc = logoKiri || (logoPos === 'left' ? defaultLogo : '');
  var rightImgSrc = logoKanan || (logoPos === 'right' ? defaultLogo : '');

  var leftImgHtml = leftImgSrc ? '<img src="' + leftImgSrc + '" style="width:' + (logoKiri ? logoKiriSize : logoSize) + 'px;margin-right:16px;" />' : '';
  var rightImgHtml = rightImgSrc ? '<img src="' + rightImgSrc + '" style="width:' + (logoKanan ? logoKananSize : logoSize) + 'px;margin-left:16px;" />' : '';
  
  kopHtml = leftImgHtml + '<div class="kop-text"><h2>' + k1 + '</h2><h1>' + k2 + '</h1><p>' + k3 + (kTelp ? '<br>Telp: ' + kTelp : '') + '</p></div>' + rightImgHtml;

  var html = '<html><head><style>' +
    'body{font-family:"Times New Roman",Times,serif;padding:30px;line-height:1.5;color:#000;font-size:' + fontSize + 'pt;}' +
    '.kop{display:flex;align-items:center;justify-content:center;border-bottom:4px solid #000;padding-bottom:10px;margin-bottom:2px;}' +
    '.kop-border{border-top:1px solid #000;margin-bottom:28px;}' +
    '.kop-text{text-align:center;line-height:1.2;}' +
    '.kop-text h2{margin:0;font-size:14pt;font-weight:normal;}' +
    '.kop-text h1{margin:4px 0;font-size:18pt;font-weight:bold;}' +
    '.kop-text p{margin:0;font-size:10pt;}' +
    '.title{text-align:center;margin-bottom:24px;}' +
    '.title h3{text-decoration:underline;font-size:13pt;margin:0;}' +
    '.title p{margin:4px 0 0;font-size:12pt;}' +
    '.content{margin:0 20px;}' +
    '.row{display:flex;margin-bottom:7px;}' +
    '.label{width:150px;}.colon{width:20px;}.val{flex:1;}' +
    '.sig{margin-top:50px;display:flex;justify-content:flex-end;}' +
    '.sig-box{width:300px;}' +
    '</style></head><body>' +
    '<div class="kop">' + kopHtml + '</div>' +
    '<div class="kop-border"></div>' +
    '<div class="title"><h3>SURAT PERINTAH TUGAS</h3><p>Nomor: 094/001/SPT/2026</p></div>' +
    '<div class="content">' +
    '<p style="margin-bottom:14px">Yang bertanda tangan di bawah ini, menginstruksikan kepada:</p>' +
    '<div class="row"><div class="label">Nama</div><div class="colon">:</div><div class="val"><strong>NAMA PETUGAS</strong></div></div>' +
    '<div class="row"><div class="label">NIP</div><div class="colon">:</div><div class="val">19800101 200501 1 001</div></div>' +
    '<div class="row"><div class="label">Jabatan</div><div class="colon">:</div><div class="val">Auditor Ahli Madya</div></div>' +
    '<p style="margin-top:18px;margin-bottom:10px">Untuk melaksanakan tugas:</p>' +
    '<div class="row"><div class="label">Tujuan</div><div class="colon">:</div><div class="val">Kantor Camat Madiun</div></div>' +
    '<div class="row"><div class="label">Keperluan</div><div class="colon">:</div><div class="val">Melakukan evaluasi berkas laporan keuangan</div></div>' +
    '<div class="row"><div class="label">Waktu Tugas</div><div class="colon">:</div><div class="val">1 Januari 2026 s/d 3 Januari 2026</div></div>' +
    '<p style="margin-top:20px">' + penutup + '</p>' +
    '</div>' +
    '<div class="sig"><div class="sig-box">' +
    '<p>' + tKota + ', ' + new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) + '<br><strong>' + tJab + '</strong></p>' +
    '<br><br><br><br>' +
    '<p style="text-decoration:underline;font-weight:bold;margin:0">' + tNama + '</p>' +
    '<p style="margin:0">NIP. ' + tNip + '</p>' +
    '</div></div>' +
    '</body></html>';

  var frame = document.getElementById('spt-preview-frame');
  if (frame) {
    frame.srcdoc = html;
  }
}

function printSptPreview() {
  var frame = document.getElementById('spt-preview-frame');
  if (frame && frame.contentWindow) {
    frame.contentWindow.print();
  }
}

async function setupDatabase() {
  if (!confirm('Tindakan ini akan menginisialisasi ulang Sheet pada Google Spreadsheet Anda. Lanjutkan?')) return;
  showSpinner('Inisialisasi Database...');
  try {
    var res = await callAPI('setupDb', {});
    hideSpinner();
    if (res.success) {
      showToast('Database berhasil diinisialisasi!', 'success');
    } else {
      showToast(res.message || 'Gagal inisialisasi database.', 'error');
    }
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}
async function submitAddUser() {
  var data = { nama: v('new-nama'), username: v('new-username'), password: document.getElementById('new-password').value, role: v('new-role') };
  if (!data.nama || !data.username || !data.password) { showToast('Semua field wajib diisi.', 'error'); return; }
  showSpinner('Menambahkan pengguna...');
  try {
    var res = await callAPI('addUser', { data: data });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); resetFields(['new-nama', 'new-username', 'new-password']); loadUsers(); }
    else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function submitChangePassword() {
  var u = v('chg-username');
  var ow = document.getElementById('chg-old').value;
  var nw = document.getElementById('chg-new').value;
  var cf = document.getElementById('chg-confirm').value;
  if (!ow || !nw || !cf) { showToast('Semua field wajib diisi.', 'error'); return; }
  if (nw !== cf) { showToast('Password baru tidak cocok.', 'error'); return; }
  if (nw.length < 6) { showToast('Password baru minimal 6 karakter.', 'error'); return; }
  showSpinner('Mengubah password...');
  try {
    var res = await callAPI('changePassword', { username: u, oldPassword: ow, newPassword: nw });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); resetFields(['chg-old', 'chg-new', 'chg-confirm']); }
    else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadUsers() {
  try {
    var res = await callAPI('getUsers', {});
    var tbody = document.getElementById('tbody-users');
    if (!res.success || !res.data.length) { tbody.innerHTML = '<tr class="no-data"><td colspan="6">Tidak ada pengguna.</td></tr>'; return; }
    tbody.innerHTML = res.data.map(function (d, i) {
      var isCurrent = APP.user && d.username === APP.user.username;
      return '<tr><td>' + (i + 1) + '</td><td><div style="display:flex;align-items:center;gap:10px"><div class="user-table-avatar">' + d.nama.charAt(0).toUpperCase() + '</div>' + esc(d.nama) + '</div></td><td><span style="font-family:var(--mono);font-size:.82rem">' + esc(d.username) + '</span></td><td><span class="badge-cat masuk">' + esc(d.role) + '</span></td><td>' + fmtDate(d.created || d.CreatedAt) + '</td><td class="action-col">' + (isCurrent ? '<span style="font-size:.78rem;color:var(--text-muted)">Akun aktif</span>' : '<button class="btn-danger-custom" onclick="deleteItem(\'deleteUser\',\'' + d.id + '\',loadUsers)"><i class="bi bi-person-x"></i> Hapus</button>') + '</td></tr>';
    }).join('');
  } catch (err) { /* silent */ }
}

async function doSetupDb() {
  if (!confirm('Tindakan ini akan menginisialisasi ulang sistem dan Sheet pada spreadsheet Anda. Lanjutkan?')) return;
  showSpinner('Inisialisasi Database...');
  try {
    var res = await callAPI('setupDb', {});
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    hideSpinner(); showToast('Network Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  DELETE GENERIC
// ══════════════════════════════════════════════════════════
async function deleteItem(action, id, reloadFn) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  showSpinner('Menghapus data...');
  try {
    var res = await callAPI(action, { id: id });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); if (reloadFn) reloadFn(); }
    else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

// ══════════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════════
function setTab(tabId) {
  document.querySelectorAll('.custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function (c) { c.style.display = 'none'; });
  var tabMap = { 'tab-masuk': 'content-masuk', 'tab-keluar': 'content-keluar' };
  var activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');
  var content = tabMap[tabId];
  if (content) { var el = document.getElementById(content); if (el) el.style.display = 'block'; }
}

// ══════════════════════════════════════════════════════════
//  TOGGLE PANEL & COLLAPSE
// ══════════════════════════════════════════════════════════
function togglePanel(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function toggleCollapse(contentId, triggerEl) {
  var content = document.getElementById(contentId);
  if (!content) return;
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    triggerEl.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    triggerEl.classList.add('collapsed');
  }
}

// ══════════════════════════════════════════════════════════
//  CETAK REPORT
// ══════════════════════════════════════════════════════════
function printPage() {
  window.print();
}

// ══════════════════════════════════════════════════════════
//  PREVIEW MODAL (IFRAME)
// ══════════════════════════════════════════════════════════
function openPreview(url) {
  var overlay = document.getElementById('preview-overlay');
  var frame = document.getElementById('preview-frame');
  var previewUrl = url;
  if (url.includes('/view')) {
    previewUrl = url.replace(/\/view.*$/, '/preview');
  } else if (!url.includes('/preview')) {
    // If it's a raw google drive link, try to append preview
    previewUrl = url + '/preview';
  }
  frame.src = previewUrl;
  overlay.classList.add('active');
}
function closePreview() {
  document.getElementById('preview-overlay').classList.remove('active');
  document.getElementById('preview-frame').src = '';
}

// ══════════════════════════════════════════════════════════
//  TABLE FILTER
// ══════════════════════════════════════════════════════════
function filterTable(tableId, query) {
  var q = query.toLowerCase();
  document.querySelectorAll('#' + tableId + ' tbody tr:not(.no-data)').forEach(function (row) {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function esc(str) {
  if (!str) return '-';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(val) {
  if (!val || val === '-') return '-';
  try { var d = new Date(val); if (isNaN(d)) return String(val); return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return String(val); }
}
function v(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function resetFields(ids) {
  ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
}

// ══════════════════════════════════════════════════════════
//  DRAG & DROP EVENTS & INITS
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  
  ['login-username', 'login-password'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  });

  document.querySelectorAll('.file-drop').forEach(function (zone) {
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      var fileInput = zone.querySelector('input[type="file"]');
      var infoEl = zone.querySelector('.drop-name');
      if (fileInput && e.dataTransfer.files[0]) {
        var dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fileInput.files = dt.files;
        var f = e.dataTransfer.files[0];
        if (infoEl) infoEl.textContent = '📎 ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)';
      }
    });
  });
});
