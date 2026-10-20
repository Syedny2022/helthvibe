/* ============================================================
   Helthvibe — Google Analytics 4 loader (Consent Mode v2)
   Loaded only when the page contains a <meta name="ga-measurement-id">
   tag, which the build injects when PUBLIC_GA_ID is configured.
   No cookies are set until the visitor accepts.
   ============================================================ */
(function () {
  var meta = document.querySelector('meta[name="ga-measurement-id"]');
  if (!meta) return;

  var gaId = meta.getAttribute('content');
  if (!gaId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });

  try {
    var stored = window.localStorage.getItem('helthvibe-consent');
    if (stored === 'granted' || stored === 'denied') {
      gtag('consent', 'update', {
        ad_storage: stored,
        ad_user_data: stored,
        ad_personalization: stored,
        analytics_storage: stored,
        personalization_storage: stored
      });
    }
  } catch (e) {
    /* storage unavailable — stay in default denied state */
  }

  gtag('js', new Date());
  gtag('config', gaId);

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
  document.head.appendChild(script);
})();
