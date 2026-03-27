//  PDF — PROGRESS
// ══════════════════════════════════════════════════════════════════════════════
function _showRenderProgress(txt,sub,pct) {
  var ov=G('pdf-render-overlay'),t=G('pdf-render-txt'),s=G('pdf-render-sub'),bar=G('pdf-render-bar');
  if(ov)  ov.classList.add('show');
  if(t)   t.textContent=txt||'Merender...';
  if(s)   s.textContent=sub||'';
  if(bar) bar.style.width=(pct||0)+'%';
}

function _hideRenderProgress() {
  var ov=G('pdf-render-overlay'); if(ov) ov.classList.remove('show');
  var bar=G('pdf-render-bar'); if(bar) bar.style.width='0%';
}

// ══════════════════════════════════════════════════════════════════════════════
