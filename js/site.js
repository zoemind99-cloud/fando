(function () {
  var DEFAULTS = {
    nav: {
      logo: "/public/images/9b7dee20-3ed5-4c0e-b1e2-aa1c324e60d0.png",
      logoAlt: "WLAND FANDOR MEDIA",
      links: [
        { href: "/about", label: "關於我們", id: "about" },
        { href: "/articles", label: "文章分享", id: "articles" },
        { href: "/creators", label: "創作者專區", id: "creators" },
        { href: "/partners", label: "品牌商合作", id: "partners" }
      ],
      cta: { label: "立即加入", href: "/creators#join" }
    },
    footer: {
      tagline: "讓每一位創作者，都能輕鬆開團變現。精選商品、專屬團購連結、即時銷售數據，從曝光到成交一次完成。",
      company: "故事行銷顧問股份有限公司",
      taxId: "93488152",
      copyright: "© 2026 FANDOR. All rights reserved.",
      quickLinksHeading: "快速連結",
      contactHeading: "聯絡我們",
      quickLinks: [
        { href: "/", label: "首頁" },
        { href: "/about", label: "關於我們" },
        { href: "/articles", label: "文章分享" },
        { href: "/creators", label: "創作者專區" },
        { href: "/partners", label: "品牌商合作" }
      ],
      contact: [
        { type: "email", label: "hstoryteller@starpost.io", href: "mailto:hstoryteller@starpost.io" },
        { type: "link", label: "fandor.co", href: "https://fandor.co" }
      ]
    }
  };

  var content = window.FANDOR_CONTENT || {};
  var nav = content.site && content.site.nav ? content.site.nav : DEFAULTS.nav;
  var footer = content.site && content.site.footer ? content.site.footer : DEFAULTS.footer;

  function activeId() {
    return document.body.getAttribute("data-page") || "";
  }

  function navLinks(cls) {
    var id = activeId();
    return (nav.links || []).map(function (item) {
      var active = item.id === id ? " " + cls + "--active" : "";
      return '<a href="' + item.href + '" class="' + cls + active + '">' + item.label + "</a>";
    }).join("");
  }

  function renderHeader() {
    var mount = document.getElementById("site-header");
    if (!mount) return;
    var cta = nav.cta || DEFAULTS.nav.cta;
    mount.innerHTML =
      '<header class="top-app-bar" role="banner" id="top-app-bar">' +
      '  <div class="top-app-bar__inner">' +
      '    <a href="/" class="top-app-bar__logo" aria-label="FANDOR 首頁"><img src="' + nav.logo + '" alt="' + (nav.logoAlt || "") + '" /></a>' +
      '    <nav class="top-app-bar__nav" aria-label="主要導航">' + navLinks("top-app-bar__link") + "</nav>" +
      '    <div class="top-app-bar__actions">' +
      '      <a href="' + cta.href + '" class="btn btn--filled">' + cta.label + "</a>" +
      '      <button type="button" class="icon-btn menu-btn" aria-label="開啟選單" aria-expanded="false" aria-controls="mobile-drawer" id="menu-open">' +
      '        <span class="material-symbols-outlined" aria-hidden="true">menu</span>' +
      "      </button>" +
      "    </div>" +
      "  </div>" +
      "</header>" +
      '<div class="drawer-overlay" id="drawer-overlay" hidden></div>' +
      '<nav class="drawer" id="mobile-drawer" aria-label="行動版選單" hidden>' +
      '  <button type="button" class="icon-btn" aria-label="關閉選單" id="menu-close" style="align-self:flex-end">' +
      '    <span class="material-symbols-outlined" aria-hidden="true">close</span>' +
      "  </button>" +
      navLinks("drawer__link") +
      '  <a href="' + cta.href + '" class="btn btn--filled btn--large" style="margin-top:12px">' + cta.label + "</a>" +
      "</nav>";
  }

  function renderFooter() {
    var mount = document.getElementById("site-footer");
    if (!mount) return;
    var quickLinks = (footer.quickLinks || [])
      .map(function (l) {
        return "<li><a href=\"" + l.href + "\">" + l.label + "</a></li>";
      })
      .join("");
    var contact = (footer.contact || [])
      .map(function (c) {
        var attrs = c.href.indexOf("http") === 0 ? ' target="_blank" rel="noopener"' : "";
        return "<li><a href=\"" + c.href + "\"" + attrs + ">" + c.label + "</a></li>";
      })
      .join("");

    mount.innerHTML =
      '<footer class="footer" role="contentinfo">' +
      '  <div class="container footer__grid">' +
      "    <div>" +
      '      <div class="footer__logo"><img src="' + nav.logo + '" alt="' + (nav.logoAlt || "") + '" /></div>' +
      '      <p class="footer__tagline">' + footer.tagline + "</p>" +
      '      <p class="footer__meta">' + footer.company + "<br />統編 " + footer.taxId + "</p>" +
      "    </div>" +
      "    <div>" +
      '      <h3 class="footer__heading">' + (footer.quickLinksHeading || "快速連結") + "</h3>" +
      '      <ul class="footer__links">' + quickLinks + "</ul>" +
      "    </div>" +
      "    <div>" +
      '      <h3 class="footer__heading">' + (footer.contactHeading || "聯絡我們") + "</h3>" +
      '      <ul class="footer__links">' + contact + "</ul>" +
      "    </div>" +
      "  </div>" +
      '  <div class="container footer__bottom">' + footer.copyright + "</div>" +
      "</footer>";
  }

  function bindDrawer() {
    var openBtn = document.getElementById("menu-open");
    var closeBtn = document.getElementById("menu-close");
    var drawer = document.getElementById("mobile-drawer");
    var overlay = document.getElementById("drawer-overlay");
    if (!openBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.hidden = false;
      overlay.hidden = false;
      requestAnimationFrame(function () {
        drawer.classList.add("drawer--open");
        overlay.classList.add("drawer-overlay--open");
      });
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
      drawer.classList.remove("drawer--open");
      overlay.classList.remove("drawer-overlay--open");
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      setTimeout(function () {
        drawer.hidden = true;
        overlay.hidden = true;
      }, 250);
    }

    openBtn.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("drawer--open")) closeDrawer();
    });
  }

  function bindScrollShadow() {
    var bar = document.getElementById("top-app-bar");
    if (!bar) return;
    function onScroll() {
      bar.classList.toggle("top-app-bar--scrolled", window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function bindHistory() {
    var root = document.getElementById("history-carousel");
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll(".history-slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll("[data-history-dot]"));
    var idx = 0;

    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle("history-slide--active", n === idx);
      });
      dots.forEach(function (d, n) {
        d.setAttribute("aria-current", n === idx ? "true" : "false");
      });
    }

    var prev = root.querySelector("[data-history-prev]");
    var next = root.querySelector("[data-history-next]");
    if (prev) prev.addEventListener("click", function () { show(idx - 1); });
    if (next) next.addEventListener("click", function () { show(idx + 1); });
    dots.forEach(function (d, n) {
      d.addEventListener("click", function () { show(n); });
    });
    show(0);
  }

  function bindKolCarousel() {
    var carousel = document.getElementById("kol-carousel");
    var chipsRoot = document.getElementById("kol-chips");
    if (!carousel || !chipsRoot) return;

    var cards = Array.prototype.slice.call(carousel.querySelectorAll(".kol-card"));
    var chips = Array.prototype.slice.call(chipsRoot.querySelectorAll(".kol-chip"));
    var active = 0;

    function scrollToIndex(i) {
      active = Math.max(0, Math.min(i, cards.length - 1));
      var card = cards[active];
      if (!card) return;
      var offset = card.offsetLeft - carousel.offsetLeft - 16;
      carousel.scrollTo({ left: offset, behavior: "smooth" });
      chips.forEach(function (chip, n) {
        chip.classList.toggle("kol-chip--active", n === active);
      });
      var chip = chips[active];
      if (chip) {
        chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    chips.forEach(function (chip, n) {
      chip.addEventListener("click", function () { scrollToIndex(n); });
    });

    var prev = document.querySelector("[data-kol-scroll='prev']");
    var next = document.querySelector("[data-kol-scroll='next']");
    if (prev) prev.addEventListener("click", function () { scrollToIndex(active - 1); });
    if (next) next.addEventListener("click", function () { scrollToIndex(active + 1); });
  }

  function bindForms() {
    document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        alert("已收到申請（示意）。正式上線後將串接表單後端。");
        form.reset();
      });
    });
  }

  renderHeader();
  renderFooter();
  bindDrawer();
  bindScrollShadow();
  bindHistory();
  bindKolCarousel();
  bindForms();
})();
