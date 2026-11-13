// Web / ana ekran tətbiqi: (1) yeni versiya çıxanda tətbiq özü yenilənir (iPhone köhnə kodu yaddaşda saxlaya bilir);
// (2) Profil → Versiya sətrinə 5 dəfə toxunanda ekran ölçüsü diaqnostikası (HUD) açılır/bağlanır — layout problemlərini görmək üçün.
const entryOf = (s) => (s || '').match(/entry-([a-z0-9]+)\.js/)?.[1] || null;
const loaded = () => entryOf([...document.scripts].map((s) => s.src).find((x) => /entry-[a-z0-9]+\.js/.test(x)));

export const buildId = () => (loaded() || 'dev').slice(0, 8);

export function watchForUpdates() {
  const cur = loaded();
  if (!cur) return () => {};              // dev server: heş yoxdur
  let busy = false;
  const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  const check = async () => {
    if (busy) return;
    busy = true;
    try {
      const html = await (await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })).text();
      const next = entryOf(html);
      if (next && next !== cur && !typing()) window.location.reload();
    } catch { /* şəbəkə yoxdur — sonra yenə yoxlanılacaq */ }
    busy = false;
  };
  const onVis = () => { if (document.visibilityState === 'visible') check(); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', check);
  const t = setInterval(check, 3 * 60_000);
  setTimeout(check, 3000);
  return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pageshow', check); clearInterval(t); };
}

let hud = null;
let hudTimer = null;
function paint() {
  const vv = window.visualViewport;
  const root = document.getElementById('root');
  const r = root?.getBoundingClientRect();
  const sab = getComputedStyle(document.documentElement).getPropertyValue('--sab').trim();
  const a = document.activeElement;
  hud.textContent = `v ${buildId()} | vv ${Math.round(vv?.height ?? 0)}x${Math.round(vv?.width ?? 0)} top ${Math.round(vv?.offsetTop ?? 0)} | inner ${innerHeight} | screen ${screen.height} | scrollY ${Math.round(scrollY)} | root ${Math.round(r?.top ?? 0)}+${Math.round(r?.height ?? 0)} | sab ${sab || '-'} | ${matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'PWA' : 'tab'} | ${a?.tagName || '-'}`;
}
export function toggleHud() {
  if (hud) { clearInterval(hudTimer); hud.remove(); hud = null; return false; }
  hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:4px;right:4px;top:60px;z-index:99999;background:rgba(0,0,0,.75);color:#9f9;font:10px/1.3 monospace;padding:4px 6px;border-radius:6px;pointer-events:none;word-break:break-all';
  document.body.appendChild(hud);
  paint();
  hudTimer = setInterval(paint, 400);
  return true;
}
