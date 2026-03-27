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
  var unitOpts=['Satpol PP','Satlinmas Desa','Satlinmas Kelurahan','Lainnya'].map(function(u){return'<option value="'+u+'"'+(row&&row.unit===u?' selected':'')+'>'+u+'</option>';}).join('');
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

