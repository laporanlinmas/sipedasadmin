// ══════════════════════════════════════════
//  FOTO THUMBNAIL
// ══════════════════════════════════════════
function renderFotoThumb(fotArr,fotThumb,ck){
  if(!fotArr||!fotArr.length)return'—';
  var disp=fotArr.slice(0,3);var rest=fotArr.length-3;
  var html='<div class="foto-thumb-wrap">';
  disp.forEach(function(u,i){
    var thumb=(fotThumb&&fotThumb[i])?fotThumb[i]:u;
    html+='<img src="'+esc(thumb)+'" title="Foto '+(i+1)+'" '
      +'onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,'+i+')" '
      +'onerror="this.style.display=\'none\'">';
  });
  if(rest>0){html+='<span class="foto-more-badge" onclick="var rx=rcGet(\''+ck+'\');galOpen(rx.fotos,rx.fotosThumb||rx.fotos,3)"><i class="fas fa-images"></i> +'+rest+'</span>';}
  return html+'</div>';
}

