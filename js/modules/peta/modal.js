//  MODAL FOTO LAPANGAN
// ══════════════════════════════════════════════════════════════════════════════
function openLayerPhotoPanel(lat, lng, nama, warna, ico) {
  _currentLayerCenter={lat:lat,lng:lng,nama:nama,warna:warna||'#1e6fd9',ico:ico||'fa-location-dot'};
  _lyrPhotoOpen=true;
  var hdr=G('foto-hd');
  if (hdr) {
    hdr.innerHTML='<div class="foto-hd-ico" style="background:'+warna+'18;color:'+warna+'"><i class="fas '+(ico||'fa-location-dot')+'"></i></div>'
      +'<div class="foto-hd-info"><div class="foto-hd-title">'+esc(nama)+'</div><div class="foto-hd-sub"><i class="fas fa-camera"></i> Foto &amp; Laporan Sekitar Lokasi</div></div>'
      +'<button class="foto-close" onclick="closeLayerPhotoPanel()"><i class="fas fa-xmark"></i></button>';
  }
  var df=G('foto-date-from'),dt=G('foto-date-to');
  if(df) df.value=''; if(dt) dt.value='';
  var ov=G('foto-ov'); if(ov) ov.classList.add('show');
  _loadFotoBody();
  if(_lfMap) _lfMap.closePopup();
}

function closeLayerPhotoPanel() {
  _lyrPhotoOpen=false; _currentLayerCenter=null;
  var ov=G('foto-ov'); if(ov) ov.classList.remove('show');
}

function refreshFotoModal() { _loadFotoBody(); }

function resetFotoFilter() {
  var df=G('foto-date-from'),dt=G('foto-date-to');
  if(df) df.value=''; if(dt) dt.value='';
  _loadFotoBody();
}

function _loadFotoBody() {
  if (!_currentLayerCenter) return;
  var body=G('foto-body');
  if(body) body.innerHTML='<div class="foto-empty"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';
  var lat=_currentLayerCenter.lat, lng=_currentLayerCenter.lng;
  var radius=parseInt((G('foto-radius')||{}).value||'1000',10);
  var dateFrom=((G('foto-date-from')||{}).value||'').trim();
  var dateTo=((G('foto-date-to')||{}).value||'').trim();
  var filtered=(_dfRawData||[]).filter(function(pt){
    if(!pt.lat||!pt.lng) return false;
    if(_haversineDistance(lat,lng,pt.lat,pt.lng)>radius) return false;
    if(dateFrom||dateTo){
      var tgl=_parseTglFoto(pt);
      if(!tgl) return !dateFrom;
      if(dateFrom&&tgl<dateFrom) return false;
      if(dateTo&&tgl>dateTo) return false;
    }
    return true;
  });
  filtered.sort(function(a,b){ return _haversineDistance(lat,lng,a.lat,a.lng)-_haversineDistance(lat,lng,b.lat,b.lng); });
  _renderFotoBody(filtered,lat,lng,radius);
}

function _parseTglFoto(pt) {
  var raw=pt.waktuExif||pt.tanggalFoto||''; if(!raw) return null;
  raw=raw.toString().trim();
  var m1=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(m1) return m1[3]+'-'+m1[2]+'-'+m1[1];
  var m2=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);   if(m2) return m2[1]+'-'+m2[2]+'-'+m2[3];
  return null;
}

function _renderFotoBody(data, cLat, cLng, radius) {
  var body=G('foto-body'); if(!body) return;
  if(!data.length){
    body.innerHTML='<div class="foto-empty"><i class="fas fa-camera-slash"></i><p>Tidak ada foto dalam radius '+_fmtR(radius)+'</p></div>';
    return;
  }
  var stat='<div class="foto-stat">Menampilkan <b>'+data.length+'</b> foto dalam radius '+_fmtR(radius)+'</div>';
  var cards='<div class="foto-list">'+data.map(function(pt){
    var dist=_haversineDistance(cLat,cLng,pt.lat,pt.lng);
    var distStr=dist<1000?Math.round(dist)+' m':(dist/1000).toFixed(1)+' km';
    var hasTh=!!pt.thumbUrl, hasDrv=!!pt.linkDrive, hasGmaps=!!pt.linkGmaps;
    var thumbCol=hasTh
      ?'<div class="foto-thumb-col" onclick="openLb(\''+esc(pt.thumbUrl)+'\','+(hasDrv?'\''+esc(pt.linkDrive)+'\'':'null')+',\''+esc(pt.namaFile||'Foto')+'\')">'
        +'<img src="'+esc(pt.thumbUrl)+'" loading="lazy" onerror="this.parentElement.className=\'foto-thumb-ph\';this.outerHTML=\'<i class=\\\"fas fa-image\\\"></i>\'">'
        +'<div class="foto-thumb-overlay"><i class="fas fa-expand-alt"></i></div></div>'
      :'<div class="foto-thumb-ph"><i class="fas fa-image"></i></div>';
    var waktu=pt.waktuExif||pt.tanggalFoto||'';
    var koordinat=pt.lat.toFixed(5)+', '+pt.lng.toFixed(5);
    var metaRows='<div class="foto-meta-rows">'
      +(pt.danru?'<div class="foto-meta-row"><i class="fas fa-shield-halved" style="color:#0d9268"></i><span>'+esc(pt.danru)+'</span></div>':'')
      +(waktu?'<div class="foto-meta-row"><i class="fas fa-clock"></i><span>'+esc(waktu)+'</span></div>':'')
      +'<div class="foto-meta-row"><i class="fas fa-crosshairs" style="color:#1e6fd9"></i><span style="font-family:var(--mono);font-size:.58rem">'+koordinat+'</span></div>'
      +'</div>';
    var acts='<div class="foto-acts">'
      +(hasTh?'<button class="foto-btn prev" onclick="openLb(\''+esc(pt.thumbUrl)+'\','+(hasDrv?'\''+esc(pt.linkDrive)+'\'':'null')+',\''+esc(pt.namaFile||'Foto')+'\')"><i class="fas fa-eye"></i> Preview</button>':'')
      +(hasGmaps?'<a class="foto-btn gmaps" href="'+esc(pt.linkGmaps)+'" target="_blank" rel="noopener"><i class="fas fa-map-location-dot"></i> Maps</a>':'')
      +(hasDrv?'<a class="foto-btn drv" href="'+esc(pt.linkDrive)+'" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Drive</a>':'')
      +'</div>';
    var infoCol='<div class="foto-info-col"><div class="foto-fname">'+esc(pt.namaFile||'Foto Lapangan')+'</div>'+metaRows
      +'<div class="foto-bottom-row"><span class="foto-dist"><i class="fas fa-circle-dot"></i>'+distStr+'</span>'+acts+'</div></div>';
    return '<div class="foto-card">'+thumbCol+infoCol+'</div>';
  }).join('')+'</div>';
  body.innerHTML=stat+cards;
}

function _fmtR(r){ return r<1000?r+' m':(r/1000)+' km'; }

function openLb(thumbUrl, driveUrl, nama) {
  var ov=G('img-lb-ov'),img=G('img-lb-img'),nm=G('img-lb-name'),drv=G('img-lb-drv');
  if(!ov||!img) return;
  img.src=thumbUrl||''; img.alt='';
  if(nm) nm.textContent=nama||'';
  if(drv){ if(driveUrl){drv.href=driveUrl;drv.style.display='inline-flex';}else drv.style.display='none'; }
  ov.classList.add('show');
}

function closeLb() {
  var ov=G('img-lb-ov'); if(ov) ov.classList.remove('show');
  var img=G('img-lb-img'); if(img) img.src='';
}

function _haversineDistance(la1,ln1,la2,ln2) {
  var R=6371000,p1=la1*Math.PI/180,p2=la2*Math.PI/180;
  var dp=(la2-la1)*Math.PI/180,dl=(ln2-ln1)*Math.PI/180;
  var a=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ══════════════════════════════════════════════════════════════════════════════
