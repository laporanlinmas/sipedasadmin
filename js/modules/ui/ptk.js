// ══════════════════════════════════════════
//  PETUNJUK TEKNIS
// ══════════════════════════════════════════
var _ptkData=[
  {id:'ptk-db',ico:'fa-gauge-high',color:'var(--blue)',bg:'var(--bluelo)',title:'Dashboard',desc:'Halaman utama menampilkan statistik ringkasan dan grafik data laporan patroli.',poin:['Statistik total laporan, pelanggaran, & aktivitas hari ini','Grafik laporan per hari','Top lokasi patroli berdasarkan frekuensi','Tren Laporan dalam Format Triwulan','Jumlah Anggota Satlinmas Pedestrian']},
  {id:'ptk-peta',ico:'fa-map-location-dot',color:'#0891b2',bg:'#e0f7fa',title:'Peta Pedestrian',desc:'Peta interaktif wilayah patroli Satlinmas Pedestrian.',poin:['Mode Google My Maps menampilkan rute patroli, titik rawan, dan pos jaga','Mode Peta Realtime menampilkan laporan lapangan secara langsung','Klik layer atau marker untuk melihat detail lokasi','Tombol Edit Layer untuk administrator','Tombol Refresh untuk memuat ulang peta realtime']},
  {id:'ptk-rk',ico:'fa-table-list',color:'var(--amber)',bg:'var(--amberl)',title:'Rekap Laporan',desc:'Melihat, mencari, dan mencetak seluruh laporan patroli.',poin:['Filter berdasarkan kata kunci, lokasi, personil, atau rentang tanggal','Lihat foto dokumentasi langsung dari tabel','Cetak laporan tunggal atau kolektif (PDF rekap)','Admin dapat edit dan hapus laporan dari halaman ini']},
  {id:'ptk-in',ico:'fa-plus-circle',color:'var(--green)',bg:'var(--greenl)',title:'Input Laporan (Admin)',desc:'Menambahkan laporan patroli baru.',poin:['Input manual: isi form tanggal, hari, lokasi, personil, identitas pelanggar','Format WA: tempel teks laporan dari WhatsApp, sistem otomatis parsing','Lampirkan foto dokumentasi (maks 10 foto)','Minimal 1 foto wajib disertakan']},
  {id:'ptk-ed',ico:'fa-file-pen',color:'var(--purple)',bg:'var(--purplel)',title:'Edit Laporan',desc:'Mengelola dan memperbaiki data laporan. Khusus Admin.',poin:['Edit semua field laporan','Tambah atau hapus foto dari laporan','Hapus laporan secara permanen']},
  {id:'ptk-sl',ico:'fa-users',color:'var(--red)',bg:'var(--redl)',title:'Data Satlinmas',desc:'Manajemen data anggota Satlinmas Pedestrian.',poin:['Tambah, edit, dan hapus data anggota','Data mencakup nama, tanggal lahir, unit, dan nomor WhatsApp','Usia dihitung otomatis dari tanggal lahir']},
  {id:'ptk-acc',ico:'fa-user-shield',color:'var(--blue)',bg:'var(--bluelo)',title:'Tipe Akun & Hak Akses',desc:'Dua level pengguna dengan batasan fitur berbeda.',poin:['Administrator: Akses penuh (Input, Validasi, Edit, Hapus, Cetak).','Pengguna (User): Akses terbatas (hanya lihat dan cetak).']},
  {id:'ptk-auth',ico:'fa-circle-info',color:'#34495e',bg:'#f4f7f6',title:'Informasi Sistem',desc:'Dikembangkan untuk efisiensi pelaporan Satlinmas Pedestrian.',poin:['Author: Ahmad Abdul Basith, S.Tr.I.P.','<a href="https://wa.me/6285159686554" target="_blank" style="color:#0d9268;font-weight:bold;"><i class="fab fa-whatsapp"></i> Hubungi 0851-5968-6554</a>']}
];

function renderPetunjukWidget(){
  var h='<div class="ptk-section"><div class="ptk-outer">'
    +'<button class="ptk-outer-toggle" onclick="togglePtkOuter(this)">'
      +'<div class="ptk-outer-left"><div class="ptk-outer-ico"><i class="fas fa-book-open"></i></div>'
      +'<div><div class="ptk-outer-title">Petunjuk Teknis SI-PEDAS</div><div class="ptk-outer-sub">Panduan fitur & penggunaan sistem</div></div></div>'
      +'<i class="fas fa-chevron-down ptk-outer-arr"></i>'
    +'</button>'
    +'<div class="ptk-menulist" id="ptk-menulist">';
  _ptkData.forEach(function(item){
    var faClass=item.ico.indexOf('fab ')===0?item.ico:'fas '+item.ico;
    h+='<div class="ptk-menu-item">'
      +'<button class="ptk-menu-btn" onclick="togglePtkMenu(this)">'
        +'<div class="ptk-menu-left"><div class="ptk-menu-ico" style="background:'+item.bg+';color:'+item.color+'"><i class="'+faClass+'"></i></div>'
        +'<span class="ptk-menu-name">'+item.title+'</span></div>'
        +'<i class="fas fa-chevron-right ptk-menu-arr"></i>'
      +'</button>'
      +'<div class="ptk-detail"><p>'+item.desc+'</p><ul>'+item.poin.map(function(p){return'<li>'+p+'</li>';}).join('')+'</ul></div>'
    +'</div>';
  });
  h+='</div></div></div>';
  return h;
}
function togglePtkOuter(btn){btn.classList.toggle('open');var ml=G('ptk-menulist');if(ml)ml.classList.toggle('on');}
function togglePtkMenu(btn){
  var detail=btn.nextElementSibling;var isOpen=detail.classList.contains('on');
  document.querySelectorAll('.ptk-detail.on').forEach(function(d){d.classList.remove('on');});
  document.querySelectorAll('.ptk-menu-btn.open').forEach(function(b){b.classList.remove('open');});
  if(!isOpen){detail.classList.add('on');btn.classList.add('open');}
}
function loadPetunjuk(){
  setNav('ptk');setPage('Petunjuk Teknis','Panduan fitur & penggunaan SI-PEDAS');sbClose();
  dChart('bar');dChart('dnt');
  G('ct').innerHTML='<div class="fu">'+renderPetunjukWidget()+'</div>';
  var tog=document.querySelector('.ptk-outer-toggle');if(tog)togglePtkOuter(tog);
}

