// js/main.js — entry point loader untuk SI-PEDAS
// Hanya api.js dan main.js dipanggil di index.html.
// Semua modul fungsional di-load di sini (tanpa aggregator `ui.js`, `laporan.js`, `peta.js`).
(function(){
  var modules = [
    'js/modules/ui/state.js',
    'js/modules/ui/device.js',
    'js/modules/ui/viewmode.js',
    'js/modules/ui/util.js',
    'js/modules/ui/foto-thumb.js',
    'js/modules/ui/gallery.js',
    'js/modules/ui/sidebar.js',
    'js/modules/ui/login.js',
    'js/modules/ui/dashboard.js',
    'js/modules/ui/ptk.js',
    'js/modules/ui/satlinmas.js',
    'js/modules/ui/pagination.js',
    'js/modules/laporan/rekap.js',
    'js/modules/laporan/pdf-single.js',
    'js/modules/laporan/kolektif.js',
    'js/modules/laporan/edit.js',
    'js/modules/laporan/confirm.js',
    'js/modules/laporan/input.js',
    'js/modules/peta/core.js',
    'js/modules/peta/load.js',
    'js/modules/peta/photo.js',
    'js/modules/peta/modal.js',
    'js/modules/peta/measure.js',
    'js/modules/peta/progress.js',
    'js/modules/peta/legend.js',
    'js/modules/peta/chk.js'
  ];

  // Muat sequential untuk menjaga ketergantungan global order
  var i = 0;
  function loadNext() {
    if (i >= modules.length) return;
    var script = document.createElement('script');
    script.src = modules[i++];
    script.async = false;
    script.onload = loadNext;
    script.onerror = function(){
      console.error('Gagal memuat modul:', this.src);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNext);
  } else {
    loadNext();
  }
})();