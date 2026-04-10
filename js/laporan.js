// ══════════════════════════════════════════
//  REKAP
// ══════════════════════════════════════════
function loadRekap(){
  setNav('rk');setPage('Rekap Laporan','Data laporan patroli');sbClose();
  dChart('bar');dChart('dnt');_rPg=1;_rFQ='';_rFFrom='';_rFTo='';
  var cached=window._gcGet('rekap');
  if(cached){
    _rData=(cached.data&&cached.data.rows)?cached.data.rows:(cached.data||[]);
    _rPg=1;renderRekap();window._gcRefresh('rekap');return;
  }
  _rData=[];showLoad();
  apiGet('getRekap').then(function(res){
    hideLoad();
    if(!res||res.success===false){
      showErr((res&&res.message)||'Gagal memuat rekap.');
      return;
    }
    window._gcSet('rekap',res);
    _rData=(res.data&&res.data.rows)?res.data.rows:(res.data||[]);
    _rPg=1;renderRekap();
  });
}

function makeChipDesktop(identitas){
  if(!identitas||identitas.toUpperCase()==='NIHIL')return'<span class="chip cm">Nihil</span>';
  var safe=esc(identitas);
  return'<span class="chip cr2" style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle;cursor:pointer" title="'+safe+'" onclick="var s=this.style;var on=this.dataset.exp===\'1\';this.dataset.exp=on?\'0\':\'1\';s.maxWidth=on?\'110px\':\'none\';s.whiteSpace=on?\'nowrap\':\'normal\';s.overflow=on?\'hidden\':\'visible\';">'+safe+'</span>';
}

function expTxt(val, isChip, chipCls) {
  if (!val) return '<span style="color:var(--muted)">—</span>';
  var s = esc(val);
  if (isChip) {
    return '<span class="chip '+chipCls+'" style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle;cursor:pointer" title="Klik untuk detail" onclick="var on=this.dataset.exp===\'1\';this.dataset.exp=on?\'0\':\'1\';this.style.whiteSpace=on?\'nowrap\':\'normal\';this.style.maxWidth=on?\'110px\':\'none\';">'+s+'</span>';
  }
  return '<div class="txt-clamp" onclick="this.classList.toggle(\'on\')" title="Klik untuk detail">'+s+'</div>';
}


function makeDriveThumbUrl(url){
  if(!url)return'';if(url.startsWith('data:'))return url;
  var m1=/[?&]id=([^&]+)/.exec(url);if(m1)return'https://drive.google.com/thumbnail?id='+m1[1]+'&sz=w120';
  var m2=/\/file\/d\/([^\/]+)/.exec(url);if(m2)return'https://drive.google.com/thumbnail?id='+m2[1]+'&sz=w120';
  return url;
}

function _injectTblCss(id,css){
  if(document.getElementById(id))return;
  var s=document.createElement('style');s.id=id;s.textContent=css;
  document.head.appendChild(s);
}

// ── FIXED: CSS Tabel Rekap (Scrollable, Sticky, Hover, Smooth) ── 
var _RTBL_CSS=[
  '.rtbl-wrap { width: 100%; max-height: 65vh; overflow: auto; -webkit-overflow-scrolling: touch; border-radius: 0 0 8px 8px; outline: none; position: relative; scroll-behavior: smooth; overscroll-behavior: contain; }',
  '.rtbl-wrap table { min-width: 1450px; width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }',
  '.rtbl-wrap thead th { position: sticky; top: 0; z-index: 2; background: var(--bg); }',
  '.rtbl-wrap .tc-no { width: 40px; }',
  '.rtbl-wrap .tc-ts { width: 85px; }', 
  '.rtbl-wrap .tc-lok { width: 240px; word-break: break-word; overflow-wrap: break-word; white-space: normal; }', 
  '.rtbl-wrap .tc-har { width: 80px; }',
  '.rtbl-wrap .tc-tgl { width: 120px; }',
  '.rtbl-wrap .tc-idn { width: 120px; }',
  '.rtbl-wrap .tc-per { width: 160px; word-break: break-word; overflow-wrap: break-word; white-space: normal; }',
  '.rtbl-wrap .tc-dan { width: 100px; }',
  '.rtbl-wrap .tc-ndn { width: 140px; word-break: break-word; overflow-wrap: break-word; white-space: normal; }',
  '.rtbl-wrap .tc-ket { width: 300px; }',
  '.rtbl-wrap .tc-fot { width: 90px; }',
  '.rtbl-wrap .tc-aks { width: 130px; position: sticky; right: 0; background: var(--bg); z-index: 5; border-left: 1px solid var(--border); box-shadow: -4px 0 10px rgba(0,0,0,0.06); pointer-events: auto; }',
  '.rtbl-wrap thead .tc-aks { z-index: 10; background: var(--bg); }',
  '.rtbl-wrap tbody td.tc-aks { background: var(--card); }',
  '.rtbl-wrap .bpdf, .rtbl-wrap .be, .rtbl-wrap .bd { cursor: pointer; transition: transform 0.2s; border: none; padding: 6px 10px; border-radius: 6px; }',
  '.rtbl-wrap .bpdf:hover, .rtbl-wrap .be:hover, .rtbl-wrap .bd:hover { transform: scale(1.15); opacity: 0.9; }',
  '.rtbl-wrap td { vertical-align: middle; padding: 12px 10px; font-size: .75rem; word-break: break-word; overflow-wrap: break-word; white-space: normal; border-bottom: 1px solid var(--border); background: var(--card); line-height: 1.5; }',
  '.rtbl-wrap th { padding: 12px 10px; font-size: .7rem; white-space: nowrap; border-bottom: 2px solid var(--border); text-align: left; }',
  '.rtbl-wrap .tc-no, .rtbl-wrap .tc-har, .rtbl-wrap .tc-dan, .rtbl-wrap .tc-fot { text-align: center; }',
  '.rtbl-wrap .tc-aks { text-align: center; white-space: nowrap; }',
  '.rtbl-wrap tbody tr:hover td { background: var(--bg) !important; }',
  '.rtbl-wrap tbody tr:hover td.tc-aks { background: var(--bg) !important; }',
  '.txt-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; transition: all 0.2s; white-space: normal !important; word-break: break-word; }',
  '.txt-clamp.on { -webkit-line-clamp: unset; }'
].join('');


function buildRekapRows(sl,st,isAdm){
  var rows='',cards='';
  if(!sl.length){
    rows='<tr><td colspan="12"><div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div></td></tr>';
    cards='<div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada data</p></div>';
  }else{
    sl.forEach(function(r,i){
      var fotArr=r.fotos||[],fotThumb=r.fotosThumb||fotArr;
      var chip=makeChipDesktop(r.identitas);var chipMob=mcardChip(r.identitas,'cr2');
      var ck=rcSet(r);
      var fotCell=fotArr.length
        ?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)" title="Lihat '+fotArr.length+' foto"><i class="fas fa-images"></i> '+fotArr.length+'</button>'
        :'<span style="color:var(--muted);font-size:.65rem">—</span>';
      var aksi='<button class="bpdf" onclick="openPdf(rcGet(\''+ck+'\'))" title="Cetak PDF"><i class="fas fa-file-pdf"></i></button>';
      if(isAdm){
        aksi+=' <button class="be" onclick="openEditModal(rcGet(\''+ck+'\'))" title="Edit"><i class="fas fa-pen"></i></button>'
          +' <button class="bd" onclick="konfirmHapus(\'laporan\',rcGet(\''+ck+'\')._ri)" title="Hapus"><i class="fas fa-trash"></i></button>';
      }
      var ketDisp=expTxt(r.keterangan, false);

      // ── PERBAIKAN TIMESTAMP (Pisah Tanggal di atas, Jam di bawah) ──
      var tsVal = esc(r.ts || '');
      var tsArr = tsVal.split(' ');
      var tsDisp = tsArr.length > 1
        ? tsArr[0] + '<br><span style="color:var(--muted);font-size:.6rem;display:inline-block;margin-top:2px"><i class="fas fa-clock" style="font-size:.55rem"></i> ' + tsArr[1] + '</span>'
        : tsVal;

      rows+='<tr>'
        +'<td class="tc-no" style="color:var(--muted);font-family:var(--mono)">'+(st+i+1)+'</td>'
        // <-- tc-ts diubah line-heightnya agar rapi
        +'<td class="tc-ts" style="font-family:var(--mono);font-size:.68rem;white-space:nowrap;line-height:1.3">'+tsDisp+'</td>'
        +'<td class="tc-lok" style="font-weight:600">'+esc(r.lokasi)+'</td>'
        +'<td class="tc-har"><span class="chip ca2" style="font-size:.65rem">'+esc(r.hari)+'</span></td>'
        +'<td class="tc-tgl" style="white-space:nowrap">'+esc(r.tanggal)+'</td>'
        +'<td class="tc-idn">'+chip+'</td>'
        +'<td class="tc-per" style="color:var(--mid)">'+esc(r.personil)+'</td>'
        +'<td class="tc-dan"><span class="chip cb2" style="font-size:.62rem; white-space:normal; display:inline-flex; align-items:center; justify-content:center; text-align:center; flex-wrap:wrap; height:auto; min-height:24px; padding:4px 8px; line-height:1.3; max-width:100%; word-break:break-word;">'+esc(r.danru)+'</span></td>'
        +'<td class="tc-ndn" style="color:var(--mid)">'+esc(r.namaDanru)+'</td>'
        +'<td class="tc-ket" style="color:var(--mid)">'+expTxt(r.keterangan, false)+'</td>'
        +'<td class="tc-fot">'+fotCell+'</td>'
        +'<td class="tc-aks">'+aksi+'</td>'
        +'</tr>';

      var fotBtnMob=fotArr.length
        ?'<button class="bfot" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)"><i class="fas fa-images"></i> '+fotArr.length+'</button>'
        :'';
      var aksiMob='<button class="bpdf" onclick="openPdf(rcGet(\''+ck+'\'))"><i class="fas fa-file-pdf"></i></button>';
      if(isAdm){
        aksiMob+=' <button class="be" onclick="openEditModal(rcGet(\''+ck+'\'))"><i class="fas fa-pen"></i></button>'
          +' <button class="bd" onclick="konfirmHapus(\'laporan\',rcGet(\''+ck+'\')._ri)"><i class="fas fa-trash"></i></button>';
      }
      cards+='<div class="mcard-item">'
        +'<div class="mcard-row">'+mcardLokasi(r.lokasi)+chipMob+'</div>'
        +'<div class="mcard-meta">'
        +'<i class="fas fa-calendar-day" style="color:var(--amber);width:14px"></i> '+esc(r.hari)+', '+esc(r.tanggal)+'<br>'
        +'<i class="fas fa-users" style="color:var(--blue);width:14px"></i> '+mcardPersonil(r.personil)
        +(r.namaDanru?' &middot; Danru: '+esc(r.namaDanru):'')
        +(r.keterangan?'<br><i class="fas fa-clipboard" style="color:var(--teal);width:14px"></i> '+expTxt(r.keterangan, false):'')
        +(fotArr.length?'<br><i class="fas fa-images" style="color:var(--green);width:14px"></i> '+fotArr.length+' foto':'')
        +'</div>'
        +'<div class="mcard-acts">'+fotBtnMob+' '+aksiMob+'</div>'
        +'</div>';
    });
  }
  return{rows:rows,cards:cards};
}

function renderRekap(){
  _injectTblCss('_rtbl-css',_RTBL_CSS);
  var isAdm=SES&&SES.role==='admin';
  var flt=filterR(),tot=flt.length,pages=Math.max(1,Math.ceil(tot/PER));
  _rPg=Math.min(_rPg,pages);var st=(_rPg-1)*PER,sl=flt.slice(st,st+PER);
  var rc=buildRekapRows(sl,st,isAdm);
  
  if(!G('r-tbody')){
    var h='<div class="fu"><div class="panel">'
      +'<div class="phd"><span class="ptl"><i class="fas fa-table-list"></i> Rekap Laporan</span>'
      +'<div class="fbar-right">'
      +'<span id="r-count" style="font-size:.66rem;color:var(--muted);font-family:var(--mono)">'+tot+'</span>'
      +'<button class="bppl" onclick="openKolektifModal()"><i class="fas fa-print"></i> Kolektif</button>'
      +'</div></div>'
      +'<div class="fbar">'
      +'<div class="fsrch" style="flex:2 1 150px"><i class="fas fa-search fsi"></i>'
      +'<input class="fctl" type="text" id="ft-q" placeholder="Cari lokasi, personil, keterangan..." oninput="rFiltDebounce()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px">'
      +'<label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">Dari:</label>'
      +'<input class="fctl" type="date" id="ft-from" style="min-width:0;flex:1" onchange="rFilt()"></div>'
      +'<div style="display:flex;align-items:center;gap:4px">'
      +'<label style="font-size:.65rem;color:var(--mid);font-weight:700;white-space:nowrap">S/d:</label>'
      +'<input class="fctl" type="date" id="ft-to" style="min-width:0;flex:1" onchange="rFilt()"></div>'
      +'<button class="bg2" onclick="rReset()"><i class="fas fa-rotate-left"></i></button>'
      +'</div>'
      +'<div class="rtbl-wrap" id="r-tbl-wrap">'
      +'<table class="dtbl"><thead><tr>'
      +'<th class="tc-no">#</th>'
      +'<th class="tc-ts">Timestamp</th>'
      +'<th class="tc-lok">Lokasi</th>'
      +'<th class="tc-har">Hari</th>'
      +'<th class="tc-tgl">Tanggal</th>'
      +'<th class="tc-idn">Pelanggaran</th>'
      +'<th class="tc-per">Personil</th>'
      +'<th class="tc-dan">Danru</th>'
      +'<th class="tc-ndn">Nama Danru</th>'
      +'<th class="tc-ket">Keterangan</th>'
      +'<th class="tc-fot">Foto</th>'
      +'<th class="tc-aks">Aksi</th>'
      +'</tr></thead>'
      +'<tbody id="r-tbody">'+rc.rows+'</tbody></table>'
      +'</div>'
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
    if(_rFQ){
      var q=_rFQ.toLowerCase();
      if((r.lokasi||'').toLowerCase().indexOf(q)<0
        &&(r.tanggal||'').toLowerCase().indexOf(q)<0
        &&(r.hari||'').toLowerCase().indexOf(q)<0
        &&(r.personil||'').toLowerCase().indexOf(q)<0
        &&(r.identitas||'').toLowerCase().indexOf(q)<0
        &&(r.danru||'').toLowerCase().indexOf(q)<0
        &&(r.namaDanru||'').toLowerCase().indexOf(q)<0
        &&(r.keterangan||'').toLowerCase().indexOf(q)<0)
        return false;
    }
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
// ══════════════════════════════════════════
//  PDF SINGLE  — with Settings Store
// ══════════════════════════════════════════

// Settings store for PDF — populated from pengaturan
var _pdfSettings = {};

function _getPdfSetting(key, fallback) {
  return (_pdfSettings[key] && _pdfSettings[key].trim()) ? _pdfSettings[key] : fallback;
}

// Load PDF settings from server Settings sheet
function loadPdfSettings(callback) {
  if (Object.keys(_pdfSettings).length > 0) { if (callback) callback(); return; }
  apiGet('getSettings').then(function(res) {
    if (res && res.success !== false && res.data) _pdfSettings = res.data;
    if (callback) callback();
  });
}

function togglePdfTtd(){
  var box=G('pdf-ttd-box'),lbl=G('pdf-ttd-lbl');
  var on=box.classList.contains('on');box.classList.toggle('on');
  lbl.textContent=on?'Ubah Data Pejabat TTD ▸':'Sembunyikan Data Pejabat TTD ▾';
}

function tglIDStr(d){
  var BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate()+' '+BLN[d.getMonth()]+' '+d.getFullYear();
}

function openPdf(row){
  if(!row){toast('Data tidak ditemukan.','er');return;}
  _pdfRow=row;

  loadPdfSettings(function(){
    var now=new Date();
    G('pdf-hari').value=row.hari||'';
    G('pdf-tanggal').value=row.tanggal||'';
    G('pdf-tujuan').value=_getPdfSetting('pdf_tujuan','Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian');
    var ns=G('pdf-nospt');if(ns)ns.value=_getPdfSetting('pdf_nospt','');
    G('pdf-lokasi').value=row.lokasi||'';
    G('pdf-anggota').value=_getPdfSetting('pdf_anggota','Regu Pedestrian, Anggota Bidang Linmas, Satpol PP');
    G('pdf-pukul').value=_getPdfSetting('pdf_pukul','16.00 \u2013 00.00 WIB');
    // Identitas
    var idn=row.identitas||'';var isNihil=idn.trim()===''||idn.toUpperCase()==='NIHIL';
    G('pdf-identitas').value=isNihil?'':idn;
    G('pdf-uraian').value=row.keterangan||'';
    G('pdf-tglsurat').value=tglIDStr(now);
    // Fill TTD from settings
    var jabEl=G('pdf-jabatan'),namaEl=G('pdf-namatd'),pngEl=G('pdf-pangkat'),nipEl=G('pdf-nip');
    if(jabEl)jabEl.value=_getPdfSetting('pdf_jabatan','Kepala Bidang SDA dan Linmas');
    if(namaEl)namaEl.value=_getPdfSetting('pdf_nama','Erry Setiyoso Birowo, SP');
    if(pngEl)pngEl.value=_getPdfSetting('pdf_pangkat','Pembina');
    if(nipEl)nipEl.value=_getPdfSetting('pdf_nip','19751029 200212 1 008');
    var box=G('pdf-ttd-box');if(box)box.classList.remove('on');
    var lbl=G('pdf-ttd-lbl');if(lbl)lbl.textContent='Ubah Data Pejabat TTD ▸';
    om('mpdf');
    refreshPdfPreview();
    attachPdfEvents();
  });
}

var _pdfTo = null;
function refreshPdfPreviewDebounced() {
  clearTimeout(_pdfTo);
  _pdfTo = setTimeout(refreshPdfPreview, 700);
}

function attachPdfEvents() {
  if (window._pdfEventsAttached) return;
  var fields = ['pdf-hari', 'pdf-tanggal', 'pdf-nospt', 'pdf-tujuan', 'pdf-lokasi', 'pdf-anggota', 'pdf-pukul', 'pdf-identitas', 'pdf-uraian', 'pdf-tglsurat', 'pdf-jabatan', 'pdf-namatd', 'pdf-pangkat', 'pdf-nip'];
  fields.forEach(function(f) {
    var el = G(f);
    if(el) {
       el.addEventListener('input', refreshPdfPreviewDebounced);
    }
  });
  window._pdfEventsAttached = true;
}

function refreshPdfPreview(){
  var btn = G('btn-ref-pdf');
  if(btn) btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Memperbarui...';
  var judulUtama=_getPdfSetting('pdf_judul', 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO');
  apiPost('generateLaporanHtml',{
    judulUtama:judulUtama,
    judulSub:'',
    hari:G('pdf-hari').value,
    tanggal:G('pdf-tanggal').value,
    tujuan:G('pdf-tujuan').value,
    nomorSpt:(G('pdf-nospt')||{}).value||'',
    lokasi:G('pdf-lokasi').value,
    anggota:G('pdf-anggota').value,
    pukul:G('pdf-pukul').value,
    identitas:G('pdf-identitas').value,
    keterangan:G('pdf-uraian').value,
    uraian:G('pdf-uraian').value,
    tglSurat:G('pdf-tglsurat').value,
    jabatanTtd:G('pdf-jabatan').value,
    namaTtd:G('pdf-namatd').value,
    pangkatTtd:G('pdf-pangkat').value,
    nipTtd:G('pdf-nip').value,
    kopAktif:false,
    fotos:_pdfRow?(_pdfRow.fotos||[]):[]
  }).then(function(res){
    var btn = G('btn-ref-pdf');
    if(btn) btn.innerHTML='<i class="fas fa-sync"></i> Perbarui Preview';
    if(!res.success){toast('Gagal: '+res.message,'er');return;}
    var html=(res.data&&res.data.html)?res.data.html:res.html;

    // Inject mobile-responsive CSS
    var mobileFix = `
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media screen and (max-width: 768px) {
          html { zoom: 0.55; -moz-transform: scale(0.55); -moz-transform-origin: top left; }
          body { width: 180%; margin: 0; padding: 15px; box-sizing: border-box; }
        }
      </style>
    `;
    if(html.includes('<head>')){
      html = html.replace('<head>', '<head>' + mobileFix);
    } else {
      html = mobileFix + html;
    }

    G('pdfframe').srcdoc=html;
  });
}

function doPrint(fid) {
  var fr = G(fid);
  if (!fr || !fr.contentWindow) { toast('Preview belum siap.', 'inf'); return; }
  try {
    var pwin = window.open('', '_blank');
    if (!pwin) { toast('Harap izinkan Pop-up untuk mencetak.', 'er'); return; }
    pwin.document.open();
    pwin.document.write(fr.srcdoc || fr.contentDocument.documentElement.outerHTML);
    pwin.document.close();
    pwin.focus();
    setTimeout(function() { 
      try { pwin.print(); setTimeout(function(){ pwin.close(); }, 500); } 
      catch (err) { toast('Gagal: '+err.message, 'er'); }
    }, 800);
  } catch (e) {
    toast('Gagal mencetak: ' + e.message, 'er');
  }
}
// ══════════════════════════════════════════
//  CETAK KOLEKTIF
// ══════════════════════════════════════════

var _kolPreviewTimer = null;
function _kolPreviewDebounced() {
  clearTimeout(_kolPreviewTimer);
  _kolPreviewTimer = setTimeout(previewKolektif, 600);
}
function openKolektifModal(){
  var now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  var d=String(now.getDate()).padStart(2,'0'); // Ambil tanggal hari ini
  
  // Set default: Tanggal 1 s/d Hari Ini
  if(G('kol-from')) G('kol-from').value=y+'-'+m+'-01';
  if(G('kol-to')) G('kol-to').value=y+'-'+m+'-'+d;
  
  if(G('kol-info')) G('kol-info').innerHTML='Menyiapkan data preview...';
  if(G('kol-printbtn')){ G('kol-printbtn').disabled=true; G('kol-printbtn').style.opacity='.4'; }
  if(G('kolframe')) G('kolframe').style.display='none';
  if(G('kol-empty')) G('kol-empty').style.display='flex';
  
  om('mkolektif'); // Buka Modal
  
  // OTOMATIS LOAD PREVIEW (Jeda 300ms agar animasi modal mulus)
  setTimeout(previewKolektif, 300);
}

function previewKolektif(){
  var from = G('kol-from') ? G('kol-from').value : '';
  var to = G('kol-to') ? G('kol-to').value : '';
  
  // Filter berdasarkan rentang tanggal
  var rows = _rData.filter(function(r){
    if(from){var df=parseISODate(from);if(df){var dt=parseTglID(r.tanggal);if(!dt||dt<df)return false;}}
    if(to){var dto=parseISODate(to);if(dto){dto.setHours(23,59,59,999);var dt2=parseTglID(r.tanggal);if(!dt2||dt2>dto)return false;}}
    return true;
  }).slice().reverse();
  
  _kolData = rows;
  
  // Update Info Teks
  if(G('kol-info')) {
    G('kol-info').innerHTML='Ditemukan <strong>'+rows.length+'</strong> laporan'
      +(rows.length?' (termasuk '+rows.filter(function(r){return r.identitas&&r.identitas.toUpperCase()!=='NIHIL'&&r.identitas!=='';}).length+' pelanggaran).':'.');
  }

  // Jika Kosong, kembalikan ke state awal
  if(!rows.length){
    if(G('kolframe')) G('kolframe').style.display='none';
    if(G('kol-empty')) G('kol-empty').style.display='flex';
    if(G('kol-printbtn')){ G('kol-printbtn').disabled=true; G('kol-printbtn').style.opacity='.4'; }
    return;
  }
  
  showLoad('Menyiapkan preview kolektif...');

  // FIX: Mapping ulang data untuk memastikan 'keterangan' ikut terkirim ke Backend GAS
  var cleanRows = rows.map(function(r) {
    return {
      ts: r.ts || '',
      lokasi: r.lokasi || '',
      hari: r.hari || '',
      tanggal: r.tanggal || '',
      identitas: r.identitas || '',
      personil: r.personil || '',
      danru: r.danru || '',
      namaDanru: r.namaDanru || '',
      keterangan: r.keterangan || r.teks || '' // <-- Ini yang akan ditangkap oleh Code.gs
    };
  });

  // Kirim data ke backend
  apiPost('generateKolektifHtml', {
      rows: cleanRows, 
      tglFrom: from, 
      tglTo: to,
      kopSurat: (typeof _getPdfSetting === 'function') ? _getPdfSetting('pdf_kop', '') : '',
      judul: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_judul', 'LAPORAN PATROLI WILAYAH PEDESTRIAN') : 'LAPORAN PATROLI WILAYAH PEDESTRIAN',
      subjudul: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_subjudul', 'SATGAS LINMAS PEDESTRIAN') : 'SATGAS LINMAS PEDESTRIAN',
      jabatanTtd: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_jabatan', 'Kepala Bidang SDA dan LINMAS') : 'Kepala Bidang SDA dan LINMAS',
      namaTtd: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_nama', 'Erry Setiyoso Birowo, SP') : 'Erry Setiyoso Birowo, SP',
      pangkatTtd: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_pangkat', 'Pembina') : 'Pembina',
      nipTtd: (typeof _getPdfSetting === 'function') ? _getPdfSetting('kol_nip', '19751029 200212 1 008') : '19751029 200212 1 008'
  }).then(function(res){
    hideLoad();
    if(!res.success){toast('Gagal: '+res.message,'er');return;}
    var html=(res.data&&res.data.html)?res.data.html:res.html;
    
    // Tampilkan Frame
    if(G('kol-empty')) G('kol-empty').style.display='none';
    if(G('kolframe')) {
      G('kolframe').style.display='block';
      G('kolframe').srcdoc=html;
    }
    if(G('kol-printbtn')) {
      G('kol-printbtn').disabled=false;
      G('kol-printbtn').style.opacity='1';
    }
  });
}
// ══════════════════════════════════════════
//  EDIT LAPORAN (MODAL SAJA)
// ══════════════════════════════════════════

function _editMakeDriveThumb(url) {
  if (!url) return ''; if (url.startsWith('data:')) return url;
  var m1 = /[?&]id=([^&]+)/.exec(url); if (m1) return 'https://drive.google.com/thumbnail?id=' + m1[1] + '&sz=w120';
  var m2 = /\/file\/d\/([^\/]+)/.exec(url); if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w120';
  return url;
}

function _fotoIconCellEdit(fotArr, fotThumb, ck) {
  if (!fotArr || !fotArr.length) return '<span style="color:var(--muted);font-size:.65rem">—</span>';
  return '<button class="bfot" onclick="var rx=rcGet(\'' + ck + '\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,0)" title="Lihat ' + fotArr.length + ' foto"><i class="fas fa-images"></i> ' + fotArr.length + '</button>';
}

/* ── Modal Edit ── */
function openEditModal(row) {
  if (!row) { toast('Data tidak ditemukan.', 'er'); return; }
  _editRow = row;
  _editFotos = (row.fotos || []).map(function (u) { return { src: _editMakeDriveThumb(u), url: u, isNew: false }; });
  var days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  var dOpts = days.map(function (d) { return '<option value="' + d + '"' + (row.hari === d ? ' selected' : '') + '>' + d + '</option>'; }).join('');
  G('medit-body').innerHTML = ''
    + '<div class="frow">'
    + '<div class="fcol"><label class="flbl">Lokasi <span class="req">*</span></label><input class="fctl" id="ed-lok" value="' + esc(row.lokasi) + '"></div>'
    + '<div class="fcol"><label class="flbl">Hari</label><select class="fctl" id="ed-hari">' + dOpts + '</select></div>'
    + '</div>'
    + '<div class="frow">'
    + '<div class="fcol"><label class="flbl">Tanggal</label><input class="fctl" id="ed-tgl" value="' + esc(row.tanggal) + '"></div>'
    + '<div class="fcol"><label class="flbl">Identitas / Pelanggar</label>'
    + '<textarea class="fctl" id="ed-idn" rows="2" placeholder="NIHIL atau isi identitas">' + esc(row.identitas) + '</textarea></div>'
    + '</div>'
    + '<div class="fgrp"><label class="flbl">Personil</label><input class="fctl" id="ed-per" value="' + esc(row.personil) + '"></div>'
    + '<div class="frow">'
    + '<div class="fcol"><label class="flbl">Danru</label><input class="fctl" id="ed-dan" value="' + esc(row.danru) + '"></div>'
    + '<div class="fcol"><label class="flbl">Nama Danru</label><input class="fctl" id="ed-ndan" value="' + esc(row.namaDanru) + '"></div>'
    + '</div>'
    + '<div class="fgrp"><label class="flbl">Keterangan / Uraian Laporan</label>'
    + '<textarea class="fctl" id="ed-ket" rows="3" placeholder="Uraian pelaksanaan kegiatan...">' + esc(row.keterangan || '') + '</textarea>'
    + '<div style="font-size:.6rem;color:var(--muted);margin-top:3px"><i class="fas fa-info-circle"></i> Otomatis jadi Uraian saat cetak PDF.</div>'
    + '</div>'
    + '<div class="fgrp"><label class="flbl">Foto</label><div class="fgrd" id="ed-fgrd"></div></div>';
  renderEditFotoGrid();
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none'; inp.id = 'ed-finp';
  inp.addEventListener('change', function (e) { addEditFotos(e.target.files); inp.value = ''; });
  G('medit-body').appendChild(inp);
  om('medit');
}

function renderEditFotoGrid() {
  var g = G('ed-fgrd'); if (!g) return; g.innerHTML = '';
  _editFotos.forEach(function (f, i) {
    var div = document.createElement('div'); div.className = 'fitem';
    var img = document.createElement('img'); img.src = f.src || f.url || '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;cursor:pointer;';
    img.onerror = (function (fi, imgEl, divEl) {
      return function () {
        var stage = parseInt(imgEl.dataset.stage || '0'); imgEl.onerror = null;
        if (stage === 0) { imgEl.dataset.stage = '1'; var orig = fi.url || ''; if (orig && imgEl.src !== orig) { imgEl.onerror = arguments.callee; imgEl.src = orig; return; } stage = 1; }
        if (stage === 1) { imgEl.dataset.stage = '2'; var furl = fi.url || ''; var mx2 = /\/file\/d\/([^\/]+)/.exec(furl); var mx1 = /[?&]id=([^&]+)/.exec(furl); var fid = mx2 ? mx2[1] : (mx1 ? mx1[1] : ''); if (fid) { var lh3url = 'https://lh3.googleusercontent.com/d/' + fid + '=w400'; imgEl.onerror = function () { imgEl.onerror = null; showFotoPlaceholder(imgEl, divEl); }; imgEl.src = lh3url; return; } }
        showFotoPlaceholder(imgEl, divEl);
      };
    })(f, img, div);
    img.onclick = (function (idx) { return function () { var origUrls = _editFotos.map(function (x) { return x.url || x.src; }); var thumbUrls = _editFotos.map(function (x) { return x.src || x.url; }); galOpen(origUrls, thumbUrls, idx); }; })(i);
    var del = document.createElement('button'); del.className = 'fdel'; del.innerHTML = '<i class="fas fa-times"></i>';
    del.onclick = (function (ii) { return function (e) { e.stopPropagation(); _editFotos.splice(ii, 1); renderEditFotoGrid(); }; })(i);
    var num = document.createElement('div'); num.className = 'fnum'; num.textContent = i + 1;
    div.appendChild(img); div.appendChild(del); div.appendChild(num); g.appendChild(div);
  });
  if (_editFotos.length < 10) {
    var btn = document.createElement('button'); btn.className = 'fadd';
    btn.innerHTML = '<i class="fas fa-plus"></i><span>Tambah</span>';
    btn.onclick = function () { var fi = G('ed-finp'); if (fi) fi.click(); };
    g.appendChild(btn);
  }
}

function showFotoPlaceholder(imgEl, divEl) {
  if (divEl) divEl.style.background = '#f0f0f0'; imgEl.onerror = null;
  imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23e8e8e8"%2F%3E%3Ctext x="40" y="47" text-anchor="middle" fill="%23bbb" font-size="9" font-family="sans-serif"%3EFoto%3C%2Ftext%3E%3C%2Fsvg%3E';
}

function addEditFotos(files) {
  var rem = 10 - _editFotos.length;
  for (var i = 0; i < Math.min(files.length, rem); i++) {
    (function (file) {
      var rd = new FileReader();
      rd.onload = function (e) { _editFotos.push({ src: e.target.result, isNew: true, data: e.target.result, mime: file.type }); renderEditFotoGrid(); };
      rd.readAsDataURL(file);
    })(files[i]);
  }
}

function submitEdit() {
  if (!_editRow) return;
  var lok = (G('ed-lok') || {}).value || '';
  var tgl = (G('ed-tgl') || {}).value || '';
  var dan = (G('ed-ndan') || {}).value || (G('ed-dan') || {}).value || '';
  if (!lok.trim()) { toast('Lokasi wajib diisi.', 'er'); return; }
  var cName = 'PC_' + (tgl ? tgl.replace(/\//g, '-') : 'Tanggal') + '_' + (dan ? dan : 'Danru');
  var fPay = _editFotos.map(function (f) { return f.isNew ? { data: f.data, mime: f.mime, customFileName: cName } : (f.url || f.src || ''); }).filter(function (f) { return f; });
  showLoad('Menyimpan...'); cm('medit');
  apiPost('updateLaporan', {
    _ri: _editRow._ri,
    lokasi: lok,
    hari: (G('ed-hari') || {}).value || '',
    tanggal: (G('ed-tgl') || {}).value || '',
    identitas: (G('ed-idn') || {}).value || '',
    personil: (G('ed-per') || {}).value || '',
    danru: (G('ed-dan') || {}).value || '',
    namaDanru: (G('ed-ndan') || {}).value || '',
    keterangan: (G('ed-ket') || {}).value || '',
    fotos: fPay
  }).then(function (res) {
    hideLoad();
    if (res.success) {
      toast('Laporan berhasil diperbarui.', 'ok');
      window._gcDel('rekap'); window._gcDel('dashboard'); loadRekap();
    } else toast('Gagal: ' + (res.message || ''), 'er');
  });
}
// ══════════════════════════════════════════
//  KONFIRM HAPUS
//  Sebelum: google.script.run.withSuccessHandler(fn).deleteLaporan(ri)
//  Sesudah: apiPost('deleteLaporan', { ri }).then(fn)
// ══════════════════════════════════════════
function konfirmHapus(mode, ri) {
  _hpsMode = mode; _hpsRi = ri;
  G('mconf-msg').textContent = mode === 'satlinmas' ? 'Hapus data anggota ini? Tidak dapat dibatalkan.' : 'Hapus laporan ini? Tidak dapat dibatalkan.';
  G('mbtnhps').onclick = function () { doHapus(); }; om('mconf');
}

function doHapus() {
  if (!_hpsRi && _hpsRi !== 0) return; showLoad('Menghapus...'); cm('mconf');
  if (_hpsMode === 'satlinmas') {
    // ✅ GANTI
    apiPost('deleteSatlinmas', { ri: _hpsRi }).then(function (res) {
      hideLoad();
      if (res.success) { toast('Anggota dihapus.', 'ok'); window._gcDel('satlinmas'); loadSatlinmas(); }
      else toast('Gagal: ' + (res.message || ''), 'er');
    });
  } else {
    // ✅ GANTI
    apiPost('deleteLaporan', { ri: _hpsRi }).then(function (res) {
      hideLoad();
      if (res.success) {
        toast('Laporan dihapus.', 'ok'); window._gcDel('rekap'); window._gcDel('dashboard');
        loadRekap();
      } else toast('Gagal: ' + (res.message || ''), 'er');
    });
  }
}
function loadInput() {
  if (SES && SES.role !== "admin") {
    toast("Akses ditolak.", "er");
    return;
  }

  setNav("in");
  setPage("Input Laporan", "Input via embed (optimal load)");
  sbClose();

  var ct = document.getElementById("ct");
  if (!ct) return;

  var isMobile = window.matchMedia("(max-width: 768px)").matches;
  var shellHeight = isMobile ? "calc(100dvh - 126px)" : "calc(100vh - 118px)";

  ct.style.maxWidth = "100%";
  ct.style.padding = isMobile ? "4px" : "6px 8px";
  ct.innerHTML = ''
    + '<div id="in-embed-shell" style="width:100%;height:' + shellHeight + ';min-height:' + (isMobile ? "420px" : "560px") + ';max-height:100%;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card);position:relative">'
    + '  <div id="in-embed-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--card);color:var(--muted);font-size:.72rem;font-weight:700">'
    + '    <div class="spw"><div class="spo"></div><div class="spi"></div></div>'
    + '    <span>Memuat Form Input...</span>'
    + '  </div>'
    + '</div>';

  var shell = document.getElementById("in-embed-shell");
  if (!shell) return;

  // If we already preloaded the iframe, reuse it (no reload).
  var pre = window._inputEmbedPreloaded;
  var iframe = null;
  if (pre && pre.tagName === 'IFRAME') {
    iframe = pre;
    try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch(e){}
  } else {
    iframe = document.createElement('iframe');
    iframe.src = typeof window.getInputEmbedUrl === 'function' ? window.getInputEmbedUrl() : '/api/input-embed';
  }

  iframe.id = 'input-iframe';
  iframe.title = 'Input Laporan SI-PEDAS';
  iframe.loading = 'eager';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allow = 'camera; microphone; geolocation; clipboard-read; clipboard-write';
  iframe.allowFullscreen = true;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';

  iframe.onload = function() {
    var ld = document.getElementById('in-embed-loading');
    if (ld) ld.style.display = 'none';
  };

  shell.appendChild(iframe);
}
