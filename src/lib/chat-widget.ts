/**
 * Quote-intake chat. A fixed script of questions with one AI call in the
 * middle that proposes up to two follow-ups tailored to what the visitor
 * described. If that call fails or returns nothing, the script simply
 * continues — the visitor never sees an error.
 *
 * The finished conversation is submitted through the same endpoint as the
 * contact form, so it lands in Mensajes and is emailed like any other lead.
 */
export const CHAT_RUNTIME = String.raw`
(function () {
  var S = window.__SITE__ || {};
  var C = S.chat;
  if (!C || !C.enabled) return;
  if (document.getElementById("__site_chat__")) return;

  var TIMELINE = ["Lo antes posible", "En 1 a 3 meses", "Todavía sin fecha"];

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  var state = null;
  function reset() {
    state = {
      step: 0,
      answers: {},
      extra: [],
      queue: [],
      current: null,
      busy: false,
      done: false
    };
  }
  reset();

  function boot() {
    /* ---------------------------- markup ---------------------------- */

    var mount = document.createElement("div");
    mount.id = "__site_chat__";
    mount.style.cssText =
      "position:fixed;right:20px;bottom:20px;z-index:2147483100;width:auto;height:auto";
    document.body.appendChild(mount);

    var root = mount.attachShadow ? mount.attachShadow({ mode: "open" }) : mount;

    var T = C.theme || {};
    function pick(key, fallback) {
      var v = T[key];
      return v === undefined || v === null || v === "" ? fallback : v;
    }
    var radius = Number(pick("radius", 16));
    var bubble = Number(pick("bubbleRadius", 14));
    var round = pick("launcherShape", "pill") === "circle";

    var style = document.createElement("style");
    style.textContent = [
      ":host { all: initial; }",
      ":host {",
      "  --surface: " + pick("surface", "#ffffff") + ";",
      "  --ink: " + pick("ink", "#111318") + ";",
      "  --on-ink: " + pick("onInk", "#ffffff") + ";",
      "  --accent: " + pick("accent", "#111318") + ";",
      "  --on-accent: " + pick("onAccent", "#ffffff") + ";",
      "  --highlight: " + pick("highlight", "#9aa4b0") + ";",
      "  --radius: " + radius + "px;",
      "  --bubble: " + bubble + "px;",
      "  --font: " + pick("fontFamily", "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif") + ";",
      "  --display: " + pick("displayFontFamily", "inherit") + ";",
      "}",
      "* { box-sizing: border-box; margin: 0; font-family: var(--font); }",
      ".launcher {",
      "  display: inline-flex; align-items: center; justify-content: center; gap: 8px;",
      "  position: relative; cursor: pointer; padding: 13px 20px; border: 0; border-radius: 999px;",
      "  background: var(--accent); color: var(--on-accent); font-size: 14px; font-weight: 600;",
      "  font-family: var(--display); letter-spacing: .04em; text-transform: uppercase;",
      "  box-shadow: 0 6px 20px rgba(0,0,0,.26);",
      "  transition: transform .2s cubic-bezier(.34,1.4,.64,1), box-shadow .2s ease;",
      "  animation: enter .45s cubic-bezier(.34,1.4,.64,1) both;",
      "}",
      // El texto tiene que poder partirse: un flex item no encoge por debajo de
      // su contenido, y por eso se desbordaba del círculo.
      ".launcher .label { min-width: 0; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }",
      ".launcher::after {",
      "  content: ''; position: absolute; inset: 0; border-radius: inherit;",
      "  box-shadow: 0 0 0 0 var(--accent); animation: ring 2.8s ease-out infinite 1.2s;",
      "  pointer-events: none;",
      "}",
      "@keyframes enter { from { opacity: 0; transform: scale(.6) translateY(12px); } to { opacity: 1; transform: none; } }",
      "@keyframes ring { 0% { box-shadow: 0 0 0 0 var(--accent); opacity: .55 } 70%, 100% { box-shadow: 0 0 0 18px var(--accent); opacity: 0 } }",
      ".launcher:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 10px 28px rgba(0,0,0,.32); }",
      ".launcher:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }",
      ".launcher .dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }",
      ".panel {",
      "  display: none; flex-direction: column; width: 370px; height: 540px;",
      "  max-height: calc(100vh - 40px); background: var(--surface); border-radius: var(--radius);",
      "  box-shadow: 0 14px 52px rgba(0,0,0,.30); overflow: hidden;",
      "}",
      ".open .panel { display: flex; }",
      ".open .launcher { display: none; }",
      ".head { display: flex; align-items: center; gap: 10px; padding: 16px; background: var(--ink); }",
      ".head h2 { font-size: 16px; font-weight: 600; color: var(--on-ink); font-family: var(--display); letter-spacing: .04em; text-transform: uppercase; }",
      ".head p { font-size: 11.5px; color: var(--highlight); margin-top: 2px; }",
      ".close { margin-left: auto; background: none; border: 0; cursor: pointer; color: var(--on-ink); opacity: .7; font-size: 20px; line-height: 1; padding: 4px 6px; border-radius: 6px; }",
      ".close:hover { opacity: 1; }",
      ".log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }",
      "@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }",
      ".msg { animation: pop .22s cubic-bezier(.34,1.3,.64,1) both; }",
      ".msg { max-width: 84%; padding: 11px 14px; border-radius: var(--bubble); font-size: 14px; line-height: 1.55; white-space: pre-wrap; word-wrap: break-word; }",
      ".bot { align-self: flex-start; background: var(--ink); color: var(--on-ink); }",
      ".me { align-self: flex-end; background: var(--accent); color: var(--on-accent); }",
      ".typing { display: inline-flex; gap: 4px; padding: 13px; }",
      ".typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--on-ink); opacity: .5; animation: b 1.1s infinite; }",
      ".typing i:nth-child(2) { animation-delay: .18s; } .typing i:nth-child(3) { animation-delay: .36s; }",
      "@keyframes b { 0%,60%,100% { opacity: .3 } 30% { opacity: 1 } }",
      ".opts { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 16px 12px; }",
      ".opts button {",
      "  border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer;",
      "  padding: 8px 14px; border-radius: 999px; font-size: 13px;",
      "}",
      ".opts button:hover { background: var(--accent); color: var(--on-accent); }",
      ".bar { display: flex; gap: 8px; padding: 12px; }",
      ".bar input {",
      "  flex: 1; min-width: 0; padding: 11px 13px; border: 1px solid rgba(0,0,0,.16);",
      "  border-radius: calc(var(--bubble) - 3px); font-size: 14px; color: var(--ink); background: #fff;",
      "}",
      ".bar input:focus { outline: none; border-color: var(--accent); }",
      ".bar button { border: 0; border-radius: calc(var(--bubble) - 3px); background: var(--accent); color: var(--on-accent); padding: 0 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--display); letter-spacing: .04em; text-transform: uppercase; }",
      ".bar button:disabled { opacity: .45; cursor: not-allowed; }",
      ".bar[hidden] { display: none; }",
      ".note { padding: 0 16px 14px; font-size: 11.5px; color: var(--ink); opacity: .65; line-height: 1.5; }",
      round ? ".launcher { width: 104px; height: 104px; border-radius: 50%; padding: 10px; flex-direction: column; gap: 0; font-size: 13px; line-height: 1.15; text-align: center; }" : "",
      round ? ".launcher .dot { display: none; }" : "",
      "@media (max-width: 460px) {",
      "  .panel { width: calc(100vw - 24px); height: calc(100vh - 90px); }",
      "  .launcher { padding: 11px 16px; font-size: 13px; }",
      // Un círculo de 104px se come el 27% del ancho de un teléfono y tapa
      // contenido. En pantalla chica vuelve a la píldora, que dice lo mismo
      // ocupando una fracción. En escritorio se respeta la forma elegida.
      round ? "  .launcher { width: auto; height: auto; border-radius: 999px; padding: 11px 16px; flex-direction: row; gap: 8px; font-size: 12.5px; line-height: 1; text-align: left; }" : "",
      round ? "  .launcher .dot { display: inline-block; }" : "",
      "}",
      "@media (prefers-reduced-motion: reduce) { *, .launcher, .launcher::after { animation: none !important; transition: none !important; } }",
      "@media print { :host { display: none; } }"
    ].join("\n");

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<button class="launcher" type="button"><span class="dot"></span><span class="label"></span></button>' +
      '<section class="panel" role="dialog" aria-modal="false" aria-label="Asistente de cotización">' +
      '  <header class="head"><div><h2></h2><p>Respuesta de un humano por correo</p></div>' +
      '    <button class="close" type="button" aria-label="Cerrar">&times;</button></header>' +
      '  <div class="log" role="log" aria-live="polite"></div>' +
      '  <div class="opts"></div>' +
      '  <form class="bar"><input type="text" autocomplete="off" placeholder="Escribe tu respuesta…">' +
      '    <button type="submit">Enviar</button></form>' +
      '  <p class="note"></p>' +
      "</section>";

    root.appendChild(style);
    root.appendChild(wrap);

    var launcher = wrap.querySelector(".launcher");
    var panel = wrap.querySelector(".panel");
    var log = wrap.querySelector(".log");
    var opts = wrap.querySelector(".opts");
    var bar = wrap.querySelector(".bar");
    var input = bar.querySelector("input");
    var note = wrap.querySelector(".note");

    wrap.querySelector(".launcher .label").textContent = C.launcherLabel || "Cotiza con IA";
    wrap.querySelector(".head h2").textContent = C.launcherLabel || "Cotiza con IA";

    /* ---------------------------- helpers ---------------------------- */

    var scrollPending = false;
    function scrollToEnd() {
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          scrollPending = false;
          log.scrollTop = log.scrollHeight;
        });
      });
    }

    function say(from, text) {
      var el = document.createElement("div");
      el.className = "msg " + (from === "me" ? "me" : "bot");
      el.textContent = text;
      log.appendChild(el);
      scrollToEnd();
      return el;
    }

    function thinking() {
      var el = document.createElement("div");
      el.className = "msg bot typing";
      el.innerHTML = "<i></i><i></i><i></i>";
      log.appendChild(el);
      scrollToEnd();
      return el;
    }

    function choices(list, onPick) {
      opts.innerHTML = "";
      bar.hidden = true;
      list.forEach(function (label) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.addEventListener("click", function () {
          opts.innerHTML = "";
          say("me", label);
          onPick(label);
        });
        opts.appendChild(b);
      });
      scrollToEnd();
    }

    var pendingText = null;
    function askText(placeholder, onAnswer) {
      opts.innerHTML = "";
      bar.hidden = false;
      input.placeholder = placeholder || "Escribe tu respuesta…";
      input.value = "";
      pendingText = onAnswer;
      scrollToEnd();
      if (panel.offsetParent !== null) input.focus();
    }

    bar.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var value = input.value.trim();
      if (!value || !pendingText || state.busy) return;
      var handler = pendingText;
      pendingText = null;
      input.value = "";
      say("me", value);
      handler(value);
    });

    /* ------------------------------ flow ------------------------------ */

    /**
     * Los mensajes del guion también pasan por el indicador de escritura. No
     * hace falta técnicamente, pero sin esa pausa aparecen de golpe y no se
     * alcanza a notar que el asistente respondió.
     */
    function botSay(text, done) {
      opts.innerHTML = "";
      bar.hidden = true;
      var bubble = thinking();
      var delay = Math.min(850, 280 + String(text).length * 7);

      setTimeout(function () {
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        say("bot", text);
        if (done) done();
      }, delay);
    }

    function start() {
      log.innerHTML = "";
      opts.innerHTML = "";
      reset();
      note.textContent = "";
      botSay(
        C.welcome || "Hola. Te hago unas preguntas rápidas para preparar tu cotización. No te doy precios automáticos — una persona revisa todo y te contesta.",
        askService
      );
    }

    function askService() {
      var list = (C.serviceOptions && C.serviceOptions.length)
        ? C.serviceOptions
        : ["Página web", "Tienda en línea", "App móvil", "Software a la medida", "Otra cosa"];
      botSay("¿Qué describe mejor lo que necesitas?", function () {
        choices(list, function (pick) {
          state.answers.servicio = pick;
          askDescription();
        });
      });
    }

    function askDescription() {
      botSay("Cuéntame en pocas palabras qué problema quieres resolver.", function () {
        askText("Describe tu proyecto…", function (text) {
          state.answers.descripcion = text;
          smartQuestions(text);
        });
      });
    }

    function smartQuestions(description) {
      state.busy = true;
      bar.hidden = true;
      var bubble = thinking();

      var done = function (questions) {
        state.busy = false;
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        state.queue = questions || [];
        nextSmart();
      };

      var timer = setTimeout(function () { done([]); }, 22000);

      fetch(C.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: state.answers.servicio || "", description: description })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          clearTimeout(timer);
          done(Array.isArray(data.questions) ? data.questions.slice(0, 2) : []);
        })
        .catch(function () {
          clearTimeout(timer);
          done([]);
        });
    }

    function nextSmart() {
      if (state.queue.length === 0) return askTimeline();
      state.current = state.queue.shift();
      botSay(state.current, function () {
        askText("Tu respuesta…", function (text) {
          state.extra.push({ label: state.current, text: text });
          state.current = null;
          nextSmart();
        });
      });
    }

    function askTimeline() {
      botSay("¿Para cuándo te gustaría tenerlo listo?", function () {
        choices(TIMELINE, function (pick) {
          state.answers.tiempo = pick;
          askName();
        });
      });
    }

    function askName() {
      botSay("¿Cómo te llamas?", function () {
        askText("Tu nombre…", function (text) {
          state.answers.nombre = text;
          askEmail();
        });
      });
    }

    function askEmail() {
      botSay("¿A qué correo te contactamos?", function () {
        askText("tu@correo.com", function (text) {
          if (!/^\S+@\S+\.\S+$/.test(text)) {
            return botSay("Ese correo no se ve válido. ¿Lo escribes de nuevo?", askEmail);
          }
          state.answers.email = text;
          askPhone();
        });
      });
    }

    function askPhone() {
      botSay("¿Y un WhatsApp o teléfono? Puedes escribir \"omitir\" si prefieres solo correo.", function () {
        askText("+52 …", function (text) {
          if (/^(omitir|no|ninguno|skip)$/i.test(text.trim())) {
            state.answers.telefono = "";
            return finish();
          }
          if (text.replace(/\D/g, "").length < 7) {
            return botSay("Ese número se ve incompleto. ¿Lo intentas otra vez?", askPhone);
          }
          state.answers.telefono = text;
          finish();
        });
      });
    }

    function summary() {
      var lines = [
        "Tipo de proyecto: " + (state.answers.servicio || "—"),
        "Qué necesita: " + (state.answers.descripcion || "—")
      ];
      state.extra.forEach(function (item) {
        lines.push(item.label + " " + item.text);
      });
      lines.push("Tiempo deseado: " + (state.answers.tiempo || "—"));
      lines.push("Nombre: " + (state.answers.nombre || "—"));
      lines.push("Correo: " + (state.answers.email || "—"));
      if (state.answers.telefono) lines.push("Teléfono: " + state.answers.telefono);
      return lines.join("\n");
    }

    /**
     * Antes de mandar nada, la persona ve el resumen y decide. Enviar en
     * automático deja la sensación de haber perdido el control de sus datos y
     * le quita la última oportunidad de corregir algo.
     */
    function finish() {
      bar.hidden = true;
      opts.innerHTML = "";
      botSay("Esto es lo que le voy a pasar al equipo:\n\n" + summary(), askToSend);
    }

    function askToSend() {
      botSay("¿Lo envío así, o quieres agregar algo más?", function () {
        choices(["Enviar información", "Agregar algo más"], function (pick) {
          if (pick === "Agregar algo más") return addMore();
          send();
        });
      });
    }

    function addMore() {
      botSay("Claro. ¿Qué más quieres que sepan?", function () {
        askText("Lo que quieras agregar…", function (text) {
          state.extra.push({ label: "Nota adicional", text: text });
          botSay("Anotado.", askToSend);
        });
      });
    }

    function send() {
      state.done = true;
      bar.hidden = true;
      opts.innerHTML = "";

      var payload = {
        _form: C.formName || "chat",
        _url: location.href,
        nombre: state.answers.nombre || "",
        email: state.answers.email || "",
        telefono: state.answers.telefono || "",
        mensaje: state.answers.descripcion || "",
        "tipo de proyecto": state.answers.servicio || "",
        "tiempo deseado": state.answers.tiempo || ""
      };
      state.extra.forEach(function (item, i) {
        payload["seguimiento " + (i + 1)] = item.label + " → " + item.text;
      });

      var bubble = thinking();

      fetch(S.formEndpoint || "/api/f/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
        .then(function (res) {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
          if (!res.r.ok || res.j.ok === false) throw new Error("send_failed");
          botSay("Enviado. Nadie te va a mandar un precio automático: una persona revisa tu caso y te contesta por correo.", function () {
            note.textContent = "Recibido. Puedes cerrar esta ventana.";
            choices(["Empezar de nuevo"], function () { start(); });
          });
        })
        .catch(function () {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
          botSay("No pude enviar tus datos. ¿Intentamos otra vez?", function () {
            choices(["Reintentar", "Agregar algo más"], function (pick) {
              if (pick === "Agregar algo más") return addMore();
              send();
            });
          });
        });
    }

    /* ---------------------------- open/close ---------------------------- */

    function open() {
      mount.classList.add("open");
      wrap.classList.add("open");
      if (log.children.length === 0) start();
      setTimeout(function () { if (!bar.hidden) input.focus(); }, 60);
    }

    function close() {
      mount.classList.remove("open");
      wrap.classList.remove("open");
    }

    launcher.addEventListener("click", open);
    wrap.querySelector(".close").addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && wrap.classList.contains("open")) close();
    });

    // When the chat replaces the contact form, take the static form off the page
    // so a visitor is not offered two ways to say the same thing.
    if (C.replacesForm) {
      Array.prototype.forEach.call(document.querySelectorAll("form[data-site-form]"), function (form) {
        var target = form.closest("[data-site-form-section]") || form;
        target.hidden = true;
        target.style.display = "none";
      });
    }
  }

})();
`;
