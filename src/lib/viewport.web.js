// iPhone ana ekran tətbiqi (PWA): klaviatura açılıb bağlanandan sonra səhifə yuxarı sürüşmüş qalır
// (başlıq status barın altına keçir, aşağıda boş yer yaranır, yazı sahəsi klaviaturanın altında qalır).
// Həll: tətbiqin kökü (#root) HƏR ZAMAN həqiqi görünən sahəyə (visualViewport) bərabər yerləşdirilir —
// sürüşmə nə qədər olursa olsun tətbiq görünən sahəni tam doldurur, klaviatura açıq olanda yazı sahəsi onun üstündə qalır.
export function fixMobileViewport() {
  const vv = window.visualViewport;
  const root = document.getElementById('root');
  if (!vv || !root || !window.matchMedia?.('(pointer: coarse)').matches) return () => {};

  const probe = document.createElement('div'); // klaviaturasız tam hündürlük (100lvh)
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  const apply = () => {
    const full = Math.max(probe.offsetHeight, window.innerHeight);
    const kb = full - vv.height > 120;                                  // klaviatura açıqdır
    root.style.position = 'fixed';
    root.style.left = `${vv.offsetLeft}px`;
    root.style.top = `${vv.offsetTop}px`;
    root.style.width = `${vv.width}px`;
    root.style.height = `${vv.height}px`;
    document.documentElement.style.setProperty('--sab', kb ? '0' : '1'); // klaviatura üstündə home-indicator boşluğu lazım deyil
  };
  const reset = () => { window.scrollTo(0, 0); apply(); };
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
  return () => {
    vv.removeEventListener('resize', apply);
    vv.removeEventListener('scroll', apply);
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', settle);
    window.removeEventListener('pageshow', settle);
    document.removeEventListener('visibilitychange', settle);
    document.removeEventListener('focusout', onOut);
    document.removeEventListener('focusin', settle);
    probe.remove();
    ['position', 'left', 'top', 'width', 'height'].forEach((k) => root.style.removeProperty(k));
  };
}
