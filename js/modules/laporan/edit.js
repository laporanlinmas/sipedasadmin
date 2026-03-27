// ══════════════════════════════════════════
//  EDIT LAPORAN
//  Sebelum: google.script.run.withSuccessHandler(fn).getRekapData({})
//  Sesudah: apiGet('getRekap').then(fn)
// ══════════════════════════════════════════
function loadEdit(){
  if(SES&&SES.role!=='admin'){toast('Akses ditolak.','er');return;}
  setNav('ed'); setPage('Edit Laporan','Kelola data laporan'); sbClose();
  dChart('bar'); dChart('dnt'); _rPg=1; _rFQ=''; _rFFrom=''; _rFTo='';

  var cached=window._gcGet('rekap');
  if(cached){
    _rData=(cached.data&&cached.data.rows)?cached.data.rows:(cached.data||[]);
    _rPg=1; renderEdit();
    window._gcRefresh('rekap');
    return;
  }

  _rData=[]; showLoad();
  apiGet('getRekap').then(function(res){
    hideLoad();
    window._gcSet('rekap',res);
    _rData=(res.data&&res.data.rows)?res.data.rows:(res.data||[]);
    _rPg=1; renderEdit();
  });
}
function buildEditRows(sl,st){
  var rows='',cards='';
  if(!sl.length){
    rows='<tr><td colspan="10"><div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div></td></tr>';
    cards='<div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div>';
  }else{
    sl.forEach(function(r){
      var fotArr=r.fotos||[],fotThumb=r.fotosThumb||fotArr;
      var chip=makeChipDesktop(r.identitas);var chipMob=mcardChip(r.identitas,'cr2');
      var ck=rcSet(r);
      var fotCell=fotArr.length?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)"><i class="fas fa-images"></i> '+fotArr.length+'</button>':'—';
      var aksi='<button class="be" onclick="openEditModal(rcGet(\''+ck+'\'))"><i class="fas fa-pen"></i> Edit</button> <button class="bd" onclick="konfirmHapus(\'laporan\',rcGet(\''+ck+'\')._ri)"><i class="fas fa-trash"></i></button>';
      rows+='<tr>'
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
      var fotBtnMob=fotArr.length?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)"><i class="fas fa-images"></i> '+fotArr.length+'</button>':'';
      cards+='<div class="mcard-item"><div class="mcard-row">'+mcardLokasi(r.lokasi)+chipMob+'</div>'
        +'<div class="mcard-meta"><i class="fas fa-calendar-day" style="color:var(--amber);width:12px"></i> '+esc(r.hari)+', '+esc(r.tanggal)+'<br>'
        +'<i class="fas fa-users" style="color:var(--blue);width:12px"></i> '+mcardPersonil(r.personil)+(r.namaDanru?' · Danru: '+esc(r.namaDanru):'')
        +(fotArr.length?'<br><i class="fas fa-images" style="color:var(--green);width:12px"></i> '+fotArr.length+' foto':'')
        +'</div><div class="mcard-acts">'+fotBtnMob+' '+aksi+'</div></div>';
    });
  }
  return{rows:rows,cards:cards};
}

function renderEdit(){
  var flt=filterR(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/PER));
  _rPg=Math.min(_rPg,pages);var st=(_rPg-1)*PER,sl=flt.slice(st,st+PER);var rc=buildEditRows(sl,st);
  if(!G('e-tbody')){
    var h='<div class="fu"><div class="panel">'
      +'<div class="phd"><span class="ptl"><i class="fas fa-file-pen"></i> Daftar Laporan</span><span id="e-count" style="font-size:.66rem;color:var(--muted);font-family:var(--mono)">'+tot+'</span></div>'
      +'<div class="fbar">'
      +'<div class="fsrch" style="flex:2 1 150px"><i class="fas fa-search fsi"></i><input class="fctl" type="text" id="ft-q" placeholder="Cari lokasi, tanggal, danru..." oninput="eFiltDebounce()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">Dari:</label><input class="fctl" type="date" id="ft-from" style="min-width:0" onchange="rFilt()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px"><label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">S/d:</label><input class="fctl" type="date" id="ft-to" style="min-width:0" onchange="rFilt()"></div>'
      +'<button class="bg2" onclick="rReset()"><i class="fas fa-rotate-left"></i></button>'
      +'</div>'
      +'<div class="twrap"><table class="dtbl"><thead><tr><th>Timestamp</th><th>Lokasi</th><th>Hari</th><th>Tanggal</th><th>Pelanggaran</th><th>Personil</th><th>Danru</th><th>Nama Danru</th><th>Foto</th><th>Aksi</th></tr></thead>'
      +'<tbody id="e-tbody">'+rc.rows+'</tbody></table></div>'
      +'<div class="mcard-list" id="e-cards">'+rc.cards+'</div>'
      +'<div class="pgw" id="e-pgw"><span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'ePage')+'</div></div>'
      +'</div></div>';
    G('ct').innerHTML=h;
  }else{
    G('e-tbody').innerHTML=rc.rows;G('e-cards').innerHTML=rc.cards;
    G('e-pgw').innerHTML='<span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'ePage')+'</div>';
    if(G('e-count'))G('e-count').textContent=tot;
  }
}

var _eFiltTimer=null;
function eFiltDebounce(){clearTimeout(_eFiltTimer);_eFiltTimer=setTimeout(function(){_rFQ=G('ft-q')?G('ft-q').value:'';_rPg=1;renderEditBody();},200);}
function renderEditBody(){
  var flt=filterR(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/PER));
  _rPg=Math.min(_rPg,pages);var st=(_rPg-1)*PER,sl=flt.slice(st,st+PER);var rc=buildEditRows(sl,st);
  if(G('e-tbody'))G('e-tbody').innerHTML=rc.rows;if(G('e-cards'))G('e-cards').innerHTML=rc.cards;
  if(G('e-pgw'))G('e-pgw').innerHTML='<span>'+pgInfo(st,tot,PER)+'</span><div class="pbs">'+pgBtns(_rPg,pages,'ePage')+'</div>';
  if(G('e-count'))G('e-count').textContent=tot;
}
function ePage(p){_rPg=p;renderEditBody();}

function makeDriveThumbUrl(url){
  if(!url)return'';if(url.startsWith('data:'))return url;
  var m1=/[?&]id=([^&]+)/.exec(url);if(m1)return'https://drive.google.com/thumbnail?id='+m1[1]+'&sz=w400';
  var m2=/\/file\/d\/([^\/]+)/.exec(url);if(m2)return'https://drive.google.com/thumbnail?id='+m2[1]+'&sz=w400';
  return url;
}

function openEditModal(row){
  if(!row){toast('Data tidak ditemukan.','er');return;}
  _editRow=row;
  _editFotos=(row.fotos||[]).map(function(u){return{src:makeDriveThumbUrl(u),url:u,isNew:false};});
  var days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  var dOpts=days.map(function(d){return'<option value="'+d+'"'+(row.hari===d?' selected':'')+'>'+d+'</option>';}).join('');
  G('medit-body').innerHTML=''
    +'<div class="frow"><div class="fcol"><label class="flbl">Lokasi <span class="req">*</span></label><input class="fctl" id="ed-lok" value="'+esc(row.lokasi)+'"></div>'
    +'<div class="fcol"><label class="flbl">Hari</label><select class="fctl" id="ed-hari">'+dOpts+'</select></div></div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Tanggal</label><input class="fctl" id="ed-tgl" value="'+esc(row.tanggal)+'"></div>'
    +'<div class="fcol"><label class="flbl">Identitas / Pelanggar</label><textarea class="fctl" id="ed-idn" rows="3" placeholder="NIHIL atau isi identitas">'+esc(row.identitas)+'</textarea></div></div>'
    +'<div class="fgrp"><label class="flbl">Personil</label><input class="fctl" id="ed-per" value="'+esc(row.personil)+'"></div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Danru</label><input class="fctl" id="ed-dan" value="'+esc(row.danru)+'"></div>'
    +'<div class="fcol"><label class="flbl">Nama Danru</label><input class="fctl" id="ed-ndan" value="'+esc(row.namaDanru)+'"></div></div>'
    +'<div class="fgrp"><label class="flbl">Foto</label><div class="fgrd" id="ed-fgrd"></div></div>';
  renderEditFotoGrid();
  var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;inp.style.display='none';inp.id='ed-finp';
  inp.addEventListener('change',function(e){addEditFotos(e.target.files);inp.value='';});
  G('medit-body').appendChild(inp);om('medit');
}

function renderEditFotoGrid(){
  var g=G('ed-fgrd');if(!g)return;g.innerHTML='';
  _editFotos.forEach(function(f,i){
    var div=document.createElement('div');div.className='fitem';
    var img=document.createElement('img');img.src=f.src||f.url||'';
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;cursor:pointer;';
    img.onerror=(function(fi,imgEl,divEl){return function(){
      var stage=parseInt(imgEl.dataset.stage||'0');imgEl.onerror=null;
      if(stage===0){imgEl.dataset.stage='1';var orig=fi.url||'';if(orig&&imgEl.src!==orig){imgEl.onerror=arguments.callee;imgEl.src=orig;return;}stage=1;}
      if(stage===1){imgEl.dataset.stage='2';var furl=fi.url||'';var mx2=/\/file\/d\/([^\/]+)/.exec(furl);var mx1=/[?&]id=([^&]+)/.exec(furl);var fid=mx2?mx2[1]:(mx1?mx1[1]:'');if(fid){var lh3url='https://lh3.googleusercontent.com/d/'+fid+'=w400';imgEl.onerror=function(){imgEl.onerror=null;showFotoPlaceholder(imgEl,divEl);};imgEl.src=lh3url;return;}}
      showFotoPlaceholder(imgEl,divEl);
    };})(f,img,div);
    img.onclick=(function(idx){return function(){var origUrls=_editFotos.map(function(x){return x.url||x.src;});var thumbUrls=_editFotos.map(function(x){return x.src||x.url;});galOpen(origUrls,thumbUrls,idx);};})(i);
    var del=document.createElement('button');del.className='fdel';del.innerHTML='<i class="fas fa-times"></i>';
    del.onclick=(function(ii){return function(e){e.stopPropagation();_editFotos.splice(ii,1);renderEditFotoGrid();};})(i);
    var num=document.createElement('div');num.className='fnum';num.textContent=i+1;
    div.appendChild(img);div.appendChild(del);div.appendChild(num);g.appendChild(div);
  });
  if(_editFotos.length<10){
    var btn=document.createElement('button');btn.className='fadd';
    btn.innerHTML='<i class="fas fa-plus"></i><span>Tambah</span>';
    btn.onclick=function(){var fi=G('ed-finp');if(fi)fi.click();};
    g.appendChild(btn);
  }
}

function showFotoPlaceholder(imgEl,divEl){
  if(divEl)divEl.style.background='#f0f0f0';imgEl.onerror=null;
  imgEl.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23e8e8e8"%2F%3E%3Ctext x="40" y="47" text-anchor="middle" fill="%23bbb" font-size="9" font-family="sans-serif"%3EFoto%3C%2Ftext%3E%3C%2Fsvg%3E';
}

function addEditFotos(files){
  var rem=10-_editFotos.length;
  for(var i=0;i<Math.min(files.length,rem);i++){
    (function(file){
      var rd=new FileReader();
      rd.onload=function(e){_editFotos.push({src:e.target.result,isNew:true,data:e.target.result,mime:file.type});renderEditFotoGrid();};
      rd.readAsDataURL(file);
    })(files[i]);
  }
}

function submitEdit(){
  if(!_editRow)return;
  var lok=(G('ed-lok')||{}).value||'';
  if(!lok.trim()){toast('Lokasi wajib diisi.','er');return;}
  var fPay=_editFotos.map(function(f){return f.isNew?{data:f.data,mime:f.mime}:f.url;});
  showLoad('Menyimpan...');cm('medit');

  // ✅ GANTI
  apiPost('updateLaporan',{
    _ri:_editRow._ri,lokasi:lok,
    hari:(G('ed-hari')||{}).value||'',tanggal:(G('ed-tgl')||{}).value||'',
    identitas:(G('ed-idn')||{}).value||'',personil:(G('ed-per')||{}).value||'',
    danru:(G('ed-dan')||{}).value||'',namaDanru:(G('ed-ndan')||{}).value||'',
    fotos:fPay
  }).then(function(res){
    hideLoad();
    if(res.success){toast('Laporan berhasil diperbarui.','ok'); window._gcDel('rekap'); window._gcDel('dashboard'); loadEdit();}
    else toast('Gagal: '+(res.message||''),'er');
  });
}

