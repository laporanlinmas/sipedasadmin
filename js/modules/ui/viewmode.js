// ══════════════════════════════════════════
//  VIEW MODE
// ══════════════════════════════════════════
function getVM(){try{return localStorage.getItem('_vm3')||'auto';}catch(e){return'auto';}}
function setVM(v){try{localStorage.setItem('_vm3',v);}catch(e){};}
function applyViewMode(){
  var mode=getVM(),mobile=isRealMobile(),body=document.body;
  body.classList.remove('mode-phone','mode-desktop-hp');
  var eff=(mode==='phone')?'phone':(mode==='desktop')?'desktop':(mobile?'phone-native':'desktop-native');
  if(eff==='phone'&&!mobile){body.classList.add('mode-phone');setViewport(false);}
  else if(eff==='desktop'&&mobile){body.classList.add('mode-desktop-hp');setViewport(true);}
  else{setViewport(!mobile);}
  updateFab(mode,mobile);
}
function updateFab(mode,mobile){
  var ico=G('vm-ico'),lbtico=G('lvm-ico');
  var tip,iconClass;
  if(mobile){if(mode==='desktop'){iconClass='fas fa-mobile-alt';tip='Kembali ke Mode HP';}else{iconClass='fas fa-desktop';tip='Mode Desktop';}}
  else{if(mode==='phone'){iconClass='fas fa-desktop';tip='Kembali ke Mode Desktop';}else{iconClass='fas fa-mobile-alt';tip='Mode HP';}}
  if(ico)ico.className=iconClass;if(lbtico)lbtico.className=iconClass;
  var vmb=G('vm-btn');if(vmb)vmb.setAttribute('data-tip',tip);
  var lvmb=G('lvm-btn');if(lvmb)lvmb.title=tip;
}
function toggleViewMode(){
  var mode=getVM(),mobile=isRealMobile(),next;
  if(mobile){next=(mode==='desktop')?'auto':'desktop';}
  else{next=(mode==='phone')?'auto':'phone';}
  setVM(next);document.body.classList.remove('sb-off');applyViewMode();
  var nl={auto:'Otomatis',phone:'Mode HP',desktop:'Mode Desktop'};
  toast('Tampilan: '+nl[next],'inf');
}
function setViewport(allowZoom){
  var m=G('mvp');if(!m)return;
  m.setAttribute('content',allowZoom?'width=1080,initial-scale=0.5,minimum-scale=0.2,user-scalable=yes':'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no');
}
function toggleSbCollapse(){document.body.classList.toggle('sb-off');}

function doRefreshPage(){
  var btn=G('refresh-btn');
  if(btn)btn.classList.add('spinning');
  toast('Memuat ulang data...','inf');
  setTimeout(function(){
    if(btn)btn.classList.remove('spinning');
    var page=_currentPage;
    if(page==='db')loadDashboard();
    else if(page==='rk')loadRekap();
    else if(page==='ed')loadEdit();
    else if(page==='in')loadInput();
    else if(page==='sl')loadSatlinmas();
    else if(page==='pt'){_petaLoaded=false;loadPeta();}
    else if(page==='ptk')loadPetunjuk();
    else loadDashboard();
  },600);
}

// Swipe gesture
(function(){
  var sx=0,sy=0,stime=0;
  document.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;stime=Date.now();},{passive:true});
  document.addEventListener('touchend',function(e){
    if(!document.body.classList.contains('mode-desktop-hp'))return;
    var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy,dt=Date.now()-stime;
    if(dt>500||Math.abs(dy)>Math.abs(dx)*1.2||Math.abs(dx)<50)return;
    var off=document.body.classList.contains('sb-off');
    if(dx>0&&off)document.body.classList.remove('sb-off');
    else if(dx<0&&!off)document.body.classList.add('sb-off');
  },{passive:true});
})();

