// ══════════════════════════════════════════
//  INPUT LAPORAN
//  Sebelum: google.script.run.withSuccessHandler(fn).addLaporan(payload)
//  Sesudah: apiPost('addLaporan', payload).then(fn)
// ══════════════════════════════════════════
var _inFotos=[],_inMode='manual';

function loadInput(){
  if(SES&&SES.role!=='admin'){toast('Akses ditolak.','er');return;}
  setNav('in');setPage('Input Laporan','Tambah laporan baru');sbClose();
  dChart('bar');dChart('dnt');_inFotos=[];_inMode='manual';
  var days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  var dOpts=days.map(function(d){return'<option>'+d+'</option>';}).join('');
  var bulan=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var bOpts=bulan.map(function(b,i){return'<option value="'+(i+1)+'">'+b+'</option>';}).join('');
  var now=new Date(),cy=now.getFullYear();
  var thnOpts='';for(var y=cy-1;y<=cy+4;y++)thnOpts+='<option value="'+y+'"'+(y===cy?' selected':'')+'>'+y+'</option>';
  var h='<div class="fu"><div class="panel" style="max-width:800px">'
    +'<div class="phd"><span class="ptl"><i class="fas fa-plus-circle"></i> Input Laporan Baru</span></div><div class="pbd">'
    +'<div class="in-tabs">'
    +'<button class="in-tab on" id="tab-manual" onclick="switchInTab(\'manual\')"><i class="fas fa-keyboard"></i> Input Manual</button>'
    +'<button class="in-tab" id="tab-wa" onclick="switchInTab(\'wa\')"><i class="fab fa-whatsapp"></i> Format WA</button>'
    +'</div>'
    +'<div id="in-panel-wa" style="display:none">'
    +'<div class="fgrp"><label class="flbl">Tempel Teks Laporan WA <span class="req">*</span></label>'
    +'<textarea class="wa-ta" id="wa-teks" placeholder="Tempel teks laporan dari WhatsApp di sini..."></textarea>'
    +'<div class="wa-err" id="wa-err"><i class="fas fa-circle-xmark"></i><span id="wa-err-msg"></span></div>'
    +'<div class="wa-prev" id="wa-prev"><div class="wa-prev-head"><i class="fas fa-circle-check"></i> Berhasil diparse — periksa lalu klik Lanjut ke Form</div><div id="wa-prev-body"></div></div>'
    +'<div style="display:flex;gap:7px;margin-top:10px"><button class="bp" onclick="parseWA()"><i class="fas fa-wand-magic-sparkles"></i> Parse Teks</button>'
    +'<button class="bg2" id="wa-btn-lanjut" style="display:none" onclick="waLanjutKeForm()"><i class="fas fa-arrow-right"></i> Lanjut ke Form</button></div></div></div>'
    +'<div id="in-panel-manual">'
    +'<div class="fgrp"><label class="flbl">Tanggal <span class="req">*</span></label>'
    +'<div style="display:grid;grid-template-columns:64px 1fr 84px;gap:7px">'
    +'<select class="fctl" id="in-tgl-h" onchange="syncTglStr()">'+buildTglOpts(1,31)+'</select>'
    +'<select class="fctl" id="in-tgl-b" onchange="syncTglStr()">'+bOpts+'</select>'
    +'<select class="fctl" id="in-tgl-y" onchange="syncTglStr()">'+thnOpts+'</select>'
    +'</div><input type="hidden" id="in-tgl-str"></div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Hari <span class="req">*</span></label><select class="fctl" id="in-hari">'+dOpts+'</select></div>'
    +'<div class="fcol"><label class="flbl">Lokasi Patroli <span class="req">*</span></label><input class="fctl" id="in-lok" placeholder="Nama jalan / lokasi"></div></div>'
    +'<div class="fgrp"><label class="flbl">Personil <span class="req">*</span></label><input class="fctl" id="in-per" placeholder="Nama personil, dipisah koma"></div>'
    +'<div class="fgrp"><label class="flbl">Identitas / Pelanggar</label><textarea class="fctl" id="in-idn" rows="3" placeholder="NIHIL atau isi identitas pelanggar">NIHIL</textarea></div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Danru</label><input class="fctl" id="in-dan" placeholder="Danru 1"></div>'
    +'<div class="fcol"><label class="flbl">Nama Danru</label><input class="fctl" id="in-ndan" placeholder="Nama danru"></div></div>'
    +'<div class="fgrp"><label class="flbl">Foto Dokumentasi <span style="color:var(--muted);font-weight:400;text-transform:none;font-size:.6rem">(maks 10)</span></label>'
    +'<div style="display:flex;gap:7px;margin-bottom:7px"><button class="bg2" onclick="GG(\'in-gal\').click()"><i class="fas fa-images"></i> Galeri</button><button class="bg2" onclick="GG(\'in-cam\').click()"><i class="fas fa-camera"></i> Kamera</button></div>'
    +'<div class="fgrd" id="in-fgrd"></div></div>'
    +'<div id="in-msg" style="display:none;margin-bottom:10px"></div>'
    +'<div style="display:flex;gap:7px"><button class="bp" onclick="submitInput()"><i class="fas fa-save"></i> Simpan</button><button class="bg2" onclick="resetInput()"><i class="fas fa-rotate-left"></i> Reset</button></div>'
    +'</div></div></div></div>';
  G('ct').innerHTML=h;
  G('in-tgl-h').value=now.getDate();G('in-tgl-b').value=now.getMonth()+1;syncTglStr();
  var dayN=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];G('in-hari').value=dayN[now.getDay()];
  renderInFotoGrid();
  var ig=document.createElement('input');ig.type='file';ig.id='in-gal';ig.accept='image/*';ig.multiple=true;ig.style.display='none';
  ig.addEventListener('change',function(e){addInFotos(e.target.files);ig.value='';});
  var ic=document.createElement('input');ic.type='file';ic.id='in-cam';ic.accept='image/*';ic.capture='environment';ic.style.display='none';
  ic.addEventListener('change',function(e){addInFotos(e.target.files);ic.value='';});
  G('ct').appendChild(ig);G('ct').appendChild(ic);
}

function switchInTab(mode){
  _inMode=mode;
  var tabs={manual:G('tab-manual'),wa:G('tab-wa')};
  var panels={manual:G('in-panel-manual'),wa:G('in-panel-wa')};
  Object.keys(tabs).forEach(function(k){if(tabs[k])tabs[k].classList.toggle('on',k===mode);if(panels[k])panels[k].style.display=k===mode?'':'none';});
}

var _waParsed=null;
function _bersihWA(teks){return teks.replace(/[\*\_\~\u200B\u200C\u200D\uFEFF]/g,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();}
function _parseWAClient(teks){
  var bersih=_bersihWA(teks);
  var hasil={lokasi:'',hari:'',tanggal:'',identitas:'',personil:'',danru:'',namaDanru:''};
  var mLok=/Patroli\s+([\s\S]+?)\s+Sebagai/i.exec(bersih);if(!mLok)mLok=/Patroli\s+(.+)/i.exec(bersih.split('\n')[0]);
  if(mLok)hasil.lokasi=mLok[1].replace(/\n/g,' ').trim();
  var mHari=/Hari\s*:\s*(.+)/i.exec(bersih);if(mHari)hasil.hari=mHari[1].split('\n')[0].trim();
  var mTgl=/Tanggal\s*:\s*(.+)/i.exec(bersih);if(mTgl)hasil.tanggal=mTgl[1].split('\n')[0].trim();
  var mIdn=/Identitas\s*[\/\\]\s*Nama\s*Pelanggaran\s*\n+([^\n]+)/i.exec(bersih);
  if(!mIdn)mIdn=/Identitas\s*[\/\\]\s*Nama\s*Pelanggaran\s*:?\s*([^\n]+)/i.exec(bersih);
  if(mIdn)hasil.identitas=mIdn[1].trim();else{var mFb=/Pelanggaran[^\n]*\n([^\n]+)/i.exec(bersih);if(mFb)hasil.identitas=mFb[1].trim();}
  var mPer=/Personil\s*yang\s*terlibat\s*:\s*\(?([^)\n]+)\)?/i.exec(bersih);if(mPer)hasil.personil=mPer[1].replace(/[()]/g,'').trim();
  var mDan=/Danru\s*(\d+)/i.exec(bersih);if(mDan)hasil.danru='Danru '+mDan[1];
  var mNdan=/Danru\s*\d+\s*\(\s*([^)]+)\s*\)/i.exec(bersih);if(mNdan)hasil.namaDanru=mNdan[1].trim();
  return hasil;
}

function parseWA(){
  var teks=(G('wa-teks')||{}).value||'';
  var errEl=G('wa-err'),prevEl=G('wa-prev'),lanjutBtn=G('wa-btn-lanjut');
  _waParsed=null;errEl.classList.remove('on');prevEl.classList.remove('on');if(lanjutBtn)lanjutBtn.style.display='none';
  if(!teks.trim()){G('wa-err-msg').textContent='Teks WA belum diisi.';errEl.classList.add('on');return;}
  var p=_parseWAClient(teks);
  var missing=[];
  if(!p.lokasi)missing.push('Lokasi');if(!p.hari)missing.push('Hari');if(!p.tanggal)missing.push('Tanggal');if(!p.personil)missing.push('Personil yang terlibat');
  if(missing.length){G('wa-err-msg').innerHTML='Field tidak terbaca:<br>• '+missing.join('<br>• ')+'<br><br>Periksa format teks WA-nya.';errEl.classList.add('on');return;}
  _waParsed=p;
  var rowsHtml='';
  [{l:'Lokasi',v:p.lokasi},{l:'Hari',v:p.hari},{l:'Tanggal',v:p.tanggal},{l:'Identitas',v:p.identitas||'NIHIL'},{l:'Personil',v:p.personil},{l:'Danru',v:p.danru||'—'},{l:'Nama Danru',v:p.namaDanru||'—'}].forEach(function(r){
    var cls=(r.v==='—'||!r.v)?'wp-val wp-mis':'wp-val wp-ok';
    rowsHtml+='<div class="wp-row"><span class="wp-lbl">'+r.l+'</span><span class="'+cls+'">'+esc(r.v||'tidak ditemukan')+'</span></div>';
  });
  G('wa-prev-body').innerHTML=rowsHtml;prevEl.classList.add('on');if(lanjutBtn)lanjutBtn.style.display='';
}

function waLanjutKeForm(){
  if(!_waParsed)return;var p=_waParsed;switchInTab('manual');
  if(G('in-lok'))G('in-lok').value=p.lokasi||'';if(G('in-per'))G('in-per').value=p.personil||'';
  if(G('in-idn'))G('in-idn').value=p.identitas||'NIHIL';if(G('in-dan'))G('in-dan').value=p.danru||'';if(G('in-ndan'))G('in-ndan').value=p.namaDanru||'';
  if(p.hari&&G('in-hari')){var HARI_MAP={senin:'Senin',selasa:'Selasa',rabu:'Rabu',kamis:'Kamis',jumat:'Jumat',sabtu:'Sabtu',minggu:'Minggu'};G('in-hari').value=HARI_MAP[p.hari.toLowerCase()]||p.hari;}
  if(p.tanggal){
    var BMAP={januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12};
    var mT=/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/.exec(p.tanggal);
    if(mT){var tgl=parseInt(mT[1]),bln=BMAP[mT[2].toLowerCase()],thn=parseInt(mT[3]);if(tgl&&bln&&thn){if(G('in-tgl-h'))G('in-tgl-h').value=tgl;if(G('in-tgl-b'))G('in-tgl-b').value=bln;if(G('in-tgl-y'))G('in-tgl-y').value=thn;syncTglStr();}}
  }
  toast('Data dari WA berhasil diisi. Periksa & simpan.','ok');
}

function GG(id){return document.getElementById(id);}
function buildTglOpts(mn,mx){var s='';for(var i=mn;i<=mx;i++)s+='<option value="'+i+'">'+i+'</option>';return s;}
var BULAN_ID=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function syncTglStr(){
  var h=parseInt((G('in-tgl-h')||{}).value||1),b=parseInt((G('in-tgl-b')||{}).value||1),y=parseInt((G('in-tgl-y')||{}).value||2026);
  if(G('in-tgl-str'))G('in-tgl-str').value=h+' '+BULAN_ID[b]+' '+y;
}

function addInFotos(files){
  var rem=10-_inFotos.length;
  if(rem<=0){toast('Maks 10 foto.','er');return;}
  for(var i=0;i<Math.min(files.length,rem);i++){
    (function(file){
      var rd=new FileReader();
      rd.onload=function(e){_inFotos.push({data:e.target.result,mime:file.type});renderInFotoGrid();};
      rd.readAsDataURL(file);
    })(files[i]);
  }
}

function renderInFotoGrid(){
  var g=G('in-fgrd');if(!g)return;g.innerHTML='';
  _inFotos.forEach(function(f,i){
    var div=document.createElement('div');div.className='fitem';
    var img=document.createElement('img');img.src=f.data;
    img.onclick=(function(idx){return function(){var srcs=_inFotos.map(function(x){return x.data;});galOpen(srcs,srcs,idx);};})(i);
    var del=document.createElement('button');del.className='fdel';del.innerHTML='<i class="fas fa-times"></i>';
    del.onclick=(function(ii){return function(e){e.stopPropagation();_inFotos.splice(ii,1);renderInFotoGrid();};})(ii);
    var num=document.createElement('div');num.className='fnum';num.textContent=i+1;
    div.appendChild(img);div.appendChild(del);div.appendChild(num);g.appendChild(div);
  });
}

function submitInput(){
  syncTglStr();
  var tgl=(G('in-tgl-str')||{}).value||'',lok=(G('in-lok')||{}).value||'',per=(G('in-per')||{}).value||'',hari=(G('in-hari')||{}).value||'';
  if(!tgl||!lok||!per||!hari){inMsg('Tanggal, Hari, Lokasi, dan Personil wajib diisi.','er');return;}
  if(!_inFotos.length){inMsg('Lampirkan minimal 1 foto.','er');return;}
  showLoad('Menyimpan laporan...');

  // ✅ GANTI
  apiPost('addLaporan',{
    lokasi:lok,hari:hari,tanggal:tgl,
    identitas:(G('in-idn')||{}).value||'NIHIL',
    personil:per,
    danru:(G('in-dan')||{}).value||'',
    namaDanru:(G('in-ndan')||{}).value||'',
    fotos:_inFotos
  }).then(function(res){
    hideLoad();
    if(res.success){toast('Laporan berhasil disimpan.','ok'); window._gcDel('rekap'); window._gcDel('dashboard'); _inFotos=[];resetInput();}
    else inMsg('Gagal: '+(res.message||''),'er');
  });
}

function inMsg(msg,type){
  var el=G('in-msg');if(!el)return;
  el.style.display='block';el.style.padding='8px 12px';el.style.borderRadius='8px';el.style.fontSize='.73rem';el.style.fontWeight='700';
  if(type==='er'){el.style.background='var(--redl)';el.style.color='var(--red)';el.innerHTML='<i class="fas fa-circle-xmark"></i> '+msg;}
  else{el.style.background='var(--greenl)';el.style.color='var(--green)';el.innerHTML='<i class="fas fa-circle-check"></i> '+msg;}
}

function resetInput(){_inFotos=[];loadInput();}
