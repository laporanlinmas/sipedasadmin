// ══════════════════════════════════════════
//  LOGIN
//  Sebelum: google.script.run.withSuccessHandler(fn).checkLogin(u,p)
//  Sesudah: apiPost('login', { username, password }).then(fn)
// ══════════════════════════════════════════
function toggleEye(){var i=G('ip'),ic=G('eyeico');if(i.type==='password'){i.type='text';ic.className='fas fa-eye-slash';}else{i.type='password';ic.className='fas fa-eye';}}

function doLogin(){
  var u=G('iu').value.trim(),p=G('ip').value;
  if(!u||!p){showLErr('Username & password wajib diisi.');return;}
  var btn=G('lbtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Memeriksa...';
  btn.disabled=true;
  G('lerr').classList.remove('on');

  // ✅ GANTI: google.script.run → apiPost
  apiPost('login',{username:u,password:p}).then(function(res){
    btn.innerHTML='<i class="fas fa-right-to-bracket"></i> Masuk';
    btn.disabled=false;
    if(res.success){
      var d=res.data||res;
      SES={username:d.username,role:d.role,namaLengkap:d.namaLengkap};
      try{sessionStorage.setItem('_slm',JSON.stringify(SES));}catch(e){}
      buildUI();
      G('lp').style.display='none';
      G('app').classList.add('on');
      loadDashboard(); window._prefetchAll();
    }else{
      showLErr(res.message||'Login gagal.');
    }
  });
}

function showLErr(m){G('lerrmsg').textContent=m;G('lerr').classList.add('on');}

function buildUI(){
  if(!SES)return;
  var adm=SES.role==='admin';
  var ini=(SES.namaLengkap||SES.username||'?').charAt(0).toUpperCase();
  var tbav=G('tb-av'),tbun=G('tb-un'),tbrl=G('tb-rl'),tbbdg=G('tb-bdg'),tbacct=G('tb-acct');
  if(tbav)tbav.textContent=ini;
  if(tbun)tbun.textContent=SES.namaLengkap||SES.username;
  if(tbrl)tbrl.textContent=adm?'Administrator':'Pengguna';
  if(tbbdg){tbbdg.textContent=adm?'Admin':'User';tbbdg.className='rbdg '+(adm?'adm':'usr');}
  if(tbacct)tbacct.style.display='';
  if(!adm){
    var ne=G('nav-ed'),ni=G('nav-in'),be=G('bni-ed'),bi=G('bni-in');
    if(ne)ne.style.display='none';if(ni)ni.style.display='none';
    if(be)be.style.display='none';if(bi)bi.style.display='none';
  }
}

function doLogout(){
  if(!confirm('Yakin ingin keluar?'))return; window._gcClear();
  try{sessionStorage.removeItem('_slm');}catch(e){}
  SES=null;
  G('app').classList.remove('on');
  G('lp').style.display='';
  G('ip').value='';
  G('ct').innerHTML='';
  sbClose();
  document.body.classList.remove('sb-off');
  _petaLoaded=false;
}

