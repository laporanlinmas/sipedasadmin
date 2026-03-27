// ══════════════════════════════════════════
//  GALLERY
// ══════════════════════════════════════════
function galOpen(fotos,fotosThumb,idx){
  if(!fotos||!fotos.length){toast('Tidak ada foto.','inf');return;}
  _galOrig=fotos;_gal=fotosThumb&&fotosThumb.length?fotosThumb:fotos;_gi=idx||0;
  galRender();G('gov').classList.add('on');
}
function galRender(){
  var img=G('gimg');img.style.display='none';G('gloaderOverlay').classList.add('on');
  img.src=_gal[_gi]||'';G('gcnt').textContent=(_gi+1)+' / '+_gal.length;
  G('gpv').disabled=_gi===0;G('gnx').disabled=_gi===_gal.length-1;
  var orig=_galOrig[_gi]||'';var lnk=G('gdrvhref');
  if(orig&&orig.indexOf('drive.google.com')>-1){lnk.href=orig;G('gdrvlink').style.display='';}else{G('gdrvlink').style.display='none';}
  var th=G('gths');th.innerHTML='';
  _gal.forEach(function(u,i){var el=document.createElement('img');el.src=u;el.className='gth'+(i===_gi?' on':'');el.onerror=function(){el.style.opacity='.15';};el.onclick=(function(ii){return function(){_gi=ii;galRender();};})(i);th.appendChild(el);});
}
function galImgLoad(img){G('gloaderOverlay').classList.remove('on');img.style.display='block';}
function galImgErr(img){
  G('gloaderOverlay').classList.remove('on');img.style.display='block';
  var orig=_galOrig[_gi]||'';
  if(orig&&img.src!==orig){img.src=orig;return;}
  img.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23222"%2F%3E%3Ctext x="150" y="110" text-anchor="middle" fill="%23777" font-size="13" font-family="sans-serif"%3EGambar tidak dapat dimuat%3C%2Ftext%3E%3C%2Fsvg%3E';
  if(orig&&orig.indexOf('drive.google.com')>-1)G('gdrvlink').style.display='';
}
function galNav(d){_gi=Math.max(0,Math.min(_gal.length-1,_gi+d));galRender();}
function galClose(){G('gov').classList.remove('on');}

