// iPhone ana ekran tətbiqi (PWA): klaviatura açılıb bağlanandan sonra səhifə yuxarı sürüşmüş qalır
// (başlıq status barın altına keçir, aşağıda boş yer yaranır, yazı sahəsi klaviaturanın altında qalır).
// Həll: tətbiqin kökü (#root) HƏR ZAMAN həqiqi görünən sahəyə (visualViewport) bərabər yerləşdirilir —
// sürüşmə nə qədər olursa olsun tətbiq görünən sahəni tam doldurur, klaviatura açıq olanda yazı sahəsi onun üstündə qalır.
import { diagApi } from '../api/endpoints';
import { buildId } from './appUpdate';

let sent = 0;
let lastSent = 0;
function inset(side) {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;visibility:hidden;padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(d);
  const v = parseFloat(getComputedStyle(d)[`padding${side[0].toUpperCase()}${side.slice(1)}`]) || 0;
  d.remove();
  return Math.round(v);
}
/** Layout problemini görmək üçün ölçüləri serverə göndər (səssiz; hər sessiyada ≤40 dəfə). */
export function reportViewport(reason) {
  const now = Date.now();
  if (sent >= 40 || now - lastSent < 1200) return;
  try { if (!window.localStorage.getItem('team_access_token')) return; } catch { return; }   // yalnız giriş etmiş istifadəçi
  sent += 1; lastSent = now;
  try {
    const vv = window.visualViewport;
    const root = document.getElementById('root');
    const r = root?.getBoundingClientRect();
    const a = document.activeElement;
    diagApi.report({
      reason, v: buildId(),
      vvH: Math.round(vv?.height ?? 0), vvW: Math.round(vv?.width ?? 0), vvTop: Math.round(vv?.offsetTop ?? 0), vvScale: vv?.scale,
      inner: `${innerWidth}x${innerHeight}`, outer: `${outerWidth}x${outerHeight}`, screen: `${screen.width}x${screen.height}`,
      scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, bodyH: document.body.scrollHeight, clientH: document.documentElement.clientHeight,
      root: r ? `${Math.round(r.top)}+${Math.round(r.height)}` : null, rootStyle: root?.getAttribute('style'),
      sat: inset('top'), sab: inset('bottom'), sabVar: getComputedStyle(document.documentElement).getPropertyValue('--sab').trim(),
      standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
      active: a?.tagName || null, path: location.pathname, ua: navigator.userAgent.slice(25, 90),
    }).catch(() => {});
  } catch { /* diaqnostika işləməsə də tətbiq işləsin */ }
}

export function fixMobileViewport() {
  const vv = window.visualViewport;
  const root = document.getElementById('root');
  if (!vv || !root || !window.matchMedia?.('(pointer: coarse)').matches) return () => {};

  // iPhone ana ekran tətbiqi: innerHeight ekrandan status bar qədər (məs. 812 ↔ 874) kiçik bildirilir, tətbiq isə TAM ekranı (status barın altına qədər)
  // tutur — aşağıda boş zolaq qalırdı. Fərq (gap) həm klaviaturasız, həm klaviaturalı halda görünən sahəyə əlavə olunur.
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const apply = () => {
    const gap = standalone ? Math.max(0, Math.min(screen.height - window.innerHeight, 80)) : 0;
    const kb = window.innerHeight - vv.height > 120;                    // klaviatura açıqdır
    root.style.position = 'fixed';
    root.style.left = `${vv.offsetLeft}px`;
    root.style.top = `${vv.offsetTop}px`;
    root.style.width = `${vv.width}px`;
    root.style.height = `${vv.height + gap}px`;
    document.documentElement.style.setProperty('--sab', kb ? '0' : '1'); // klaviatura üstündə home-indicator boşluğu lazım deyil
  };
  const reset = () => { window.scrollTo(0, 0); apply(); };
  const report = (why) => setTimeout(() => reportViewport(why), 700);
  const settle = () => { [0, 60, 180, 400, 800, 1400].forEach((t) => setTimeout(reset, t)); };   // iOS hadisələri gec/yarımçıq göndərə bilir

  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', settle);
  window.addEventListener('pageshow', settle);
  document.addEventListener('visibilitychange', settle);
  // Klaviatura bağlananda WebKit-i yerləşməni yenidən hesablamağa məcbur et (viewport meta-nı qısa müddətə dəyişib qaytarmaq)
  const nudge = () => {
    const meta = document.querySelector('meta[name=viewport]');
    if (!meta) return;
    const orig = meta.getAttribute('content');
    meta.setAttribute('content', `${orig},maximum-scale=1`);
    setTimeout(() => { meta.setAttribute('content', orig); reset(); }, 60);
  };
  const onOut = () => { settle(); setTimeout(() => { if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) nudge(); }, 250); };
  document.addEventListener('focusout', onOut);
  document.addEventListener('focusin', settle);
  settle();
  report('load');
  const onAny = (e) => report(e.type);
  ['focusin', 'focusout', 'visibilitychange', 'pageshow'].forEach((t) => document.addEventListener(t, onAny));
  return () => {
    ['focusin', 'focusout', 'visibilitychange', 'pageshow'].forEach((t) => document.removeEventListener(t, onAny));
    vv.removeEventListener('resize', apply);
    vv.removeEventListener('scroll', apply);
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', settle);
    window.removeEventListener('pageshow', settle);
    document.removeEventListener('visibilitychange', settle);
    document.removeEventListener('focusout', onOut);
    document.removeEventListener('focusin', settle);
    ['position', 'left', 'top', 'width', 'height'].forEach((k) => root.style.removeProperty(k));
  };
}
