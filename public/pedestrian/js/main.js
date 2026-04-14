// js/main.js — entry point loader untuk SI-PEDAS
// Hanya api.js dan main.js dipanggil di index.html.
// Semua modul fungsional di-load di sini secara sequential.
(function(){
  var modules = [
    'js/modules/ui.js',
    'js/modules/laporan.js',
    'js/modules/peta.js'
  ];

  var i = 0;
  var timestamp = new Date().getTime(); // Cache busting

  function loadNext() {
    if (i >= modules.length) {
      if (window._initApp) window._initApp();
      return;
    }
    var script = document.createElement('script');
    script.src = modules[i++] + '?v=' + timestamp;
    script.async = false;
    script.onload = loadNext;
    script.onerror = function(){
      console.error('Gagal memuat modul:', this.src);
      loadNext();
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNext);
  } else {
    loadNext();
  }
})();
