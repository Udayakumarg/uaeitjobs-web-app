// Runs before first paint so the saved theme applies without a light flash.
// Kept as an external file because the CSP only allows script-src 'self'.
(function () {
  try {
    var mode = localStorage.getItem('uaeitjobs.theme') || 'system'
    var accent = localStorage.getItem('uaeitjobs.accent') || 'pink'
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    var root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.accent = accent
  } catch (e) {
    /* storage blocked — React applies the default on mount */
  }
})()
