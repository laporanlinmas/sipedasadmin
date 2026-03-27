// ══════════════════════════════════════════
//  CETAK KOLEKTIF
//  Sebelum: google.script.run.withSuccessHandler(fn).generateKolektifHtml(payload)
//  Sesudah: apiPost('generateKolektifHtml', payload).then(fn)
// ══════════════════════════════════════════
function openKolektifModal(){
  var now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  G('kol-from').value=y+'-'+m+'-01';
  G('kol-to').value=y+'-'+m+'-'+String(now.getDate()).padStart(2,'0');
  G('kol-info').innerHTML='Pilih rentang tanggal lalu klik Perbarui Preview.';
  G('kol-printbtn').disabled=true;G('kol-printbtn').style.opacity='.4';
  G('kolframe').style.display='none';G('kol-empty').style.display='flex';
  om('mkolektif');
}

function previewKolektif(){
  var from=G('kol-from').value,to=G('kol-to').value;
  var rows=_rData.filter(function(r){
    if(from){var df=parseISODate(from);if(df){var dt=parseTglID(r.tanggal);if(!dt||dt<df)return false;}}
    if(to){var dto=parseISODate(to);if(dto){dto.setHours(23,59,59,999);var dt2=parseTglID(r.tanggal);if(!dt2||dt2>dto)return false;}}
    return true;
  }).slice().reverse();
  _kolData=rows;
  G('kol-info').innerHTML='Ditemukan <strong>'+rows.length+'</strong> laporan'+(rows.length?' (termasuk '+rows.filter(function(r){return r.identitas&&r.identitas.toUpperCase()!=='NIHIL'&&r.identitas!=='';}).length+' pelanggaran).':'.');
  if(!rows.length){
    G('kolframe').style.display='none';G('kol-empty').style.display='flex';
    G('kol-printbtn').disabled=true;G('kol-printbtn').style.opacity='.4';return;
  }
  showLoad('Menyiapkan preview kolektif...');

  // ✅ GANTI
  apiPost('generateKolektifHtml',{rows:rows,tglFrom:from,tglTo:to}).then(function(res){
    hideLoad();
    if(!res.success){toast('Gagal: '+res.message,'er');return;}
    var html=(res.data&&res.data.html)?res.data.html:res.html;
    G('kol-empty').style.display='none';
    G('kolframe').style.display='block';
    G('kolframe').srcdoc=html;
    G('kol-printbtn').disabled=false;
    G('kol-printbtn').style.opacity='1';
  });
}

