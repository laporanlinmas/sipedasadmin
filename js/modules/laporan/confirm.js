// ══════════════════════════════════════════
//  KONFIRM HAPUS
//  Sebelum: google.script.run.withSuccessHandler(fn).deleteLaporan(ri)
//  Sesudah: apiPost('deleteLaporan', { ri }).then(fn)
// ══════════════════════════════════════════
function konfirmHapus(mode,ri){
  _hpsMode=mode;_hpsRi=ri;
  G('mconf-msg').textContent=mode==='satlinmas'?'Hapus data anggota ini? Tidak dapat dibatalkan.':'Hapus laporan ini? Tidak dapat dibatalkan.';
  G('mbtnhps').onclick=function(){doHapus();};om('mconf');
}

function doHapus(){
  if(!_hpsRi&&_hpsRi!==0)return;showLoad('Menghapus...');cm('mconf');
  if(_hpsMode==='satlinmas'){
    // ✅ GANTI
    apiPost('deleteSatlinmas',{ri:_hpsRi}).then(function(res){
      hideLoad();
      if(res.success){toast('Anggota dihapus.','ok'); window._gcDel('satlinmas'); loadSatlinmas();}
      else toast('Gagal: '+(res.message||''),'er');
    });
  }else{
    // ✅ GANTI
    apiPost('deleteLaporan',{ri:_hpsRi}).then(function(res){
      hideLoad();
      if(res.success){
        toast('Laporan dihapus.','ok'); window._gcDel('rekap'); window._gcDel('dashboard');
        var an=document.querySelector('.nb.on');
        if(an&&an.id==='nav-rk')loadRekap();else loadEdit();
      }else toast('Gagal: '+(res.message||''),'er');
    });
  }
}

