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
  var ub=G('dtw-user-badge');if(ub&&SES){ub.innerHTML='<i class="fas fa-user"></i> '+(SES.namaLengkap||SES.username||'');}
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

