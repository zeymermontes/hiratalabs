/**
 * Injected into every HTML page a landing serves. Keep it dependency-free,
 * ES5-safe and small — it runs on whatever the designer shipped.
 */
export const SITE_RUNTIME = `
(function () {
  var S = window.__SITE__ || {};

  function val(path) {
    if (!path) return "";
    return String(path).split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, S);
  }

  function hrefFor(key) {
    if (!key) return "";
    if (key === "email") return S.emailHref || "";
    if (key === "phone" || key === "tel") return S.phoneHref || "";
    if (key === "whatsapp" || key === "wa") return S.whatsappHref || "";
    if (key === "address" || key === "map") return S.addressHref || "";
    var direct = val(key);
    if (typeof direct === "string" && direct) return direct;
    return (S.socials && S.socials[key]) || "";
  }

  function hide(el) {
    if (el.hasAttribute("data-site-keep")) return;
    var target = el.closest("[data-site-hide-parent]") || el;
    target.hidden = true;
    target.style.display = "none";
  }

  function each(root, sel, fn) {
    Array.prototype.forEach.call(root.querySelectorAll(sel), fn);
  }

  function apply(root) {
    root = root || document;

    each(root, "[data-site]", function (el) {
      var v = val(el.getAttribute("data-site"));
      if (v == null || v === "") return hide(el);
      el.textContent = String(v);
    });

    each(root, "[data-site-href]", function (el) {
      var v = hrefFor(el.getAttribute("data-site-href"));
      if (!v) return hide(el);
      el.setAttribute("href", v);
    });

    // data-site-attr="src:custom.logo, alt:brandName"
    each(root, "[data-site-attr]", function (el) {
      el.getAttribute("data-site-attr").split(",").forEach(function (pair) {
        var i = pair.indexOf(":");
        if (i < 0) return;
        var attr = pair.slice(0, i).trim();
        var v = val(pair.slice(i + 1).trim());
        if (v) el.setAttribute(attr, String(v));
      });
    });
  }

  function statusEl(form, name) {
    return form.querySelector("[data-site-form-" + name + "]") ||
      document.querySelector("[data-site-form-" + name + "]");
  }

  function hidden(form, name, value) {
    if (form.querySelector('[name="' + name + '"]')) return;
    var i = document.createElement("input");
    i.type = "hidden";
    i.name = name;
    i.value = value;
    form.appendChild(i);
  }

  function bindForm(form) {
    if (form.__siteBound) return;
    form.__siteBound = true;

    if (!form.getAttribute("action")) form.setAttribute("action", S.formEndpoint || "/api/f/submit");
    if (!form.getAttribute("method")) form.setAttribute("method", "post");

    hidden(form, "_form", form.getAttribute("data-site-form") || "contact");
    hidden(form, "_ts", String(Date.now()));

    // Honeypot: real people never fill a field they cannot see.
    if (!form.querySelector('[name="_hp"]')) {
      var hp = document.createElement("input");
      hp.type = "text";
      hp.name = "_hp";
      hp.tabIndex = -1;
      hp.autocomplete = "off";
      hp.setAttribute("aria-hidden", "true");
      hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
      form.appendChild(hp);
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = statusEl(form, "success");
      var bad = statusEl(form, "error");
      var buttons = form.querySelectorAll('button, [type="submit"]');
      var payload = {};
      new FormData(form).forEach(function (v, k) {
        payload[k] = typeof v === "string" ? v : "";
      });

      form.setAttribute("data-state", "sending");
      if (ok) ok.hidden = true;
      if (bad) bad.hidden = true;
      Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });

      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
        .then(function (res) {
          if (!res.r.ok || res.j.ok === false) throw new Error(res.j.error || "send_failed");
          form.setAttribute("data-state", "sent");
          form.reset();
          if (ok) { ok.hidden = false; ok.style.display = ""; }
          var to = form.getAttribute("data-site-form-redirect");
          if (to) window.location.href = to;
          form.dispatchEvent(new CustomEvent("site:sent", { bubbles: true }));
        })
        .catch(function (err) {
          form.setAttribute("data-state", "error");
          if (bad) {
            bad.hidden = false;
            bad.style.display = "";
            if (bad.hasAttribute("data-site-form-error-text")) bad.textContent = String(err.message || err);
          }
          form.dispatchEvent(new CustomEvent("site:error", { bubbles: true, detail: err }));
        })
        .then(function () {
          Array.prototype.forEach.call(buttons, function (b) { b.disabled = false; });
        });
    });
  }

  /**
   * Floating widgets — WhatsApp buttons, chat bubbles, cookie bars — almost
   * always live in the bottom-right corner too. Find the ones that would sit
   * under the chip and stack above them instead of overlapping.
   */
  function obstacles(mount) {
    var found = [];
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scanned = 0;

    function consider(el) {
      if (scanned++ > 400) return;
      if (el === mount || mount.contains(el)) return;

      var cs;
      try { cs = getComputedStyle(el); } catch (e) { return; }
      if (cs.position !== "fixed" && cs.position !== "sticky") return;
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;

      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      // Skip full-screen overlays and page-wide bars: those are not FABs.
      if (r.width * r.height > vw * vh * 0.4) return;
      if (r.width > vw * 0.9) return;
      // Only what sits in the lower part of the screen can collide with us.
      if (r.bottom < vh * 0.5) return;

      found.push(r);
    }

    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      consider(kids[i]);
      var grand = kids[i].children;
      for (var j = 0; j < grand.length && j < 12; j++) consider(grand[j]);
    }
    return found;
  }

  // Touching at exactly the gap counts as clear, otherwise stacking above an
  // obstacle lands right back on it and the search gives up.
  function overlaps(a, b, pad) {
    return !(
      a.right + pad <= b.left ||
      a.left - pad >= b.right ||
      a.bottom + pad <= b.top ||
      a.top - pad >= b.bottom
    );
  }

  function place(mount, link) {
    var M = 16;
    var GAP = 10;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // An author can pin it explicitly: <body data-site-badge="left">
    var pinned = (document.body.getAttribute("data-site-badge") || "").toLowerCase();

    link.style.left = "auto";
    link.style.top = "auto";
    link.style.right = M + "px";
    link.style.bottom = M + "px";

    var size = link.getBoundingClientRect();
    var w = size.width;
    var h = size.height;
    if (!w || !h) return;

    if (pinned === "left" || pinned === "right") {
      if (pinned === "left") {
        link.style.right = "auto";
        link.style.left = M + "px";
      }
      return;
    }

    var blockers = obstacles(mount);
    if (blockers.length === 0) return;

    function boxAt(side, bottom) {
      var left = side === "right" ? vw - M - w : M;
      var top = vh - bottom - h;
      return { left: left, right: left + w, top: top, bottom: top + h };
    }

    function freeSide(side) {
      var bottom = M;
      // Climb over stacked widgets, but never crawl up the whole page.
      for (var step = 0; step < 4; step++) {
        var box = boxAt(side, bottom);
        var hit = null;
        for (var i = 0; i < blockers.length; i++) {
          if (overlaps(box, blockers[i], GAP)) {
            if (!hit || blockers[i].top < hit.top) hit = blockers[i];
          }
        }
        if (!hit) return bottom;
        bottom = vh - hit.top + GAP;
        if (bottom + h > vh * 0.6) return null;
      }
      return null;
    }

    var rightBottom = freeSide("right");
    if (rightBottom !== null) {
      link.style.bottom = Math.round(rightBottom) + "px";
      return;
    }

    var leftBottom = freeSide("left");
    if (leftBottom !== null) {
      link.style.right = "auto";
      link.style.left = M + "px";
      link.style.bottom = Math.round(leftBottom) + "px";
    }
    // Nothing free: stay bottom-right rather than land somewhere strange.
  }

  function poweredBy() {
    if (!S.poweredBy) return;
    if (document.getElementById("__platform_badge__")) return;

    var mount = document.createElement("div");
    mount.id = "__platform_badge__";
    document.body.appendChild(mount);

    // Shadow DOM so the landing's own CSS cannot restyle or break the chip.
    var root = mount.attachShadow ? mount.attachShadow({ mode: "open" }) : mount;
    var link = document.createElement("a");
    link.href = S.poweredByUrl || "/";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Powered by " + (S.poweredByName || "");

    var style = document.createElement("style");
    style.textContent = [
      ":host { all: initial; }",
      "a {",
      "  position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;",
      "  display: inline-flex; align-items: center; gap: 6px;",
      "  padding: 7px 13px; border-radius: 999px;",
      "  font: 500 12px/1 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;",
      "  letter-spacing: .01em; text-decoration: none; white-space: nowrap;",
      "  color: #fff; background: rgba(17,19,23,.88);",
      "  border: 1px solid rgba(255,255,255,.14);",
      "  box-shadow: 0 2px 10px rgba(0,0,0,.18);",
      "  backdrop-filter: saturate(180%) blur(8px);",
      "  opacity: .72; transition: opacity .18s ease, transform .18s ease, bottom .2s ease, left .2s ease;",
      "}",
      "a:hover, a:focus-visible { opacity: 1; transform: translateY(-1px); }",
      "a:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }",
      "@media (prefers-reduced-motion: reduce) { a { transition: none; } }",
      "@media print { a { display: none; } }",
    ].join("\\n");

    root.appendChild(style);
    root.appendChild(link);

    var timer = null;
    function reposition() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { place(mount, link); }, 120);
    }

    place(mount, link);
    window.addEventListener("resize", reposition);

    // Chat widgets and cookie bars usually arrive after load, so keep looking
    // for a while instead of deciding once.
    if (window.MutationObserver) {
      var mo = new MutationObserver(reposition);
      mo.observe(document.body, { childList: true });
      setTimeout(function () { mo.disconnect(); }, 20000);
    }
    [600, 1500, 4000, 9000].forEach(function (ms) { setTimeout(reposition, ms); });
  }

  function init() {
    apply(document);
    each(document, "form[data-site-form]", bindForm);
    poweredBy();
  }

  window.__SITE_APPLY__ = apply;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`.trim();
