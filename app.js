/* ============================================================
   Programlama 1 – Vize Çalışma Sitesi (saf JS, derleme gerektirmez)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- yardımcılar ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem("p1_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("p1_" + k, JSON.stringify(v)); } catch (e) { /* yoksay */ } }
  };
  const DIFF = { 1: "Kolay", 2: "Orta", 3: "Zor" };
  const topicById = (id) => TOPICS.find((t) => t.id === id);
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  /* ---------- C# renklendirme ---------- */
  const KW = /\b(using|namespace|internal|class|static|void|string|int|double|decimal|bool|char|byte|short|long|float|object|uint|ulong|ushort|sbyte|if|else|while|do|for|foreach|return|new|true|false|var|const)\b/;
  function highlight(code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')|(\b\d+(?:\.\d+)?m?\b)|([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü]*)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="cm">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="st">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="nu">' + esc(m[3]) + "</span>";
      else if (KW.test(m[4])) {
        const isType = /^(string|int|double|decimal|bool|char|byte|short|long|float|object|uint|ulong|ushort|sbyte|var)$/.test(m[4]);
        out += '<span class="' + (isType ? "ty" : "kw") + '">' + esc(m[4]) + "</span>";
      } else out += esc(m[4]);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  const codeBlock = (c) => '<pre class="code"><code style="background:none;border:0;padding:0;color:inherit;font-size:inherit">' + highlight(c) + "</code></pre>";

  /* ---------- blokları HTML'e çevir ---------- */
  function renderBlock(b, i, attrs) {
    const a = attrs ? ` data-b="${i}"` : "";
    switch (b.t) {
      case "h": return `<h3${a} class="blk">${fmt(b.x)}</h3>`;
      case "p": return `<p${a} class="blk">${fmt(b.x)}</p>`;
      case "tip": return `<div${a} class="tip blk">💡 ${fmt(b.x)}</div>`;
      case "code": return codeBlock(b.x);
      case "list": return `<ul${a} class="blk">${b.x.map((x) => "<li>" + fmt(x) + "</li>").join("")}</ul>`;
      case "table": return `<div${a} class="tbl blk"><table><thead><tr>${b.head.map((h) => "<th>" + esc(h) + "</th>").join("")}</tr></thead><tbody>${b.rows.map((r) => "<tr>" + r.map((c) => "<td>" + fmt(c) + "</td>").join("") + "</tr>").join("")}</tbody></table></div>`;
    }
    return "";
  }

  /* ============================================================
     SESLİ OKUMA (tarayıcının Web Speech API'si – internetsiz de çalışır)
     ============================================================ */
  function opsToWords(c) {
    return c
      .replace(/!=/g, " eşit değildir ").replace(/<=/g, " küçük eşittir ").replace(/>=/g, " büyük eşittir ")
      .replace(/==/g, " çift eşittir ").replace(/&&/g, " ve ").replace(/\|\|/g, " veya ")
      .replace(/\+\+/g, " artı artı ").replace(/--/g, " eksi eksi ").replace(/\+=/g, " artı eşittir ")
      .replace(/-=/g, " eksi eşittir ").replace(/\*=/g, " çarpı eşittir ").replace(/%/g, " mod ")
      .replace(/\*/g, " çarpı ").replace(/\//g, " bölü ").replace(/\+/g, " artı ").replace(/</g, " küçüktür ")
      .replace(/>/g, " büyüktür ").replace(/=/g, " eşittir ").replace(/(\w)\.(\w)/g, "$1 nokta $2")
      .replace(/[(){};"]/g, " ").replace(/\s+/g, " ");
  }
  function tts(s) {
    return s.replace(/`([^`]+)`/g, (m, c) => " " + opsToWords(c) + " ")
      .replace(/\*\*/g, "").replace(/→/g, " sonra ").replace(/≡/g, " eşdeğerdir ").replace(/…/g, " ile ")
      .replace(/[·—]/g, ", ").replace(/💡/g, "").replace(/\s+/g, " ").trim();
  }
  function chunkText(s, max = 190) {
    const parts = s.split(/(?<=[.!?:;])\s+/), out = [];
    let cur = "";
    for (const p of parts) {
      if ((cur + " " + p).length > max && cur) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
    }
    if (cur) out.push(cur);
    return out;
  }
  const blockSpeech = (b) => {
    switch (b.t) {
      case "h": return "Başlık: " + tts(b.x) + ".";
      case "p": return tts(b.x);
      case "tip": return "Dikkat. " + tts(b.x);
      case "list": return b.x.map((x) => tts(x) + ".").join(" ");
      case "table": return b.say ? tts(b.say) : "";
      default: return ""; // kod blokları okunmaz
    }
  };

  const Speech = {
    synth: window.speechSynthesis || null,
    voices: [], voiceURI: store.get("voice", ""), rate: store.get("rate", 1),
    queue: [], idx: 0, playing: false, token: 0, onChange: null,
    supported() { return !!this.synth && typeof SpeechSynthesisUtterance !== "undefined"; },
    load() {
      if (!this.supported()) return;
      const get = () => { this.voices = this.synth.getVoices(); if (this.onChange) this.onChange("voices"); };
      get(); this.synth.onvoiceschanged = get;
    },
    trVoices() { return this.voices.filter((v) => /^tr/i.test(v.lang)); },
    pickVoice() {
      const tr = this.trVoices();
      return this.voices.find((v) => v.voiceURI === this.voiceURI) || tr.find((v) => /natural|online|neural/i.test(v.name)) || tr[0] || null;
    },
    setQueue(q, start = 0) { this.stop(); this.ended = false; this.queue = q; this.idx = start; if (this.onChange) this.onChange("idx"); },
    speakCurrent() {
      if (!this.supported() || !this.queue.length) return;
      const my = ++this.token;
      this.synth.cancel();
      const item = this.queue[this.idx];
      const u = new SpeechSynthesisUtterance(item.text);
      u.lang = "tr-TR"; u.rate = this.rate;
      const v = this.pickVoice(); if (v) u.voice = v;
      u.onend = () => { if (my !== this.token || !this.playing) return; this.next(true); };
      u.onerror = (e) => { if (my !== this.token) return; if (e.error === "interrupted" || e.error === "canceled") return; this.playing = false; if (this.onChange) this.onChange("state"); };
      this.synth.speak(u);
      if (this.onChange) this.onChange("idx");
    },
    play() { if (!this.queue.length) return; if (this.ended) { this.idx = 0; this.ended = false; } this.playing = true; if (this.onChange) this.onChange("state"); this.speakCurrent(); },
    pause() { this.playing = false; this.token++; if (this.supported()) this.synth.cancel(); if (this.onChange) this.onChange("state"); },
    stop() { this.playing = false; this.token++; if (this.supported()) this.synth.cancel(); if (this.onChange) this.onChange("state"); },
    next(auto) {
      if (this.idx < this.queue.length - 1) { this.idx++; if (this.playing) this.speakCurrent(); else if (this.onChange) this.onChange("idx"); }
      else if (auto) { this.playing = false; this.ended = true; this.token++; if (this.onChange) this.onChange("done"); }
    },
    prev() { if (this.idx > 0) { this.idx--; if (this.playing) this.speakCurrent(); else if (this.onChange) this.onChange("idx"); } },
    jump(i) { this.idx = Math.max(0, Math.min(this.queue.length - 1, i)); if (this.playing) this.speakCurrent(); else if (this.onChange) this.onChange("idx"); },
    say(text) { // tek seferlik (kart okuma)
      if (!this.supported()) return; this.stop(); const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; u.rate = this.rate;
      const v = this.pickVoice(); if (v) u.voice = v; this.synth.speak(u);
    }
  };
  Speech.load();

  /* Dinleme kuyruğu: mode = "ozet" | "detay", scope = "all" | topicId */
  function buildQueue(mode, scope) {
    const topics = scope === "all" ? TOPICS : [topicById(scope)];
    const q = [];
    topics.forEach((t) => {
      q.push({ topic: t.id, b: -1, text: `Konu ${t.no}. ${t.title}.` });
      if (mode === "ozet") {
        t.summary.forEach((s, i) => chunkText(tts(s) + ".").forEach((c) => q.push({ topic: t.id, b: i, text: c })));
      } else {
        t.detail.forEach((b, i) => { const sp = blockSpeech(b); if (sp) chunkText(sp).forEach((c) => q.push({ topic: t.id, b: i, text: c })); });
      }
    });
    return q;
  }

  /* ============================================================
     YÖNLENDİRME
     ============================================================ */
  const ICONS = {
    panel: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    ozet: '<path d="M5 4h14M5 9h14M5 14h9M5 19h6"/>',
    anlatim: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6M9 12h6"/>',
    dinle: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    kartlar: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/>',
    deneme: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>'
  };
  const ROUTES = [
    ["panel", "Panel"], ["ozet", "Özet"], ["anlatim", "Anlatım"], ["dinle", "Dinle"], ["kartlar", "Kartlar"], ["deneme", "Deneme"]
  ];
  $("#nav").innerHTML = ROUTES.map(([k, l]) => `<a href="#/${k}" data-r="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}</a>`).join("");

  let cleanup = null;
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const params = {}; (qs || "").split("&").forEach((p) => { if (p) { const [k, v] = p.split("="); params[k] = decodeURIComponent(v || ""); } });
    return { path: path || "panel", params };
  }
  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { /* */ } cleanup = null; }
    const { path, params } = parseHash();
    const r = PAGES[path] ? path : "panel";
    $$("#nav a").forEach((a) => a.setAttribute("aria-current", a.dataset.r === r ? "page" : "false"));
    const old = $("#view"); const view = old.cloneNode(false); old.replaceWith(view); // eski dinleyicileri temizle
    cleanup = PAGES[r](view, params) || null;
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* tema */
  (function theme() {
    const saved = store.get("theme", null);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $("#themeBtn").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next); store.set("theme", next);
    });
  })();

  /* ============================================================
     SAYFALAR
     ============================================================ */
  const PAGES = {};

  /* ---------- PANEL ---------- */
  PAGES.panel = (v) => {
    const cards = store.get("cards", {});
    const totalCards = TOPICS.reduce((n, t) => n + t.cards.length, 0);
    const known = Object.values(cards).filter((x) => x === "k").length;
    const hist = store.get("history", []);
    const best = hist.length ? Math.max(...hist.map((h) => Math.round((h.correct / h.count) * 100))) : null;
    const plan = store.get("plan", {});
    const PLAN = [
      ["Tüm yazılı özetleri oku", "≈ 30 dk · Özet sekmesi, 9 konunun hepsi"],
      ["Ayrıntılı anlatım: Konu 1–4", "≈ 45 dk · algoritma, değişken, veri tipleri, operatörler"],
      ["Ayrıntılı anlatım: Konu 5–9", "≈ 60 dk · giriş/çıkış, if, while, for, hata türleri. Kodları elle izle!"],
      ["Bilgi kartlarında bir tam tur", "≈ 30 dk · bilmediklerini “Tekrar” yap"],
      ["50 soruluk karışık deneme", "≈ 50 dk · anında geri bildirim kapalı olsun"],
      ["Yanlışlarını tekrar çöz + “Tekrar” kartları", "≈ 30 dk · Deneme sonuç ekranında tek tuş"],
      ["Yatmadan önce sesli özeti dinle", "≈ 20 dk · Dinle sekmesi → Özet"],
      ["Sabah: 100 soruluk zor/karışık deneme + son bakış", "≈ 60 dk · %90 üzeri hedef"]
    ];
    v.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Programlama 1 · C# · Vize</div>
        <h1>Yarına kadar vizeye hazırsın.</h1>
        <p>Kendi ders dosyalarından (Değişkenler, While’dan For’a, operatörler, veri tipleri, kek tarifi akış diyagramı ve Hafta 3–6 uygulamaları) hazırlanan özet, anlatım, sesli ders, kartlar ve ${QUESTIONS.length} soruluk ayarlanabilir deneme.</p>
        <div class="row"><a class="btn" href="#/deneme">Denemeye başla</a><a class="btn sec" href="#/ozet">Özeti oku</a><a class="btn sec" href="#/dinle?mode=ozet&topic=all">Sesli özeti dinle</a></div>
      </section>
      <div class="stats">
        <div class="card stat"><b>${known}/${totalCards}</b><span>bilinen kart</span></div>
        <div class="card stat"><b>${hist.length}</b><span>çözülen deneme</span></div>
        <div class="card stat"><b>${best === null ? "—" : "%" + best}</b><span>en iyi sonuç</span></div>
        <div class="card stat"><b>${QUESTIONS.length}</b><span>soru bankası</span></div>
      </div>
      <h2>Bugünün planı</h2>
      <div class="card plan" id="plan">${PLAN.map((p, i) => `<label><input type="checkbox" data-i="${i}" ${plan[i] ? "checked" : ""}><span><strong>${esc(p[0])}</strong><small>${esc(p[1])}</small></span></label>`).join("")}</div>
      <h2>Konular</h2>
      <div class="grid cols3">${TOPICS.map((t) => `<a class="card topic-tile" href="#/anlatim?topic=${t.id}"><span class="no">${t.no}</span><strong>${esc(t.title)}</strong><span class="muted" style="font-size:.85rem">${esc(t.week)} · ${t.cards.length} kart · ${QUESTIONS.filter((q) => q.t === t.id).length} soru</span></a>`).join("")}</div>
      <p class="muted" style="margin-top:28px;font-size:.85rem">İlerlemen bu tarayıcıda saklanır. Aynı cihazdan devam edersen kaldığın yerden sürer.</p>`;
    $("#plan", v).addEventListener("change", (e) => { const i = e.target.dataset.i; plan[i] = e.target.checked; store.set("plan", plan); });
  };

  /* ---------- ÖZET ---------- */
  PAGES.ozet = (v) => {
    v.innerHTML = `<div class="eyebrow">Yazılı özet</div><h1>9 konuda hızlı özet</h1><p class="lead">Sınav öncesi son bakış için: her konunun en kritik noktaları, tuzaklar ve formüller.</p>
      <input class="search" id="q" type="search" placeholder="Özetlerde ara… (örn. do-while, scope, int)" aria-label="Özetlerde ara">
      <div class="tabs" id="jump">${TOPICS.map((t) => `<button type="button" data-j="${t.id}">${t.no}. ${esc(t.title.split(":")[0].split(" ve ")[0])}</button>`).join("")}</div>
      <div id="list">${TOPICS.map((t) => `<section id="s-${t.id}" data-t="${t.id}"><div class="topic-head"><h2>${t.no}. ${esc(t.title)}</h2><div class="row"><a class="btn sm sec" href="#/dinle?mode=ozet&topic=${t.id}">🎧 Dinle</a><a class="btn sm sec" href="#/anlatim?topic=${t.id}">Ayrıntı</a></div></div><ul class="bullets">${t.summary.map((s) => `<li>${fmt(s)}</li>`).join("")}</ul></section>`).join("")}</div>`;
    $("#jump", v).addEventListener("click", (e) => { const b = e.target.closest("[data-j]"); if (b) { const el = $("#s-" + b.dataset.j); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } });
    $("#q", v).addEventListener("input", (e) => {
      const q = e.target.value.trim().toLocaleLowerCase("tr");
      $$("#list section", v).forEach((sec) => {
        let any = false;
        $$("li", sec).forEach((li) => { const hit = !q || li.textContent.toLocaleLowerCase("tr").includes(q); li.classList.toggle("hide", !hit); if (hit) any = true; });
        sec.classList.toggle("hide", !any);
      });
    });
  };

  /* ---------- AYRINTILI ANLATIM ---------- */
  PAGES.anlatim = (v, params) => {
    let cur = topicById(params.topic) ? params.topic : TOPICS[0].id;
    const done = store.get("read", {});
    function draw() {
      const t = topicById(cur), i = TOPICS.indexOf(t);
      v.innerHTML = `<div class="eyebrow">Ayrıntılı anlatım</div><h1>${t.no}. ${esc(t.title)}</h1><p class="lead">${esc(t.week)} · konuyu kod örnekleriyle birlikte adım adım anlatır.</p>
        <div class="tabs" role="tablist">${TOPICS.map((x) => `<button role="tab" type="button" data-t="${x.id}" aria-selected="${x.id === cur}">${done[x.id] ? "✓ " : ""}${x.no}. ${esc(x.title.split(":")[0].split(" ve ")[0])}</button>`).join("")}</div>
        <div class="row" style="margin-bottom:6px"><a class="btn sm sec" href="#/dinle?mode=detay&topic=${t.id}">🎧 Bu konuyu dinle</a><button class="btn sm sec" id="mark" type="button">${done[t.id] ? "Okundu işaretini kaldır" : "✓ Okudum"}</button></div>
        <article class="prose">${t.detail.map((b, k) => renderBlock(b, k, false)).join("")}</article>
        <div class="pager">${i > 0 ? `<button class="btn sec" data-go="${TOPICS[i - 1].id}" type="button">← ${esc(TOPICS[i - 1].title.split(":")[0])}</button>` : "<span></span>"}${i < TOPICS.length - 1 ? `<button class="btn" data-go="${TOPICS[i + 1].id}" type="button">${esc(TOPICS[i + 1].title.split(":")[0])} →</button>` : `<a class="btn" href="#/deneme">Denemeye geç →</a>`}</div>`;
    }
    draw();
    v.addEventListener("click", (e) => {
      const tb = e.target.closest("[data-t]"), go = e.target.closest("[data-go]");
      if (tb) { cur = tb.dataset.t; draw(); window.scrollTo(0, 0); }
      else if (go) { cur = go.dataset.go; draw(); window.scrollTo(0, 0); }
      else if (e.target.id === "mark") { done[cur] = !done[cur]; store.set("read", done); draw(); }
    });
  };

  /* ---------- SESLİ ANLATIM ---------- */
  PAGES.dinle = (v, params) => {
    let mode = params.mode === "detay" ? "detay" : "ozet";
    let scope = params.topic && (params.topic === "all" || topicById(params.topic)) ? params.topic : "all";
    v.innerHTML = `<div class="eyebrow">Sesli anlatım</div><h1>Dinleyerek çalış</h1><p class="lead">Tarayıcının Türkçe sesi metni yüksek sesle okur. Telefonu kulaklıkla bağlayıp yürürken ya da uyumadan önce dinleyebilirsin.</p>
      <div id="warn"></div>
      <div class="player" id="player">
        <div class="row" style="margin-bottom:10px">
          <div class="field">Anlatım türü<select id="mode"><option value="ozet">Sesli özet (kısa, ≈ 12 dk)</option><option value="detay">Ayrıntılı sesli anlatım (≈ 60+ dk)</option></select></div>
          <div class="field">Kapsam<select id="scope"><option value="all">Tüm konular</option>${TOPICS.map((t) => `<option value="${t.id}">${t.no}. ${esc(t.title)}</option>`).join("")}</select></div>
        </div>
        <div class="ctrls">
          <button class="round" id="prev" type="button" aria-label="Önceki parça"><svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg></button>
          <button class="round main" id="pp" type="button" aria-label="Oynat"></button>
          <button class="round" id="next" type="button" aria-label="Sonraki parça"><svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg></button>
          <div class="field" style="margin-left:8px">Hız <span id="rv">${Speech.rate.toFixed(1)}×</span><input id="rate" type="range" min="0.6" max="1.6" step="0.1" value="${Speech.rate}"></div>
          <div class="field">Ses<select id="voice"></select></div>
        </div>
        <div class="progress" style="margin-top:12px"><i id="bar" style="width:0%"></i></div>
        <div class="muted" id="pos" style="font-size:.8rem;margin-top:4px"></div>
      </div>
      <div class="transcript prose" id="tr"></div>`;
    $("#mode", v).value = mode; $("#scope", v).value = scope;

    const warn = $("#warn", v), pp = $("#pp", v);
    const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    let els = []; // kuyruk indeksi -> transcript blok elemanı

    function drawTranscript() {
      const topics = scope === "all" ? TOPICS : [topicById(scope)];
      let html = "";
      topics.forEach((t) => {
        html += `<h2 data-th="${t.id}">${t.no}. ${esc(t.title)}</h2>`;
        if (mode === "ozet") html += `<div>${t.summary.map((s, i) => `<p class="blk" data-t="${t.id}" data-b="${i}">${fmt(s)}</p>`).join("")}</div>`;
        else html += t.detail.map((b, i) => (b.t === "code" ? renderBlock(b) : renderBlock(b, i, true).replace(/ data-b="(\d+)"/, ` data-t="${t.id}" data-b="$1"`))).join("");
      });
      $("#tr", v).innerHTML = html;
    }
    function setup(start = 0) {
      drawTranscript();
      Speech.setQueue(buildQueue(mode, scope), start);
      mark();
    }
    function mark() {
      $$(".blk.now", v).forEach((e) => e.classList.remove("now"));
      const it = Speech.queue[Speech.idx]; if (!it) return;
      let el = null;
      if (it.b === -1) el = $(`[data-th="${it.topic}"]`, v);
      else el = $(`.blk[data-t="${it.topic}"][data-b="${it.b}"]`, v);
      if (el) { el.classList.add("now"); const r = el.getBoundingClientRect(); if (r.top < 160 || r.bottom > innerHeight - 90) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      $("#bar", v).style.width = ((Speech.idx + 1) / Speech.queue.length) * 100 + "%";
      $("#pos", v).textContent = `Parça ${Speech.idx + 1} / ${Speech.queue.length}`;
    }
    function state() { pp.innerHTML = Speech.playing ? PAUSE : PLAY; pp.setAttribute("aria-label", Speech.playing ? "Duraklat" : "Oynat"); }
    function fillVoices() {
      const sel = $("#voice", v); if (!sel) return;
      const tr = Speech.trVoices(), list = tr.length ? tr : Speech.voices;
      sel.innerHTML = list.map((x) => `<option value="${esc(x.voiceURI)}">${esc(x.name)} (${esc(x.lang)})</option>`).join("") || '<option value="">Varsayılan</option>';
      const cur = Speech.pickVoice(); if (cur) sel.value = cur.voiceURI;
      if (!Speech.supported()) warn.innerHTML = '<div class="notice">Bu tarayıcı sesli okumayı desteklemiyor. Chrome, Edge ya da Safari kullan.</div>';
      else if (!tr.length && Speech.voices.length) warn.innerHTML = '<div class="notice">Cihazında Türkçe ses bulunamadı; farklı bir sesle okunabilir. Çözüm: Telefon/bilgisayar ayarlarından “Türkçe” konuşma sesini indir ya da Edge tarayıcısını dene (Emel/Ahmet doğal sesleri var).</div>';
      else warn.innerHTML = "";
    }
    Speech.onChange = (what) => {
      if (what === "voices") fillVoices();
      if (what === "state" || what === "done") state();
      if (what === "idx" || what === "done") mark();
    };
    fillVoices(); state(); setup();

    $("#mode", v).addEventListener("change", (e) => { mode = e.target.value; setup(); });
    $("#scope", v).addEventListener("change", (e) => { scope = e.target.value; setup(); });
    $("#voice", v).addEventListener("change", (e) => { Speech.voiceURI = e.target.value; store.set("voice", Speech.voiceURI); if (Speech.playing) Speech.speakCurrent(); });
    $("#rate", v).addEventListener("input", (e) => { Speech.rate = parseFloat(e.target.value); $("#rv", v).textContent = Speech.rate.toFixed(1) + "×"; store.set("rate", Speech.rate); });
    $("#rate", v).addEventListener("change", () => { if (Speech.playing) Speech.speakCurrent(); });
    pp.addEventListener("click", () => { if (Speech.playing) Speech.pause(); else Speech.play(); });
    $("#next", v).addEventListener("click", () => Speech.next(false));
    $("#prev", v).addEventListener("click", () => Speech.prev());
    $("#tr", v).addEventListener("click", (e) => {
      const b = e.target.closest(".blk[data-b]"); if (!b) return;
      const i = Speech.queue.findIndex((q) => q.topic === b.dataset.t && String(q.b) === b.dataset.b);
      if (i >= 0) { Speech.jump(i); if (!Speech.playing) Speech.play(); }
    });
    v.insertAdjacentHTML("beforeend", '<p class="muted" style="font-size:.85rem;margin-top:24px">İpucu: Bir paragrafa dokunursan okuma oradan devam eder. Sayfadan çıkınca okuma durur.</p>');
    return () => { Speech.onChange = null; Speech.stop(); };
  };

  /* ---------- BİLGİ KARTLARI ---------- */
  PAGES.kartlar = (v) => {
    const states = store.get("cards", {});
    const all = [];
    TOPICS.forEach((t) => t.cards.forEach((c, i) => all.push({ id: t.id + ":" + i, topic: t.id, q: c[0], a: c[1] })));
    let f = { topic: "all", mode: "all", shuffle: false };
    let deck = [], pos = 0, flipped = false;

    function build() {
      deck = all.filter((c) => (f.topic === "all" || c.topic === f.topic) &&
        (f.mode === "all" || (f.mode === "again" && states[c.id] === "a") || (f.mode === "new" && states[c.id] !== "k")));
      if (f.shuffle) deck = shuffle(deck);
      pos = 0; flipped = false;
    }
    function frame() {
      v.innerHTML = `<div class="eyebrow">Bilgi kartları</div><h1>Kartlarla tekrar</h1><p class="lead">Karta tıkla (ya da Boşluk) → cevabı gör. Kısayollar: ← → gezin, 1 = Tekrar, 2 = Biliyorum.</p>
        <div class="row" style="margin-bottom:10px">
          <div class="field">Konu<select id="ft"><option value="all">Tüm konular (${all.length})</option>${TOPICS.map((t) => `<option value="${t.id}">${t.no}. ${esc(t.title)} (${t.cards.length})</option>`).join("")}</select></div>
          <div class="field">Gösterilecek<select id="fm"><option value="all">Hepsi</option><option value="new">Henüz bilmediklerim</option><option value="again">Tekrar listem</option></select></div>
          <button class="toggle" id="fs" type="button" aria-pressed="${f.shuffle}">🔀 Karıştır</button>
          <button class="ghost" id="rs" type="button">İlerlemeyi sıfırla</button>
        </div>
        <div class="deck-wrap" id="deck"></div>`;
      $("#ft", v).value = f.topic; $("#fm", v).value = f.mode;
      card();
    }
    function card() {
      const d = $("#deck", v), known = all.filter((c) => states[c.id] === "k").length;
      if (!deck.length) { d.innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2 style="margin-top:0">Bu filtrede kart yok 🎉</h2><p class="muted">Başka bir konu ya da “Hepsi” seçeneğini dene.</p></div>`; return; }
      const c = deck[pos], t = topicById(c.topic);
      d.innerHTML = `<div class="row" style="justify-content:space-between"><span class="muted">${pos + 1} / ${deck.length}</span><span class="muted">Bilinen: ${known}/${all.length}</span></div>
        <div class="progress" style="margin:6px 0"><i style="width:${((pos + 1) / deck.length) * 100}%"></i></div>
        <div class="flip ${flipped ? "flipped" : ""}" id="flip" role="button" tabindex="0" aria-label="Kartı çevir">
          <div class="flip-in">
            <div class="face front"><span class="chip tag">${t.no}. ${esc(t.title.split(":")[0])}</span><div class="q">${fmt(c.q)}</div><span class="hint">çevirmek için dokun</span></div>
            <div class="face back"><span class="chip teal tag">Cevap</span><div class="q" style="font-size:clamp(1.1rem,3vw,1.45rem)">${fmt(c.a)}</div></div>
          </div></div>
        <div class="row" style="justify-content:center;margin-bottom:12px"><button class="btn sm sec" id="pv" type="button">← Önceki</button><button class="btn sm sec" id="sp" type="button">🔊 Oku</button><button class="btn sm sec" id="nx" type="button">Sonraki →</button></div>
        <div class="deck-actions"><button class="btn again" id="ag" type="button">↺ Tekrar (1)</button><button class="btn know" id="kn" type="button">✓ Biliyorum (2)</button></div>`;
      const st = states[c.id];
      if (st) d.querySelector(".face.front").insertAdjacentHTML("beforeend", `<span class="chip ${st === "k" ? "d1" : "d3"}" style="position:absolute;top:14px;right:18px">${st === "k" ? "bilinen" : "tekrar"}</span>`);
    }
    const flip = () => { flipped = !flipped; const el = $("#flip", v); if (el) el.classList.toggle("flipped", flipped); };
    const go = (d) => { if (!deck.length) return; pos = (pos + d + deck.length) % deck.length; flipped = false; card(); };
    const mark = (s) => { if (!deck.length) return; states[deck[pos].id] = s; store.set("cards", states); if (f.mode !== "all") { deck.splice(pos, 1); if (pos >= deck.length) pos = 0; flipped = false; card(); } else go(1); };

    v.addEventListener("click", (e) => {
      if (e.target.closest("#flip")) flip();
      else if (e.target.closest("#pv")) go(-1); else if (e.target.closest("#nx")) go(1);
      else if (e.target.closest("#ag")) mark("a"); else if (e.target.closest("#kn")) mark("k");
      else if (e.target.closest("#sp")) { const c = deck[pos]; Speech.say(tts(c.q) + ". " + tts(c.a)); }
      else if (e.target.closest("#fs")) { f.shuffle = !f.shuffle; build(); frame(); }
      else if (e.target.closest("#rs")) { if (confirm("Kart ilerlemen sıfırlansın mı?")) { Object.keys(states).forEach((k) => delete states[k]); store.set("cards", states); build(); frame(); } }
    });
    v.addEventListener("change", (e) => { if (e.target.id === "ft") { f.topic = e.target.value; build(); frame(); } if (e.target.id === "fm") { f.mode = e.target.value; build(); frame(); } });
    const key = (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === " " || e.key === "Enter") { if (document.activeElement.tagName === "BUTTON") return; e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "1") mark("a"); else if (e.key === "2") mark("k");
    };
    document.addEventListener("keydown", key);
    build(); frame();
    return () => { document.removeEventListener("keydown", key); Speech.stop(); };
  };

  /* ---------- DENEME SINAVI ---------- */
  PAGES.deneme = (v) => {
    const cfg = Object.assign({ count: Math.min(100, QUESTIONS.length), diffs: [1, 2, 3], topics: TOPICS.map((t) => t.id), instant: false, timed: false, onlyWrong: false }, store.get("cfg", {}));
    cfg.count = Math.min(cfg.count, QUESTIONS.length);
    let run = null, timer = null;

    const wrongSet = () => new Set(store.get("wrong", []));
    const pool = () => { const w = wrongSet(); return QUESTIONS.map((q, i) => ({ q, i })).filter((x) => cfg.diffs.includes(x.q.d) && cfg.topics.includes(x.q.t) && (!cfg.onlyWrong || w.has(x.i))); };
    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };

    /* ----- ayar ekranı ----- */
    function setup() {
      stopTimer(); run = null;
      const p = pool(), max = Math.max(p.length, 1);
      cfg.count = Math.max(1, Math.min(cfg.count, max));
      const cntD = (d) => QUESTIONS.filter((q) => q.d === d && cfg.topics.includes(q.t)).length;
      const wn = wrongSet().size;
      v.innerHTML = `<div class="eyebrow">Deneme sınavı</div><h1>Kendi sınavını kur</h1><p class="lead">Soru sayısını, zorluğu ve konuları ayarla. Soru bankasında toplam ${QUESTIONS.length} soru var; her denemede sorular ve şıklar karışık gelir.</p>
        <div class="card setup">
          <div class="block"><label class="lbl" for="cnt">Soru sayısı</label>
            <div class="row" style="align-items:flex-end;gap:18px"><span class="bigval" id="cv">${cfg.count}</span><span class="muted" id="cmax">/ ${p.length} uygun soru</span></div>
            <input id="cnt" type="range" min="1" max="${max}" value="${cfg.count}">
            <div class="row" style="margin-top:8px">${[10, 25, 50, 100].map((n) => `<button class="toggle" data-n="${n}" type="button">${n}</button>`).join("")}<button class="toggle" data-n="all" type="button">Tümü</button></div></div>
          <div class="block"><span class="lbl">Zorluk</span>
            <div class="checks" id="df">${[1, 2, 3].map((d) => `<button class="toggle" data-d="${d}" type="button" aria-pressed="${cfg.diffs.includes(d)}">${DIFF[d]} (${cntD(d)})</button>`).join("")}<button class="toggle" id="mixd" type="button">Hepsi (karışık)</button></div></div>
          <div class="block"><span class="lbl">Konular</span>
            <div class="checks" id="tp">${TOPICS.map((t) => `<button class="toggle" data-t="${t.id}" type="button" aria-pressed="${cfg.topics.includes(t.id)}">${t.no}. ${esc(t.title.split(":")[0].split(" ve ")[0])} (${QUESTIONS.filter((q) => q.t === t.id).length})</button>`).join("")}<button class="ghost" id="tall" type="button">Hepsini seç</button></div></div>
          <div class="block"><span class="lbl">Seçenekler</span>
            <div class="checks">
              <button class="toggle" id="oi" type="button" aria-pressed="${cfg.instant}">Anında doğru/yanlış göster</button>
              <button class="toggle" id="ot" type="button" aria-pressed="${cfg.timed}">Süreli (soru başına 1 dk)</button>
              <button class="toggle" id="ow" type="button" aria-pressed="${cfg.onlyWrong}" ${wn ? "" : "disabled"}>Sadece daha önce yanlış yaptıklarım (${wn})</button>
            </div></div>
          <div class="row"><button class="btn" id="start" type="button" ${p.length ? "" : "disabled"}>Sınavı başlat →</button><span class="muted" id="sum"></span></div>
        </div>
        ${history()}`;
      sum();
      v.addEventListener("click", onSetupClick); v.addEventListener("input", onSetupInput);
    }
    const sum = () => { const s = $("#sum", v); if (s) s.textContent = `${cfg.count} soru · ${cfg.diffs.length === 3 ? "karışık zorluk" : cfg.diffs.map((d) => DIFF[d]).join(" + ")} · ${cfg.topics.length === TOPICS.length ? "tüm konular" : cfg.topics.length + " konu"}${cfg.timed ? " · " + cfg.count + " dk" : ""}`; };
    function history() {
      const h = store.get("history", []); if (!h.length) return "";
      return `<h2>Son denemeler</h2><div class="card">${h.slice(-6).reverse().map((x) => { const pc = Math.round((x.correct / x.count) * 100); return `<div class="bar" style="grid-template-columns:130px 1fr 90px"><span class="muted">${esc(x.date)}</span><div class="progress"><i style="width:${pc}%"></i></div><span><strong>%${pc}</strong> <span class="muted">(${x.correct}/${x.count})</span></span></div>`; }).join("")}</div>`;
    }
    function refreshPool() {
      const p = pool(), max = Math.max(p.length, 1);
      cfg.count = Math.max(1, Math.min(cfg.count, max));
      const r = $("#cnt", v); if (!r) return;
      r.max = max; r.value = cfg.count; $("#cv", v).textContent = cfg.count; $("#cmax", v).textContent = `/ ${p.length} uygun soru`;
      $("#start", v).disabled = !p.length; sum(); store.set("cfg", cfg);
    }
    function onSetupInput(e) { if (e.target.id === "cnt") { cfg.count = +e.target.value; $("#cv", v).textContent = cfg.count; sum(); store.set("cfg", cfg); } }
    function onSetupClick(e) {
      const b = e.target.closest("button"); if (!b || !$("#start", v)) return;
      if (b.dataset.n) { cfg.count = b.dataset.n === "all" ? pool().length : +b.dataset.n; refreshPool(); }
      else if (b.dataset.d) { const d = +b.dataset.d; cfg.diffs = cfg.diffs.includes(d) ? cfg.diffs.filter((x) => x !== d) : cfg.diffs.concat(d); if (!cfg.diffs.length) cfg.diffs = [d]; $$("#df [data-d]", v).forEach((x) => x.setAttribute("aria-pressed", cfg.diffs.includes(+x.dataset.d))); refreshPool(); }
      else if (b.id === "mixd") { cfg.diffs = [1, 2, 3]; $$("#df [data-d]", v).forEach((x) => x.setAttribute("aria-pressed", "true")); refreshPool(); }
      else if (b.dataset.t) { const t = b.dataset.t; cfg.topics = cfg.topics.includes(t) ? cfg.topics.filter((x) => x !== t) : cfg.topics.concat(t); if (!cfg.topics.length) cfg.topics = [t]; $$("#tp [data-t]", v).forEach((x) => x.setAttribute("aria-pressed", cfg.topics.includes(x.dataset.t))); refreshPool(); }
      else if (b.id === "tall") { cfg.topics = TOPICS.map((t) => t.id); $$("#tp [data-t]", v).forEach((x) => x.setAttribute("aria-pressed", "true")); refreshPool(); }
      else if (b.id === "oi") { cfg.instant = !cfg.instant; b.setAttribute("aria-pressed", cfg.instant); store.set("cfg", cfg); }
      else if (b.id === "ot") { cfg.timed = !cfg.timed; b.setAttribute("aria-pressed", cfg.timed); sum(); store.set("cfg", cfg); }
      else if (b.id === "ow") { cfg.onlyWrong = !cfg.onlyWrong; b.setAttribute("aria-pressed", cfg.onlyWrong); refreshPool(); }
      else if (b.id === "start") { start(shuffle(pool()).slice(0, cfg.count).map((x) => x.i)); }
    }

    /* ----- sınav ----- */
    function start(ids) {
      v.removeEventListener("click", onSetupClick); v.removeEventListener("input", onSetupInput);
      run = { items: ids.map((i) => { const q = QUESTIONS[i]; const order = shuffle(q.o.map((_, k) => k)); return { i, q, order, correct: order.indexOf(0), ans: null, flag: false }; }), cur: 0, t0: Date.now(), limit: cfg.timed ? ids.length * 60 : 0, instant: cfg.instant, done: false };
      stopTimer(); timer = setInterval(tick, 1000);
      renderQ();
    }
    function tick() {
      if (!run) return; const el = Math.floor((Date.now() - run.t0) / 1000);
      const t = $("#tm", v); if (t) t.textContent = run.limit ? mmss(Math.max(0, run.limit - el)) : mmss(el);
      if (run.limit && el >= run.limit) finish(true);
    }
    function renderQ() {
      const it = run.items[run.cur], n = run.items.length, locked = run.instant && it.ans !== null;
      const letters = "ABCD";
      v.innerHTML = `<div class="sticky-top"><div class="qhead"><strong>Soru ${run.cur + 1} / ${n}</strong><div class="row"><span class="chip">⏱ <span id="tm">00:00</span></span><button class="btn sm sec" id="fin" type="button">Sınavı bitir</button></div></div><div class="progress"><i style="width:${(run.items.filter((x) => x.ans !== null).length / n) * 100}%"></i></div></div>
        <div class="card q-card" style="margin-top:12px">
          <div class="row"><span class="chip teal">${esc(topicById(it.q.t).title.split(":")[0])}</span><span class="chip d${it.q.d}">${DIFF[it.q.d]}</span>${it.flag ? '<span class="chip d2">⚑ işaretli</span>' : ""}</div>
          <div class="qt">${fmt(it.q.q)}</div>
          ${it.q.code ? codeBlock(it.q.code) : ""}
          <div role="radiogroup" aria-label="Şıklar">${it.order.map((oi, k) => {
            let cls = ""; if (it.ans === k) cls = "sel";
            if (locked) { if (k === it.correct) cls = "right"; else if (it.ans === k) cls = "wrong"; }
            return `<button class="opt ${cls}" data-k="${k}" type="button" role="radio" aria-checked="${it.ans === k}" ${locked ? "disabled" : ""}><span class="k">${letters[k]}</span><span>${fmt(it.q.o[oi])}</span></button>`;
          }).join("")}</div>
          ${locked ? `<div class="expl"><strong>${it.ans === it.correct ? "✓ Doğru." : "✗ Yanlış."}</strong> ${fmt(it.q.e)}</div>` : ""}
        </div>
        <div class="pager" style="margin-top:14px"><button class="btn sec" id="pv" type="button" ${run.cur === 0 ? "disabled" : ""}>← Önceki</button><button class="btn sec" id="fl" type="button">${it.flag ? "⚑ İşareti kaldır" : "⚐ İşaretle"}</button>${run.cur < n - 1 ? '<button class="btn" id="nx" type="button">Sonraki →</button>' : '<button class="btn" id="fin2" type="button">Bitir ✓</button>'}</div>
        <div class="navgrid" id="ng">${run.items.map((x, k) => { let c = ""; if (x.ans !== null) c = run.instant ? (x.ans === x.correct ? "ok" : "no") : "ans"; return `<button type="button" data-g="${k}" class="${c} ${x.flag ? "flag" : ""} ${k === run.cur ? "cur" : ""}" aria-label="Soru ${k + 1}">${k + 1}</button>`; }).join("")}</div>`;
      tick();
    }
    const quizClick = (e) => {
      if (!run || run.done) return;
      const b = e.target.closest("button"); if (!b) return; const it = run.items[run.cur];
      if (b.dataset.k !== undefined) { if (run.instant && it.ans !== null) return; it.ans = +b.dataset.k; renderQ(); }
      else if (b.id === "nx") { run.cur++; renderQ(); window.scrollTo(0, 0); }
      else if (b.id === "pv") { run.cur--; renderQ(); window.scrollTo(0, 0); }
      else if (b.id === "fl") { it.flag = !it.flag; renderQ(); }
      else if (b.dataset.g !== undefined) { run.cur = +b.dataset.g; renderQ(); window.scrollTo(0, 0); }
      else if (b.id === "fin" || b.id === "fin2") {
        const blank = run.items.filter((x) => x.ans === null).length;
        if (!blank || confirm(`${blank} soru boş. Yine de bitirmek istiyor musun?`)) finish();
      }
    };
    const quizKey = (e) => {
      if (!run || run.done || !$("#ng", v)) return;
      const k = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[e.key.toLowerCase()];
      const it = run.items[run.cur];
      if (k !== undefined && k < it.order.length && !(run.instant && it.ans !== null)) { it.ans = k; renderQ(); }
      else if (e.key === "ArrowRight" && run.cur < run.items.length - 1) { run.cur++; renderQ(); }
      else if (e.key === "ArrowLeft" && run.cur > 0) { run.cur--; renderQ(); }
    };
    v.addEventListener("click", quizClick); document.addEventListener("keydown", quizKey);

    /* ----- sonuç ----- */
    function finish(timeUp) {
      stopTimer(); run.done = true;
      const secs = Math.floor((Date.now() - run.t0) / 1000), n = run.items.length;
      const right = run.items.filter((x) => x.ans === x.correct).length, blank = run.items.filter((x) => x.ans === null).length, wrong = n - right - blank;
      const pc = Math.round((right / n) * 100);
      // geçmiş + yanlışlar
      const hist = store.get("history", []); const d = new Date();
      hist.push({ date: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }), count: n, correct: right, secs }); store.set("history", hist.slice(-30));
      const w = wrongSet(); run.items.forEach((x) => { if (x.ans === null) return; if (x.ans === x.correct) w.delete(x.i); else w.add(x.i); }); store.set("wrong", Array.from(w));
      const by = (key, labelOf, keys) => keys.map((k) => { const xs = run.items.filter((x) => x.q[key] === k); if (!xs.length) return ""; const r = xs.filter((x) => x.ans === x.correct).length, p = Math.round((r / xs.length) * 100); return `<div class="bar"><span>${esc(labelOf(k))}</span><div class="progress"><i style="width:${p}%;background:${p >= 80 ? "var(--good)" : p >= 50 ? "var(--warn)" : "var(--bad)"}"></i></div><span><strong>${r}/${xs.length}</strong></span></div>`; }).join("");
      const msg = pc >= 90 ? "Muhteşem! Bu seviyede 100 çok yakın." : pc >= 75 ? "Çok iyi. Yanlışlarına bir tur daha bak." : pc >= 50 ? "Fena değil, eksik konulara dön." : "Başlangıç için normal. Ayrıntılı anlatımı oku, sonra tekrar dene.";
      v.innerHTML = `<div class="eyebrow">${timeUp ? "Süre doldu" : "Sonuç"}</div><h1>${msg}</h1>
        <div class="card"><div class="score"><div class="ring" style="--p:${pc}"><div>%${pc}</div></div>
          <div class="row" style="gap:28px"><div class="stat"><b style="color:var(--good)">${right}</b><span>doğru</span></div><div class="stat"><b style="color:var(--bad)">${wrong}</b><span>yanlış</span></div><div class="stat"><b style="color:var(--warn)">${blank}</b><span>boş</span></div><div class="stat"><b>${mmss(secs)}</b><span>süre</span></div></div></div></div>
        <div class="row" style="margin:16px 0"><button class="btn" id="redo" type="button" ${wrong + blank ? "" : "disabled"}>Yanlış/boşları tekrar çöz</button><button class="btn sec" id="again" type="button">Yeni deneme</button><button class="btn sec" id="back" type="button">Ayarlara dön</button></div>
        <h2>Konulara göre</h2><div class="card">${by("t", (k) => { const t = topicById(k); return t.no + ". " + t.title.split(":")[0]; }, TOPICS.map((t) => t.id))}</div>
        <h2>Zorluğa göre</h2><div class="card">${by("d", (k) => DIFF[k], [1, 2, 3])}</div>
        <h2>Soru soru inceleme</h2>
        <div class="row" id="rf" style="margin-bottom:6px"><button class="toggle" data-f="all" aria-pressed="true" type="button">Hepsi</button><button class="toggle" data-f="bad" aria-pressed="false" type="button">Yanlışlar (${wrong})</button><button class="toggle" data-f="blank" aria-pressed="false" type="button">Boşlar (${blank})</button></div>
        <div id="rv">${run.items.map((x, k) => { const st = x.ans === null ? "blank" : x.ans === x.correct ? "good" : "bad"; return `<div class="review ${st}" data-st="${st}"><div class="row"><strong>${k + 1}.</strong><span class="chip teal">${esc(topicById(x.q.t).title.split(":")[0])}</span><span class="chip d${x.q.d}">${DIFF[x.q.d]}</span></div><div class="qt" style="font-weight:600;margin:8px 0">${fmt(x.q.q)}</div>${x.q.code ? codeBlock(x.q.code) : ""}<div>${x.ans === null ? '<span class="chip d2">Boş bıraktın</span>' : `Senin cevabın: <strong style="color:var(--${st === "good" ? "good" : "bad"})">${fmt(x.q.o[x.order[x.ans]])}</strong>`}</div>${st !== "good" ? `<div>Doğru cevap: <strong style="color:var(--good)">${fmt(x.q.o[0])}</strong></div>` : ""}<div class="expl">${fmt(x.q.e)}</div></div>`; }).join("")}</div>`;
      window.scrollTo(0, 0);
      const resultClick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.id === "redo") { const ids = run.items.filter((x) => x.ans !== x.correct).map((x) => x.i); v.removeEventListener("click", resultClick); start(shuffle(ids)); }
        else if (b.id === "again") { v.removeEventListener("click", resultClick); start(shuffle(pool()).slice(0, cfg.count).map((x) => x.i)); }
        else if (b.id === "back") { v.removeEventListener("click", resultClick); setup(); }
        else if (b.dataset.f) { $$("#rf .toggle", v).forEach((x) => x.setAttribute("aria-pressed", x === b)); $$("#rv .review", v).forEach((r) => r.classList.toggle("hide", b.dataset.f !== "all" && r.dataset.st !== b.dataset.f)); }
      };
      v.addEventListener("click", resultClick);
    }

    setup();
    return () => { stopTimer(); document.removeEventListener("keydown", quizKey); };
  };

  route();
})();
