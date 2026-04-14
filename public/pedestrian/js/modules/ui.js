/* --- state.js --- */
// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
var PER=15,SLM_PER=24;
var _RC={};var _rcIdx=0;
function rcSet(r){var k='rc_'+(++_rcIdx);_RC[k]=r;return k;}
function rcGet(k){return _RC[k]||null;}
var _gal=[],_galOrig=[],_gi=0;
var _charts={};
var _rData=[],_rPg=1,_rFQ='',_rFFrom='',_rFTo='';
var _editRow=null,_editFotos=[];
var _pdfRow=null;
var _pdfSettings={}; // PDF settings store — see pdf-single.js
var _slmData=[],_slmPg=1,_slmFNama='',_slmFUnit='',_slmRow=null;
var _hpsMode='',_hpsRi=null;
var _kolData=[];
var _petaLoaded=false;
/** Halaman aktif (sidebar / refresh) — default dashboard */
var _currentPage = 'db';

// Legacy stub — toggleViewMode removed, no-op
function toggleViewMode(){}


/* --- device.js --- */
// ══════════════════════════════════════════
//  DEVICE DETECTION
// ══════════════════════════════════════════
function isRealMobile(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&window.screen.width<=900);
}
function isMobileView(){
  // Force desktop view in landscape regardless of width to utilize wider screen space
  if (window.innerWidth > window.innerHeight) return false;
  return window.innerWidth <= 768 || isRealMobile();
}


/* --- viewmode.js --- */
// ══════════════════════════════════════════
//  VIEW MODE — Auto Responsive (No Toggle)
//  Desktop = sidebar layout
//  Mobile  = bottom nav layout (auto detect)
// ══════════════════════════════════════════

function applyViewMode() {
  var mobile = isRealMobile();
  var body = document.body;
  // Remove legacy mode classes
  body.classList.remove('mode-phone', 'mode-desktop-hp');
  if (mobile) {
    setViewport(false); // mobile viewport
  } else {
    setViewport(true); // allow zoom on desktop
  }
}

function setViewport(allowZoom) {
  var m = G('mvp'); if (!m) return;
  m.setAttribute('content', allowZoom
    ? 'width=1080,initial-scale=0.5,minimum-scale=0.2,user-scalable=yes'
    : 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no');
}

function toggleSbCollapse() { document.body.classList.toggle('sb-off'); }

function doRefreshPage() {
  var btn = G('refresh-btn');
  if (btn) btn.classList.add('spinning');
  toast('Memuat ulang data...', 'inf');
  setTimeout(function() {
    if (btn) btn.classList.remove('spinning');
    var page = _currentPage;
    if (page === 'db') loadDashboard();
    else if (page === 'rk') loadRekap();
    else if (page === 'in') loadInput();
    else if (page === 'sl') loadSatlinmas();
    else if (page === 'pt') { _petaLoaded = false; loadPeta(); }
    else if (page === 'ptk') loadPetunjuk();
    else if (page === 'set') loadSettings();
    else loadDashboard();
  }, 600);
}

// Swipe gesture for sidebar on touch devices
(function() {
  var sx = 0, sy = 0, stime = 0;
  document.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; stime = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy, dt = Date.now() - stime;
    if (dt > 500 || Math.abs(dy) > Math.abs(dx) * 1.2 || Math.abs(dx) < 50) return;
    var off = document.body.classList.contains('sb-off');
    if (dx > 0 && off) document.body.classList.remove('sb-off');
    else if (dx < 0 && !off) document.body.classList.add('sb-off');
  }, { passive: true });
})();


/* --- util.js --- */
// ══════════════════════════════════════════
//  UTIL
// ══════════════════════════════════════════
function G(id){return document.getElementById(id);}
function esc(v){if(!v)return'';return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
/** Untuk href/src di atribut HTML */
function escUrlAttr(v){
  if(v==null||v==='')return'';
  return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function showLoad(m){G('lmsg').textContent=m||'Memuat...';G('lov').classList.add('on');}
function hideLoad(){G('lov').classList.remove('on');}
function toast(msg,type){
  type=type||'inf';
  var ico={ok:'fa-circle-check',er:'fa-circle-xmark',inf:'fa-circle-info'};
  var el=document.createElement('div');el.className='ti '+type;
  el.innerHTML='<i class="fas '+(ico[type]||ico.inf)+'"></i><span>'+esc(msg)+'</span>';
  var container = G('tco');
  container.innerHTML = ''; 
  container.prepend(el);
  setTimeout(function(){el.classList.add('tOut');setTimeout(function(){el.remove();},230);},3400);
}
function om(id){G(id).classList.add('on');document.body.style.overflow='hidden';}
function cm(id){G(id).classList.remove('on');document.body.style.overflow='';}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){galClose();document.querySelectorAll('.mov.on').forEach(function(m){m.classList.remove('on');});document.body.style.overflow='';}
  var gov=G('gov');if(gov&&gov.classList.contains('on')){if(e.key==='ArrowLeft')galNav(-1);if(e.key==='ArrowRight')galNav(1);}
});

function toggleLokasi(el){/* tidak dipakai lagi */}
function mcardLokasi(teks){
  if(!teks)return'<div class="lok-wrap"><span class="lok-trunc" style="color:var(--muted)">—</span></div>';
  return'<div class="lok-wrap"><span class="lok-trunc">'+esc(teks)+'</span></div>';
}
function mcardChip(teks,chipCls){
  if(!teks)return'';
  var isNihil=teks.toUpperCase()==='NIHIL'||teks==='';
  if(isNihil)return'<span class="chip cm">Nihil</span>';
  
  var escaped = esc(teks);
  var summary = escaped.replace(/\n/g, ' / ');
  
  var tableHtml = '<table style="width:100%; max-width:100%; border:none; margin:0; padding:0; border-collapse:collapse; table-layout:auto; font-size:inherit; background:transparent !important;">';
  var lines = teks.split('\n');
  lines.forEach(function(l) {
    if(!l.trim()) return;
    var idx = l.indexOf(':');
    if (idx !== -1) {
      var k = esc(l.substring(0, idx).trim());
      var v = esc(l.substring(idx + 1).trim());
      tableHtml += '<tr style="background:transparent !important;"><td style="width:1%; padding:2px 4px 2px 0; border:none; vertical-align:top; white-space:nowrap; overflow-wrap:break-word; text-align:left; color:inherit; background:transparent !important;">' + k + '</td><td style="width:1%; padding:2px 2px; border:none; vertical-align:top; background:transparent !important;">:</td><td style="padding:2px 0 2px 4px; border:none; vertical-align:top; word-break:break-word; overflow-wrap:break-word; white-space:normal; font-weight:600; text-align:left; color:inherit; background:transparent !important;">' + v + '</td></tr>';
    } else {
      tableHtml += '<tr style="background:transparent !important;"><td colspan="3" style="padding:2px 0; border:none; vertical-align:top; white-space:normal; word-break:break-word; overflow-wrap:break-word; font-weight:600; text-align:left; color:inherit; background:transparent !important;">' + esc(l.trim()) + '</td></tr>';
    }
  });
  tableHtml += '</table>';

  var html = '<div class="chip '+chipCls+' chip-mob" onclick="var on=this.dataset.exp===\'1\'; document.querySelectorAll(\'.chip-mob[data-exp=\\\'1\\\']\').forEach(function(el){if(el!==this){ el.dataset.exp=\'0\'; el.style.maxWidth=\'100px\'; el.style.whiteSpace=\'nowrap\'; el.style.borderRadius=\'50px\'; el.style.padding=\'\'; el.style.textAlign=\'left\'; el.style.overflow=\'hidden\'; el.children[0].style.display=\'inline\'; el.children[1].style.display=\'none\'; }}.bind(this)); this.dataset.exp=on?\'0\':\'1\'; if(!on){ this.style.maxWidth=\'100%\'; this.style.whiteSpace=\'normal\'; this.style.borderRadius=\'8px\'; this.style.padding=\'10px\'; this.style.textAlign=\'left\'; this.style.overflow=\'visible\'; this.children[0].style.display=\'none\'; this.children[1].style.display=\'block\'; } else { this.style.maxWidth=\'100px\'; this.style.whiteSpace=\'nowrap\'; this.style.borderRadius=\'50px\'; this.style.padding=\'\'; this.style.textAlign=\'left\'; this.style.overflow=\'hidden\'; this.children[0].style.display=\'inline\'; this.children[1].style.display=\'none\'; }" style="cursor:pointer; display:inline-block; vertical-align:middle; max-width:100px; transition:all 0.2s; overflow:hidden; text-overflow:ellipsis; text-align:left;">';
  
  html += '<span>' + summary + '</span>';
  html += '<div style="display:none; line-height:1.4;">' + tableHtml + '</div>';
  
  html += '</div>';

  return html;
}
function mcardPersonil(teks){
  if(!teks)return'—';var safe=esc(teks);
  if(teks.length<=25)return safe;
  return'<span class="per-trunc" onclick="this.classList.toggle(\'expanded\')" title="'+safe+'">'+safe+'</span>';
}

// Datetime
var _dtwInterval=null;
var _hariNames=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
var _bulanNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function startDtwTick(){
  if(_dtwInterval)clearInterval(_dtwInterval);
  _dtwInterval=setInterval(tickDtw,1000);tickDtw();
}
function tickDtw(){
  var now=new Date();
  var h=G('dtw-h'),m=G('dtw-m'),s=G('dtw-s'),dte=G('dtw-date'),dy=G('dtw-day');
  if(!h)return;
  function z(n){return String(n).padStart(2,'0');}
  h.textContent=z(now.getHours());m.textContent=z(now.getMinutes());s.textContent=z(now.getSeconds());
  dte.textContent=now.getDate()+' '+_bulanNames[now.getMonth()]+' '+now.getFullYear();
  dy.textContent=_hariNames[now.getDay()];
}
function tickClock(){var c=G('clk');if(c)c.textContent=new Date().toLocaleString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
tickClock();setInterval(tickClock,1000);

/* ── BULLETPROOF: Global Keyboard Scroll Helper ── */
window.addEventListener('keydown', function(e) {
  // 1. Abaikan jika sedang ngetik di kotak pencarian
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  // Jangan bentrok dengan navigasi galeri foto (panah kiri/kanan)
  var govK = G('gov');
  if (govK && govK.classList.contains('on')) return;

  // 2. Cari tabel mana yang sedang terbuka
  var wrap = document.getElementById('r-tbl-wrap') || document.getElementById('e-tbl-wrap');
  if (!wrap) return;

  // 3. Matikan scroll jika ada Pop-Up / Modal Terbuka
  var modals = document.querySelectorAll('.mov');
  var isModalOpen = Array.from(modals).some(function(m) {
    return window.getComputedStyle(m).display === 'flex' || window.getComputedStyle(m).display === 'block';
  });
  if (isModalOpen) return;

  var stepX = 250; 
  var stepY = 120; 
  var handled = false;

  switch(e.key) {
    case 'ArrowRight': wrap.scrollLeft += stepX; handled = true; break;
    case 'ArrowLeft':  wrap.scrollLeft -= stepX; handled = true; break;
    case 'ArrowDown':  wrap.scrollTop  += stepY; handled = true; break;
    case 'ArrowUp':    wrap.scrollTop  -= stepY; handled = true; break;
    case 'PageDown':   wrap.scrollTop  += wrap.clientHeight * 0.8; handled = true; break;
    case 'PageUp':     wrap.scrollTop  -= wrap.clientHeight * 0.8; handled = true; break;
    case 'Home':       wrap.scrollTop  = 0; wrap.scrollLeft = 0; handled = true; break;
    case 'End':        wrap.scrollTop  = wrap.scrollHeight; handled = true; break;
  }

  // 4. Cegah perilaku default browser agar layar utama tidak ikut goyang
  if (handled) {
    e.preventDefault();
  }
});


/* --- foto-thumb.js --- */
// ══════════════════════════════════════════
//  FOTO THUMBNAIL
// ══════════════════════════════════════════
function renderFotoThumb(fotArr,fotThumb,ck){
  if(!fotArr||!fotArr.length)return'—';
  var disp=fotArr.slice(0,3);var rest=fotArr.length-3;
  var html='<div class="foto-thumb-wrap">';
  disp.forEach(function(u,i){
    var thumb=(fotThumb&&fotThumb[i])?fotThumb[i]:u;
    html+='<img src="'+esc(thumb)+'" title="Foto '+(i+1)+'" '
      +'onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,'+i+')" '
      +'onerror="this.style.display=\'none\'">';
  });
  if(rest>0){html+='<span class="foto-more-badge" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,3)"><i class="fas fa-images"></i> +'+rest+'</span>';}
  return html+'</div>';
}



/* --- gallery.js --- */
// ══════════════════════════════════════════
//  GALLERY
// ══════════════════════════════════════════
function galOpen(fotos,fotosThumb,idx){
  if(!fotos||!fotos.length){toast('Tidak ada foto.','inf');return;}
  _galOrig=fotos;_gal=fotosThumb&&fotosThumb.length?fotosThumb:fotos;_gi=idx||0;
  galRender();G('gov').classList.add('on');
}
function galRender(){
  var img=G('gimg');img.style.display='none';G('gloaderOverlay').classList.add('on');
  img.src=_gal[_gi]||'';G('gcnt').textContent=(_gi+1)+' / '+_gal.length;
  G('gpv').disabled=_gi===0;G('gnx').disabled=_gi===_gal.length-1;
  var orig=_galOrig[_gi]||'';var lnk=G('gdrvhref');
  if(orig&&orig.indexOf('drive.google.com')>-1){lnk.href=orig;G('gdrvlink').style.display='';}else{G('gdrvlink').style.display='none';}
  var th=G('gths');th.innerHTML='';
  _gal.forEach(function(u,i){var el=document.createElement('img');el.src=u;el.className='gth'+(i===_gi?' on':'');el.onerror=function(){el.style.opacity='.15';};el.onclick=(function(ii){return function(){_gi=ii;galRender();};})(i);th.appendChild(el);});
}
function galImgLoad(img){G('gloaderOverlay').classList.remove('on');img.style.display='block';}
function galImgErr(img){
  G('gloaderOverlay').classList.remove('on');img.style.display='block';
  var orig=_galOrig[_gi]||'';
  if(orig&&img.src!==orig){img.src=orig;return;}
  img.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23222"%2F%3E%3Ctext x="150" y="110" text-anchor="middle" fill="%23777" font-size="13" font-family="sans-serif"%3EGambar tidak dapat dimuat%3C%2Ftext%3E%3C%2Fsvg%3E';
  if(orig&&orig.indexOf('drive.google.com')>-1)G('gdrvlink').style.display='';
}
function galNav(d){_gi=Math.max(0,Math.min(_gal.length-1,_gi+d));galRender();}
function galClose(){G('gov').classList.remove('on');}



/* --- sidebar.js --- */
// ══════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════
function sbToggle(){G('sidebar').classList.toggle('on');G('mbb').classList.toggle('on');}
function sbClose(){G('sidebar').classList.remove('on');G('mbb').classList.remove('on');}
function setNav(id){
  _currentPage=id;
  if(id!=='pt') G('ct').classList.remove('peta-outer-pa');
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var el=G('nav-'+id);if(el)el.classList.add('on');
  document.querySelectorAll('.bni').forEach(function(b){b.classList.remove('on');});
  var bn=G('bni-'+id);if(bn)bn.classList.add('on');
}
function setPage(t,s){G('pgtl').textContent=t;G('pgsb').textContent=s||'';}
function dChart(id){if(_charts[id]){_charts[id].destroy();delete _charts[id];}}



/* --- nav-portal.js --- */
// ══════════════════════════════════════════
//  KEMBALI KE PORTAL
// ══════════════════════════════════════════
function kembaliKePortal() {
  /* Kalau dimuat dalam iframe portal — kirim postMessage untuk menutup overlay */
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage('close-module', '*');
      return;
    } catch (e) { /* fallthrough ke navigasi URL */ }
  }
  /* Akses langsung (standalone) — redirect ke direktori induk */
  var base = window.location.pathname.replace(/\/([^/]+\/?)?$/, '') || '/';
  window.location.href = base || '/';
}




/* --- dashboard.js --- */
// ══════════════════════════════════════════
//  DASHBOARD
//  Sebelum: google.script.run.withSuccessHandler(renderDash).getDashboardData()
//  Sesudah: apiGet('getDashboard').then(renderDash)
// ══════════════════════════════════════════
function loadDashboard(){
  setNav('db'); setPage('Dashboard','Statistik & grafik data patroli'); sbClose();
  dChart('bar'); dChart('dnt'); dChart('tw');

  /* ── Cek cache ── */
  var cached=window._gcGet('dashboard');
  if(cached){
    renderDash(cached.data||cached);
    window._gcRefresh('dashboard');
    return;
  }

  /* ── Fetch normal ── */
  showLoad();
  apiGet('getDashboard').then(function(res){
    if(!res.success){hideLoad();showErr(res.message);return;}
    window._gcSet('dashboard',res);
    renderDash(res.data||res);
  });
}
function renderDash(d){
  hideLoad();if(!d){showErr('Data kosong');return;}
  var mobileView=isMobileView();
  var h='<div class="fu">'
    +'<div class="dtw" id="dtw">'
      +'<div class="dtw-left">'
        +'<div class="dtw-time"><span id="dtw-h">--</span>:<span id="dtw-m">--</span><span class="dtw-sec">:<span id="dtw-s">--</span></span></div>'
        +'<div class="dtw-date" id="dtw-date">—</div>'
        +'<div class="dtw-day" id="dtw-day">—</div>'
      +'</div>'
      +'<div class="dtw-right">'
        +'<div class="dtw-badge"><i class="fas fa-circle-dot"></i> Sistem Aktif</div>'
        +'<div class="dtw-badge" id="dtw-user-badge"></div>'
        +'<div class="dtw-dots"><div class="dtw-dot"></div><div class="dtw-dot"></div><div class="dtw-dot"></div></div>'
      +'</div>'
    +'</div>'
    +'<div class="sgr">'
    +sc('cb','fa-clipboard-list',d.total||0,'Total Laporan')
    +sc('cr','fa-user-slash',d.totalP||0,'Pelanggaran')
    +sc('cg','fa-calendar-day',d.hariIni||0,'Hari Ini')
    +sc('ca','fa-triangle-exclamation',d.hariIniP||0,'Pelanggaran Hari Ini')
    +sc('cp','fa-users',d.totalAnggota||0,'Total Anggota')
    +'</div>'
    +'<div class="cg2">'
    +'<div class="panel" style="margin-bottom:0"><div class="phd"><span class="ptl"><i class="fas fa-chart-bar"></i> Laporan per Hari</span></div><div class="pbd"><div class="chbox"><canvas id="cBar"></canvas></div></div></div>'
    +'<div style="display:flex;flex-direction:column;gap:12px">'
      +'<div class="panel" style="margin-bottom:0">'
        +'<div class="phd"><span class="ptl"><i class="fas fa-chart-pie" style="color:var(--purple)"></i> Tren Triwulan</span><span id="tw-year-lbl" style="font-size:.58rem;color:var(--muted);font-family:var(--mono)"></span></div>'
        +'<div class="pbd" style="padding-bottom:10px"><div class="chbox-sm"><canvas id="cTw"></canvas></div><div class="tw-legend" id="tw-legend"></div></div>'
      +'</div>'
      +'<div class="panel" style="margin-bottom:0"><div class="phd"><span class="ptl"><i class="fas fa-map-pin"></i> Top Lokasi Patroli</span></div><div class="pbd">'+lokBar(d.perLokasi||[])+'</div></div>'
    +'</div>'
    +'</div>';
  if(mobileView){h+=renderPetunjukWidget();}
  h+='</div>';
  G('ct').innerHTML=h;
  startDtwTick();
  var hl=(d.perHari||[]).map(function(x){return x.hari;}),hd=(d.perHari||[]).map(function(x){return x.n;});
  _charts['bar']=new Chart(G('cBar'),{type:'bar',data:{labels:hl,datasets:[{label:'Laporan',data:hd,backgroundColor:'rgba(30,111,217,.12)',borderColor:'#1e6fd9',borderWidth:2.5,borderRadius:7,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0}}}}});
  var twData=hitungTriwulan(d.allData||[]);
  buildTwChart(twData);
  var yl=G('tw-year-lbl');if(yl)yl.textContent='Tahun '+new Date().getFullYear();
}

function hitungTriwulan(data){
  var labels=['Jan–Mar','Apr–Jun','Jul–Sep','Okt–Des'];
  var counts=[0,0,0,0],countP=[0,0,0,0];
  var BLN={januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12};
  (data||[]).forEach(function(r){
    var b=String(r.tanggal||'').replace(/^[A-Za-z]+,?\s*/,'').trim().toLowerCase();
    var m=/(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
    if(m&&BLN[m[2]]){var mo=BLN[m[2]],qi=Math.floor((mo-1)/3);if(qi>=0&&qi<=3){counts[qi]++;if(r.identitas&&r.identitas.toUpperCase()!=='NIHIL'&&r.identitas!=='')countP[qi]++;}}
  });
  var total=counts[0]+counts[1]+counts[2]+counts[3];
  if(!total&&_rData&&_rData.length){
    _rData.forEach(function(r){
      var b=String(r.tanggal||'').replace(/^[A-Za-z]+,?\s*/,'').trim().toLowerCase();
      var m=/(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
      if(m&&BLN[m[2]]){var mo=BLN[m[2]],qi=Math.floor((mo-1)/3);if(qi>=0&&qi<=3){counts[qi]++;if(r.identitas&&r.identitas.toUpperCase()!=='NIHIL'&&r.identitas!=='')countP[qi]++;}}
    });
  }
  return{labels:labels,counts:counts,countP:countP};
}

function buildTwChart(tw){
  if(_charts['tw']){_charts['tw'].destroy();delete _charts['tw'];}
  var colors=['rgba(30,111,217,.82)','rgba(13,146,104,.82)','rgba(217,119,6,.82)','rgba(124,58,237,.82)'];
  var bords=['#1e6fd9','#0d9268','#d97706','#7c3aed'];
  _charts['tw']=new Chart(G('cTw'),{type:'doughnut',data:{labels:tw.labels,datasets:[{data:tw.counts.map(function(v){return v||0;}),backgroundColor:colors,borderColor:bords,borderWidth:2,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+ctx.parsed+' laporan';}}}}}});
  var leg=G('tw-legend');if(!leg)return;
  var legItems=[{color:'#1e6fd9',label:'Q1 Jan–Mar',n:tw.counts[0]},{color:'#0d9268',label:'Q2 Apr–Jun',n:tw.counts[1]},{color:'#d97706',label:'Q3 Jul–Sep',n:tw.counts[2]},{color:'#7c3aed',label:'Q4 Okt–Des',n:tw.counts[3]}];
  leg.innerHTML=legItems.map(function(l){return'<div class="tw-leg-item"><div class="tw-leg-dot" style="background:'+l.color+'"></div><span>'+l.label+': <strong>'+l.n+'</strong></span></div>';}).join('');
}
function sc(cls,ico,n,l){return'<div class="scard '+cls+'"><div class="sico"><i class="fas '+ico+'"></i></div><div class="snum">'+n+'</div><div class="slbl">'+l+'</div></div>';}
function lokBar(arr){
  if(!arr.length)return'<div class="empty"><i class="fas fa-map-pin"></i><p>Belum ada data</p></div>';
  var mx=arr[0].n||1,h='';
  arr.slice(0,7).forEach(function(x){var p=Math.round(x.n/mx*100);h+='<div class="lokbar-item"><div class="lokbar-label"><span>'+esc(x.lokasi)+'</span><span style="color:var(--blue);font-family:var(--mono)">'+x.n+'</span></div><div class="lokbar-track"><div class="lokbar-fill" style="width:'+p+'%"></div></div></div>';});
  return h;
}



/* --- ptk.js --- */
// ══════════════════════════════════════════
//  PETUNJUK TEKNIS
// ══════════════════════════════════════════
var _ptkData = [
  { id: 'ptk-db', ico: 'fa-gauge-high', color: 'var(--blue)', bg: 'var(--bluelo)', title: 'Dashboard', desc: 'Halaman utama menampilkan statistik ringkasan dan grafik data laporan patroli.', poin: ['Statistik total laporan, pelanggaran, & aktivitas hari ini', 'Grafik laporan per hari', 'Top lokasi patroli berdasarkan frekuensi', 'Tren Laporan dalam Format Triwulan', 'Jumlah Anggota Satlinmas Pedestrian'] },
  { id: 'ptk-peta', ico: 'fa-map-location-dot', color: '#0891b2', bg: '#e0f7fa', title: 'Peta Pedestrian', desc: 'Peta interaktif wilayah patroli Satlinmas Pedestrian.', poin: ['Mode Google My Maps menampilkan rute patroli, titik rawan, dan pos jaga', 'Mode Peta Realtime menampilkan laporan lapangan secara langsung', 'Klik layer atau marker untuk melihat detail lokasi', 'Tombol Edit Layer untuk administrator', 'Tombol Refresh untuk memuat ulang peta realtime'] },
  { id: 'ptk-rk', ico: 'fa-table-list', color: 'var(--amber)', bg: 'var(--amberl)', title: 'Rekap Laporan', desc: 'Melihat, mencari, dan mencetak seluruh laporan patroli.', poin: ['Filter berdasarkan kata kunci, lokasi, personil, atau rentang tanggal', 'Lihat foto dokumentasi langsung dari tabel', 'Cetak laporan tunggal atau kolektif (PDF rekap)', 'Admin dapat edit dan hapus laporan dari halaman ini'] },
  { id: 'ptk-in', ico: 'fa-plus-circle', color: 'var(--green)', bg: 'var(--greenl)', title: 'Input Laporan (Admin)', desc: 'Menambahkan laporan patroli baru melalui sistem terpusat.', poin: ['Input laporan eksklusif via embed sistem PEDESTRIAN terpusat', 'Integrasi otomatis dengan penyimpanan cloud & database', 'Mendukung pengiriman foto dokumentasi beresolusi tinggi dengan watermark', 'Pengamanan data terenkripsi'] },
  { id: 'ptk-ed', ico: 'fa-file-pen', color: 'var(--purple)', bg: 'var(--purplel)', title: 'Edit Laporan', desc: 'Mengelola dan memperbaiki data laporan. Khusus Admin.', poin: ['Edit semua field laporan', 'Tambah atau hapus foto dari laporan', 'Hapus laporan secara permanen'] },
  { id: 'ptk-sl', ico: 'fa-users', color: 'var(--red)', bg: 'var(--redl)', title: 'Data Satlinmas', desc: 'Manajemen data anggota Satlinmas Pedestrian.', poin: ['Tambah, edit, dan hapus data anggota', 'Data mencakup nama, tanggal lahir, unit, dan nomor WhatsApp', 'Usia dihitung otomatis dari tanggal lahir'] },
  { id: 'ptk-acc', ico: 'fa-user-shield', color: 'var(--blue)', bg: 'var(--bluelo)', title: 'Tipe Akun & Hak Akses', desc: 'Dua level pengguna dengan batasan fitur berbeda.', poin: ['Administrator: Akses penuh (Input, Validasi, Edit, Hapus, Cetak).', 'Pengguna (User): Akses terbatas (hanya lihat dan cetak).'] },
  {
    id: 'ptk-auth', ico: 'fa-circle-info', color: '#34495e', bg: '#f4f7f6', title: 'Informasi Sistem', desc: 'Dikembangkan untuk mendukung efisiensi pelaporan Satlinmas Pedestrian Ponorogo.', poin: ['__PTK_DEV_CARD__']
  }
];

function ptkDevCardHtml() {
  var waUrl = typeof window.getSupportWaChatUrl === 'function' ? window.getSupportWaChatUrl() : '';
  var waBlock = waUrl
    ? '<a href="' + escUrlAttr(waUrl) + '" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:8px; padding:8px 14px; background:#25d366; color:#fff; border-radius:10px; font-size:.7rem; font-weight:700; text-decoration:none; transition:transform 0.2s; box-shadow:0 3px 8px rgba(37,211,102,0.3)" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'"><i class="fab fa-whatsapp" style="font-size:.9rem"></i> Chat Developer</a>'
    : '<span style="font-size:.65rem;color:var(--muted);line-height:1.45">Tautan chat tidak ditampilkan. Setel <code style="font-size:.6rem">SUPPORT_WA_CHAT_URL</code> di konfigurasi.</span>';
  return '<div class="ptk-dev-card" style="margin-top:14px; padding:16px; background:var(--card); border:1px solid var(--border); border-radius:14px; display:flex; align-items:center; gap:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position:relative; overflow:hidden;">'
    + '<div style="position:absolute; top:-20px; right:-20px; width:80px; height:80px; background:var(--blue); opacity:0.05; border-radius:50%"></div>'
    + '<div class="ptk-dev-photo-wrap" style="width:72px; height:72px; border-radius:16px; border:2px solid var(--bg); flex-shrink:0; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); background:var(--bg); display:flex; align-items:center; justify-content:center;">'
    + '<img src="/pedestrian/assets/basith.jpeg" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">'
    + '<div style="display:none; font-size:1.2rem; font-weight:800; color:var(--mid);">AB</div></div>'
    + '<div class="ptk-dev-info" style="flex:1">'
    + '<div style="font-size:.6rem; font-weight:700; color:var(--blue); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">Developer & Designer</div>'
    + '<div style="font-size:.85rem; font-weight:800; color:var(--text); margin-bottom:10px">Ahmad Abdul Basith, S.Tr.I.P.</div>'
    + waBlock
    + '</div></div>';
}

function renderPetunjukWidget() {
  var h = '<div class="ptk-section"><div class="ptk-outer">'
    + '<button class="ptk-outer-toggle" onclick="togglePtkOuter(this)">'
    + '<div class="ptk-outer-left"><div class="ptk-outer-ico"><i class="fas fa-book-open"></i></div>'
    + '<div><div class="ptk-outer-title">Petunjuk Teknis PEDESTRIAN</div><div class="ptk-outer-sub">Panduan fitur & penggunaan sistem</div></div></div>'
    + '<i class="fas fa-chevron-down ptk-outer-arr"></i>'
    + '</button>'
    + '<div class="ptk-menulist" id="ptk-menulist">';
  _ptkData.forEach(function (item) {
    var faClass = item.ico.indexOf('fab ') === 0 ? item.ico : 'fas ' + item.ico;
    var poinHtml = (item.poin || []).map(function (p) {
      if (p === '__PTK_DEV_CARD__') return '<li class="ptk-dev-li" style="list-style:none;margin:0;padding:0">' + ptkDevCardHtml() + '</li>';
      if (typeof p === 'string' && p.indexOf('<div') === 0) return p;
      return '<li>' + p + '</li>';
    }).join('');

    h += '<div class="ptk-menu-item">'
      + '<button class="ptk-menu-btn" onclick="togglePtkMenu(this)">'
      + '<div class="ptk-menu-left"><div class="ptk-menu-ico" style="background:' + item.bg + ';color:' + item.color + '"><i class="' + faClass + '"></i></div>'
      + '<span class="ptk-menu-name">' + item.title + '</span></div>'
      + '<i class="fas fa-chevron-right ptk-menu-arr"></i>'
      + '</button>'
      + '<div class="ptk-detail"><p>' + item.desc + '</p><ul class="ptk-ul">' + poinHtml + '</ul></div>'
      + '</div>';
  });
  h += '</div></div></div>';
  return h;
}
function togglePtkOuter(btn) { btn.classList.toggle('open'); var ml = G('ptk-menulist'); if (ml) ml.classList.toggle('on'); }

function togglePtkMenu(btn) {
  var detail = btn.nextElementSibling; var isOpen = detail.classList.contains('on');
  document.querySelectorAll('.ptk-detail.on').forEach(function (d) { d.classList.remove('on'); });
  document.querySelectorAll('.ptk-menu-btn.open').forEach(function (b) { b.classList.remove('open'); });
  if (!isOpen) { detail.classList.add('on'); btn.classList.add('open'); }
}
function loadPetunjuk() {
  setNav('ptk'); setPage('Petunjuk Teknis', 'Panduan fitur & penggunaan PEDESTRIAN'); sbClose();
  dChart('bar'); dChart('dnt');
  G('ct').innerHTML = '<div class="fu">' + renderPetunjukWidget() + '</div>';
  var tog = document.querySelector('.ptk-outer-toggle'); if (tog) togglePtkOuter(tog);
}



/* --- satlinmas.js --- */
// ══════════════════════════════════════════
//  DATA SATLINMAS
//  Sebelum: google.script.run.withSuccessHandler(fn).getSatlinmasData()
//  Sesudah: apiGet('getSatlinmas').then(fn)
// ══════════════════════════════════════════
function loadSatlinmas(){
  setNav('sl'); setPage('Data Satlinmas','Daftar anggota'); sbClose();
  _slmFNama=''; _slmFUnit='';

  /* ── Cek cache ── */
  var cached=window._gcGet('satlinmas');
  if(cached){
    _slmData=cached.data||[];
    _slmPg=1; renderSatlinmas();
    window._gcRefresh('satlinmas');
    return;
  }

  /* ── Fetch normal ── */
  showLoad();
  apiGet('getSatlinmas').then(function(res){
    hideLoad();
    if(!res||res.success===false){
      showErr((res&&res.message)||'Gagal memuat data Satlinmas.');
      return;
    }
    window._gcSet('satlinmas',res);
    _slmData=res.data||[];
    _slmPg=1; renderSatlinmas();
  });
}

function buildSlmCards(sl){
  var cards='';
  if(!sl.length)return'<div class="empty" style="grid-column:1/-1"><i class="fas fa-users"></i><p>Belum ada data.</p></div>';
  sl.forEach(function(r){
    var av=(r.nama||'?').charAt(0).toUpperCase(),avCls='ag-av',unit=(r.unit||'').toLowerCase();
    if(unit.indexOf('satpol')>-1||unit.indexOf('pp')>-1)avCls+=' satpol';
    else if(unit.indexOf('desa')>-1)avCls+=' desa';
    else if(unit.indexOf('kelurahan')>-1||unit.indexOf('kel ')>-1)avCls+=' kel';
    var ageMeta=r.usia!==''&&r.usia!==undefined?'<span class="ag-pill ag-age"><i class="fas fa-cake-candles"></i> '+r.usia+' thn</span>':'';
    var waMeta=r.wa?'<a class="ag-pill ag-wa" href="https://wa.me/62'+r.wa.replace(/^0/,'').replace(/[^0-9]/g,'')+'" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> '+esc(r.wa)+'</a>':'';
    var bornMeta=r.tglLahir?'<span class="ag-pill ag-born"><i class="fas fa-calendar"></i> '+esc(r.tglLahir)+'</span>':'';
    var ck=rcSet(r);
    cards+='<div class="ag-card"><div class="'+avCls+'">'+av+'</div>'
      +'<div class="ag-info"><div class="ag-name">'+esc(r.nama)+'</div><div class="ag-unit">'+(esc(r.unit)||'\u2014')+'</div>'
      +'<div class="ag-meta">'+ageMeta+bornMeta+waMeta+'</div></div>'
      +'<div class="ag-act">'
      +'<button class="ag-btn ag-edit" onclick="openSlmModal(rcGet(\''+ck+'\'))" title="Edit"><i class="fas fa-pen"></i></button>'
      +'<button class="ag-btn ag-del" onclick="konfirmHapus(\'satlinmas\',rcGet(\''+ck+'\')._ri)" title="Hapus"><i class="fas fa-trash"></i></button>'
      +'</div></div>';
  });
  return cards;
}

function renderSatlinmas(){
  var flt=filterSlm(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/SLM_PER));
  _slmPg=Math.min(_slmPg,pages);var st=(_slmPg-1)*SLM_PER,sl=flt.slice(st,st+SLM_PER);
  var cards=buildSlmCards(sl);
  var unitCount={};_slmData.forEach(function(r){var k=r.unit||'Lainnya';unitCount[k]=(unitCount[k]||0)+1;});
  var unitPills=Object.keys(unitCount).map(function(k){return'<span class="chip cb2" style="margin-right:4px">'+esc(k)+': '+unitCount[k]+'</span>';}).join('');
  if(!G('slm-grid')){
    var h='<div class="fu"><div class="panel">'
      +'<div class="phd"><div style="flex:1"><span class="ptl"><i class="fas fa-users"></i> Data Satlinmas Pedestrian</span>'
      +'<div id="slm-meta" style="font-size:.62rem;color:var(--muted);margin-top:3px">Total: <strong>'+tot+'</strong> anggota'+(unitPills?' · '+unitPills:'')+'</div></div>'
      +'<button class="bp" onclick="openSlmModal(null)"><i class="fas fa-user-plus"></i> Tambah</button></div>'
      +'<div class="fbar"><div class="fsrch" style="flex:2 1 140px"><i class="fas fa-search fsi"></i><input class="fctl" type="text" id="slm-snm" placeholder="Cari nama..." oninput="slmFiltDebounce()"></div>'
      +'<div class="fsrch" style="flex:1 1 110px"><i class="fas fa-search fsi"></i><input class="fctl" type="text" id="slm-sun" placeholder="Cari unit..." oninput="slmFiltDebounce()"></div>'
      +'<button class="bg2" onclick="slmReset()"><i class="fas fa-rotate-left"></i></button></div>'
      +'<div class="ag-grid" id="slm-grid">'+cards+'</div>'
      +'<div class="pgw" id="slm-pgw"><span>'+pgInfo(st,tot,SLM_PER)+'</span><div class="pbs">'+pgBtns(_slmPg,pages,'slmPage')+'</div></div>'
      +'</div></div>';
    G('ct').innerHTML=h;
  }else{
    G('slm-grid').innerHTML=cards;
    G('slm-pgw').innerHTML='<span>'+pgInfo(st,tot,SLM_PER)+'</span><div class="pbs">'+pgBtns(_slmPg,pages,'slmPage')+'</div>';
    if(G('slm-meta'))G('slm-meta').innerHTML='Total: <strong>'+tot+'</strong> anggota'+(unitPills?' · '+unitPills:'');
  }
}

function filterSlm(){return _slmData.filter(function(r){var nm=_slmFNama.toLowerCase(),un=_slmFUnit.toLowerCase();if(nm&&(r.nama||'').toLowerCase().indexOf(nm)<0)return false;if(un&&(r.unit||'').toLowerCase().indexOf(un)<0)return false;return true;});}
var _slmFiltTimer=null;
function slmFiltDebounce(){clearTimeout(_slmFiltTimer);_slmFiltTimer=setTimeout(function(){_slmFNama=G('slm-snm')?G('slm-snm').value:'';_slmFUnit=G('slm-sun')?G('slm-sun').value:'';_slmPg=1;renderSlmBody();},200);}
function renderSlmBody(){var flt=filterSlm(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/SLM_PER));_slmPg=Math.min(_slmPg,pages);var st=(_slmPg-1)*SLM_PER,sl=flt.slice(st,st+SLM_PER);if(G('slm-grid'))G('slm-grid').innerHTML=buildSlmCards(sl);if(G('slm-pgw'))G('slm-pgw').innerHTML='<span>'+pgInfo(st,tot,SLM_PER)+'</span><div class="pbs">'+pgBtns(_slmPg,pages,'slmPage')+'</div>';}
function slmReset(){_slmFNama='';_slmFUnit='';_slmPg=1;if(G('slm-snm'))G('slm-snm').value='';if(G('slm-sun'))G('slm-sun').value='';renderSlmBody();}
function slmPage(p){_slmPg=p;renderSlmBody();}

function openSlmModal(row){
  _slmRow=row;var isEdit=!!row;
  G('mslm-title').innerHTML=isEdit?'<i class="fas fa-user-pen" style="color:var(--blue)"></i> Edit Anggota':'<i class="fas fa-user-plus" style="color:var(--green)"></i> Tambah Anggota';
  var unitOpts=['Satpol PP','Satlinmas Desa/Kelurahan','Satgas Linmas Pedestrian'].map(function(u){return'<option value="'+u+'"'+(row&&row.unit===u?' selected':'')+'>'+u+'</option>';}).join('');
  G('mslm-body').innerHTML=''
    +'<div class="fgrp"><label class="flbl">Nama Lengkap <span class="req">*</span></label><input class="fctl" id="slm-nama" placeholder="Nama lengkap" value="'+esc(row?row.nama:'')+'"></div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Tanggal Lahir</label><input class="fctl" id="slm-tgl" type="date" value="'+esc(row?row.tglLahir:'')+'" oninput="previewUsia()" onchange="previewUsia()"><div id="slm-usia-prev" style="font-size:.63rem;color:var(--blue);margin-top:3px;font-weight:700;min-height:15px"></div></div>'
    +'<div class="fcol"><label class="flbl">Unit</label><select class="fctl" id="slm-unit"><option value="">-- Pilih Unit --</option>'+unitOpts+'</select></div></div>'
    +'<div class="fgrp"><label class="flbl">Nomor WhatsApp</label><input class="fctl" id="slm-wa" placeholder="08xxxxxxxxxx" value="'+esc(row?row.wa:'')+'"></div>';
  if(row&&row.tglLahir)previewUsia();
  om('mslm');setTimeout(function(){var el=G('slm-nama');if(el)el.focus();},180);
}

function previewUsia(){
  var inp=G('slm-tgl'),prev=G('slm-usia-prev');if(!inp||!prev)return;
  var val=inp.value;if(!val){prev.textContent='';return;}
  var d=new Date(val);if(isNaN(d.getTime())){prev.textContent='';return;}
  var now=new Date(),usia=now.getFullYear()-d.getFullYear(),m=now.getMonth()-d.getMonth();
  if(m<0||(m===0&&now.getDate()<d.getDate()))usia--;
  prev.textContent=usia>=0?'Usia: '+usia+' tahun':'';
}

function submitSlm(){
  var nama=(G('slm-nama')||{}).value||'';
  if(!nama.trim()){toast('Nama wajib diisi.','er');return;}
  var payload={nama:nama,tglLahir:(G('slm-tgl')||{}).value||'',unit:(G('slm-unit')||{}).value||'',wa:(G('slm-wa')||{}).value||''};
  if(_slmRow)payload._ri=_slmRow._ri;
  var action=_slmRow?'updateSatlinmas':'addSatlinmas';
  showLoad(_slmRow?'Menyimpan...':'Menambah...');cm('mslm');

  // ✅ GANTI
  apiPost(action,payload).then(function(res){
    hideLoad();
    if(res.success){toast(_slmRow?'Data diperbarui.':'Anggota ditambahkan.','ok'); window._gcDel('satlinmas'); loadSatlinmas();}
    else toast('Gagal: '+(res.message||''),'er');
  });
}



/* --- settings.js --- */
// ══════════════════════════════════════════
//  PENGATURAN (SETTINGS)
//  SIPEDAS — Sistem Informasi Pedestrian
// ══════════════════════════════════════════

function loadSettings() {
  setNav('set');
  setPage('Pengaturan Sistem', 'Kelola akun, template cetak & konfigurasi');
  sbClose();

  // Reset binding flags so previews get rebound on each visit
  window._setPdfPreviewBind = false;
  window._setKolPreviewBind = false;

  showLoad('Memuat pengaturan...');
  apiGet('getSettings').then(function (res) {
    hideLoad();
    if (!res || res.success === false) {
      showErr((res && res.message) || 'Gagal memuat pengaturan.');
      return;
    }
    var data = res.data || {};
    // Invalidate pdf settings cache so openPdf re-loads
    _pdfSettings = {};
    renderSettings(data);
  });
}

/** Sinkron dengan getSheetInitDefinitions() di api/lib/sheets-service.js */
var _SHEET_INIT_LIST = [
  { id: 'Users', lbl: 'Users' },
  { id: 'INPUT', lbl: 'INPUT' },
  { id: 'Data Satlinmas', lbl: 'Data Satlinmas' },
  { id: 'Detail Foto', lbl: 'Detail Foto' },
  { id: 'Layer Peta', lbl: 'Layer Peta' },
  { id: 'Gambar Peta', lbl: 'Gambar Peta' },
  { id: 'Teks Laporan', lbl: 'Teks Laporan' },
  { id: 'Settings', lbl: 'Settings' }
];

function _sheetInitButtonsHtml() {
  var h = '';
  for (var i = 0; i < _SHEET_INIT_LIST.length; i++) {
    var r = _SHEET_INIT_LIST[i];
    h += '<button type="button" class="bg2" style="padding:10px 8px;font-size:.68rem;font-weight:700;justify-content:center;display:flex;align-items:center;gap:6px;flex-direction:column;text-align:center;line-height:1.25" onclick=\'runInitSheets(' + JSON.stringify(r.id) + ')\' title="Perbaiki sheet ini saja">'
      + '<i class="fas fa-table" style="color:var(--blue);font-size:.8rem"></i><span>' + esc(r.lbl) + '</span></button>';
  }
  return h;
}

function renderSettings(data) {
  function ev(key, fallback) { return esc(data[key] || fallback || ''); }

  var h = '<div class="fu" style="max-width:960px;margin:0 auto">'

    // ─── AKUN SECTION ───────────────────────────────────────────
    + '<div class="panel" style="margin-bottom:18px">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-user-shield"></i> Manajemen Akun</span></div>'
    + '  <div class="mbd" style="padding:16px;display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:20px">'

    // Ganti Password
    + '    <div class="set-card">'
    + '      <p class="set-card-ttl" style="color:var(--blue)"><i class="fas fa-key"></i> Ganti Password</p>'
    + '      <div class="fgrp"><label class="flbl">Password Lama</label>'
    + '        <div class="pw-field-wrap"><input type="password" class="fctl" id="set-old-pass"><button class="pw-eye" onclick="toggleSetEye(\'set-old-pass\',this)"><i class="fas fa-eye"></i></button></div>'
    + '      </div>'
    + '      <div class="fgrp"><label class="flbl">Password Baru</label>'
    + '        <div class="pw-field-wrap"><input type="password" class="fctl" id="set-new-pass"><button class="pw-eye" onclick="toggleSetEye(\'set-new-pass\',this)"><i class="fas fa-eye"></i></button></div>'
    + '      </div>'
    + '      <button class="bp" style="width:100%" onclick="submitChangePass()"><i class="fas fa-save"></i> Perbarui Password</button>'
    + '    </div>'

    // Buat Akun
    + '    <div class="set-card">'
    + '      <p class="set-card-ttl" style="color:var(--green)"><i class="fas fa-user-plus"></i> Buat Akun Baru</p>'
    + '      <div class="frow"><div class="fcol"><label class="flbl">Username</label><input class="fctl" id="set-new-un"></div>'
    + '      <div class="fcol"><label class="flbl">Role</label><select class="fctl" id="set-new-rl"><option value="user">User</option><option value="admin">Admin</option></select></div></div>'
    + '      <div class="fgrp"><label class="flbl">Nama Lengkap</label><input class="fctl" id="set-new-nm"></div>'
    + '      <div class="fgrp"><label class="flbl">Password</label>'
    + '        <div class="pw-field-wrap"><input type="password" class="fctl" id="set-new-pw"><button class="pw-eye" onclick="toggleSetEye(\'set-new-pw\',this)"><i class="fas fa-eye"></i></button></div>'
    + '      </div>'
    + '      <button class="bp" style="width:100%;background:var(--green)" onclick="submitCreateAcc()"><i class="fas fa-user-check"></i> Daftarkan Akun</button>'
    + '    </div>'
    + '  </div>'
    + '</div>'

    // ─── TEMPLATE CETAK PDF SINGLE ──────────────────────────────
    + '<div class="panel" style="margin-bottom:18px">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-file-pdf" style="color:var(--red)"></i> Template Cetak PDF Laporan Tunggal</span></div>'
    + '  <div class="mbd" style="padding:16px">'
    + '    <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:13px;margin-bottom:14px">'
    + '      <p style="font-size:.65rem;color:var(--blue);font-weight:700;margin-bottom:6px"><i class="fas fa-heading"></i> Header Laporan</p>'
    + '      <div class="fgrp"><label class="flbl">Judul Utama (Header Laporan) <span style="color:var(--blue);font-weight:700">(Bisa diedit)</span></label>'
    + '        <input class="fctl" id="set-pdf-judul" value="' + ev('pdf_judul','LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO') + '">'
    + '      </div>'
    + '    </div>'
    + '    <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:13px;margin-bottom:14px">'
    + '      <p style="font-size:.65rem;color:var(--blue);font-weight:700;margin-bottom:8px"><i class="fas fa-hashtag"></i> Nomor & Isi Standar</p>'
    + '      <div class="fgrp"><label class="flbl">Nomor SPT (default saat cetak)</label><input class="fctl" id="set-pdf-nospt" placeholder="300.1.4 / ARH / 8 / 405.14 / 2026" value="' + ev('pdf_nospt','') + '"></div>'
    + '      <div class="fgrp"><label class="flbl">Tujuan Kegiatan</label><input class="fctl" id="set-pdf-tujuan" value="' + ev('pdf_tujuan','Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian') + '"></div>'
    + '      <div class="frow">'
    + '        <div class="fcol"><label class="flbl">Anggota</label><input class="fctl" id="set-pdf-anggota" value="' + ev('pdf_anggota','Regu Pedestrian, Anggota Bidang Linmas, Satpol PP') + '"></div>'
    + '        <div class="fcol"><label class="flbl">Pukul</label><input class="fctl" id="set-pdf-pukul" value="' + ev('pdf_pukul','16.00 \u2013 00.00 WIB') + '"></div>'
    + '      </div>'
    + '    </div>'
    + '    <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:13px;margin-bottom:14px">'
    + '      <p style="font-size:.65rem;color:var(--gold);font-weight:700;margin-bottom:8px"><i class="fas fa-pen-nib"></i> Data Pejabat Penandatangan (TTD)</p>'
    + '      <div class="frow">'
    + '        <div class="fcol"><label class="flbl">Jabatan TTD</label><input class="fctl" id="set-pdf-jabatan" value="' + ev('pdf_jabatan','Kepala Bidang SDA dan Linmas') + '"></div>'
    + '        <div class="fcol"><label class="flbl">Nama Pejabat</label><input class="fctl" id="set-pdf-nama" value="' + ev('pdf_nama','Erry Setiyoso Birowo, SP') + '"></div>'
    + '      </div>'
    + '      <div class="frow">'
    + '        <div class="fcol"><label class="flbl">Pangkat / Golongan</label><input class="fctl" id="set-pdf-pangkat" value="' + ev('pdf_pangkat','Pembina') + '"></div>'
    + '        <div class="fcol"><label class="flbl">NIP</label><input class="fctl" id="set-pdf-nip" value="' + ev('pdf_nip','19751029 200212 1 008') + '"></div>'
    + '      </div>'
    + '    </div>'
    + '    <button class="bp" style="width:100%" onclick="submitUpdatePdfSettings()"><i class="fas fa-check-double"></i> Simpan Pengaturan PDF Tunggal</button>'
    + '    <div style="margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#e8e8e8">'
    + '      <div style="padding:7px 10px;background:var(--card);border-bottom:1px solid var(--border);font-size:.65rem;font-weight:700;color:var(--mid)">Preview Template Single PDF</div>'
    + '      <iframe id="set-pdf-preview-frame" style="width:100%;height:380px;border:none;display:block"></iframe>'
    + '    </div>'
    + '  </div>'
    + '</div>'

    // ─── TEMPLATE CETAK PDF KOLEKTIF ────────────────────────────
    + '<div class="panel" style="margin-bottom:18px">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-print" style="color:var(--purple)"></i> Template Cetak PDF Kolektif</span></div>'
    + '  <div class="mbd" style="padding:16px">'
    + '    <div class="frow">'
    + '      <div class="fcol"><label class="flbl">Judul Kolektif</label><input class="fctl" id="set-kol-judul" value="' + ev('kol_judul','LAPORAN PATROLI WILAYAH PEDESTRIAN') + '"></div>'
    + '      <div class="fcol"><label class="flbl">Sub Judul / Satuan</label><input class="fctl" id="set-kol-subjudul" value="' + ev('kol_subjudul','SATGAS LINMAS PEDESTRIAN') + '"></div>'
    + '    </div>'
    + '    <div class="frow">'
    + '      <div class="fcol"><label class="flbl">Jabatan TTD Kolektif</label><input class="fctl" id="set-kol-jabatan" value="' + ev('kol_jabatan','Kepala Bidang SDA dan LINMAS') + '"></div>'
    + '      <div class="fcol"><label class="flbl">Nama Pejabat</label><input class="fctl" id="set-kol-nama" value="' + ev('kol_nama','Erry Setiyoso Birowo, SP') + '"></div>'
    + '    </div>'
    + '    <div class="frow">'
    + '      <div class="fcol"><label class="flbl">Pangkat</label><input class="fctl" id="set-kol-pangkat" value="' + ev('kol_pangkat','Pembina') + '"></div>'
    + '      <div class="fcol"><label class="flbl">NIP</label><input class="fctl" id="set-kol-nip" value="' + ev('kol_nip','19751029 200212 1 008') + '"></div>'
    + '    </div>'
    + '    <button class="bp" style="width:100%;background:var(--purple)" onclick="submitUpdateKolSettings()"><i class="fas fa-check-double"></i> Simpan Pengaturan PDF Kolektif</button>'
    + '    <div style="margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#e8e8e8">'
    + '      <div style="padding:7px 10px;background:var(--card);border-bottom:1px solid var(--border);font-size:.65rem;font-weight:700;color:var(--mid)">Preview Template Kolektif PDF</div>'
    + '      <iframe id="set-kol-preview-frame" style="width:100%;height:380px;border:none;display:block"></iframe>'
    + '    </div>'
    + '  </div>'
    + '</div>'

    // ─── TEMPLATE PETA ──────────────────────────────────────────
    + '<div class="panel" style="margin-bottom:18px">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-map-location-dot" style="color:var(--teal)"></i> Template Cetak Peta</span></div>'
    + '  <div class="mbd" style="padding:16px">'
    + '    <div class="fgrp"><label class="flbl">Judul Peta</label><input class="fctl" id="set-peta-judul" value="' + ev('peta_judul','PETA PEDESTRIAN KABUPATEN PONOROGO') + '"></div>'
    + '    <div class="frow">'
    + '      <div class="fcol"><label class="flbl">Jabatan TTD Peta</label><input class="fctl" id="set-peta-jabatan" value="' + ev('peta_jabatan','Kepala Bidang SDA dan Linmas') + '"></div>'
    + '      <div class="fcol"><label class="flbl">Nama Pejabat</label><input class="fctl" id="set-peta-nama" value="' + ev('peta_nama','Erry Setiyoso Birowo, SP') + '"></div>'
    + '    </div>'
    + '    <button class="bp" style="width:100%;background:var(--teal)" onclick="submitUpdatePetaSettings()"><i class="fas fa-check-double"></i> Simpan Pengaturan Peta</button>'
    + '  </div>'
    + '</div>'

    // ─── TAMPILAN / DARK MODE ────────────────────────────────────
    + '<div class="panel" style="margin-bottom:18px">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-palette"></i> Tampilan</span></div>'
    + '  <div class="mbd" style="padding:16px">'
    + '    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:13px">'
    + '      <div>'
    + '        <p style="font-weight:700;font-size:.8rem;margin-bottom:3px"><i class="fas fa-moon"></i> Mode Gelap (Dark Mode)</p>'
    + '        <p style="font-size:.63rem;color:var(--muted)">Mengubah tema warna ke mode gelap / terang</p>'
    + '      </div>'
    + '      <button class="dm-toggle-btn" id="set-dm-btn" onclick="toggleDarkMode()" title="Toggle Dark Mode">'
    + '        <span class="dm-toggle-knob" id="set-dm-knob"></span>'
    + '      </button>'
    + '    </div>'
    + '  </div>'
    + '</div>'

    // ─── DATABASE ────────────────────────────────────────────────
    + '<div class="panel">'
    + '  <div class="phd"><span class="ptl"><i class="fas fa-database"></i> Pemeliharaan Struktur Data (Google Sheet)</span></div>'
    + '  <div class="mbd" style="padding:16px">'
    + '    <p style="font-size:.72rem;color:var(--muted);margin-bottom:12px;line-height:1.55">Membuat sheet yang belum ada, menyamakan <strong>baris header</strong> dengan template (jumlah kolom mengikuti template, tidak ditambah), <strong>freeze baris 1</strong>, dan <strong>header biru</strong>. Lebar kolom di spreadsheet mengikuti isi (auto). Data baris 2 ke bawah tidak dihapus.</p>'
    + '    <p style="font-size:.65rem;font-weight:800;color:var(--mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Per sheet (satu per satu)</p>'
    + '    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin-bottom:14px">'
    + _sheetInitButtonsHtml()
    + '    </div>'
    + '    <p style="font-size:.65rem;font-weight:800;color:var(--mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Semua sekaligus</p>'
    + '    <button class="bp" style="width:100%;padding:14px" onclick="runInitSheets(null)">'
    + '      <i class="fas fa-layer-group"></i> Perbaiki &amp; format <strong>semua sheet</strong> sekaligus'
    + '    </button>'
    + '  </div>'
    + '</div>'

    + '</div>';

  G('ct').innerHTML = h;

  // Implementasi Accordion untuk Menu Pengaturan
  document.querySelectorAll('#ct .panel').forEach(function(p){
    var phd = p.querySelector('.phd');
    var mbd = p.querySelector('.mbd');
    // Bagian Tampilan (Dark Mode) biarkan selalu terbuka
    if (phd && mbd && !p.innerHTML.includes('Mode Gelap')) {
      phd.style.cursor = 'pointer';
      phd.title = 'Klik untuk membuka/menutup konfigurasi ini';
      
      // Tambahkan ikon dropdown jika belum ada
      if (!phd.querySelector('.tg-ico')) {
        var wrapper=document.createElement('div');
        wrapper.style.display='flex'; wrapper.style.alignItems='center'; wrapper.style.justifyContent='space-between'; wrapper.style.width='100%';
        wrapper.innerHTML=phd.innerHTML+'<i class="fas fa-chevron-down tg-ico" style="color:var(--muted);transition:transform .3s"></i>';
        phd.innerHTML=''; phd.appendChild(wrapper);
      }
      
      var origDisp = window.getComputedStyle(mbd).display;
      mbd.setAttribute('data-orig-disp', origDisp === 'none' ? 'block' : origDisp);
      mbd.style.display = 'none'; // Awal sembunyi
      
      phd.onclick = function() {
        var isHidden = mbd.style.display === 'none';
        mbd.style.display = isHidden ? mbd.getAttribute('data-orig-disp') : 'none';
        var ico = phd.querySelector('.tg-ico');
        if (ico) ico.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      };
    }
  });

  // Update dark mode toggle state
  setTimeout(function() {
    var isDark = document.body.classList.contains('dark-mode');
    var btn = G('set-dm-btn');
    if (btn) btn.classList.toggle('on', isDark);
    updateKopToggleState();
    bindSettingsPdfPreview();
    renderSettingsPdfPreview();
    bindSettingsKolPreview();
    renderSettingsKolPreview();
  }, 50);
}

function updateKopToggleState() {
  var cb = G('set-pdf-kop-aktif');
  var sw = cb ? cb.closest('.set-switch') : null;
  if (sw) sw.classList.toggle('on', !!(cb && cb.checked));
}

function _getSetVal(id, fb) {
  var el = G(id);
  return el ? (el.value || '') : (fb || '');
}

function renderSettingsPdfPreview() {
  var frame = G('set-pdf-preview-frame');
  if (!frame) return;
  apiPost('generateLaporanHtml', {
    judulUtama: _getSetVal('set-pdf-judul', 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO'),
    hari: 'Senin',
    tanggal: '1 Januari 2026',
    tujuan: _getSetVal('set-pdf-tujuan', 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian'),
    nomorSpt: _getSetVal('set-pdf-nospt', ''),
    lokasi: 'Area Pedestrian Kota Ponorogo',
    anggota: _getSetVal('set-pdf-anggota', 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP'),
    pukul: _getSetVal('set-pdf-pukul', '16.00 - 00.00 WIB'),
    identitas: '',
    keterangan: 'Contoh uraian laporan untuk preview template dari menu pengaturan.',
    uraian: 'Contoh uraian laporan untuk preview template dari menu pengaturan.',
    tglSurat: '1 Januari 2026',
    jabatanTtd: _getSetVal('set-pdf-jabatan', 'Kepala Bidang SDA dan Linmas'),
    namaTtd: _getSetVal('set-pdf-nama', 'Erry Setiyoso Birowo, SP'),
    pangkatTtd: _getSetVal('set-pdf-pangkat', 'Pembina'),
    nipTtd: _getSetVal('set-pdf-nip', '19751029 200212 1 008'),
    kopAktif: !!(G('set-pdf-kop-aktif') && G('set-pdf-kop-aktif').checked),
    kopInstansi: _getSetVal('set-pdf-kop-instansi', 'PEMERINTAH KABUPATEN PONOROGO'),
    kopDinas: _getSetVal('set-pdf-kop-dinas', 'SATUAN POLISI PAMONG PRAJA'),
    kopJalan: _getSetVal('set-pdf-kop-jalan', 'Jl. Alun-Alun Utara No. 04 Ponorogo, Jawa Timur'),
    kopLogoKiri: _getSetVal('set-pdf-kop-kiri', ''),
    kopLogoKanan: _getSetVal('set-pdf-kop-kanan', ''),
    fotos: []
  }).then(function(res){
    if (res && res.success) {
      var html = (res.data && res.data.html) ? res.data.html : (res.html || '');
      frame.srcdoc = html;
    }
  });
}

function bindSettingsPdfPreview() {
  if (window._setPdfPreviewBind) return;
  window._setPdfPreviewBind = true;
  var ids = [
    'set-pdf-jabatan','set-pdf-nama','set-pdf-pangkat','set-pdf-nip'
  ];
  ids.forEach(function(id){
    var el = G(id);
    if (!el) return;
    el.addEventListener('input', renderSettingsPdfPreview);
    el.addEventListener('change', function() {
      if (id === 'set-pdf-kop-aktif') updateKopToggleState();
      renderSettingsPdfPreview();
    });
  });
}

function renderSettingsKolPreview() {
  var frame = G('set-kol-preview-frame');
  if (!frame) return;
  // Build a minimal sample row for preview
  var now = new Date();
  var sampleRows = [{
    ts: now.toLocaleDateString('id-ID'),
    lokasi: 'Area Pedestrian Kota Ponorogo',
    hari: 'Senin', tanggal: '1 Januari 2026',
    identitas: 'NIHIL', personil: 'Contoh Personil A, B, C',
    danru: 'Danru 1', namaDanru: 'Nama Danru Contoh',
    keterangan: 'Pelaksanaan berjalan aman dan lancar.'
  }];
  apiPost('generateKolektifHtml', {
    rows: sampleRows,
    tglFrom: '', tglTo: '',
    kopSurat: '',
    judul: _getSetVal('set-kol-judul', 'LAPORAN PATROLI WILAYAH PEDESTRIAN'),
    subjudul: _getSetVal('set-kol-subjudul', 'SATGAS LINMAS PEDESTRIAN'),
    jabatanTtd: _getSetVal('set-kol-jabatan', 'Kepala Bidang SDA dan LINMAS'),
    namaTtd: _getSetVal('set-kol-nama', 'Erry Setiyoso Birowo, SP'),
    pangkatTtd: _getSetVal('set-kol-pangkat', 'Pembina'),
    nipTtd: _getSetVal('set-kol-nip', '19751029 200212 1 008')
  }).then(function(res) {
    if (res && res.success) {
      var html = (res.data && res.data.html) ? res.data.html : (res.html || '');
      frame.srcdoc = html;
    }
  });
}

function bindSettingsKolPreview() {
  if (window._setKolPreviewBind) return;
  window._setKolPreviewBind = true;
  var ids = ['set-kol-judul','set-kol-subjudul','set-kol-jabatan','set-kol-nama','set-kol-pangkat','set-kol-nip'];
  var timer = null;
  ids.forEach(function(id){
    var el = G(id);
    if (!el) return;
    el.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(renderSettingsKolPreview, 700);
    });
  });
}

function toggleSetEye(inputId, btn) {
  var inp = G(inputId);
  if (!inp) return;
  var ico = btn.querySelector('i');
  if (inp.type === 'password') {
    inp.type = 'text';
    if (ico) ico.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    if (ico) ico.className = 'fas fa-eye';
  }
}

function submitChangePass() {
  var oldP = G('set-old-pass').value, newP = G('set-new-pass').value;
  if (!oldP || !newP) { toast('Password lama & baru wajib diisi.', 'er'); return; }
  showLoad('Memperbarui...');
  apiPost('changePassword', { oldPass: oldP, newPass: newP, username: '' }).then(function (res) {
    hideLoad();
    if (res.success) { toast('Password berhasil diganti.', 'ok'); G('set-old-pass').value = ''; G('set-new-pass').value = ''; }
    else toast(res.message, 'er');
  });
}

function submitCreateAcc() {
  var un = G('set-new-un').value.trim(), role = G('set-new-rl').value;
  var nm = G('set-new-nm').value.trim(), pw = G('set-new-pw').value;
  if (!un || !nm || !pw) { toast('Semua field akun baru wajib diisi.', 'er'); return; }
  showLoad('Mendaftarkan...');
  apiPost('createAccount', { username: un, role: role, namaLengkap: nm, password: pw }).then(function (res) {
    hideLoad();
    if (res.success) { toast('Akun ' + un + ' berhasil dibuat.', 'ok'); G('set-new-un').value = ''; G('set-new-nm').value = ''; G('set-new-pw').value = ''; }
    else toast(res.message, 'er');
  });
}

function submitUpdatePdfSettings() {
  var p = {
    pdf_judul: (G('set-pdf-judul')||{}).value || '',
    pdf_nospt: (G('set-pdf-nospt')||{}).value || '',
    pdf_tujuan: (G('set-pdf-tujuan')||{}).value || '',
    pdf_anggota: (G('set-pdf-anggota')||{}).value || '',
    pdf_pukul: (G('set-pdf-pukul')||{}).value || '',
    pdf_jabatan: (G('set-pdf-jabatan')||{}).value || '',
    pdf_nama: (G('set-pdf-nama')||{}).value || '',
    pdf_pangkat: (G('set-pdf-pangkat')||{}).value || '',
    pdf_nip: (G('set-pdf-nip')||{}).value || '',
    pdf_kop_aktif: 'false'
  };
  showLoad('Menyimpan...');
  apiPost('saveSettings', p).then(function (res) {
    hideLoad();
    if (res.success) {
      _pdfSettings = {}; // Force reload on next openPdf
      toast('Pengaturan PDF Tunggal disimpan.', 'ok');
    } else toast(res.message, 'er');
  });
}

function submitUpdateKolSettings() {
  var p = {
    kol_judul: (G('set-kol-judul')||{}).value || '',
    kol_subjudul: (G('set-kol-subjudul')||{}).value || '',
    kol_jabatan: (G('set-kol-jabatan')||{}).value || '',
    kol_nama: (G('set-kol-nama')||{}).value || '',
    kol_pangkat: (G('set-kol-pangkat')||{}).value || '',
    kol_nip: (G('set-kol-nip')||{}).value || ''
  };
  showLoad('Menyimpan...');
  apiPost('saveSettings', p).then(function (res) {
    hideLoad();
    if (res.success) toast('Pengaturan PDF Kolektif disimpan.', 'ok');
    else toast(res.message, 'er');
  });
}

function submitUpdatePetaSettings() {
  var p = {
    peta_judul: (G('set-peta-judul')||{}).value || '',
    peta_jabatan: (G('set-peta-jabatan')||{}).value || '',
    peta_nama: (G('set-peta-nama')||{}).value || ''
  };
  showLoad('Menyimpan...');
  apiPost('saveSettings', p).then(function (res) {
    hideLoad();
    if (res.success) toast('Pengaturan Peta disimpan.', 'ok');
    else toast(res.message, 'er');
  });
}

function runInitSheets(onlySheet) {
  var msg = onlySheet
    ? 'Perbaiki sheet "' + onlySheet + '" saja?\n\nHeader baris 1 akan disamakan dengan template bila tidak sama (kolom tidak ditambah). Freeze baris 1 & format header biru. Data baris 2+ tidak dihapus.'
    : 'Perbaiki SEMUA sheet sekaligus?\n\nSama seperti per sheet, untuk setiap tab sheet.';
  if (!confirm(msg)) return;
  showLoad(onlySheet ? 'Memproses satu sheet...' : 'Memproses semua sheet...');
  var payload = {};
  if (onlySheet) payload.onlySheet = onlySheet;
  apiPost('initAllSheets', payload).then(function (res) {
    hideLoad();
    if (res.success) {
      toast('Struktur sheet selesai.', 'ok');
      var lines = res.data;
      var detail = Array.isArray(lines) ? lines.join('\n') : String(res.message || '');
      alert('Selesai.\n\n' + detail);
    } else {
      toast('Gagal inisiasi.', 'er');
      alert('Gagal: ' + (res.message || ''));
    }
  });
}

// Globals for kop surat image processing
window.previewKopLogo = function(input, side) {
  var file = input.files[0];
  var hid = G('set-pdf-kop-' + side);
  var pr = G('set-kop-prev-' + side);
  if (!file) {
    if(!hid.value) pr.innerHTML = '<span style="font-size:0.6rem;color:var(--muted)">Belum ada logo ' + side + '</span>';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e){
     var data = e.target.result;
     var img = new Image();
     img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxW = 300; // max width
        var w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        var res = canvas.toDataURL('image/jpeg', 0.85); // Compress as jpeg string
        hid.value = res;
        pr.innerHTML = '<img src="'+res+'" style="max-height:60px;border:1px solid var(--border);border-radius:4px;display:block">';
        renderSettingsPdfPreview();
     };
     img.src = data;
  };
  reader.readAsDataURL(file);
}

window.clearKopLogo = function(side) {
  G('set-pdf-kop-' + side).value = '';
  G('set-kop-prev-' + side).innerHTML = '<span style="font-size:0.6rem;color:var(--muted)">Belum ada logo ' + side + '</span>';
  renderSettingsPdfPreview();
}


/* --- pagination.js --- */
// ══════════════════════════════════════════
//  PAGINATION
// ══════════════════════════════════════════
function pgBtns(cur,tot,fn){
  if(tot<=1)return'';
  var h='<button class="pbn" '+(cur<=1?'disabled':'')+' onclick="'+fn+'('+(cur-1)+')"><i class="fas fa-chevron-left fa-xs"></i></button>';
  var s=Math.max(1,cur-2),e=Math.min(tot,cur+2);
  for(var p=s;p<=e;p++)h+='<button class="pbn '+(p===cur?'on':'')+'" onclick="'+fn+'('+p+')">'+p+'</button>';
  h+='<button class="pbn" '+(cur>=tot?'disabled':'')+' onclick="'+fn+'('+(cur+1)+')"><i class="fas fa-chevron-right fa-xs"></i></button>';
  return h;
}
function pgInfo(st,tot,per){if(!tot)return'Tidak ada data';return'Menampilkan '+(st+1)+'–'+Math.min(st+per,tot)+' dari '+tot;}

function showErr(msg){
  G('ct').innerHTML='<div class="empty" style="padding:72px 20px">'
    +'<i class="fas fa-triangle-exclamation" style="color:var(--red);opacity:1;font-size:1.9rem"></i>'
    +'<p style="color:var(--red);font-weight:800;margin-top:9px">Gagal memuat data</p>'
    +'<p style="font-size:.7rem;margin-top:4px;color:var(--muted)">'+(msg||'Coba muat ulang.')+'</p>'
    +'<button class="bg2" style="margin-top:12px" onclick="loadDashboard()"><i class="fas fa-rotate-left"></i> Kembali</button>'
    +'</div>';
}


