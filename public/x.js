/* Xtreme Marketing website snippet v3.0
   Paste on every page of the company website (Zoho Sites › Settings › Header code):
     <script async src="https://xtrememarketinghub.netlify.app/x.js" data-wa="971503641714" data-quote="1"></script>
   - Counts page views, visitors and where they came from (no cookies, no personal data).
   - Counts WhatsApp, call and email clicks so you can see which pages bring enquiries.
   - data-wa="number"  adds a floating WhatsApp button.
   - data-quote="1"    adds a "Free quote" button; requests go straight into the app's Leads.
   - data-side="left"  puts the buttons on the left. */
(function () {
  "use strict";
  var me = document.currentScript || document.querySelector('script[src*="/x.js"]');
  if (!me || window.__xtreme) return;
  window.__xtreme = true;
  var API = new URL(me.src).origin + "/api/";
  var cfg = { wa: (me.getAttribute("data-wa") || "").replace(/\D/g, ""), quote: me.getAttribute("data-quote") === "1", side: me.getAttribute("data-side") === "left" ? "left" : "right" };
  function store(kind, k, v) { try { var s = window[kind]; if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; } }

  /* session + first visit, without cookies */
  var newSession = !store("sessionStorage", "xt_s"), newVisitor = !store("localStorage", "xt_v");
  store("sessionStorage", "xt_s", "1"); store("localStorage", "xt_v", "1");
  var utm = null;
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("utm_source") || q.get("utm_campaign")) {
      utm = { source: q.get("utm_source") || "", medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "" };
      store("sessionStorage", "xt_u", JSON.stringify(utm));
    } else utm = JSON.parse(store("sessionStorage", "xt_u") || "null");
  } catch (e) {}

  function send(path, data) {
    var body = JSON.stringify(data);
    try { if (navigator.sendBeacon && navigator.sendBeacon(API + path, body)) return; } catch (e) {}
    try { fetch(API + path, { method: "POST", body: body, keepalive: true, mode: "cors" }); } catch (e) {}
  }
  function track(e) { send("t", { e: e || "pv", p: location.pathname, r: document.referrer, s: e ? 0 : newSession ? 1 : 0, v: newVisitor ? 1 : 0, u: newSession ? utm : null, w: window.innerWidth, h: location.host }); }
  track();
  window.xtreme = { track: track };

  /* which links lead to an enquiry */
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/wa\.me|whatsapp\.com|api\.whatsapp/i.test(h)) track("wa");
    else if (/^tel:/i.test(h)) track("call");
    else if (/^mailto:/i.test(h)) track("mail");
  }, true);

  if (!cfg.wa && !cfg.quote) return;

  /* floating buttons + quote form, isolated in a shadow root so the website's CSS can't break them */
  var host = document.createElement("div");
  host.setAttribute("data-xtreme", "");
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  var SERVICES = ["Regular cleaning", "Deep cleaning", "Move-in / move-out cleaning", "Post-construction cleaning", "Carpet & upholstery cleaning", "AC duct cleaning", "Pest control", "Water tank cleaning", "Facilities management", "Something else"];
  var WA_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.3-4.4A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.8c.3 2.6 2.6 5 5.2 5.4l1.1-1.2 1.8.9c-.2 1-1 1.8-2 1.8-3.8-.2-7.3-3.7-7.5-7.5 0-1 .8-1.8 1.8-2l.9 1.8z"/></svg>';
  var side = cfg.side;
  root.innerHTML =
    '<style>' +
    ':host{all:initial}*{box-sizing:border-box;font-family:Poppins,"Segoe UI",Helvetica,Arial,sans-serif}' +
    '.dock{position:fixed;' + side + ':16px;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;align-items:' + (side === "left" ? "flex-start" : "flex-end") + ';gap:10px}' +
    '.fab{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 18px;border-radius:26px;border:0;cursor:pointer;font-size:15px;font-weight:700;box-shadow:0 10px 28px rgba(0,0,0,.35);text-decoration:none}' +
    '.fab:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #F6DE9E;outline-offset:2px}' +
    '.quote{background:linear-gradient(135deg,#F6DE9E,#D4AF5A 55%,#A8842F);color:#120F08}' +
    '.wa{width:56px;height:56px;padding:0;justify-content:center;border-radius:50%;background:#25D366;color:#fff}' +
    '.panel{position:fixed;' + side + ':16px;bottom:84px;z-index:2147483001;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 110px);overflow:auto;background:#0B0B0C;color:#F6F0E3;border:1px solid rgba(212,175,90,.45);border-radius:16px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.5)}' +
    '.panel[hidden]{display:none}h2{margin:0 0 2px;font-size:19px}p{margin:0 0 12px;font-size:13.5px;color:#C9C0AC;line-height:1.45}' +
    'label{display:block;font-size:12.5px;font-weight:600;color:#C9C0AC;margin:10px 0 5px}' +
    'input,select,textarea{width:100%;font-size:16px;color:#F6F0E3;background:#151412;border:1px solid #3a3326;border-radius:10px;padding:11px 12px;min-height:46px}textarea{min-height:76px;resize:vertical}' +
    '.go{width:100%;margin-top:14px;height:50px;border:0;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#F6DE9E,#D4AF5A 55%,#A8842F);color:#120F08}' +
    '.go:disabled{opacity:.6}.x{float:right;border:0;background:none;color:#C9C0AC;font-size:22px;line-height:1;cursor:pointer;width:36px;height:36px;margin:-8px -8px 0 0}' +
    '.err{color:#FF8A82;font-size:13.5px;font-weight:600;margin:10px 0 0;min-height:1em}.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '.done{text-align:center;padding:10px 0}.done b{display:block;font-size:18px;margin-bottom:6px}.done a{display:inline-flex;margin-top:12px;align-items:center;gap:8px;background:#25D366;color:#fff;border-radius:12px;padding:12px 16px;font-weight:700;text-decoration:none}' +
    '@media (prefers-reduced-motion:no-preference){.panel{animation:in .25s ease}}@keyframes in{from{opacity:0;transform:translateY(10px)}}' +
    '</style>' +
    '<div class="dock">' +
    (cfg.quote ? '<button class="fab quote" type="button" id="q" aria-expanded="false" aria-controls="panel">Free quote</button>' : "") +
    (cfg.wa ? '<a class="fab wa" id="w" href="https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent("Hello Xtreme, I'd like a quote please.") + '" target="_blank" rel="noopener" aria-label="Chat with Xtreme on WhatsApp">' + WA_ICON + '</a>' : "") +
    '</div>' +
    (cfg.quote ? '<div class="panel" id="panel" role="dialog" aria-modal="false" aria-labelledby="qt" hidden><button class="x" type="button" id="x" aria-label="Close">×</button>' +
      '<form id="f" novalidate><h2 id="qt">Get your free quote</h2><p>Tell us what you need. We reply on WhatsApp, usually within the hour.</p>' +
      '<label for="n">Your name</label><input id="n" name="name" autocomplete="name" required>' +
      '<label for="ph">WhatsApp number</label><input id="ph" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="050 123 4567" required>' +
      '<label for="sv">Service</label><select id="sv" name="service">' + SERVICES.map(function (s) { return "<option>" + s + "</option>"; }).join("") + '</select>' +
      '<label for="ar">Area</label><input id="ar" name="area" placeholder="e.g. Al Reem Island" autocomplete="address-level2">' +
      '<label for="m">Anything else? (optional)</label><textarea id="m" name="msg" placeholder="Property type, size, preferred date"></textarea>' +
      '<input class="hp" id="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="go" type="submit" id="go">Send request</button><p class="err" id="err" role="alert"></p></form></div>' : "");
  (document.body || document.documentElement).appendChild(host);

  var $ = function (id) { return root.getElementById ? root.getElementById(id) : root.querySelector("#" + id); };
  if ($("w")) $("w").addEventListener("click", function () { track("wa"); });
  if (!cfg.quote) return;
  var opened = 0, panel = $("panel"), btn = $("q");
  function toggle(open) {
    panel.hidden = !open; btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { opened = Date.now(); setTimeout(function () { try { $("n").focus(); } catch (e) {} }, 30); } else btn.focus();
  }
  btn.addEventListener("click", function () { toggle(panel.hidden); });
  $("x").addEventListener("click", function () { toggle(false); });
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
  $("f").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("err"), go = $("go");
    var data = { name: $("n").value.trim(), phone: $("ph").value.trim(), service: $("sv").value, area: $("ar").value.trim(), msg: $("m").value.trim(), hp: $("hp").value, t: Date.now() - opened, page: location.pathname, h: location.host };
    if (!data.name || data.phone.replace(/\D/g, "").length < 7) { err.textContent = "Please add your name and WhatsApp number."; return; }
    go.disabled = true; go.textContent = "Sending…"; err.textContent = "";
    fetch(API + "lead", { method: "POST", body: JSON.stringify(data), mode: "cors" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "Couldn't send. Please try WhatsApp."); return d; });
    }).then(function (d) {
      $("f").innerHTML = '<div class="done"><b>Thank you, ' + data.name.replace(/[<>&"]/g, "") + '!</b><p>We have your request and will message you on WhatsApp shortly.</p>' +
        (d.wa ? '<a href="' + d.wa + '" target="_blank" rel="noopener">' + WA_ICON + 'Chat now on WhatsApp</a>' : "") + "</div>";
    }).catch(function (x) { err.textContent = x.message; go.disabled = false; go.textContent = "Send request"; });
  });
})();
