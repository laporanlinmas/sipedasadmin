//  PDF — CHECKBOX & SETTER
// ══════════════════════════════════════════════════════════════════════════════
function _pdfChk(id,lbl,sub,checked){
  return '<div class="pdf-chk'+(checked?' on':'')+'" onclick="togglePdfChk(\''+id+'\')">'
    +'<input type="checkbox" id="'+id+'"'+(checked?' checked':'')+' onclick="event.stopPropagation()">'
    +'<label for="'+id+'">'+lbl+sub+'</label></div>';
}

function togglePdfChk(id){
  var inp=G(id); if(!inp) return;
  inp.checked=!inp.checked;
  var p=inp.closest?inp.closest('.pdf-chk'):inp.parentElement;
  if(p) p.classList.toggle('on',inp.checked);
  var m={'pc-lay':'showLayers','pc-foto':'showFoto','pc-draw':'showDraw'};
  if(m[id]){ _pdfOpts[m[id]]=inp.checked; _buildPdfLegendRows(); _rebuildLegEditor(); _initPdfMap(); }
}

function setPdfMap(mode){
  _pdfOpts.mapMode=mode;
  document.querySelectorAll('.pdf-map-btn').forEach(function(b){b.classList.toggle('on',b.dataset.id===mode);});
  if(_pdfMap&&_pdfMapLayers.base){
    _pdfMap.removeLayer(_pdfMapLayers.base);
    var tc=_getTileConf();
    _pdfMapLayers.base=L.tileLayer(tc.url,{attribution:tc.attr,maxZoom:tc.maxZoom||19,crossOrigin:'anonymous'});
    _pdfMapLayers.base.addTo(_pdfMap);
  }
}

function setPdfOri(ori){
  _pdfOpts.orientation=ori;
  document.querySelectorAll('.pdf-ori-btn').forEach(function(b){
    b.classList.toggle('on',b.textContent.trim().toLowerCase().indexOf(ori)>-1);
  });
}

function setPdfPaper(size){
  _pdfOpts.paperSize=size;
  document.querySelectorAll('.pdf-paper-btn').forEach(function(b){b.classList.toggle('on',b.dataset.sz===size);});
}

function setPdfDpi(val){
  _pdfOpts.dpi=val;
  document.querySelectorAll('.pdf-dpi-btn').forEach(function(b){b.classList.toggle('on',parseFloat(b.dataset.dpi)===val);});
  var h=G('dpi-hint'); if(h) h.innerHTML='<i class="fas fa-info-circle" style="color:var(--blue)"></i> '+_getDpiHint().replace('<i class="fas fa-info-circle" style="color:var(--blue)"></i> ','');
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — EXPORT ENTRY POINTS
// ══════════════════════════════════════════════════════════════════════════════
function _setPdfBtn(id,loading,original){
  var btn=G(id); if(!btn) return;
  btn.innerHTML=loading?'<i class="fas fa-spinner fa-spin"></i> Memproses...':original;
  btn.disabled=loading;
}

function execPrint(){
  if(_pdfRenderBusy) return;
  _setPdfBtn('btn-pdf-print',true,'<i class="fas fa-print"></i> Cetak');
  _runPdfExport(function(doc){
    _setPdfBtn('btn-pdf-print',false,'<i class="fas fa-print"></i> Cetak');
    if(!doc) return;
    var url=URL.createObjectURL(doc.output('blob'));
    var w=window.open(url);
    if(w) setTimeout(function(){w.print();},1000);
    toast('Dokumen siap dicetak.','ok');
  });
}

function execDownload(){
  if(_pdfRenderBusy) return;
  _setPdfBtn('btn-pdf-dl',true,'<i class="fas fa-download"></i> Unduh PDF');
  _runPdfExport(function(doc){
    _setPdfBtn('btn-pdf-dl',false,'<i class="fas fa-download"></i> Unduh PDF');
    if(!doc) return;
    var paper=(PAPER_SIZES[_pdfOpts.paperSize]||PAPER_SIZES.a4).label.replace(/\s/g,'_');
    var ori=_pdfOpts.orientation==='landscape'?'L':'P';
    doc.save('Peta_Pedestrian_'+paper+'_'+ori+'_'+new Date().toISOString().slice(0,10)+'.pdf');
    toast('PDF berhasil diunduh.','ok');
  });
}

function _runPdfExport(done){
  if(_pdfRenderBusy){ toast('Render sedang berjalan.','inf'); return; }
  _pdfRenderBusy=true;
  var finish=function(doc){ _pdfRenderBusy=false; _hideRenderProgress(); done(doc); };
  _ensureJsPDF(function(){
    _ensureHtml2Canvas(function(){
      _generatePdf4K(finish);
    });
  });
}

function _ensureHtml2Canvas(cb){
  if(window.html2canvas){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  s.onload=cb; s.onerror=function(){toast('html2canvas gagal.','er');}; document.head.appendChild(s);
}

function _ensureJsPDF(cb){
  if((window.jspdf&&window.jspdf.jsPDF)||window.jsPDF){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=cb; s.onerror=function(){toast('jsPDF gagal.','er');}; document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — HIDE/SHOW LEAFLET UI
// ══════════════════════════════════════════════════════════════════════════════
function _hideLeafletUI(mapEl){
  if(!mapEl) return;
  ['.leaflet-control-zoom','.leaflet-control-attribution','.leaflet-control-scale','.leaflet-bar','.leaflet-top','.leaflet-bottom'].forEach(function(sel){
    mapEl.querySelectorAll(sel).forEach(function(el){el.setAttribute('data-pdf-hidden',el.style.display||'');el.style.display='none';});
  });
}

function _showLeafletUI(mapEl){
  if(!mapEl) return;
  mapEl.querySelectorAll('[data-pdf-hidden]').forEach(function(el){
    var orig=el.getAttribute('data-pdf-hidden');
    el.style.display=(orig==='none'||orig==='')?'':orig;
    el.removeAttribute('data-pdf-hidden');
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — GENERATE 4K (html2canvas offscreen)
// ══════════════════════════════════════════════════════════════════════════════
function _generatePdf4K(done){
  if(!_pdfMap){ toast('Inisialisasi peta terlebih dahulu.','er'); done(null); return; }

  var dpi=_pdfOpts.dpi||3;
  var dpiLabel=dpi<=2?'Normal':dpi<=3?'HD':dpi<=4.5?'Full HD':'Ultra';
  var today=new Date();
  var tglStr=today.toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  var jamStr=today.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  var tileConf=_getTileConf();

  _showRenderProgress('Menyiapkan render '+dpiLabel+'...','Membuat canvas offscreen',5);

  var dims=_getPaperDims();
  var MM=3.7795275591;
  var TW=Math.round((dims.w-10)*MM);
  var TH=Math.round((dims.h-58)*MM);

  var offDiv=document.createElement('div');
  offDiv.id='__pdf_off_4k__';
  offDiv.style.cssText=['position:fixed','left:-99999px','top:0','width:'+TW+'px','height:'+TH+'px','background:#e4eaf5','z-index:-99999','overflow:hidden','pointer-events:none'].join(';');
  document.body.appendChild(offDiv);

  _showRenderProgress('Memuat tile peta...','Tunggu tile dari '+(tileConf.label||'server'),15);

  var offMap=L.map(offDiv,{center:_pdfMap.getCenter(),zoom:_pdfMap.getZoom(),zoomControl:false,attributionControl:false,preferCanvas:true,renderer:L.canvas({padding:.5})});
  L.tileLayer(tileConf.url,{attribution:tileConf.attr,maxZoom:tileConf.maxZoom||19,crossOrigin:'anonymous',keepBuffer:8}).addTo(offMap);
  _cloneLayersTo4KMap(offMap);
  offMap.invalidateSize({animate:false});

  var elapsed=0, captured=false;
  var waitTile=setInterval(function(){
    elapsed+=200;
    var pct=Math.min(55,15+Math.round(elapsed/5000*40));
    var pending=offDiv.querySelectorAll('img.leaflet-tile:not(.leaflet-tile-loaded)').length;
    var total=offDiv.querySelectorAll('img.leaflet-tile').length;
    var loaded=total-pending;
    _showRenderProgress('Memuat tile...',(total>0?loaded+'/'+total+' tile dimuat':'Menunggu...'),pct);
    if(!captured&&((pending===0&&elapsed>600)||(elapsed>=5000))){
      captured=true; clearInterval(waitTile);
      _showRenderProgress('Merender canvas '+dpiLabel+'...','Skala: '+dpi+'x',60);
      setTimeout(function(){ _doH2CCapture4K(offMap,offDiv,TW,TH,dpi,dpiLabel,tglStr,jamStr,tileConf,done); },300);
    }
  },200);
}

function _doH2CCapture4K(offMap,offDiv,TW,TH,dpi,dpiLabel,tglStr,jamStr,tileConf,done){
  var mapEl=offMap.getContainer();
  _hideLeafletUI(mapEl);
  _showRenderProgress('Merender canvas '+dpiLabel+'...','scale='+dpi+'x, resolusi '+(TW*dpi)+'×'+(TH*dpi),65);

  html2canvas(mapEl,{
    useCORS:true, allowTaint:true, scale:dpi, backgroundColor:'#e4eaf5',
    logging:false, imageTimeout:10000, width:TW, height:TH, scrollX:0, scrollY:0,
    foreignObjectRendering:false,
    onclone:function(clonedDoc){
      var cc=clonedDoc.querySelector('#__pdf_off_4k__'); if(!cc) return;
      cc.querySelectorAll('.leaflet-control-zoom,.leaflet-control-attribution,.leaflet-control-scale,.leaflet-bar,.leaflet-top,.leaflet-bottom')
        .forEach(function(el){el.style.display='none';});
      cc.querySelectorAll('[class*="leaflet-pane"]').forEach(function(pane){
        var cls=pane.className||'';
        if(cls.indexOf('leaflet-map-pane')>-1){
          try{var st=window.getComputedStyle(pane).transform;if(st&&st!=='none'){var m=new DOMMatrix(st);pane.style.transform='none';pane.style.left=m.m41+'px';pane.style.top=m.m42+'px';}}catch(e){}
        }
        if(cls.indexOf('leaflet-tile-pane')>-1){
          pane.querySelectorAll('.leaflet-tile-container').forEach(function(tc){
            try{var st2=window.getComputedStyle(tc).transform;if(st2&&st2!=='none'){var m2=new DOMMatrix(st2);tc.style.transform='none';tc.style.left=m2.m41+'px';tc.style.top=m2.m42+'px';}}catch(e){}
          });
        }
      });
      cc.querySelectorAll('.leaflet-overlay-pane svg').forEach(function(svg){
        try{var st3=window.getComputedStyle(svg).transform;if(st3&&st3!=='none'){var m3=new DOMMatrix(st3);svg.style.transform='none';svg.style.left=m3.m41+'px';svg.style.top=m3.m42+'px';}}catch(e){}
      });
      cc.querySelectorAll('.leaflet-canvas-pane canvas').forEach(function(cv){
        try{var st4=window.getComputedStyle(cv).transform;if(st4&&st4!=='none') cv.style.transform='none';}catch(e){}
      });
    }
  }).then(function(canvas){
    _showRenderProgress('Menyusun dokumen PDF...','Menambahkan legenda & elemen',88);
    _showLeafletUI(mapEl);
    try{offMap.off();offMap.remove();}catch(e){}
    if(offDiv.parentNode) offDiv.parentNode.removeChild(offDiv);
    _showRenderProgress('Menghasilkan PDF...','Hampir selesai...',95);
    setTimeout(async function(){
      await _buildPdfDocument(canvas,tglStr,jamStr,tileConf,done);
    },80);
  }).catch(function(e){
    _showLeafletUI(mapEl);
    try{offMap.off();offMap.remove();}catch(ex){}
    if(offDiv.parentNode) offDiv.parentNode.removeChild(offDiv);
    _hideRenderProgress();
    toast('Error render: '+(e.message||e),'er');
    done(null);
  });
}

function _cloneLayersTo4KMap(targetMap){
  if(_pdfOpts.showLayers&&_layerData){
    _layerData.filter(function(l){return l.aktif&&l.lat&&l.lng;}).forEach(function(layer){
      var sd=getSimbolDef(layer.simbol), warna=layer.warna||sd.warna||'#1e6fd9';
      L.marker([layer.lat,layer.lng],{icon:_makeLeafletIcon(warna,sd.ico)}).addTo(targetMap);
    });
  }
  if(_pdfOpts.showDraw&&_drawnItems){
    _drawnItems.eachLayer(function(layer){
      try{
        var gj=layer.toGeoJSON(),lid=L.Util.stamp(layer),meta=_drawnMeta[lid]||{},w=meta.warna||'#1e6fd9';
        var isLine=(meta.tipe||'polyline')==='polyline';
        var opts=isLine?{color:w,weight:3.5,opacity:.95,dashArray:'8 5',lineCap:'round'}:{color:w,weight:2,fillColor:w,fillOpacity:.22};
        L.geoJSON(gj,{style:opts}).addTo(targetMap);
      }catch(e){}
    });
  }
  if(_pdfOpts.showFoto&&_dfRawData){
    var pts=_dfGroupFilter===null?_dfRawData:_dfRawData.filter(function(pt){return _resolveKelompok(pt)===_dfGroupFilter;});
    pts.forEach(function(pt){
      if(!pt.lat||!pt.lng) return;
      var grp=JALAN_GROUPS.filter(function(x){return x.id===_resolveKelompok(pt);})[0];
      var color=grp?grp.warna:'#1e6fd9';
      L.circleMarker([pt.lat,pt.lng],{radius:5,color:'#fff',weight:1.5,fillColor:color,fillOpacity:1}).addTo(targetMap);
    });
  }
}

function _getTileConf(){ return TILE_LAYERS[_pdfOpts.mapMode]||TILE_LAYERS.osm; }

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
async function _buildPdfDocument(mapCanvas,tglStr,jamStr,tileConf,done){
  var dims=_getPaperDims(), pgW=dims.w, pgH=dims.h;
  var paper=PAPER_SIZES[_pdfOpts.paperSize]||PAPER_SIZES.a4;
  var isLS=_pdfOpts.orientation==='landscape';
  var JsPDF=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
  if(!JsPDF){ toast('jsPDF tidak tersedia.','er'); done(null); return; }

  var doc=new JsPDF({orientation:isLS?'landscape':'portrait',unit:'mm',format:[dims.w,dims.h]});

  var HDR_H=20, FTR_H=10, PAD=5;
  var LEG_W = _pdfLegendRows.length > 0 ? 52 : 0;  // sidebar lebih sempit
  var LEG_GAP = LEG_W > 0 ? 3 : 0;
  var COMP_H  = 36; // tinggi area kompas

  var cTop = HDR_H + PAD;
  var cBot = pgH - FTR_H - PAD;
  var cH   = cBot - cTop;  // tinggi area konten penuh

  // Lebar area peta = sisa setelah legenda
  var mapAreaW = pgW - PAD * 2 - LEG_W - LEG_GAP;

  // Aspect ratio canvas → hitung dimensi peta
  var imgW = mapCanvas.width, imgH = mapCanvas.height;
  var ratio = imgH / imgW;

  // Peta mengisi penuh tinggi konten, lebar menyesuaikan
  var dispH = cH;
  var dispW = cH / ratio;
  // Jika terlalu lebar, sesuaikan
  if (dispW > mapAreaW) { dispW = mapAreaW; dispH = mapAreaW * ratio; }

  // Posisi peta: kiri rata PAD, vertikal center
  var mapX = PAD;
  var mapY = cTop + (cH - dispH) / 2;

  // Background
  doc.setFillColor(230,237,248); doc.rect(0,0,pgW,pgH,'F');
  doc.setFillColor(246,249,254); doc.roundedRect(3,3,pgW-6,pgH-6,2,2,'F');

  // Pastikan ikon sudah ter-cache (sync)
  _precacheSimbolIcons();

  // Logo (fetch dengan cache)
  if(!_logoCacheB64){
    try{ _logoCacheB64=await _imgToBase64('assets/icon-full.png'); }
    catch(e){ console.warn('Logo gagal:',e); }
  }

  // Header
  doc.setFillColor(8,18,38);    doc.rect(0,0,pgW,HDR_H,'F');
  doc.setFillColor(12,26,56);   doc.rect(0,0,pgW*0.58,HDR_H,'F');
  doc.setFillColor(28,111,217); doc.rect(0,HDR_H-1.2,pgW,1.2,'F');

  // Logo atau badge
  if(_logoCacheB64){
    doc.addImage(_logoCacheB64,'PNG',PAD,2,14,14);
  } else {
    doc.setFillColor(28,111,217); doc.roundedRect(PAD,3.5,13,13,1.5,1.5,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(5.5);
    doc.text('PETA',PAD+6.5,8.5,{align:'center'});
    doc.text('PWK', PAD+6.5,12.5,{align:'center'});
  }

  doc.setFont('helvetica','bold'); doc.setFontSize(isLS?10.5:9); doc.setTextColor(238,246,255);
  doc.text('LAPORAN PEMETAAN KAWASAN PEDESTRIAN',PAD+16,9);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(155,193,235);
  doc.text('Satlinmas — '+tglStr+' pukul '+jamStr,PAD+16,14.5);
  doc.setFontSize(6); doc.setTextColor(115,155,210);
  doc.text('Ponorogo, Jawa Timur',pgW-PAD,7.5,{align:'right'});
  doc.text(paper.label+' '+(isLS?'Landscape':'Portrait'),pgW-PAD,11.5,{align:'right'});
  doc.text('Dicetak: '+tglStr,pgW-PAD,15.5,{align:'right'});

  // Shadow & border peta
  doc.setFillColor(195,210,228); doc.roundedRect(mapX+.8,mapY+.8,dispW+.4,dispH+.4,2,2,'F');
  doc.setDrawColor(160,188,218); doc.setLineWidth(.4);
  doc.roundedRect(mapX,mapY,dispW,dispH,1.5,1.5,'S');

  // Gambar peta
  doc.addImage(mapCanvas.toDataURL('image/png',1),'png',mapX,mapY,dispW,dispH,'','FAST');

    // Sidebar legenda — tinggi mengikuti tinggi peta aktual (bukan cH)
  if(LEG_W>0){
    var sbX = mapX + dispW + LEG_GAP;
    var sbY = mapY;
    var sbH = dispH; // sama tinggi dengan peta

    doc.setFillColor(240,245,252); doc.setDrawColor(182,204,226); doc.setLineWidth(.35);
    doc.roundedRect(sbX,sbY,LEG_W,sbH,2,2,'FD');
    doc.setFillColor(18,48,100); doc.roundedRect(sbX+2,sbY+2,LEG_W-4,7,1,1,'F');
    doc.setTextColor(208,228,255); doc.setFont('helvetica','bold'); doc.setFontSize(5.5);
    doc.text('KETERANGAN PETA',sbX+LEG_W/2,sbY+6.5,{align:'center'});
    doc.setDrawColor(145,172,208); doc.setLineWidth(.25);
    doc.line(sbX+3,sbY+10.5,sbX+LEG_W-3,sbY+10.5);

    // Area untuk legenda (di atas kompas)
    var legStartY = sbY + 12;
    var legEndY   = sbY + sbH - COMP_H - 4;
    var legH      = legEndY - legStartY;
    var rowCount  = _pdfLegendRows.length;

    // Tinggi baris adaptif: min 7mm, max 16mm
    var rowH    = rowCount > 0 ? Math.min(16, Math.max(7, legH / rowCount)) : 10;
    // Ikon proporsional 32:42, max lebar LEG_W*0.28
    var icoH    = Math.min(rowH * 0.9, rowH - 1);
    var icoW    = Math.min(icoH * (32/42), LEG_W * 0.28);
    var txtX    = sbX + icoW + 5;
    var txtMaxW = LEG_W - icoW - 7;
    var fSize   = Math.max(5, Math.min(7, rowH * 0.65));

    var curY = legStartY;
    _pdfLegendRows.forEach(function(row){
      if(curY + rowH > legEndY + 1) return; // skip jika tidak muat
      var c = hexToRgb(row.warna || '#607d8b');
      var icoY = curY + (rowH - icoH) / 2; // vertikal center ikon dalam baris
      _drawLegendSymbolPdfSized(doc, row, sbX+2, icoY, c, icoW, icoH);
      doc.setTextColor(36,56,86); doc.setFont('helvetica','normal'); doc.setFontSize(fSize);
      var lines = doc.splitTextToSize((row.label||'').substring(0,34), txtMaxW);
      // Batas max 2 baris label
      if(lines.length > 2) lines = lines.slice(0,2);
      var txtY = curY + rowH/2;
      doc.text(lines, txtX, txtY, {baseline:'middle', lineHeightFactor:1.2});
      // Garis pemisah tipis antar baris
      if(rowH > 8){
        doc.setDrawColor(220,230,245); doc.setLineWidth(.15);
        doc.line(sbX+3, curY+rowH-.5, sbX+LEG_W-3, curY+rowH-.5);
      }
      curY += rowH;
    });

    // Kompas
    var cCX=sbX+LEG_W/2, cCY=sbY+sbH-20, cR=10;
    doc.setFillColor(225,233,250); doc.setDrawColor(158,182,212); doc.setLineWidth(.3);
    doc.circle(cCX,cCY,cR,'FD');
    doc.setFillColor(215,225,245); doc.circle(cCX,cCY,cR-2,'F');
    doc.setDrawColor(140,165,198); doc.setLineWidth(.3);
    doc.line(cCX,cCY-cR+.4,cCX,cCY-cR+2.2);
    doc.line(cCX,cCY+cR-2.2,cCX,cCY+cR-.4);
    doc.line(cCX-cR+.4,cCY,cCX-cR+2.2,cCY);
    doc.line(cCX+cR-2.2,cCY,cCX+cR-.4,cCY);
    doc.setFillColor(192,57,43);
    doc.triangle(cCX,cCY-cR+2,cCX-2.8,cCY,cCX+2.8,cCY,'F');
    doc.setFillColor(130,150,175);
    doc.triangle(cCX,cCY+cR-2,cCX-2.8,cCY,cCX+2.8,cCY,'F');
    doc.setFillColor(248,252,255); doc.circle(cCX,cCY,2.4,'F');
    doc.setFillColor(68,88,120);   doc.circle(cCX,cCY,.9,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.2); doc.setTextColor(192,57,43);
    doc.text('U',cCX,cCY-cR-1.8,{align:'center'});
    doc.setTextColor(88,110,145); doc.setFontSize(5);
    doc.text('S',cCX,          cCY+cR+3.8,{align:'center'});
    doc.text('B',cCX-cR-3.5,  cCY+1.6,   {align:'center'});
    doc.text('T',cCX+cR+3.5,  cCY+1.6,   {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(4.8); doc.setTextColor(105,128,160);
    doc.text('Utara Magnetik',cCX,sbY+sbH-3.5,{align:'center'});
    doc.setFontSize(4.5); doc.setTextColor(85,108,145);
    doc.text('Skala '+_getScaleLabel(_pdfMap?_pdfMap.getZoom():13),cCX,sbY+sbH-.8,{align:'center'});
  }

  // Footer
  var ftY=pgH-FTR_H;
  doc.setFillColor(8,18,38); doc.rect(0,ftY,pgW,FTR_H,'F');
  doc.setFillColor(28,111,217); doc.rect(0,ftY,pgW,1,'F');
  doc.setTextColor(98,138,202); doc.setFont('helvetica','bold'); doc.setFontSize(6);
  doc.text('SATLINMAS PONOROGO — PETA PEDESTRIAN',PAD,ftY+4.5);
  doc.setFont('helvetica','normal'); doc.setFontSize(5); doc.setTextColor(72,108,162);
  doc.text('SI-PEDAS · Sistem Informasi Pedestrian Satlinmas',PAD,ftY+8);
  doc.setTextColor(88,128,192); doc.setFontSize(5.8);
  doc.text('Sumber: '+(tileConf.label||tileConf.attr||'OSM'),pgW/2,ftY+4.5,{align:'center'});
  doc.setFontSize(4.8); doc.setTextColor(62,92,152);
  doc.text('Koordinat: -7.87148, 111.47032',pgW/2,ftY+8,{align:'center'});
  doc.setTextColor(88,128,192); doc.setFontSize(5.8);
  doc.text('Dicetak: '+tglStr+' '+jamStr,pgW-PAD,ftY+4.5,{align:'right'});
  doc.setFontSize(4.5); doc.setTextColor(52,82,142);
  doc.text('Halaman 1 dari 1',pgW-PAD,ftY+8,{align:'right'});

  done(doc);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF — GAMBAR SIMBOL LEGENDA (ukuran dinamis)
// ══════════════════════════════════════════════════════════════════════════════
// Versi berukuran tetap (dipakai internal)
function _drawLegendSymbolPdf(doc, row, x, y, c) {
  _drawLegendSymbolPdfSized(doc, row, x, y, c, 10, 13);
}

// Versi ukuran dinamis — icoW & icoH dalam mm
function _drawLegendSymbolPdfSized(doc, row, x, y, c, icoW, icoH) {
  var t = row.tipe || 'marker';
  var cx = x + icoW / 2;   // center X simbol
  var cy = y + icoH / 2;   // center Y simbol

  if (t === 'line') {
    var ly = cy, lx1 = x, lx2 = x + icoW;
    doc.setDrawColor(c.r,c.g,c.b); doc.setLineWidth(Math.max(.8, icoH * .1));
    var dash = icoW / 5, gap = icoW / 8, px = lx1;
    while(px < lx2){ var e=Math.min(px+dash,lx2); doc.line(px,ly,e,ly); px+=dash+gap; }
    doc.setFillColor(c.r,c.g,c.b);
    doc.circle(lx1, ly, Math.max(.4, icoH*.08), 'F');
    doc.circle(lx2, ly, Math.max(.4, icoH*.08), 'F');
    doc.setLineWidth(.25);
    return;
  }

  if (t === 'poly') {
    var aw=icoW*.9, ah=icoH*.65, ax=x+icoW*.05, ay=cy-ah/2;
    doc.setFillColor(c.r,c.g,c.b);
    doc.setGState(doc.GState({opacity:.22}));
    doc.roundedRect(ax,ay,aw,ah,1,1,'F');
    doc.setGState(doc.GState({opacity:1}));
    doc.setDrawColor(c.r,c.g,c.b); doc.setLineWidth(Math.max(.6, icoH*.08));
    doc.roundedRect(ax,ay,aw,ah,1,1,'S');
    doc.setLineWidth(.25);
    return;
  }

  if (t === 'dot') {
    var r = Math.min(icoW, icoH) * .38;
    doc.setFillColor(255,255,255); doc.circle(cx, cy, r+.8, 'F');
    doc.setFillColor(c.r,c.g,c.b); doc.circle(cx, cy, r, 'F');
    return;
  }

  // marker: PNG dari cache
  var png = _getSimbolPng(row.simbol || 'fa-map-pin', row.warna || '#607d8b');
  if (png) {
    try { doc.addImage(png, 'PNG', x, y, icoW, icoH); return; } catch(e) {}
  }
  // fallback pin manual
  var hr = icoW * .38;
  doc.setFillColor(c.r,c.g,c.b); doc.circle(cx, y+hr, hr, 'F');
  doc.triangle(cx-hr+.5, y+hr*1.4, cx+hr-.5, y+hr*1.4, cx, y+icoH-.5, 'F');
  doc.setFillColor(255,255,255); doc.circle(cx, y+hr, hr*.65, 'F');
  doc.setFillColor(c.r,c.g,c.b); doc.circle(cx, y+hr, hr*.28, 'F');
}

function _getScaleLabel(zoom){
  var scales={10:'1:300.000',11:'1:150.000',12:'1:75.000',13:'1:38.000',14:'1:19.000',15:'1:9.500',16:'1:4.800',17:'1:2.400',18:'1:1.200',19:'1:600'};
  return scales[Math.min(19,Math.max(10,zoom||13))]||'1:50.000';
}

// ══════════════════════════════════════════════════════════════════════════════
//  PICK KOORDINAT
// ══════════════════════════════════════════════════════════════════════════════
function _cancelPickCoord(){
  _pickCoordMode=false;
  var md=G('lf-map-div'); if(md) md.classList.remove('lf-pick-cursor');
  var b=G('lf-pick-banner'); if(b&&b.parentNode) b.parentNode.removeChild(b);
  if(_lfMap){ _lfMap.off('click'); _lfMap.on('click',function(){ if(_dfStreetPanelOpen) _closeStreetPanel(); }); }
}

function _setPickedCoord(lat,lng){
  var li=G('lf-lat'),lo=G('lf-lng');
  if(li){ li.value=lat.toFixed(6); li.dispatchEvent(new Event('input')); }
  if(lo){ lo.value=lng.toFixed(6); lo.dispatchEvent(new Event('input')); }
  if(_pickTempMarker&&_lfMap){ try{_lfMap.removeLayer(_pickTempMarker);}catch(e){} }
  _pickTempMarker=L.marker([lat,lng],{icon:L.divIcon({html:'<div style="width:18px;height:18px;border-radius:50%;background:#0d9268;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.4)"></div>',className:'',iconSize:[18,18],iconAnchor:[9,9]})})
    .addTo(_lfMap).bindPopup('<div class="lf-popup-title"><i class="fas fa-crosshairs" style="color:#0d9268"></i> Koordinat Dipilih</div><div class="lf-popup-row"><span style="font-family:var(--mono);font-size:.63rem">'+lat.toFixed(6)+', '+lng.toFixed(6)+'</span></div>',{maxWidth:200}).openPopup();
  toast('Koordinat: '+lat.toFixed(5)+', '+lng.toFixed(5),'ok');
  setTimeout(function(){ if(_pickTempMarker&&_lfMap){ try{_lfMap.removeLayer(_pickTempMarker);}catch(e){} _pickTempMarker=null; } },7000);
}

function openLayerModal_pickCoord(){
  var modal=G('mlayer'); if(modal) modal.classList.remove('on');
  toast('Klik lokasi di peta — modal terbuka kembali otomatis.','inf');
  _pickCoordMode=true;
  var md=G('lf-map-div'); if(md) md.classList.add('lf-pick-cursor');
  var lw=G('leaflet-wrap');
  if(lw&&!G('lf-pick-banner')){
    var b=document.createElement('div'); b.id='lf-pick-banner'; b.className='lf-pick-banner';
    b.innerHTML='<i class="fas fa-crosshairs"></i> Klik lokasi di peta<button class="lf-pick-cancel" onclick="_cancelPickCoordModal()">Batal</button>';
    lw.appendChild(b);
  }
  if(_lfMap){
    _lfMap.once('click',function(e){
      if(!_pickCoordMode) return;
      _cancelPickCoordModal(); _setPickedCoord(e.latlng.lat,e.latlng.lng);
      setTimeout(function(){ if(G('mlayer')) G('mlayer').classList.add('on'); },400);
    });
  }
}

function _cancelPickCoordModal(){
  _pickCoordMode=false;
  var md=G('lf-map-div'); if(md) md.classList.remove('lf-pick-cursor');
  var b=G('lf-pick-banner'); if(b&&b.parentNode) b.parentNode.removeChild(b);
  if(_lfMap){ _lfMap.off('click'); _lfMap.on('click',function(){ if(_dfStreetPanelOpen) _closeStreetPanel(); }); }
  if(G('mlayer')) G('mlayer').classList.add('on');
}

function _onKeyEsc(e){
  if(e.key!=='Escape') return;
  if(_pickCoordMode)                                                            { _cancelPickCoord(); return; }
  if(G('img-lb-ov')&&G('img-lb-ov').classList.contains('show'))                { closeLb(); return; }
  if(_lyrPhotoOpen)                                                             { closeLayerPhotoPanel(); return; }
  if(_pdfModalOpen)                                                             { closePdfModal(); return; }
  if(_dfStreetPanelOpen)                                                        { _closeStreetPanel(); return; }
  if(G('lf-meta-overlay')&&G('lf-meta-overlay').classList.contains('show'))    { cancelDrawMeta(); return; }
  if(_drawPanelOpen)                                                            { closeDrawPanel(); return; }
  if(_activeDrawMode)                                                           { _cancelDraw(); return; }
  if(_petaFullscreen)                                                           { togglePetaFullscreen(); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAP CONTROLS
// ══════════════════════════════════════════════════════════════════════════════
function onPetaFrameLoad(){
  var sh=G('peta-shimmer'),fr=G('peta-frame');
  if(sh) sh.classList.add('hidden');
  if(fr) fr.style.opacity='1';
}

function togglePetaFullscreen(){
  _petaFullscreen=!_petaFullscreen;
  var wrap=G('peta-main-wrap'),ico=G('btn-fs-ico'),lbl=G('btn-fs-lbl');
  if(_petaFullscreen){
    wrap.classList.add('peta-fs-active');
    if(ico) ico.className='fas fa-compress';
    if(lbl) lbl.textContent='Keluar Penuh';
    document.body.style.overflow='hidden';
  } else {
    wrap.classList.remove('peta-fs-active');
    if(ico) ico.className='fas fa-expand';
    if(lbl) lbl.textContent='Layar Penuh';
    document.body.style.overflow='';
  }
  if(_lfMap) setTimeout(function(){ _lfMap.invalidateSize({animate:false}); },350);
}

function reloadPetaFrame(){
  var fr=G('peta-frame'),sh=G('peta-shimmer');
  if(!fr){ toast('Frame tidak ditemukan.','er'); return; }
  if(sh) sh.classList.remove('hidden');
  fr.style.opacity='0'; fr.src='';
  setTimeout(function(){fr.src=PETA_EMBED_URL;},100);
}

function switchPetaMode(mode){
  if(_petaMode===mode) return;
  _petaMode=mode;
  var btnMM=G('btn-mymaps'),btnLF=G('btn-leaflet');
  var wMM=G('mymaps-wrap'),wLF=G('leaflet-wrap');
  var bEL=G('btn-edit-layer'),bPR=G('btn-print-pdf'),bOM=G('btn-open-mymaps');
  if(mode==='mymaps'){
    if(btnMM) btnMM.classList.add('on');    if(btnLF) btnLF.classList.remove('on');
    if(wLF)  wLF.style.display='none';     if(wMM) wMM.style.display='';
    if(bEL)  bEL.style.display='none';     if(bPR) bPR.style.display='none';
    if(bOM)  bOM.style.display='';
    closeDrawPanel();
  } else {
    if(btnLF) btnLF.classList.add('on');    if(btnMM) btnMM.classList.remove('on');
    if(wMM)  wMM.style.display='none';     if(wLF) wLF.style.display='';
    if(bEL)  bEL.style.display='';         if(bPR) bPR.style.display='';
    if(bOM)  bOM.style.display='none';
    if(!_lfMap) _initLeaflet();
    else setTimeout(function(){ if(_lfMap) _lfMap.invalidateSize({animate:false}); },80);
  }
}

function reloadPetaActive(){ if(_petaMode==='mymaps') reloadPetaFrame(); else refreshLeaflet(); }
function _lfShowLoad(m){ var el=G('lf-loader'),sp=el&&el.querySelector('span'); if(sp) sp.textContent=m||'Memuat...'; if(el) el.style.display='flex'; }
function _lfHideLoad() { var el=G('lf-loader'); if(el) el.style.display='none'; }

function toggleDrawPanel(){
  _drawPanelOpen=!_drawPanelOpen;
  var p=G('lf-draw-panel'),b=G('btn-draw-toggle');
  if(_drawPanelOpen){ if(p){p.classList.remove('hidden');p.classList.add('visible');}if(b) b.classList.add('active'); }
  else closeDrawPanel();
}

function closeDrawPanel(){
  _drawPanelOpen=false;
  var p=G('lf-draw-panel'),b=G('btn-draw-toggle');
  if(p){p.classList.remove('visible');p.classList.add('hidden');}
  if(b) b.classList.remove('active');
}

// ══════════════════════════════════════════════════════════════════════════════
//  LEAFLET INIT
// ══════════════════════════════════════════════════════════════════════════════
function _ensureLeafletLoaded(cb){
  if(window.L&&window.L.Draw){cb();return;}
  function lC(h,i){if(document.getElementById(i))return;var l=document.createElement('link');l.id=i;l.rel='stylesheet';l.href=h;document.head.appendChild(l);}
  function lS(s,fn){var e=document.createElement('script');e.src=s;e.onload=fn;document.head.appendChild(e);}
  lC('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css','lf-css');
  lC('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css','lf-draw-css');
  if(!window.L) lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',function(){lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',cb);});
  else lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',cb);
}

function _initLeaflet(){
  _ensureLeafletLoaded(function(){
    var md=G('lf-map-div'); if(!md) return;
    if(_lfMap){
      if(!document.body.contains(_lfMap.getContainer())){try{_lfMap.off();_lfMap.remove();}catch(e){}_lfMap=null;}
      else{setTimeout(function(){if(_lfMap) _lfMap.invalidateSize({animate:false});},80);refreshLeaflet();return;}
    }
    _lfMap=L.map('lf-map-div',{center:PETA_CENTER,zoom:PETA_ZOOM,zoomControl:false,attributionControl:true});

    var osmL=L.tileLayer(TILE_LAYERS.osm.url,       {attribution:TILE_LAYERS.osm.attr,       maxZoom:19,crossOrigin:true});
    var satL=L.tileLayer(TILE_LAYERS.satellite.url, {attribution:TILE_LAYERS.satellite.attr, maxZoom:19,crossOrigin:true});
    var hybL=L.tileLayer(TILE_LAYERS.hybrid.url,    {attribution:TILE_LAYERS.hybrid.attr,    maxZoom:20,crossOrigin:true});
    var gsL =L.tileLayer(TILE_LAYERS.google_sat.url,{attribution:TILE_LAYERS.google_sat.attr,maxZoom:20,crossOrigin:true});
    var ctL =L.tileLayer(TILE_LAYERS.carto.url,     {attribution:TILE_LAYERS.carto.attr,     maxZoom:19,crossOrigin:true});
    var toL =L.tileLayer(TILE_LAYERS.topo.url,      {attribution:TILE_LAYERS.topo.attr,      maxZoom:17,crossOrigin:true});
    osmL.addTo(_lfMap); _currentBaseLayer=osmL;

    L.control.layers({
      '<i class="fas fa-map" style="color:#1e6fd9"></i>&nbsp;OSM':osmL,
      '<i class="fas fa-satellite" style="color:#0d9268"></i>&nbsp;Satelit':satL,
      '<i class="fas fa-globe" style="color:#ea580c"></i>&nbsp;G.Sat':gsL,
      '<i class="fas fa-road" style="color:#16a34a"></i>&nbsp;Hybrid':hybL,
      '<i class="fas fa-map-location" style="color:#7c3aed"></i>&nbsp;CartoDB':ctL,
      '<i class="fas fa-mountain" style="color:#b45309"></i>&nbsp;Topo':toL
    },{},{collapsed:true,position:'topright'}).addTo(_lfMap);

    _lfMap.on('baselayerchange',function(e){_currentBaseLayer=e.layer;});
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(_lfMap);
    _addNavCtrl();

    _drawnItems=new L.FeatureGroup().addTo(_lfMap);
    _drawControl=new L.Control.Draw({
      position:'topright',
      draw:{
        polyline:{shapeOptions:{color:'#1e6fd9',weight:3,opacity:.9,dashArray:'6 4',fillOpacity:0}},
        polygon:{allowIntersection:false,showArea:false,shapeOptions:{color:'#7c3aed',weight:2.5,opacity:1,fillColor:'#7c3aed',fillOpacity:.12}},
        rectangle:false,circle:false,marker:false,circlemarker:false
      },
      edit:{featureGroup:_drawnItems,remove:true}
    });
    _drawControl.addTo(_lfMap);

    _lfMap.on('mousemove',function(){
      if(!_activeDrawMode) return;
      document.querySelectorAll('.leaflet-overlay-pane svg path').forEach(function(p){
        var f=p.getAttribute('fill');
        if(f==='#000000'||f==='black'||f==='#000'||(!f&&p.style.fill==='')){
          p.setAttribute('fill',_activeDrawMode==='polygon'?'#7c3aed':'none');
          p.setAttribute('fill-opacity','0.12');
        }
      });
    });

    setTimeout(function(){var dc=document.querySelector('.leaflet-draw');if(dc) dc.style.display='none';},200);

    _lfMap.on(L.Draw.Event.CREATED,function(e){
      _showMetaForm(e.layer,_activeDrawMode||(e.layerType==='polyline'?'polyline':'polygon'));
      _activeDrawMode=null;
    });
    _lfMap.on(L.Draw.Event.DRAWSTOP,function(){_setDrawMode(null);});
    _lfMap.on('click',function(){if(_dfStreetPanelOpen) _closeStreetPanel();});

    _lfLayerGroupDF=L.layerGroup();
    _addDefaultMarker();
    refreshLeaflet();
    loadDrawings();
  });
}

function _addNavCtrl(){
  if(!window.L||!_lfMap) return;
  if(!G('lf-nav-style')){
    var st=document.createElement('style'); st.id='lf-nav-style';
    st.textContent=[
      '.lf-nav-wrap{position:absolute;top:10px;left:10px;z-index:900;display:flex;flex-direction:column;align-items:center;gap:0}',
      '.lf-nav-toggle{width:30px;height:30px;border-radius:6px;background:rgba(15,23,42,.9);color:#fff;border:1.5px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:.8rem;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,.32);transition:background .14s;flex-shrink:0}',
      '.lf-nav-toggle:hover{background:rgba(30,111,217,.85)}',
      '.lf-nav-toggle.open{background:rgba(30,111,217,.9);border-color:rgba(100,170,255,.4)}',
      '.lf-nav-panel{display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;max-height:0;opacity:0;transition:max-height .22s ease,opacity .18s ease;margin-top:3px}',
      '.lf-nav-panel.open{max-height:200px;opacity:1}',
      '.lf-nav-btn{width:28px;height:28px;border-radius:5px;background:rgba(10,20,42,.88);color:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:.72rem;cursor:pointer;backdrop-filter:blur(6px);transition:background .12s,color .12s;flex-shrink:0}',
      '.lf-nav-btn:hover{background:rgba(30,111,217,.75);color:#fff}',
      '.lf-nav-row{display:flex;gap:2px}',
      '.lf-nav-sep{height:1px;width:28px;background:rgba(255,255,255,.1);margin:1px 0}'
    ].join('');
    document.head.appendChild(st);
  }
  var mapContainer=_lfMap.getContainer();
  var wrap=document.createElement('div'); wrap.className='lf-nav-wrap'; wrap.id='lf-nav-wrap';
  wrap.innerHTML=''
    +'<button class="lf-nav-toggle" id="lf-nav-toggle" title="Navigasi" onclick="_toggleNavPanel()"><i class="fas fa-compass"></i></button>'
    +'<div class="lf-nav-panel" id="lf-nav-panel">'
      +'<button class="lf-nav-btn" title="Zoom In"  onclick="if(_lfMap)_lfMap.zoomIn()"><i class="fas fa-plus"></i></button>'
      +'<button class="lf-nav-btn" title="Zoom Out" onclick="if(_lfMap)_lfMap.zoomOut()"><i class="fas fa-minus"></i></button>'
      +'<div class="lf-nav-sep"></div>'
      +'<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([0,-80])"><i class="fas fa-chevron-up"></i></button>'
      +'<div class="lf-nav-row">'
        +'<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([-80,0])"><i class="fas fa-chevron-left"></i></button>'
        +'<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([80,0])"><i class="fas fa-chevron-right"></i></button>'
      +'</div>'
      +'<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([0,80])"><i class="fas fa-chevron-down"></i></button>'
      +'<div class="lf-nav-sep"></div>'
      +'<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.flyTo(PETA_CENTER,PETA_ZOOM,{animate:true,duration:1.2})" style="color:#f59e0b"><i class="fas fa-crosshairs"></i></button>'
    +'</div>';
  mapContainer.appendChild(wrap);
  L.DomEvent.disableClickPropagation(wrap);
  L.DomEvent.disableScrollPropagation(wrap);
}

function _toggleNavPanel(){
  _navPanelOpen=!_navPanelOpen;
  var panel=G('lf-nav-panel'),toggle=G('lf-nav-toggle');
  if(panel)  panel.classList.toggle('open',_navPanelOpen);
  if(toggle) toggle.classList.toggle('open',_navPanelOpen);
}

function startDraw(type){
  if(!_lfMap||!window.L||!L.Draw){toast('Peta belum siap.','er');return;}
  if(_activeDrawMode===type){_cancelDraw();return;}
  _cancelDraw(); _activeDrawMode=type;
  if(type==='polyline'){
    _activeDrawHandler=new L.Draw.Polyline(_lfMap,{shapeOptions:{color:'#1e6fd9',weight:3,opacity:.9,dashArray:'6 4',fillOpacity:0}});
    toast('Mode GARIS — klik titik, dobel klik selesai','inf');
  } else {
    _activeDrawHandler=new L.Draw.Polygon(_lfMap,{allowIntersection:false,showArea:false,shapeOptions:{color:'#7c3aed',weight:2.5,opacity:1,fillColor:'#7c3aed',fillOpacity:.12}});
    toast('Mode AREA — klik titik, dobel klik selesai','inf');
  }
  if(_activeDrawHandler) _activeDrawHandler.enable();
  _setDrawMode(type); closeDrawPanel();
}

function _cancelDraw(){
  if(_activeDrawHandler){_activeDrawHandler.disable();_activeDrawHandler=null;}
  _activeDrawMode=null; _setDrawMode(null);
}

function _setDrawMode(m){
  var bl=G('btn-draw-line'),ba=G('btn-draw-area');
  if(bl) bl.classList.toggle('active',m==='polyline');
  if(ba) ba.classList.toggle('active',m==='polygon');
}

function clearDrawings(){
  if(!_drawnItems) return;
  var c=Object.keys(_drawnItems._layers||{}).length;
  if(!c){toast('Tidak ada gambar.','inf');return;}
  _drawnItems.clearLayers(); _drawnMeta={}; _cancelDraw(); closeDrawPanel();
  toast(c+' gambar dihapus.','ok');
}

function _buildMetaSwatches(){
  var g=G('lf-meta-warna-grid'); if(!g) return;
  g.innerHTML=DRAW_WARNA_PRESET.map(function(c){
    return '<div class="lf-meta-swatch'+(c.hex===_metaWarna?' on':'')+'" style="background:'+c.hex+'" data-hex="'+c.hex+'" onclick="metaWarnaPilih(\''+c.hex+'\')"></div>';
  }).join('');
}

function metaWarnaPilih(h){
  _metaWarna=h;
  document.querySelectorAll('.lf-meta-swatch').forEach(function(s){s.classList.toggle('on',s.dataset.hex===h);});
  var i=G('lf-meta-color-inp'); if(i) i.value=h;
  var l=G('lf-meta-color-lbl'); if(l) l.textContent=h;
  _applyPC(h);
}

function metaWarnaCustom(h){
  _metaWarna=h;
  document.querySelectorAll('.lf-meta-swatch').forEach(function(s){s.classList.remove('on');});
  var l=G('lf-meta-color-lbl'); if(l) l.textContent=h;
  _applyPC(h);
}

function _applyPC(h){
  if(!_pendingLayer) return;
  try{if(_pendingLayer.setStyle) _pendingLayer.setStyle(_pendingLayerType==='polyline'?{color:h}:{color:h,fillColor:h});}catch(e){}
}

function _showMetaForm(layer,type){
  _pendingLayer=layer; _pendingLayerType=type;
  var dw=type==='polyline'?'#1e6fd9':'#7c3aed';
  _metaWarna=dw; _buildMetaSwatches();
  var inp=G('lf-meta-color-inp'); if(inp) inp.value=dw;
  var lbl=G('lf-meta-color-lbl'); if(lbl) lbl.textContent=dw;
  var n=G('lf-meta-nama'),k=G('lf-meta-ket');
  if(n) n.value=''; if(k) k.value='';
  var msr=_getMsr(layer,type);
  var me=G('lf-meta-msr'),mt=G('lf-meta-msr-text');
  if(me) me.style.display=msr?'':'none'; if(mt) mt.textContent=msr;
  var t=G('lf-meta-title');
  if(t) t.innerHTML='<i class="fas '+(type==='polyline'?'fa-pen-nib':'fa-vector-square')+'"></i> '+(type==='polyline'?'Detail Garis / Rute':'Detail Area / Zona');
  var el=G('lf-meta-overlay'); if(el) el.classList.add('show');
  setTimeout(function(){if(n) n.focus();},260);
}

function confirmDrawMeta(){
  if(!_pendingLayer) return;
  var nama=((G('lf-meta-nama')||{}).value||'').trim();
  if(!nama){var n=G('lf-meta-nama');if(n){n.focus();n.style.borderColor='#c0392b';}toast('Nama wajib diisi.','er');return;}
  var ket=((G('lf-meta-ket')||{}).value||'').trim();
  _applyPC(_metaWarna); _drawnItems.addLayer(_pendingLayer);
  var lid=L.Util.stamp(_pendingLayer), msr=_getMsr(_pendingLayer,_pendingLayerType);
  _drawnMeta[lid]={nama:nama,ket:ket,warna:_metaWarna,tipe:_pendingLayerType,measurement:msr};
  _bindDrawnPopup(_pendingLayer,nama,ket,_metaWarna,_pendingLayerType,msr);
  _bindMsrTooltip(_pendingLayer,_pendingLayerType);
  _hideMetaForm(); _setDrawMode(null);
  toast('Gambar "'+nama+'" ditambahkan.','ok');
  _pendingLayer=null; _pendingLayerType=null;
}

function cancelDrawMeta(){
  if(_pendingLayer&&_lfMap){try{_lfMap.removeLayer(_pendingLayer);}catch(e){}}
  _pendingLayer=null; _pendingLayerType=null;
  _hideMetaForm(); _setDrawMode(null);
  toast('Gambar dibatalkan.','inf');
}

function _hideMetaForm(){ var el=G('lf-meta-overlay'); if(el) el.classList.remove('show'); }

function _bindDrawnPopup(layer,nama,ket,warna,tipe,msr){
  var ico=tipe==='polyline'?'fa-pen-nib':'fa-vector-square';
  var label=tipe==='polyline'?'Garis / Rute':'Area / Zona';
  var html='<div class="lf-popup-title" style="display:flex;align-items:center;gap:5px">'
    +'<i class="fas '+ico+'" style="color:'+warna+'"></i>'
    +'<span style="font-weight:800;color:var(--text)">'+esc(nama)+'</span></div>'
    +'<div class="lf-popup-badge" style="background:'+warna+'18;color:'+warna+';border:1px solid '+warna+'30">'+label+'</div>'
    +(msr?'<div class="lf-popup-row" style="margin-top:4px"><span style="font-family:var(--mono);font-size:.7rem;font-weight:800;color:'+warna+'">'+msr+'</span></div>':'')
    +(ket?'<div class="lf-popup-row"><i class="fas fa-info-circle" style="color:var(--muted)"></i><span>'+esc(ket)+'</span></div>':'');
  if(layer.bindPopup) layer.bindPopup(html,{maxWidth:260,className:'lf-clean-popup'});
}

function _makeLeafletIcon(warna,faIco){
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><ellipse cx="16" cy="39" rx="5" ry="2.5" fill="rgba(0,0,0,.2)"/><path d="M16 0C9.37 0 4 5.37 4 12c0 9.5 12 28 12 28S28 21.5 28 12C28 5.37 22.63 0 16 0z" fill="'+warna+'"/><circle cx="16" cy="12" r="8" fill="rgba(255,255,255,.22)"/></svg>';
  return L.divIcon({html:'<div style="position:relative;width:32px;height:42px">'+svg+'<i class="fas '+faIco+'" style="position:absolute;top:6px;left:50%;transform:translateX(-50%);color:#fff;font-size:9px;pointer-events:none"></i></div>',className:'',iconSize:[32,42],iconAnchor:[16,42],popupAnchor:[0,-40]});
}

function _makeDFIcon(groupId){
  var g=groupId?JALAN_GROUPS.filter(function(x){return x.id===groupId;})[0]:null;
  var c=g?g.warna:'#1e6fd9';
  return L.divIcon({html:'<div class="df-dot" style="background:'+c+';box-shadow:0 2px 8px '+c+'55"></div>',className:'',iconSize:[13,13],iconAnchor:[6,6],popupAnchor:[0,-8]});
}

function _addDefaultMarker(){
  if(!_lfMap) return;
  L.marker(PETA_CENTER,{icon:_makeLeafletIcon('#1e6fd9','fa-road')}).addTo(_lfMap)
    .bindPopup('<div class="lf-popup-title"><i class="fas fa-road" style="color:#1e6fd9"></i> Pos Jaga Wilayah Pedestrian</div>'
      +'<div class="lf-popup-badge" style="background:rgba(30,111,217,.1);color:#1e6fd9">Titik Awal Patroli</div>'
      +'<div class="lf-popup-row"><i class="fas fa-map-pin" style="color:#1e6fd9"></i><span>Ponorogo, Jawa Timur</span></div>');
}

function refreshLeaflet(){
  if(!_lfMap){_initLeaflet();return;}
  _lfShowLoad('Memuat data peta...');

  var cachedL=window._gcGet('layerPeta');
  var cachedF=window._gcGet('fotoMarker');
  var lD=cachedL?cachedL.data||[]:null;
  var dD2=cachedF?cachedF.data||[]:null;

  if(lD&&dD2){
    _lfHideLoad();
    _layerData=lD; _dfRawData=dD2;
    _renderLeafletLayers(lD);
    if(_dfVisible&&_dfGroupFilter!==undefined){
      var f=_dfGroupFilter===null?dD2:dD2.filter(function(pt){return _resolveKelompok(pt)===_dfGroupFilter;});
      _renderLeafletDF(f);
      if(_lfLayerGroupDF&&_lfMap) _lfLayerGroupDF.addTo(_lfMap);
    }
    _updateLegendBar(lD);
    _precacheSimbolIcons();
    window._gcRefresh('layerPeta');
    window._gcRefresh('fotoMarker');
    return;
  }

  var dL=false,dD=false;
  lD=lD||[]; dD2=dD2||[];

  function check(){
    if(!dL||!dD) return;
    _lfHideLoad();
    _layerData=lD; _dfRawData=dD2;
    _renderLeafletLayers(lD);
    if(_dfVisible&&_dfGroupFilter!==undefined){
      var f=_dfGroupFilter===null?dD2:dD2.filter(function(pt){return _resolveKelompok(pt)===_dfGroupFilter;});
      _renderLeafletDF(f); if(_lfLayerGroupDF&&_lfMap) _lfLayerGroupDF.addTo(_lfMap);
    }
    _updateLegendBar(lD); _precacheSimbolIcons();
    toast('Peta diperbarui: '+lD.filter(function(l){return l.aktif;}).length+' layer aktif.','ok');
  }

  if(!window._gcGet('layerPeta')){
    apiGet('getLayerPeta').then(function(res){
      lD=res.data||[]; window._gcSet('layerPeta',res); dL=true; check();
    }).catch(function(e){ dL=true; toast('Gagal layer: '+e.message,'er'); check(); });
  } else { dL=true; check(); }

  if(!window._gcGet('fotoMarker')){
    apiGet('getDetailFotoMarkers').then(function(res){
      dD2=res.data||[]; window._gcSet('fotoMarker',res); dD=true; check();
    }).catch(function(){ dD=true; check(); });
  } else { dD=true; check(); }
}

function _renderLeafletLayers(data){
  _lfMarkersLP.forEach(function(m){_lfMap.removeLayer(m);}); _lfMarkersLP=[];
  data.forEach(function(layer){
    if(!layer.aktif||!layer.lat||!layer.lng) return;
    var sd=getSimbolDef(layer.simbol), warna=layer.warna||sd.warna;
    var lat=layer.lat, lng=layer.lng, nama=layer.nama;
    var fotoBtn='<div style="margin-top:8px;border-top:1px solid rgba(0,0,0,.07);padding-top:8px">'
      +'<button onclick="openLayerPhotoPanel('+lat+','+lng+',\''+esc(nama).replace(/'/g,"\\'")
      +'\',\''+warna+'\',\''+sd.ico+'\')" '
      +'style="display:flex;align-items:center;gap:5px;width:100%;padding:5px 8px;background:'+warna+'18;color:'+warna+';border:1px solid '+warna+'30;border-radius:6px;font-size:.64rem;font-weight:800;cursor:pointer;font-family:var(--font)">'
      +'<i class="fas fa-camera"></i> Foto &amp; Laporan Sekitar</button></div>';
    var popup='<div class="lf-popup-title"><i class="fas '+sd.ico+'" style="color:'+warna+'"></i> '+esc(nama)+'</div>'
      +'<div class="lf-popup-badge" style="background:'+warna+'22;color:'+warna+'">'+sd.label+'</div>'
      +(layer.ket?'<div class="lf-popup-row"><i class="fas fa-info-circle"></i><span>'+esc(layer.ket)+'</span></div>':'')
      +'<div class="lf-popup-row"><i class="fas fa-map-pin"></i><span>'+lat.toFixed(5)+', '+lng.toFixed(5)+'</span></div>'
      +fotoBtn;
    var m=L.marker([lat,lng],{icon:_makeLeafletIcon(warna,sd.ico)}).addTo(_lfMap).bindPopup(popup,{maxWidth:265});
    _lfMarkersLP.push(m);
  });
}

function _renderLeafletDF(data){
  if(_lfLayerGroupDF) _lfLayerGroupDF.clearLayers();
  else _lfLayerGroupDF=L.layerGroup();
  _lfMarkersDF=[];
  data.forEach(function(pt){
    if(!pt.lat||!pt.lng) return;
    var kelompok=_resolveKelompok(pt), icon=_makeDFIcon(kelompok);
    var thumb=pt.thumbUrl
      ?'<img src="'+esc(pt.thumbUrl)+'" style="width:100%;max-height:100px;object-fit:cover;border-radius:7px;margin:6px 0 4px;cursor:pointer" '
          +'onerror="this.style.display=\'none\';" '
          +'onclick="openLb(\''+esc(pt.thumbUrl)+'\','+(pt.linkDrive?'\''+esc(pt.linkDrive)+'\'':'null')+',\''+esc(pt.namaFile||'Foto')+'\')">'
      :'';
    var grp=JALAN_GROUPS.filter(function(g){return g.id===kelompok;})[0];
    var badge=grp?'<div class="lf-popup-badge" style="background:'+grp.warna+'18;color:'+grp.warna+'"><i class="fas '+grp.ico+'"></i> '+grp.label+'</div>':'';
    var btnDrv=pt.linkDrive?'<a href="'+esc(pt.linkDrive)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#0d9268;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none;margin-right:4px"><i class="fas fa-external-link-alt"></i> Drive</a>':'';
    var btnGmaps=pt.linkGmaps?'<a href="'+esc(pt.linkGmaps)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#1e6fd9;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none"><i class="fas fa-map-location-dot"></i> Maps</a>':'';
    var actions=(btnDrv||btnGmaps)?'<div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:4px">'+btnDrv+btnGmaps+'</div>':'';
    var popup='<div class="lf-popup-title"><i class="fas fa-camera" style="color:#1e6fd9"></i> '+esc(pt.namaFile||'Foto Lapangan')+'</div>'
      +badge+thumb
      +(pt.danru?'<div class="lf-popup-row"><i class="fas fa-shield-halved" style="color:#0d9268"></i><b>'+esc(pt.danru)+'</b></div>':'')
      +(pt.waktuExif?'<div class="lf-popup-row"><i class="fas fa-clock"></i>'+esc(pt.waktuExif)+'</div>':'')
      +'<div class="lf-popup-row"><i class="fas fa-crosshairs" style="color:#1e6fd9"></i><span style="font-family:var(--mono);font-size:.63rem">'+pt.lat.toFixed(6)+', '+pt.lng.toFixed(6)+'</span></div>'
      +(pt.ket?'<div class="lf-popup-row"><i class="fas fa-info-circle"></i><span>'+esc(pt.ket)+'</span></div>':'')
      +actions;
    var m=L.marker([pt.lat,pt.lng],{icon:icon}).bindPopup(popup,{maxWidth:260});
    _lfLayerGroupDF.addLayer(m); _lfMarkersDF.push(m);
  });
  if(_dfVisible&&_lfMap) _lfLayerGroupDF.addTo(_lfMap);
}

function _updateLegendBar(layerData){
  var bar=G('peta-legend-bar'); if(!bar) return;
  var counts={};
  layerData.filter(function(l){return l.aktif;}).forEach(function(l){counts[l.simbol]=(counts[l.simbol]||0)+1;});
  var items=SIMBOL_DEF.filter(function(s){return counts[s.id];}).map(function(s){
    return '<div class="peta-lf-leg-item"><i class="fas '+s.ico+'" style="color:'+s.warna+';font-size:.72rem"></i>'+s.label+' <strong style="font-family:var(--mono)">'+counts[s.id]+'</strong></div>';
  });
  if(_dfVisible&&_dfRawData&&_dfRawData.length){
    var gc={};
    _dfRawData.forEach(function(pt){var k=_resolveKelompok(pt);gc[k]=(gc[k]||0)+1;});
    var fi=JALAN_GROUPS.filter(function(g){return gc[g.id];}).map(function(g){
      var a=_dfGroupFilter===g.id;
      return '<div class="peta-lf-leg-item" style="cursor:pointer;'+(a?'background:'+g.warna+'18;border-radius:6px;padding:2px 4px':'')+'" onclick="selectDfGroup(\''+g.id+'\')">'
        +'<i class="fas '+g.ico+'" style="color:'+g.warna+';font-size:.72rem"></i>'+g.label.replace('Jl. ','')+' <strong style="font-family:var(--mono)">'+gc[g.id]+'</strong></div>';
    });
    if(fi.length){items.push('<div style="height:1px;background:var(--border);margin:3px 0"></div>');items=items.concat(fi);}
  }
  bar.innerHTML='<div class="peta-lf-legend"><div class="peta-lf-legend-title"><i class="fas fa-circle-info" style="color:var(--blue)"></i> Keterangan Layer Aktif</div>'
    +(items.length?items.join(''):'<span style="font-size:.62rem;color:var(--muted)">Belum ada layer aktif</span>')+'</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
//  SIMPAN & MUAT GAMBAR
// ══════════════════════════════════════════════════════════════════════════════
function _serializeDrawings(){
  var r=[]; if(!_drawnItems) return r;
  _drawnItems.eachLayer(function(layer){
    try{
      var gj=layer.toGeoJSON(),lid=L.Util.stamp(layer),meta=_drawnMeta[lid]||{};
      r.push({tipe:gj.geometry.type,warna:meta.warna||'#1e6fd9',nama:meta.nama||'',ket:meta.ket||'',measurement:meta.measurement||'',geojson:JSON.stringify(gj)});
    }catch(e){}
  });
  return r;
}

function saveDrawings(){
  if(!_drawnItems){toast('Tidak ada gambar.','inf');return;}
  var d=_serializeDrawings();
  if(!d.length){toast('Tidak ada gambar.','inf');return;}
  var btn=G('btn-draw-save');
  if(btn) btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';

  // ✅ GANTI
  apiPost('saveGambarPeta',{drawings:d}).then(function(res){
    if(btn) btn.innerHTML='<i class="fas fa-floppy-disk" style="color:#0d9268"></i> Simpan';
    if(res.success){
      _showSaveNote('✓ '+d.length+' disimpan!');
      toast(d.length+' gambar disimpan.','ok');
      closeDrawPanel();
    }else toast('Gagal.','er');
  });
}

function loadDrawings(){
  if(!_lfMap||!_drawnItems) return;

  // ✅ GANTI
  apiGet('getGambarPeta').then(function(res){
    if(!res.success||!res.data||!res.data.length) return;
    _drawnItems.clearLayers(); _drawnMeta={};
    res.data.forEach(function(d){
      try{
        var gj=JSON.parse(d.geojson),w=d.warna||'#1e6fd9',isLine=gj.geometry&&gj.geometry.type==='LineString';
        var opts=isLine
          ?{color:w,weight:3,opacity:.9,dashArray:'6 4'}
          :{color:w,weight:2,fillColor:w,fillOpacity:.18,opacity:.9};
        var lyr=L.geoJSON(gj,{style:opts});
        lyr.eachLayer(function(sub){
          _drawnItems.addLayer(sub);
          var lid=L.Util.stamp(sub),tipe=isLine?'polyline':'polygon';
          var msr=d.measurement||_getMsr(sub,tipe);
          _drawnMeta[lid]={nama:d.nama||'',ket:d.ket||'',warna:w,tipe:tipe,measurement:msr};
          if(d.nama){_bindDrawnPopup(sub,d.nama,d.ket,w,tipe,msr);_bindMsrTooltip(sub,tipe);}
        });
      }catch(e){}
    });
    toast(res.data.length+' gambar dimuat.','ok');
  });
}

function _showSaveNote(msg){
  var el=G('lf-save-note'); if(!el) return;
  el.textContent=msg; el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},2800);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL EDIT LAYER
// ══════════════════════════════════════════════════════════════════════════════
function openLayerModal(){ om('mlayer'); _loadLayerList(); }

function _loadLayerList(){
  var body=G('layer-list-body');
  if(body) body.innerHTML='<div class="empty"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';

  // ✅ GANTI
  apiGet('getLayerPeta').then(function(res){
    _layerData=res.data||[];
    _renderLayerList();
  }).catch(function(e){
    if(body) body.innerHTML='<div class="empty"><i class="fas fa-circle-xmark" style="color:var(--red)"></i><p>'+esc(e.message)+'</p></div>';
  });
}

function _renderLayerList(){
  var body=G('layer-list-body'); if(!body) return;
  if(!_layerData.length){body.innerHTML='<div class="empty"><i class="fas fa-layer-group"></i><p>Belum ada layer.</p></div>';return;}
  body.innerHTML=_layerData.map(function(layer){
    var sd=getSimbolDef(layer.simbol),ck=rcSet(layer);
    return '<div class="layer-list-item'+(layer.aktif?'':' inactive')+'">'
      +'<div class="layer-item-ico" style="background:'+(layer.warna||sd.warna)+'22;color:'+(layer.warna||sd.warna)+'"><i class="fas '+sd.ico+'"></i></div>'
      +'<div class="layer-item-info"><div class="layer-item-name">'+esc(layer.nama)+'</div><div class="layer-item-sub">'+sd.label+' · '+(layer.aktif?'<span style="color:var(--green)">Aktif</span>':'<span style="color:var(--muted)">Nonaktif</span>')+'</div></div>'
      +'<div class="layer-item-acts">'
        +'<button class="ag-btn" style="background:'+(layer.aktif?'var(--greenl)':'var(--bg)')+';color:'+(layer.aktif?'var(--green)':'var(--muted)')+'" onclick="toggleLayerAktifUI(rcGet(\''+ck+'\'))"><i class="fas '+(layer.aktif?'fa-eye':'fa-eye-slash')+'"></i></button>'
        +'<button class="ag-btn ag-edit" onclick="openLayerForm(rcGet(\''+ck+'\'))"><i class="fas fa-pen"></i></button>'
        +'<button class="ag-btn ag-del" onclick="konfirmHapusLayer(rcGet(\''+ck+'\')._ri)"><i class="fas fa-trash"></i></button>'
      +'</div></div>';
  }).join('');
}

function toggleLayerAktifUI(layer){
  if(!layer) return;

  // ✅ GANTI
  apiPost('toggleLayerAktif',{ri:layer._ri,aktif:!layer.aktif}).then(function(res){
    if(res.success){toast(layer.aktif?'Nonaktif.':'Aktif.','ok');_loadLayerList();}
    else toast('Gagal.','er');
  });
}

function konfirmHapusLayer(ri){ _layerDelRi=ri; G('mbtnhpsLayer').onclick=function(){doHapusLayer();}; om('mconfLayer'); }

function doHapusLayer(){
  if(!_layerDelRi) return;
  cm('mconfLayer');

  // ✅ GANTI
  apiPost('deleteLayerPeta',{ri:_layerDelRi}).then(function(res){
    if(res.success){
      toast('Layer dihapus.','ok'); window._gcDel('layerPeta');
      _loadLayerList();
      G('layer-form-wrap').innerHTML='<div class="empty" style="padding:40px 10px"><i class="fas fa-hand-pointer" style="font-size:1.5rem;opacity:.14;display:block;margin-bottom:8px"></i><p style="font-size:.72rem">Pilih layer untuk diedit.</p></div>';
    }else toast('Gagal.','er');
  });
}

function openLayerForm(layer){
  _layerFormRow=layer;
  _selectedSimbol=(layer&&layer.simbol)||'rute';
  _selectedWarna=(layer&&layer.warna)||'#1e6fd9';
  var fwrap=G('layer-form-wrap'); if(!fwrap) return;
  fwrap.innerHTML=''
    +'<p style="font-size:.67rem;font-weight:800;color:var(--mid);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">'+(layer?'Edit Layer':'Tambah Layer Baru')+'</p>'
    +'<div class="fgrp"><label class="flbl">Nama Layer <span class="req">*</span></label><input class="fctl" id="lf-nama" value="'+esc(layer?layer.nama:'')+'"></div>'
    +'<div class="fgrp"><label class="flbl">Simbol</label><div class="mlayer-simbol-grid">'
    +SIMBOL_DEF.map(function(s){return '<button class="msimbol-btn'+(s.id===_selectedSimbol?' on':'')+'" onclick="selectSimbol(\''+s.id+'\')" id="sbtn-'+s.id+'"><i class="fas '+s.ico+' simbol-ico"></i>'+s.label+'</button>';}).join('')
    +'</div></div>'
    +'<div class="fgrp"><label class="flbl">Warna</label><div class="color-swatches">'
    +WARNA_PRESET.map(function(w){return '<div class="color-swatch'+(w===_selectedWarna?' on':'')+'" style="background:'+w+'" onclick="selectWarna(\''+w+'\')" data-warna="'+w+'"></div>';}).join('')
    +'</div><div style="display:flex;align-items:center;gap:7px"><input type="color" id="lf-warna-inp" value="'+_selectedWarna+'" oninput="selectWarnaCustom(this.value)" style="width:34px;height:28px;border:none;border-radius:5px;cursor:pointer;background:none"><span id="lf-warna-lbl" style="font-size:.68rem;font-family:var(--mono);color:var(--mid)">'+_selectedWarna+'</span></div></div>'
    +'<div class="fgrp"><label class="flbl">Koordinat</label>'
    +'<button type="button" style="width:100%;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border:1.5px dashed var(--teal);border-radius:8px;background:transparent;color:var(--teal);font-size:.7rem;font-weight:700;cursor:pointer;font-family:var(--font)" onclick="openLayerModal_pickCoord()"><i class="fas fa-crosshairs"></i> Klik Lokasi di Peta</button>'
    +'</div>'
    +'<div class="frow"><div class="fcol"><label class="flbl">Latitude <span class="req">*</span></label><input class="fctl" id="lf-lat" placeholder="-7.8635" value="'+esc(layer?(layer.lat||''):'')+'"></div>'
    +'<div class="fcol"><label class="flbl">Longitude <span class="req">*</span></label><input class="fctl" id="lf-lng" placeholder="111.4625" value="'+esc(layer?(layer.lng||''):'')+'"></div></div>'
    +'<div class="fgrp"><label class="flbl">Keterangan</label><textarea class="fctl" id="lf-ket" rows="3">'+esc(layer?layer.ket:'')+'</textarea></div>'
    +(layer?'<div class="fgrp" style="display:flex;align-items:center;gap:7px"><input type="checkbox" id="lf-aktif" style="width:15px;height:15px;accent-color:var(--green)" '+(layer.aktif?'checked':'')+'><label for="lf-aktif" style="font-size:.76rem;font-weight:600;color:var(--text);cursor:pointer">Layer Aktif</label></div>':'')
    +'<div style="display:flex;gap:6px;margin-top:4px"><button class="bp" style="flex:1" onclick="submitLayerForm()"><i class="fas fa-save"></i> '+(layer?'Perbarui':'Simpan')+'</button><button class="bg2" onclick="cancelLayerForm()"><i class="fas fa-times"></i></button></div>';
}

function selectSimbol(id){
  _selectedSimbol=id;
  document.querySelectorAll('.msimbol-btn').forEach(function(b){b.classList.remove('on');});
  var btn=G('sbtn-'+id); if(btn) btn.classList.add('on');
  selectWarna(getSimbolDef(id).warna);
}

function selectWarna(w){
  _selectedWarna=w;
  document.querySelectorAll('.color-swatch').forEach(function(s){s.classList.toggle('on',s.dataset.warna===w);});
  var i=G('lf-warna-inp'); if(i) i.value=w;
  var l=G('lf-warna-lbl'); if(l) l.textContent=w;
}

function selectWarnaCustom(w){
  _selectedWarna=w;
  document.querySelectorAll('.color-swatch').forEach(function(s){s.classList.remove('on');});
  var l=G('lf-warna-lbl'); if(l) l.textContent=w;
}

function cancelLayerForm(){
  _layerFormRow=null;
  var f=G('layer-form-wrap');
  if(f) f.innerHTML='<div class="empty" style="padding:40px 10px"><i class="fas fa-hand-pointer" style="font-size:1.5rem;opacity:.14;display:block;margin-bottom:8px"></i><p style="font-size:.72rem">Pilih layer di kiri untuk diedit,<br>atau klik Tambah untuk layer baru.</p></div>';
}

function submitLayerForm(){
  var nama=(G('lf-nama')||{}).value||'',lat=(G('lf-lat')||{}).value||'',lng=(G('lf-lng')||{}).value||'';
  if(!nama.trim()){toast('Nama wajib diisi.','er');return;}
  if(!lat||!lng){toast('Koordinat wajib diisi.','er');return;}
  if(isNaN(parseFloat(lat))||isNaN(parseFloat(lng))){toast('Koordinat tidak valid.','er');return;}
  var aktifEl=G('lf-aktif');
  var payload={
    nama:nama,simbol:_selectedSimbol,warna:_selectedWarna,
    lat:parseFloat(lat),lng:parseFloat(lng),
    ket:(G('lf-ket')||{}).value||'',
    aktif:aktifEl?aktifEl.checked:true
  };
  if(_layerFormRow) payload._ri=_layerFormRow._ri;
  var action=_layerFormRow?'updateLayerPeta':'addLayerPeta';
  _lfShowLoad('Menyimpan...');

  // ✅ GANTI
  apiPost(action,payload).then(function(res){
    _lfHideLoad();
    if(res.success){
      toast(_layerFormRow?'Layer diperbarui.':'Layer ditambahkan.','ok'); window._gcDel('layerPeta');
      _loadLayerList();
      cancelLayerForm();
      refreshLeaflet();
    }else toast('Gagal: '+(res.message||''),'er');
  });
}
