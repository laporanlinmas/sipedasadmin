// ══════════════════════════════════════════
//  PAGINATION
// ══════════════════════════════════════════
function pgBtns(cur,tot,fn){
  if(tot<=1)return'';
  var h='<button class="pbn" '+(cur<=1?'disabled':'')+' onclick="'+fn+'('+(cur-1)+')"><i class="fas fa-chevron-left fa-xs"></i></button>';
  var s=Math.max(1,cur-2),e=Math.min(tot,cur+2);
  for(var p=s;p<=e;p++)h+='<button class="pbn '+(p===cur?'on':'')+'" onclick="'+fn+'('+p+')">'+p+'</button>';
  h+='<button class="pbn" '+(cur>=tot?'disabled':'')+' onclick="'+fn+'('+(cur+1)+')"><i class="fas fa-chevron-right fa-xs"></i></button>';
  return h;
}
function pgInfo(st,tot,per){if(!tot)return'Tidak ada data';return'Menampilkan '+(st+1)+'–'+Math.min(st+per,tot)+' dari '+tot;}

function showErr(msg){
  G('ct').innerHTML='<div class="empty" style="padding:72px 20px">'
    +'<i class="fas fa-triangle-exclamation" style="color:var(--red);opacity:1;font-size:1.9rem"></i>'
    +'<p style="color:var(--red);font-weight:800;margin-top:9px">Gagal memuat data</p>'
    +'<p style="font-size:.7rem;margin-top:4px;color:var(--muted)">'+(msg||'Coba muat ulang.')+'</p>'
    +'<button class="bg2" style="margin-top:12px" onclick="loadDashboard()"><i class="fas fa-rotate-left"></i> Kembali</button>'
    +'</div>';
}
