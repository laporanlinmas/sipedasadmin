// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
var SES=null,PER=15,SLM_PER=24;
var _RC={};var _rcIdx=0;
function rcSet(r){var k='rc_'+(++_rcIdx);_RC[k]=r;return k;}
function rcGet(k){return _RC[k]||null;}
var _gal=[],_galOrig=[],_gi=0;
var _charts={};
var _rData=[],_rPg=1,_rFQ='',_rFFrom='',_rFTo='';
var _editRow=null,_editFotos=[];
var _pdfRow=null;
var _slmData=[],_slmPg=1,_slmFNama='',_slmFUnit='',_slmRow=null;
var _hpsMode='',_hpsRi=null;
var _kolData=[];
var _currentPage='db';
var _petaLoaded=false;

