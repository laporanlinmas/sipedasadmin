//  PDF — BUILD LEGENDA ROWS
// ══════════════════════════════════════════════════════════════════════════════
function _buildPdfLegendRows() {
  _pdfLegendRows = [];

  // 1) Layer marker aktif
  if (_pdfOpts.showLayers && _layerData) {
    _layerData.filter(function(l){ return l.aktif&&l.lat&&l.lng; }).forEach(function(layer) {
      var sd  = getSimbolDef(layer.simbol);
      var col = layer.warna || sd.warna || '#1e6fd9';
      _pdfLegendRows.push({ warna:col, tipe:'marker', label:layer.nama||'Layer', simbol:sd.ico||'fa-map-pin' });
    });
  }

  // 2) Titik foto
  if (_pdfOpts.showFoto && _dfVisible && JALAN_GROUPS) {
    JALAN_GROUPS.forEach(function(g) {
      _pdfLegendRows.push({ warna:g.warna||'#1e6fd9', tipe:'dot', label:g.label||'Foto', simbol:'fa-camera' });
    });
  }

  // 3) Drawn items
  if (_pdfOpts.showDraw && _drawnItems) {
    _drawnItems.eachLayer(function(layer) {
      var lid=L.Util.stamp(layer), meta=_drawnMeta[lid]||{}, tipe=meta.tipe||'polyline';
      _pdfLegendRows.push({
        warna: meta.warna||'#1e6fd9',
        tipe:  tipe==='polyline'?'line':'poly',
        label: meta.nama||(tipe==='polyline'?'Jalur':'Area'),
        simbol:tipe==='polyline'?'fa-route':'fa-draw-polygon'
      });
    });
  }

  // Deduplikasi
  var seen={};
  _pdfLegendRows = _pdfLegendRows.filter(function(row){
    var k=row.label+row.warna+row.tipe;
    if(seen[k]) return false; seen[k]=true; return true;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — OPEN / CLOSE MODAL
// ══════════════════════════════════════════════════════════════════════════════
async function openPdfModal() {
  var ov=G('pdf-ov'); if(!ov) return;
  ov.classList.add('show');
  _pdfModalOpen=true;
  // Pre-cache semua ikon (sync sekarang, langsung gambar ke canvas)
  _precacheSimbolIcons();
  _buildPdfLegendRows();
  _buildPdfOptsPanel();
  setTimeout(function(){ _initPdfMap(); }, 160);
  window.addEventListener('keydown', _onPdfMapKey);
}

function closePdfModal() {
  var ov=G('pdf-ov'); if(ov) ov.classList.remove('show');
  _pdfModalOpen=false;
  _destroyPdfMap();
  window.removeEventListener('keydown', _onPdfMapKey);
}

function _onPdfMapKey(e){ if(e.key==='Escape'&&_pdfModalOpen) closePdfModal(); }

function _destroyPdfMap() {
  if(_pdfMap){ try{_pdfMap.off();_pdfMap.remove();}catch(e){} _pdfMap=null; }
  _pdfMapLayers={};
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — INIT PREVIEW MAP
// ══════════════════════════════════════════════════════════════════════════════
function _initPdfMap() {
  var el=G('pdf-map-preview'); if(!el) return;
  _destroyPdfMap();
  if(!window.L){ console.error('[PDF] Leaflet belum dimuat'); return; }

  var center=_lfMap?_lfMap.getCenter():PETA_CENTER;
  var zoom=_lfMap?_lfMap.getZoom():PETA_ZOOM;

  _pdfMap=L.map('pdf-map-preview',{center:center,zoom:zoom,zoomControl:false,attributionControl:false,preferCanvas:true});

  var tConf=_getTileConf();
  _pdfMapLayers.base=L.tileLayer(tConf.url,{attribution:tConf.attr,maxZoom:tConf.maxZoom||19,crossOrigin:'anonymous',keepBuffer:4});
  _pdfMapLayers.base.addTo(_pdfMap);

  if(_pdfOpts.showLayers&&_layerData){
    _layerData.filter(function(l){return l.aktif&&l.lat&&l.lng;}).forEach(function(layer){
      var sd=getSimbolDef(layer.simbol), warna=layer.warna||sd.warna||'#1e6fd9';
      L.marker([layer.lat,layer.lng],{icon:_makeLeafletIcon(warna,sd.ico)}).addTo(_pdfMap).bindPopup('<b>'+esc(layer.nama)+'</b>');
    });
  }
  if(_pdfOpts.showFoto&&_dfVisible&&_dfRawData){
    var pts=_dfGroupFilter===null?_dfRawData:_dfRawData.filter(function(pt){return _resolveKelompok(pt)===_dfGroupFilter;});
    pts.forEach(function(pt){
      if(!pt.lat||!pt.lng) return;
      var grp=JALAN_GROUPS.filter(function(x){return x.id===_resolveKelompok(pt);})[0];
      var color=grp?grp.warna:'#1e6fd9';
      L.circleMarker([pt.lat,pt.lng],{radius:5,color:'#fff',weight:1.5,fillColor:color,fillOpacity:1}).addTo(_pdfMap).bindPopup(esc(pt.namaFile||'Foto'));
    });
  }
  if(_pdfOpts.showDraw&&_drawnItems){
    _drawnItems.eachLayer(function(layer){
      try{
        var gj=layer.toGeoJSON(),lid=L.Util.stamp(layer),meta=_drawnMeta[lid]||{},w=meta.warna||'#1e6fd9';
        var isLine=(meta.tipe||'polyline')==='polyline';
        var opts=isLine?{color:w,weight:3.5,opacity:.95,dashArray:'8 5',lineCap:'round'}:{color:w,weight:2,fillColor:w,fillOpacity:.22};
        var nl=L.geoJSON(gj,{style:opts}); nl.addTo(_pdfMap);
        if(meta.nama) nl.bindTooltip('<b>'+esc(meta.nama)+'</b>',{permanent:false,className:'lf-tip-clean'});
      }catch(e){console.warn('[PDF] drawn error',e);}
    });
  }
  setTimeout(function(){ if(_pdfMap) _pdfMap.invalidateSize({animate:false}); },260);
}

function fitPdfMapBounds() {
  if(!_pdfMap) return;
  var bounds=[];
  if(_pdfOpts.showLayers&&_layerData)
    _layerData.filter(function(l){return l.aktif&&l.lat&&l.lng;}).forEach(function(l){bounds.push([l.lat,l.lng]);});
  if(_pdfOpts.showFoto&&_dfRawData)
    _dfRawData.forEach(function(pt){if(pt.lat&&pt.lng) bounds.push([pt.lat,pt.lng]);});
  if(_pdfOpts.showDraw&&_drawnItems)
    _drawnItems.eachLayer(function(layer){
      try{var b=layer.getBounds();if(b){bounds.push([b.getNorth(),b.getEast()]);bounds.push([b.getSouth(),b.getWest()]);}}catch(e){}
    });
  if(bounds.length>0) _pdfMap.fitBounds(bounds,{padding:[30,30],animate:false});
  else _pdfMap.setView(PETA_CENTER,PETA_ZOOM,{animate:false});
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — PANEL OPSI
// ══════════════════════════════════════════════════════════════════════════════
function _buildPdfOptsPanel() {
  var p=G('pdf-opts-panel'); if(!p) return;
  var mapModes=[
    {id:'osm',ico:'fa-map',lbl:'OSM'},{id:'satellite',ico:'fa-satellite',lbl:'Satelit'},
    {id:'hybrid',ico:'fa-globe',lbl:'Hybrid'},{id:'carto',ico:'fa-map-location',lbl:'CartoDB'},
    {id:'topo',ico:'fa-mountain',lbl:'Topo'}
  ];
  var paperOpts=Object.keys(PAPER_SIZES).map(function(k){
    return '<button class="pdf-paper-btn'+(_pdfOpts.paperSize===k?' on':'')+'" data-sz="'+k+'" onclick="setPdfPaper(\''+k+'\')">'+PAPER_SIZES[k].label+'</button>';
  }).join('');

  p.innerHTML=
    '<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-sliders"></i> Elemen Tampil</div>'
      +_pdfChk('pc-lay','Marker Layer','<small>Pin lokasi aktif</small>',_pdfOpts.showLayers)
      +_pdfChk('pc-draw','Gambar Overlay','<small>Garis &amp; area</small>',_pdfOpts.showDraw)
      +_pdfChk('pc-foto','Titik Foto','<small>Dot foto lapangan</small>',_pdfOpts.showFoto)
    +'</div>'
    +'<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-map"></i> Peta Dasar</div>'
      +'<div class="pdf-map-grid">'
      +mapModes.map(function(m){
        return '<button class="pdf-map-btn'+(_pdfOpts.mapMode===m.id?' on':'')+'" data-id="'+m.id+'" onclick="setPdfMap(\''+m.id+'\')">'
          +'<i class="fas '+m.ico+'"></i>'+m.lbl+'</button>';
      }).join('')
      +'</div>'
    +'</div>'
    +'<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-file"></i> Ukuran Kertas</div>'
      +'<div class="pdf-paper-row">'+paperOpts+'</div>'
    +'</div>'
    +'<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-rotate"></i> Orientasi</div>'
      +'<div class="pdf-ori-row">'
        +'<button class="pdf-ori-btn'+(_pdfOpts.orientation==='landscape'?' on':'')+'" onclick="setPdfOri(\'landscape\')"><i class="fas fa-image"></i>Landscape</button>'
        +'<button class="pdf-ori-btn'+(_pdfOpts.orientation==='portrait'?' on':'')+'" onclick="setPdfOri(\'portrait\')"><i class="fas fa-file"></i>Portrait</button>'
      +'</div>'
    +'</div>'
    +'<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-star-half-stroke"></i> Kualitas Render</div>'
      +'<div class="pdf-dpi-row">'
        +_dpiBtn(2,'Normal')+_dpiBtn(3,'HD')+_dpiBtn(4.5,'Full HD')+_dpiBtn(6,'Ultra')
      +'</div>'
      +'<div id="dpi-hint" style="font-size:.58rem;color:var(--muted);padding:3px 2px">'+_getDpiHint()+'</div>'
    +'</div>'
    +'<div class="pdf-sect">'
      +'<div class="pdf-sect-lbl"><i class="fas fa-list"></i> Legenda <span style="font-size:.55rem;font-weight:600;color:var(--muted)">(edit teks)</span></div>'
      +'<div id="pdf-leg-area">'+_buildLegendEditorHtml()+'</div>'
    +'</div>';
}

function _dpiBtn(val,lbl){
  return '<button class="pdf-dpi-btn'+(_pdfOpts.dpi===val?' on':'')+'" data-dpi="'+val+'" onclick="setPdfDpi('+val+')">'+lbl+'</button>';
}

function _getDpiHint(){
  var hints={2:'Cepat (~0.5 MB)',3:'Seimbang HD (~1.5 MB)',4.5:'Full HD (~4 MB)',6:'Ultra (~8 MB)'};
  return '<i class="fas fa-info-circle" style="color:var(--blue)"></i> '+(hints[_pdfOpts.dpi]||'');
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — LEGENDA EDITOR
//  Preview swatch di UI: identik dengan marker di peta (PNG cache)
// ══════════════════════════════════════════════════════════════════════════════
function _buildLegendEditorHtml() {
  if(!_pdfLegendRows.length)
    return '<div style="font-size:.6rem;color:var(--muted);padding:6px 2px"><i class="fas fa-info-circle"></i> Aktifkan layer untuk otomatis mengisi legenda</div>';
  return _pdfLegendRows.map(function(row,i){
    return '<div class="pdf-leg-row">'
      +'<div class="pdf-leg-swatch-wrap" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+_buildSwatchHtml(row)+'</div>'
      +'<input class="pdf-leg-inp" data-idx="'+i+'" value="'+esc(row.label)+'" oninput="updateLegRow('+i+',this.value)" placeholder="Keterangan...">'
      +'<button class="pdf-leg-del" onclick="delLegRow('+i+')"><i class="fas fa-times"></i></button>'
    +'</div>';
  }).join('')
  +'<button class="pdf-leg-add" onclick="addLegRow()"><i class="fas fa-plus"></i> Tambah baris</button>';
}

// Preview swatch di UI editor — sama persis dengan tampilan di peta
function _buildSwatchHtml(row) {
  var w=row.warna||'#607d8b', t=row.tipe||'marker', ico=row.simbol||'fa-map-pin';
  if(t==='line'){
    return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="8">'
      +'<line x1="0" y1="4" x2="28" y2="4" stroke="'+w+'" stroke-width="2.5" stroke-dasharray="5 3" stroke-linecap="round"/>'
      +'</svg>';
  }
  if(t==='poly'){
    return '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18">'
      +'<rect x="1" y="1" width="24" height="16" rx="2" ry="2" fill="'+w+'" fill-opacity="0.22" stroke="'+w+'" stroke-width="1.8"/>'
      +'</svg>';
  }
  if(t==='dot'){
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">'
      +'<circle cx="8" cy="8" r="6" fill="'+w+'" stroke="#fff" stroke-width="2"/>'
      +'</svg>';
  }
  // marker: tampilkan pin identik peta — PNG dari cache, fallback FA icon
  var png=_getSimbolPng(ico,w);
  if(png) return '<img src="'+png+'" width="20" height="26" style="display:block;image-rendering:auto">';
  // fallback: render FA icon warna (saat cache belum ready)
  return '<i class="fas '+ico+'" style="color:'+w+';font-size:16px"></i>';
}

function updateLegRow(idx,val){ if(_pdfLegendRows[idx]) _pdfLegendRows[idx].label=val; }
function delLegRow(idx){ _pdfLegendRows.splice(idx,1); _rebuildLegEditor(); }
function addLegRow(){ _pdfLegendRows.push({warna:'#607d8b',tipe:'dot',label:'Keterangan baru'}); _rebuildLegEditor(); }
function _rebuildLegEditor(){ var a=G('pdf-leg-area'); if(a) a.innerHTML=_buildLegendEditorHtml(); }

// ══════════════════════════════════════════════════════════════════════════════
