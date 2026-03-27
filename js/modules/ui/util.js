// ══════════════════════════════════════════
//  UTIL
// ══════════════════════════════════════════
function G(id){return document.getElementById(id);}
function esc(v){if(!v)return'';return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function showLoad(m){G('lmsg').textContent=m||'Memuat...';G('lov').classList.add('on');}
function hideLoad(){G('lov').classList.remove('on');}
function toast(msg,type){
  type=type||'inf';
  var ico={ok:'fa-circle-check',er:'fa-circle-xmark',inf:'fa-circle-info'};
  var el=document.createElement('div');el.className='ti '+type;
  el.innerHTML='<i class="fas '+(ico[type]||ico.inf)+'"></i><span>'+esc(msg)+'</span>';
  G('tco').appendChild(el);
  setTimeout(function(){el.classList.add('tOut');setTimeout(function(){el.remove();},230);},3400);
}
function om(id){G(id).classList.add('on');document.body.style.overflow='hidden';}
function cm(id){G(id).classList.remove('on');document.body.style.overflow='';}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){galClose();document.querySelectorAll('.mov.on').forEach(function(m){m.classList.remove('on');});document.body.style.overflow='';}
  if(G('gov').classList.contains('on')){if(e.key==='ArrowLeft')galNav(-1);if(e.key==='ArrowRight')galNav(1);}
});

function toggleLokasi(el){/* tidak dipakai lagi */}
function mcardLokasi(teks){
  if(!teks)return'<div class="lok-wrap"><span class="lok-trunc" style="color:var(--muted)">—</span></div>';
  return'<div class="lok-wrap"><span class="lok-trunc">'+esc(teks)+'</span></div>';
}
function mcardChip(teks,chipCls){
  if(!teks)return'';var safe=esc(teks);
  var isNihil=teks.toUpperCase()==='NIHIL'||teks==='';
  if(isNihil)return'<span class="chip cm">Nihil</span>';
  return'<span class="chip '+chipCls+' chip-mob" onclick="this.classList.toggle(\'expanded\')" title="'+safe+'">'+safe+'</span>';
}
function mcardPersonil(teks){
  if(!teks)return'—';var safe=esc(teks);
  if(teks.length<=25)return safe;
  return'<span class="per-trunc" onclick="this.classList.toggle(\'expanded\')" title="'+safe+'">'+safe+'</span>';
}

// Datetime
var _dtwInterval=null;
var _hariNames=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
var _bulanNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function startDtwTick(){
  if(_dtwInterval)clearInterval(_dtwInterval);
  _dtwInterval=setInterval(tickDtw,1000);tickDtw();
}
function tickDtw(){
  var now=new Date();
  var h=G('dtw-h'),m=G('dtw-m'),s=G('dtw-s'),dte=G('dtw-date'),dy=G('dtw-day');
  if(!h)return;
  function z(n){return String(n).padStart(2,'0');}
  h.textContent=z(now.getHours());m.textContent=z(now.getMinutes());s.textContent=z(now.getSeconds());
  dte.textContent=now.getDate()+' '+_bulanNames[now.getMonth()]+' '+now.getFullYear();
  dy.textContent=_hariNames[now.getDay()];
}
function tickClock(){var c=G('clk');if(c)c.textContent=new Date().toLocaleString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
tickClock();setInterval(tickClock,1000);

