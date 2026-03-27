// ══════════════════════════════════════════
//  REKAP
//  Sebelum: google.script.run.withSuccessHandler(fn).getRekapData({})
//  Sesudah: apiGet('getRekap', params).then(fn)
// ══════════════════════════════════════════
function loadRekap(){
  setNav('rk'); setPage('Rekap Laporan','Data laporan patroli'); sbClose();
  dChart('bar'); dChart('dnt'); _rPg=1; _rFQ=''; _rFFrom=''; _rFTo='';

  var cached=window._gcGet('rekap');
  if(cached){
    _rData=(cached.data&&cached.data.rows)?cached.data.rows:(cached.data||[]);
    _rPg=1; renderRekap();
    window._gcRefresh('rekap');
    return;
  }

  _rData=[]; showLoad();
  apiGet('getRekap').then(function(res){
    hideLoad();
    window._gcSet('rekap',res);
    _rData=(res.data&&res.data.rows)?res.data.rows:(res.data||[]);
    _rPg=1; renderRekap();
  });
}
function makeChipDesktop(identitas){
  if(!identitas||identitas.toUpperCase()==='NIHIL')return'<span class="chip cm">Nihil</span>';
  var safe=esc(identitas);
  return'<span class="chip cr2" style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle;cursor:pointer;transition:all .15s" title="'+safe+'" onclick="var s=this.style;var on=this.dataset.exp===\'1\';this.dataset.exp=on?\'0\':\'1\';s.maxWidth=on?\'110px\':\'none\';s.whiteSpace=on?\'nowrap\':\'normal\';s.overflow=on?\'hidden\':\'visible\';">'+safe+'</span>';
}

function buildRekapRows(sl,st,isAdm){
  var rows='',cards='';
  if(!sl.length){
    rows='<tr><td colspan="11"><div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div></td></tr>';
    cards='<div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div>';
  }else{
    sl.forEach(function(r,i){
      var fotArr=r.fotos||[],fotThumb=r.fotosThumb||fotArr;
      var chip=makeChipDesktop(r.identitas);var chipMob=mcardChip(r.identitas,'cr2');
      var ck=rcSet(r);
      var fotCell=fotArr.length?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)"><i class="fas fa-images"></i> '+fotArr.length+'</button>':'—';
      var fotBtnMob=fotArr.length?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)"><i class="fas fa-images"></i> '+fotArr.length+'</button>':'';
      var aksi='<button class="bpdf" onclick="openPdf(rcGet(\''+ck+'\'))"><i class="fas fa-file-pdf"></i></button>';
      if(isAdm){aksi+=' <button class="be" onclick="openEditModal(rcGet(\''+ck+'\'))"><i class="fas fa-pen"></i></button> <button class="bd" onclick="konfirmHapus(\'laporan\',rcGet(\''+ck+'\')._ri)"><i class="fas fa-trash"></i></button>';}
      rows+='<tr>'
        +'<td style="color:var(--muted);font-family:var(--mono);font-size:.63rem">'+(st+i+1)+'</td>'
        +'<td style="font-size:.66rem;white-space:nowrap;font-family:var(--mono)">'+esc(r.ts)+'</td>'
        +'<td style="font-weight:600;max-width:130px">'+esc(r.lokasi)+'</td>'
        +'<td><span class="chip ca2">'+esc(r.hari)+'</span></td>'
        +'<td style="white-space:nowrap;font-size:.69rem">'+esc(r.tanggal)+'</td>'
        +'<td>'+chip+'</td>'
        +'<td style="font-size:.67rem;max-width:120px;color:var(--mid)">'+esc(r.personil)+'</td>'
        +'<td><span class="chip cb2">'+esc(r.danru)+'</span></td>'
        +'<td style="font-size:.69rem">'+esc(r.namaDanru)+'</td>'
        +'<td>'+fotCell+'</td>'
        +'<td style="white-space:nowrap">'+aksi+'</td>'
        +'</tr>';
      var aksiMob='<button class="bpdf" onclick="openPdf(rcGet(\''+ck+'\'))"><i class="fas fa-file-pdf"></i></button>';
      if(isAdm){aksiMob+=' <button class="be" onclick="openEditModal(rcGet(\''+ck+'\'))"><i class="fas fa-pen"></i></button> <button class="bd" onclick="konfirmHapus(\'laporan\',rcGet(\''+ck+'\')._ri)"><i class="fas fa-trash"></i></button>';}
      cards+='<div class="mcard-item">'
        +'<div class="mcard-row">'+mcardLokasi(r.lokasi)+chipMob+'</div>'
        +'<div class="mcard-meta"><i class="fas fa-calendar-day" style="color:var(--amber);width:12px"></i> '+esc(r.hari)+', '+esc(r.tanggal)+'<br>'
        +'<i class="fas fa-users" style="color:var(--blue);width:12px"></i> '+mcardPersonil(r.personil)+(r.namaDanru?' · Danru: '+esc(r.namaDanru):'')
        +(fotArr.length?'<br><i class="fas fa-images" style="color:var(--green);width:12px"></i> '+fotArr.length+' foto':'')
        +'</div><div class="mcard-acts">'+fotBtnMob+' '+aksiMob+'</div></div>';
    });
  }
  return{rows:rows,cards:cards};
}

function renderRekap(){
  var isAdm=SES&&SES.role==='admin';
  var flt=filterR(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/PER));
  _rPg=Math.min(_rPg,pages);var st=(_rPg-1)*PER,sl=flt.slice(st,st+PER);
  var rc=buildRekapRows(sl,st,isAdm);
  if(!G('r-tbody')){
    var h='<div class="fu"><div class="panel">'
      +'<div class="phd"><span class="ptl"><i class="fas fa-table-list"></i> Rekap Laporan</span>'
      +'<div class="fbar-right"><span id="r-count" style="font-size:.66rem;color:var(--muted);font-family:var(--mono)">'+tot+'</span>'
      +'<button class="bppl" onclick="openKolektifModal()"><i class="fas fa-print"></i> Kolektif</button></div></div>'
      +'<div class="fbar">'
      +'<div class="fsrch" style="flex:2 1 150px"><i class="fas fa-search fsi"></i><input class="fctl" type="text" id="ft-q" placeholder="Cari lokasi, personil, danru..." oninput="rFiltDebounce()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">Dari:</label><input class="fctl" type="date" id="ft-from" style="min-width:0;flex:1" onchange="rFilt()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">S/d:</label><input class="fctl" type="date" id="ft-to" style="min-width:0;flex:1" onchange="rFilt()"></div>'
      +'<button class="bg2" onclick="rReset()"><i class="fas fa-rotate-left"></i></button>'
      +'</div>'
      +'<div class="twrap"><table class="dtbl"><thead><tr><th>#</th><th>Timestamp</th><th>Lokasi</th><th>Hari</th><th>Tanggal</th><th>Pelanggaran</th><th>Personil</th><th>Danru</th><th>Nama Danru</th><th>Foto</th><th>Aksi</th></tr></thead>'
      +'<tbody id="r-tbody">'+rc.rows+'</tbody></table></div>'
      +'<div class="mcard-list" id="r-cards">'+rc.cards+'</div>'
      +'<div class="pgw" id="r-pgw"><span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'rPage')+'</div></div>'
      +'</div></div>';
    G('ct').innerHTML=h;
  }else{
    G('r-tbody').innerHTML=rc.rows;G('r-cards').innerHTML=rc.cards;
    G('r-pgw').innerHTML='<span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'rPage')+'</div>';
    if(G('r-count'))G('r-count').textContent=tot;
  }
}

function filterR(){
  return _rData.filter(function(r){
    if(_rFQ){var q=_rFQ.toLowerCase();if((r.lokasi||'').toLowerCase().indexOf(q)<0&&(r.tanggal||'').toLowerCase().indexOf(q)<0&&(r.hari||'').toLowerCase().indexOf(q)<0&&(r.personil||'').toLowerCase().indexOf(q)<0&&(r.identitas||'').toLowerCase().indexOf(q)<0&&(r.danru||'').toLowerCase().indexOf(q)<0&&(r.namaDanru||'').toLowerCase().indexOf(q)<0)return false;}
    if(_rFFrom){var df=parseISODate(_rFFrom);if(df){var dt=parseTglID(r.tanggal);if(!dt||dt<df)return false;}}
    if(_rFTo){var dto=parseISODate(_rFTo);if(dto){dto.setHours(23,59,59,999);var dt2=parseTglID(r.tanggal);if(!dt2||dt2>dto)return false;}}
    return true;
  });
}

function parseISODate(s){if(!s)return null;var m=/(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function parseTglID(s){
  if(!s)return null;
  var BLN={januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12};
  var b=s.replace(/^[A-Za-z]+,?\s*/,'').trim().toLowerCase();
  var m=/(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);if(m&&BLN[m[2]])return new Date(+m[3],BLN[m[2]]-1,+m[1]);
  var m2=/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(s);if(m2)return new Date(+m2[3],+m2[2]-1,+m2[1]);
  return null;
}

var _rFiltTimer=null;
function renderRekapBody(){
  var isAdm=SES&&SES.role==='admin';
  var flt=filterR(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/PER));
  _rPg=Math.min(_rPg,pages);var st=(_rPg-1)*PER,sl=flt.slice(st,st+PER);
  var rc=buildRekapRows(sl,st,isAdm);
  if(G('r-tbody'))G('r-tbody').innerHTML=rc.rows;
  if(G('r-cards'))G('r-cards').innerHTML=rc.cards;
  if(G('r-pgw'))G('r-pgw').innerHTML='<span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'rPage')+'</div>';
  if(G('r-count'))G('r-count').textContent=tot;
}
function rFiltDebounce(){clearTimeout(_rFiltTimer);_rFiltTimer=setTimeout(function(){_rFQ=G('ft-q')?G('ft-q').value:'';_rPg=1;renderRekapBody();},200);}
function rFilt(){_rFQ=G('ft-q')?G('ft-q').value:'';_rFFrom=G('ft-from')?G('ft-from').value:'';_rFTo=G('ft-to')?G('ft-to').value:'';_rPg=1;renderRekapBody();}
function rReset(){_rFQ='';_rFFrom='';_rFTo='';_rPg=1;if(G('ft-q'))G('ft-q').value='';if(G('ft-from'))G('ft-from').value='';if(G('ft-to'))G('ft-to').value='';renderRekapBody();}
function rPage(p){_rPg=p;renderRekapBody();}

