// Runs before first paint so the saved theme applies without a light flash.
// Kept as an external file because the CSP only allows script-src 'self'.
(function () {
  try {
    var mode = localStorage.getItem('uaeitjobs.theme') || 'system'
    var saved = localStorage.getItem('uaeitjobs.accent') || 'pink'
    var legacy = { indigo: 'blue', emerald: 'green', orange: 'pink' }
    var known = { pink: 1, blue: 1, teal: 1, green: 1, graphite: 1 }
    var accent = known[saved] ? saved : legacy[saved] || 'pink'
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    var root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.accent = accent
  } catch (e) {
    /* storage blocked — React applies the default on mount */
  }
})()
