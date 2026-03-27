// ══════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════
function sbToggle(){G('sidebar').classList.toggle('on');G('mbb').classList.toggle('on');}
function sbClose(){G('sidebar').classList.remove('on');G('mbb').classList.remove('on');}
function setNav(id){
  _currentPage=id;
  if(id!=='pt') G('ct').classList.remove('peta-outer-pa');
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var el=G('nav-'+id);if(el)el.classList.add('on');
  document.querySelectorAll('.bni').forEach(function(b){b.classList.remove('on');});
  var bn=G('bni-'+id);if(bn)bn.classList.add('on');
}
function setPage(t,s){G('pgtl').textContent=t;G('pgsb').textContent=s||'';}
function dChart(id){if(_charts[id]){_charts[id].destroy();delete _charts[id];}}

