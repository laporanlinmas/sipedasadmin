// ══════════════════════════════════════════
//  DEVICE DETECTION
// ══════════════════════════════════════════
function isRealMobile(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&window.screen.width<=900);
}
function isMobileView(){
  return document.body.classList.contains('mode-phone')||
    (isRealMobile()&&!document.body.classList.contains('mode-desktop-hp'));
}

