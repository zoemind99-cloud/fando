(function () {
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  var drawer = document.getElementById('mobile-drawer');
  var overlay = document.getElementById('drawer-overlay');

  if (!openBtn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(function () {
      drawer.classList.add('drawer--open');
      overlay.classList.add('drawer-overlay--open');
    });
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('drawer--open');
    overlay.classList.remove('drawer-overlay--open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () {
      drawer.hidden = true;
      overlay.hidden = true;
    }, 250);
  }

  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('drawer--open')) {
      closeDrawer();
    }
  });
})();
