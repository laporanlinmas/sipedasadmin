//  PENGUKURAN
// ══════════════════════════════════════════════════════════════════════════════
function _calcLen(layer) {
  var ll=layer.getLatLngs?layer.getLatLngs():[];
  if(Array.isArray(ll[0])) ll=ll[0];
  var t=0;
  for(var i=0;i<ll.length-1;i++) t+=ll[i].distanceTo(ll[i+1]);
  return t;
}

function _calcArea(layer) {
  var ll=layer.getLatLngs?layer.getLatLngs():[];
  if(Array.isArray(ll[0])) ll=ll[0];
  if(ll.length<3) return 0;
  var R=6371000,n=ll.length,a=0;
  for(var i=0;i<n;i++){
    var j=(i+1)%n;
    a+=(ll[j].lng-ll[i].lng)*Math.PI/180*(2+Math.sin(ll[i].lat*Math.PI/180)+Math.sin(ll[j].lat*Math.PI/180));
  }
  return Math.abs(a*R*R/2);
}

function _fmtLen(m)   { return m<1000?m.toFixed(0)+' m':(m/1000).toFixed(2)+' km'; }
function _fmtArea(m2) { return m2<10000?m2.toFixed(0)+' m²':(m2/10000).toFixed(3)+' ha'; }

function _getMsr(layer,tipe) {
  try{ return tipe==='polyline'?'📏 '+_fmtLen(_calcLen(layer)):'📐 '+_fmtArea(_calcArea(layer)); }
  catch(e){ return ''; }
}

function _bindMsrTooltip(layer,tipe) {
  var msr=_getMsr(layer,tipe); if(!msr) return;
  layer.bindTooltip('<b>'+msr+'</b>',{permanent:false,sticky:true,direction:'top',offset:[0,-8],className:'lf-tip-clean',opacity:1});
}

// ══════════════════════════════════════════════════════════════════════════════
