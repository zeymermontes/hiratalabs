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

  function init() {
    apply(document);
    each(document, "form[data-site-form]", bindForm);
  }

  window.__SITE_APPLY__ = apply;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`.trim();
