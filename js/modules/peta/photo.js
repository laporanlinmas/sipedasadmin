//  FOTO LAPANGAN
// ══════════════════════════════════════════════════════════════════════════════
function toggleStreetPanel() {
  var p = G('df-street-panel');
  if (p && p.classList.contains('visible')) { _closeStreetPanel(); return; }
  _buildStreetPanel();
  if (p) { p.classList.remove('hidden'); p.classList.add('visible'); }
  var btn = G('df-cam-btn'); if (btn) btn.classList.add('active');
  _dfStreetPanelOpen = true;
}

function _closeStreetPanel() {
  var p = G('df-street-panel'), btn = G('df-cam-btn');
  if (p) { p.classList.remove('visible'); p.classList.add('hidden'); }
  if (btn) btn.classList.remove('active');
  _dfStreetPanelOpen = false;
}

function _buildStreetPanel() {
  var p = G('df-street-panel'); if (!p) return;
  var counts = {};
  (_dfRawData||[]).forEach(function(pt){ var k=_resolveKelompok(pt); counts[k]=(counts[k]||0)+1; });
  var total = (_dfRawData||[]).length;
  var h = '<div class="dsp-lbl">Foto Lapangan</div>';
  h += '<button class="dsp-btn'+(_dfGroupFilter===null&&_dfVisible?' on':'')+'" '
    +(_dfGroupFilter===null&&_dfVisible?'style="background:rgba(30,111,217,.18)"':'')
    +' onclick="selectDfGroup(null)">'
    +'<i class="fas fa-layer-group si" style="color:#80b8ff"></i>Semua Foto<span class="sc">'+total+'</span></button>';
  if (_dfVisible) {
    h += '<button class="dsp-btn" onclick="hideDfAll()" style="color:rgba(160,180,210,.7)">'
      +'<i class="fas fa-eye-slash si" style="color:rgba(160,180,210,.4)"></i>Sembunyikan</button>';
  }
  h += '<div class="dsp-sep"></div><div class="dsp-lbl">Per Jalan</div>';
  JALAN_GROUPS.forEach(function(g) {
    var cnt=counts[g.id]||0, isA=_dfGroupFilter===g.id;
    h += '<button class="dsp-btn'+(isA?' on':'')+'" '+(isA?'style="background:'+g.warna+'1a"':'')+' onclick="selectDfGroup(\''+g.id+'\')">'
      +'<i class="fas '+g.ico+' si" style="color:'+g.warna+'"></i>'+g.label.replace('Jl. ','')
      +'<span class="sc"'+(cnt?'':' style="opacity:.3"')+'>'+cnt+'</span></button>';
  });
  p.innerHTML = h;
}

function _getStreetBoundsByCoords(lat, lng) {
  if (!STREET_BOUNDS || !lat || !lng) return 'lainnya';
  for (var i = 0; i < STREET_BOUNDS.length; i++) {
    var bound = STREET_BOUNDS[i];
    if (lat >= bound.minLat && lat <= bound.maxLat && 
        lng >= bound.minLng && lng <= bound.maxLng) {
      return bound.id;
    }
  }
  return 'lainnya';
}

function _resolveKelompok(pt) {
  // Cek berdasarkan koordinat terhadap STREET_BOUNDS
  if (pt.lat && pt.lng) {
    var streetId = _getStreetBoundsByCoords(pt.lat, pt.lng);
    if (streetId !== 'lainnya') return streetId;
  }
  
  // Fallback ke kelompokJalan jika ada, untuk data yang sudah ada field ini
  var k = (pt.kelompokJalan||'').toString().toLowerCase().trim();
  if (k==='diponegoro')                                  return 'diponegoro';
  if (k==='jenderal soedirman'||k==='jenderal_soedirman'||k==='jend. soedirman') return 'jenderal_soedirman';
  if (k==='hos cokroaminoto'||k==='hos_cokroaminoto')   return 'hos_cokroaminoto';
  if (k==='urip soemoharjo'||k==='urip_soemoharjo')     return 'urip_soemoharjo';
  
  return 'lainnya';
}

function selectDfGroup(groupId) {
  _dfGroupFilter=groupId; _dfVisible=true; _closeStreetPanel();
  if (_lfLayerGroupDF&&_lfMap) _lfMap.removeLayer(_lfLayerGroupDF);
  var f = groupId===null ? _dfRawData : (_dfRawData||[]).filter(function(pt){ return _resolveKelompok(pt)===groupId; });
  _renderLeafletDF(f);
  if (_lfLayerGroupDF&&_lfMap) _lfLayerGroupDF.addTo(_lfMap);
  var btn=G('df-cam-btn'); if(btn) btn.classList.add('active');
  var g = groupId ? JALAN_GROUPS.filter(function(x){ return x.id===groupId; })[0] : null;
  toast(f.length+' foto'+(g?' — '+g.label:'')+' ditampilkan.','ok');
}

function hideDfAll() {
  _dfVisible=false; _dfGroupFilter=null; _closeStreetPanel();
  if (_lfLayerGroupDF&&_lfMap) _lfMap.removeLayer(_lfLayerGroupDF);
  var btn=G('df-cam-btn'); if(btn) btn.classList.remove('active');
  toast('Foto lapangan disembunyikan.','inf');
}

// ══════════════════════════════════════════════════════════════════════════════
