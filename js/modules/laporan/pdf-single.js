// ══════════════════════════════════════════
//  PDF SINGLE
//  Sebelum: google.script.run.withSuccessHandler(fn).generateLaporanHtml(payload)
//  Sesudah: apiPost('generateLaporanHtml', payload).then(fn)
// ══════════════════════════════════════════
function togglePdfTtd(){
  var box=G('pdf-ttd-box'),lbl=G('pdf-ttd-lbl');
  var on=box.classList.contains('on');box.classList.toggle('on');
  lbl.textContent=on?'Ubah Data Pejabat TTD ▸':'Sembunyikan Data Pejabat TTD ▾';
}

function tglIDStr(d){
  var BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate()+' '+BLN[d.getMonth()]+' '+d.getFullYear();
}

function openPdf(row){
  if(!row){toast('Data tidak ditemukan.','er');return;}
  _pdfRow=row;var now=new Date();
  G('pdf-judulsub').value=(row.lokasi||'').toUpperCase();
  G('pdf-hari').value=row.hari||'';G('pdf-tanggal').value=row.tanggal||'';
  G('pdf-tujuan').value='Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian';
  var ns=G('pdf-nospt');if(ns)ns.value='';
  G('pdf-lokasi').value=row.lokasi||'';
  G('pdf-anggota').value='Regu Pedestrian, Anggota Bidang Linmas, Satpol PP';
  G('pdf-pukul').value='16.00 – 00.00 WIB';
  var idn=row.identitas||'';var isNihil=idn.trim()===''||idn.toUpperCase()==='NIHIL';
  G('pdf-identitas').value=isNihil?'':idn;G('pdf-uraian').value='';G('pdf-tglsurat').value=tglIDStr(now);
  var box=G('pdf-ttd-box');if(box)box.classList.remove('on');
  var lbl=G('pdf-ttd-lbl');if(lbl)lbl.textContent='Ubah Data Pejabat TTD ▸';
  om('mpdf');refreshPdfPreview();
}

function refreshPdfPreview(){
  showLoad('Menyiapkan preview...');

  // ✅ GANTI
  apiPost('generateLaporanHtml',{
    judulSub:G('pdf-judulsub').value,hari:G('pdf-hari').value,tanggal:G('pdf-tanggal').value,
    tujuan:G('pdf-tujuan').value,nomorSpt:(G('pdf-nospt')||{}).value||'',
    lokasi:G('pdf-lokasi').value,anggota:G('pdf-anggota').value,pukul:G('pdf-pukul').value,
    identitas:G('pdf-identitas').value,uraian:G('pdf-uraian').value,tglSurat:G('pdf-tglsurat').value,
    jabatanTtd:G('pdf-jabatan').value,namaTtd:G('pdf-namatd').value,
    pangkatTtd:G('pdf-pangkat').value,nipTtd:G('pdf-nip').value,
    fotos:_pdfRow?(_pdfRow.fotos||[]):[]
  }).then(function(res){
    hideLoad();
    if(!res.success){toast('Gagal: '+res.message,'er');return;}
    var html=(res.data&&res.data.html)?res.data.html:res.html;
    G('pdfframe').srcdoc=html;
  });
}

function doPrint(fid){
  var fr=G(fid);
  if(fr&&fr.contentWindow){fr.contentWindow.focus();fr.contentWindow.print();}
  else toast('Preview belum siap.','inf');
}

