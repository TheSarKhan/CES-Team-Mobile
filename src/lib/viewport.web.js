// iPhone ana ekran tətbiqi (PWA): klaviatura açılıb bağlanandan sonra səhifə yuxarı sürüşmüş qalır (başlıq status barın altına keçir,
// aşağıda boş yer yaranır, son mesaj yazı sahəsinin altında kəsilir). Burada:
//  1) kök hündürlüyü həqiqi görünən sahəyə (visualViewport) bərabərləşdirilir — klaviatura açıq olanda yazı sahəsi klaviaturanın üstündə qalır;
//  2) səhifənin özü heç vaxt sürüşməsin deyə hər dəyişiklikdə yuxarı qaytarılır;
//  3) klaviatura açıq olanda alt təhlükəsiz sahə boşluğu (--sab) söndürülür.
export function fixMobileViewport() {
  const vv = window.visualViewport;
  const root = document.getElementById('root');
  if (!vv || !root) return () => {};
  const touch = () => window.matchMedia?.('(pointer: coarse)').matches;
  let raf = 0;
  const apply = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!touch()) { root.style.height = ''; document.documentElement.style.setProperty('--sab', '1'); return; }
      const kb = window.innerHeight - vv.height > 80; // klaviatura açıqdır
      root.style.height = kb ? `${vv.height}px` : '';
      document.documentElement.style.setProperty('--sab', kb ? '0' : '1');
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0 || document.body.scrollTop !== 0 || vv.offsetTop !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    });
  };
  const onFocusOut = () => setTimeout(apply, 120);
  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
  window.addEventListener('scroll', apply, { passive: true });
  document.addEventListener('focusout', onFocusOut);
  window.addEventListener('orientationchange', apply);
  apply();
  return () => {
    vv.removeEventListener('resize', apply);
    vv.removeEventListener('scroll', apply);
    window.removeEventListener('scroll', apply);
    document.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('orientationchange', apply);
    cancelAnimationFrame(raf);
  };
}
