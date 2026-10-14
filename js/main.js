(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LANGS = ["hr", "en", "de"];
  let lang = "hr";

  /* ======================================================================
     Language
     ====================================================================== */
  function detectLang() {
    try {
      const saved = localStorage.getItem("lang");
      if (LANGS.includes(saved)) return saved;
    } catch (e) { /* storage unavailable */ }
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    if (["hr", "bs", "sr", "sl"].includes(nav)) return "hr";
    if (nav === "de") return "de";
    return "en";
  }

  function t(key) { return (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? ""; }

  function setLang(next) {
    lang = LANGS.includes(next) ? next : "en";
    try { localStorage.setItem("lang", lang); } catch (e) { /* ignore */ }
    document.documentElement.lang = lang;
    document.title = t("meta.title");

    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$("[data-lang]").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === lang));

    renderBio();
    renderConcerts();
    updateTrackLabels();
  }

  $$("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    setLang(b.dataset.lang);
    closeMenu();
  }));

  /* ======================================================================
     Navigation
     ====================================================================== */
  const nav = $("#nav");
  const burger = $("#burger");
  const drawer = $("#drawer");
  const darkSections = $$(".marquee, .audio, .gallery, .contact, .footer");
  const navLinks = $$(".nav__links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href")));
  let lastY = scrollY;

  function onScroll() {
    const y = scrollY;
    const h = nav.offsetHeight;
    nav.classList.toggle("is-scrolled", y > 20);
    nav.classList.toggle("is-hidden", y > lastY && y > innerHeight * 0.8 && !document.body.classList.contains("menu-open"));
    lastY = y;

    const probe = h / 2;
    nav.classList.toggle("is-dark", darkSections.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    }));

    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === active));

    parallax();
    updateMini();
  }

  function openMenu() {
    document.body.classList.add("menu-open");
    burger.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
    $(".sr", burger).textContent = t("nav.close");
  }
  function closeMenu() {
    document.body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
    $(".sr", burger).textContent = t("nav.menu");
  }
  burger.addEventListener("click", () => document.body.classList.contains("menu-open") ? closeMenu() : openMenu());
  $$("a", drawer).forEach((a) => a.addEventListener("click", closeMenu));

  /* ======================================================================
     Reveal on scroll
     ====================================================================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  const observeReveals = (root = document) => $$(".reveal:not(.in)", root).forEach((el) => io.observe(el));

  /* ======================================================================
     Cello strings (hero)
     Moving the pointer across a string plucks it; clicking plays the
     open string (C2 G2 D3 A3) with a Karplus–Strong synthesised tone.
     ====================================================================== */
  const Strings = (() => {
    const svg = $("#strings");
    const hero = $(".hero");
    const NS = "http://www.w3.org/2000/svg";
    // Real cello strings get thinner from C to A; C and G are wound (textured), D and A are plain steel.
    const NOTES = [
      { name: "C", f: 65.41, w: 3.6, wound: true },
      { name: "G", f: 98.0, w: 2.7, wound: true },
      { name: "D", f: 146.83, w: 1.8, wound: false },
      { name: "A", f: 220.0, w: 1.2, wound: false },
    ];
    const el = (tag, cls) => { const n = document.createElementNS(NS, tag); if (cls) n.setAttribute("class", cls); return n; };
    const bridge = el("path", "bridge");
    svg.append(bridge);
    const strings = NOTES.map((n, i) => {
      const g = el("g", "string" + (n.wound ? " string--wound" : ""));
      const path = el("path", "string__core");
      const tex = el("path", "string__tex");
      const label = el("text");
      label.textContent = n.name;
      g.append(path, tex);
      svg.append(g, label);
      return { ...n, i, g, path, tex, label, x0: 0, y0: 0, x1: 0, y1: 0, amp: 0, y: 0, t0: 0, dir: 1 };
    });
    let W = 0, H = 0, raf = 0;

    // x position of a string at height y (strings fan out from the scroll towards the bridge)
    const xAt = (s, y) => s.x0 + (s.x1 - s.x0) * (y - s.y0) / (s.y1 - s.y0);

    function layout() {
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const narrow = W < 900;
      const tr = $(".hero__text").getBoundingClientRect();
      // on desktop the strings run through the name column, on mobile through the middle
      const cx = narrow ? W / 2 : tr.left - r.left + tr.width * 0.42;
      const spread = narrow ? W * 0.15 : Math.min(tr.width * 0.15, 120); // gap between strings at the bridge
      // keep the bridge on the first screen, but never on top of the buttons
      const contentBottom = $(".hero__inner").getBoundingClientRect().bottom - r.top;
      const yb = Math.max(contentBottom + 36, Math.min(H, innerHeight) - (narrow ? 70 : 92));
      const half = spread * 1.5 + spread * 0.45;
      const scale = narrow ? 0.8 : 1;
      strings.forEach((s, i) => {
        const k = i - 1.5;
        s.x0 = cx + k * 7; s.y0 = -H * 0.35;                       // converge above the viewport (the nut)
        s.x1 = cx + k * spread;
        const u = (s.x1 - cx) / half;
        s.y1 = yb + 8 - 16 * (1 - u * u);                          // sit on the arched bridge
        const w = s.w * scale;
        s.path.style.strokeWidth = w;
        s.tex.style.strokeWidth = s.wound ? w : Math.max(0.5, w * 0.35);
        s.label.setAttribute("x", s.x1);
        s.label.setAttribute("y", yb + (narrow ? 58 : 74));
        draw(s, 0);
      });
      // stylised cello bridge
      const xl = cx - half, xr = cx + half, foot = yb + (narrow ? 34 : 46);
      bridge.setAttribute("d",
        `M${xl} ${yb + 8} Q${cx} ${yb - 24} ${xr} ${yb + 8}` +
        `L${xr - half * 0.18} ${foot} L${cx + half * 0.32} ${foot} Q${cx} ${yb + 6} ${cx - half * 0.32} ${foot}` +
        `L${xl + half * 0.18} ${foot} Z`);
    }

    function draw(s, off) {
      let d;
      if (off) {
        const y = Math.max(0, Math.min(s.y1 - 1, s.y || H / 2));
        d = `M${s.x0} ${s.y0} Q${xAt(s, y) + off * 2} ${y} ${s.x1} ${s.y1}`;
      } else {
        d = `M${s.x0} ${s.y0} L${s.x1} ${s.y1}`;
      }
      s.path.setAttribute("d", d);
      s.tex.setAttribute("d", d);
    }

    function tick(now) {
      let alive = false;
      strings.forEach((s) => {
        if (!s.amp) return;
        const t = (now - s.t0) / 1000;
        const decay = Math.exp(-t / (0.75 - s.i * 0.08)); // thick strings ring longer
        if (decay < 0.02) { s.amp = 0; draw(s, 0); s.g.classList.remove("on"); s.label.classList.remove("on"); return; }
        alive = true;
        const hz = 5 + s.i * 2.6; // and swing slower
        draw(s, s.dir * s.amp * decay * Math.cos(2 * Math.PI * hz * t));
      });
      raf = alive ? requestAnimationFrame(tick) : 0;
    }

    function pluck(s, y, strength, sound) {
      if (reduceMotion) { s.amp = 0; } else {
        s.y = y; s.amp = Math.max(8, Math.min(22 + s.w * 3, strength)); s.t0 = performance.now();
        s.g.classList.add("on"); s.label.classList.add("on");
        if (!raf) raf = requestAnimationFrame(tick);
      }
      if (sound) Synth.play(s.f, Math.min(1, 0.45 + strength / 40));
    }

    let prev = null;
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (prev && x !== prev.x) {
        const dx = x - prev.x;
        strings.forEach((s) => {
          if (y > s.y1 || prev.y > s.y1) return; // below the bridge there is no string
          if ((prev.x - xAt(s, prev.y)) * (x - xAt(s, y)) <= 0) {
            s.dir = Math.sign(dx);
            pluck(s, y, Math.abs(dx) * 0.9, Synth.unlocked && !Player.isPlaying());
          }
        });
      }
      prev = { x, y };
    });
    hero.addEventListener("pointerleave", () => { prev = null; });
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left, y = Math.min(e.clientY - r.top, H - 100);
      const s = strings.reduce((a, b) => Math.abs(xAt(b, y) - x) < Math.abs(xAt(a, y) - x) ? b : a);
      s.dir = x < xAt(s, y) ? 1 : -1;
      Synth.unlock();
      if (!Player.isPlaying()) pluck(s, y, 22, true);
      else pluck(s, y, 22, false);
    });

    addEventListener("resize", layout);
    return { layout };
  })();

  const Synth = (() => {
    let ctx = null;
    const cache = new Map();
    return {
      unlocked: false,
      unlock() {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
        }
        if (ctx.state === "suspended") ctx.resume();
        this.unlocked = true;
      },
      play(freq, vel = 0.7) {
        if (!ctx) return;
        let buf = cache.get(freq);
        if (!buf) {
          // Karplus–Strong plucked string
          const sr = ctx.sampleRate, len = Math.floor(sr * 3.2);
          buf = ctx.createBuffer(1, len, sr);
          const d = buf.getChannelData(0);
          const N = Math.round(sr / freq);
          for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
          const damp = 0.4985 + Math.min(0.0012, freq / 400000);
          for (let i = N; i < len; i++) d[i] = damp * (d[i - N] + d[i - N + 1]);
          cache.set(freq, buf);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 900 + freq * 6; lp.Q.value = 0.4;
        const body = ctx.createBiquadFilter(); // a touch of wooden body resonance
        body.type = "peaking"; body.frequency.value = 220; body.gain.value = 5; body.Q.value = 1.2;
        const g = ctx.createGain();
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.5 * vel, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3);
        src.connect(lp).connect(body).connect(g).connect(ctx.destination);
        src.start(now); src.stop(now + 3.1);
      },
    };
  })();

  /* ======================================================================
     Biography + marquee
     ====================================================================== */
  function renderBio() {
    const box = $("#bioText");
    box.innerHTML = "";
    t("bio").forEach((p) => {
      const el = document.createElement("p");
      el.className = "reveal in";
      el.textContent = p;
      box.append(el);
    });
    const docs = t("bioDocs");
    $("#bioPdf").href = docs.pdf;
    $("#bioDocx").href = docs.docx;
  }

  function renderMarquee() {
    const fill = (el, list) => {
      const html = list.map((n) => `<span>${n}</span>`).join("");
      el.innerHTML = html + html; // duplicated for a seamless loop
    };
    fill($("#marqueeA"), COLLABORATORS);
    fill($("#marqueeB"), ORCHESTRAS);
  }

  /* ======================================================================
     Concerts
     ====================================================================== */
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderConcerts() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parse = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
    const list = CONCERTS.map((c) => ({ ...c, d: parse(c.date) }));
    const upcoming = list.filter((c) => c.d >= today).sort((a, b) => a.d - b.d);
    const past = list.filter((c) => c.d < today).sort((a, b) => b.d - a.d);
    const months = t("months");

    const item = (c) => `
      <li class="concert">
        <div class="concert__date"><b>${String(c.d.getDate()).padStart(2, "0")}</b><span>${months[c.d.getMonth()]}<span>${c.d.getFullYear()}</span></span></div>
        <div class="concert__title">${esc(c.title)}</div>
        <div class="concert__place">${esc(c.place || "")}</div>
        ${c.url ? `<a class="concert__link" href="${esc(c.url)}" target="_blank" rel="noopener" aria-label="${esc(t("concerts.info"))}: ${esc(c.title)}">${ARROW}</a>` : "<span></span>"}
      </li>`;

    $("#upcoming").innerHTML = upcoming.length
      ? upcoming.map(item).join("")
      : `<li class="concerts__empty">${esc(t("concerts.empty"))} <a href="#contact">→</a></li>`;
    $("#past").innerHTML = past.map(item).join("");
    $(".concerts__group--past").hidden = !past.length;
  }

  /* ======================================================================
     Audio player
     ====================================================================== */
  const Player = (() => {
    const audio = $("#player");
    const ol = $("#tracks");
    const mini = $("#mini");
    const BARS = 120;
    let current = -1;
    let lastBar = -1;
    const play = () => audio.play().catch(() => {});
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

    ol.innerHTML = TRACKS.map((tr, i) => {
      const p = (PEAKS[tr.id] && PEAKS[tr.id].peaks) || [];
      const bars = Array.from({ length: BARS }, (_, k) => `<i style="height:${Math.max(6, (p[k] || 0.3) * 100).toFixed(1)}%"></i>`).join("");
      const dur = PEAKS[tr.id] ? fmt(PEAKS[tr.id].duration) : "";
      return `
        <li class="track reveal" data-i="${i}">
          <button class="track__btn" aria-label="">
            <svg class="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
          </button>
          <div class="track__meta"><b>${esc(tr.composer)}</b><span>${esc(tr.work)}${tr.movement ? " · " + esc(tr.movement) : ""}</span></div>
          <div class="track__wave" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0" aria-label="${esc(tr.composer)}">${bars}</div>
          <div class="track__time" data-total="${dur}">${dur}</div>
        </li>`;
    }).join("");
    const items = $$(".track", ol);

    function load(i) {
      if (i === current) return;
      if (current > -1) reset(items[current]);
      current = i;
      lastBar = -1;
      audio.src = `assets/audio/${TRACKS[i].id}.mp3`;
      items[i].classList.add("is-loaded");
      $("#miniComposer").textContent = TRACKS[i].composer;
      $("#miniWork").textContent = TRACKS[i].work;
    }
    function reset(li) {
      li.classList.remove("is-playing", "is-loaded");
      $$(".track__wave i", li).forEach((b) => b.classList.remove("done"));
      const time = $(".track__time", li);
      time.textContent = time.dataset.total;
    }
    function toggle(i) {
      if (i !== current) { load(i); play(); return; }
      audio.paused ? play() : audio.pause();
    }
    function seek(i, ratio) {
      load(i);
      const go = () => { audio.currentTime = ratio * audio.duration; play(); };
      audio.readyState >= 1 ? go() : audio.addEventListener("loadedmetadata", go, { once: true });
    }

    items.forEach((li, i) => {
      $(".track__btn", li).addEventListener("click", () => toggle(i));
      const wave = $(".track__wave", li);
      wave.addEventListener("pointerdown", (e) => {
        const r = wave.getBoundingClientRect();
        seek(i, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      });
      wave.addEventListener("keydown", (e) => {
        if (i !== current || !audio.duration) return;
        if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 10);
      });
    });

    const sync = () => {
      const li = items[current];
      if (!li) return;
      li.classList.toggle("is-playing", !audio.paused);
      mini.classList.toggle("is-playing", !audio.paused);
      updateTrackLabels();
    };
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    audio.addEventListener("timeupdate", () => {
      const li = items[current];
      if (!li || !audio.duration) return;
      const ratio = audio.currentTime / audio.duration;
      const bar = Math.floor(ratio * BARS);
      if (bar !== lastBar) {
        $$(".track__wave i", li).forEach((b, k) => b.classList.toggle("done", k <= bar));
        $(".track__wave", li).setAttribute("aria-valuenow", Math.round(ratio * 100));
        lastBar = bar;
      }
      $(".track__time", li).textContent = `${fmt(audio.currentTime)} / ${li.querySelector(".track__time").dataset.total}`;
      $("#miniProgress").style.width = `${ratio * 100}%`;
    });
    audio.addEventListener("ended", () => {
      const next = current + 1;
      if (next < TRACKS.length) toggle(next); else { reset(items[current]); current = -1; mini.classList.remove("is-visible"); }
    });
    $("#miniBtn").addEventListener("click", () => current > -1 && toggle(current));

    return {
      isPlaying: () => !audio.paused,
      active: () => current > -1,
      labels() {
        items.forEach((li, i) => {
          const playing = i === current && !audio.paused;
          $(".track__btn", li).setAttribute("aria-label", `${t(playing ? "audio.pause" : "audio.play")}: ${TRACKS[i].composer}`);
        });
      },
    };
  })();

  function updateTrackLabels() { Player.labels(); }

  function updateMini() {
    const mini = $("#mini");
    if (!Player.active()) { mini.classList.remove("is-visible"); return; }
    const r = $("#audio").getBoundingClientRect();
    const inView = r.top < innerHeight && r.bottom > 0;
    mini.classList.toggle("is-visible", !inView);
  }

  /* ======================================================================
     Gallery + lightbox
     ====================================================================== */
  const Gallery = (() => {
    const grid = $("#masonry");
    const INITIAL = 12;
    const fit = (w, h, max) => { const s = Math.min(1, max / Math.max(w, h)); return [Math.round(w * s), Math.round(h * s)]; };

    grid.innerHTML = PHOTOS.map(([name, w, h], i) => {
      const [sw, sh] = fit(w, h, 800);
      return `<button class="${i >= INITIAL ? "is-extra" : ""}" data-i="${i}" aria-label="Monika Leskovar ${i + 1}/${PHOTOS.length}">
        <img src="assets/photos/sm/${name}.webp" width="${sw}" height="${sh}" alt="Monika Leskovar" loading="lazy" decoding="async">
      </button>`;
    }).join("");
    $$("img", grid).forEach((img) => {
      if (img.complete) img.classList.add("ready");
      else img.addEventListener("load", () => img.classList.add("ready"), { once: true });
    });

    $("#moreBtn").addEventListener("click", () => grid.classList.add("show-all"));

    const lb = $("#lightbox");
    const img = $("#lbImg");
    let idx = 0, opener = null;

    function show(i) {
      idx = (i + PHOTOS.length) % PHOTOS.length;
      const [name, w, h] = PHOTOS[idx];
      const [lw, lh] = fit(w, h, 2000);
      img.classList.add("loading");
      img.onload = () => img.classList.remove("loading");
      img.width = lw; img.height = lh;
      img.src = `assets/photos/lg/${name}.webp`;
      img.alt = `Monika Leskovar — ${idx + 1}/${PHOTOS.length}`;
      $("#lbCount").textContent = `${String(idx + 1).padStart(2, "0")} / ${PHOTOS.length}`;
      const dl = $("#lbDownload");
      dl.href = `assets/press/${name}.${PRESS_EXT[name] || "jpg"}`;
      dl.setAttribute("download", `${name}.${PRESS_EXT[name] || "jpg"}`);
      [idx + 1, idx - 1].forEach((n) => { const p = PHOTOS[(n + PHOTOS.length) % PHOTOS.length]; new Image().src = `assets/photos/lg/${p[0]}.webp`; });
    }
    function open(i, from) {
      opener = from;
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      show(i);
      $("#lbClose").focus();
    }
    function close() {
      lb.hidden = true;
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }

    grid.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-i]");
      if (b) open(+b.dataset.i, b);
    });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", () => show(idx - 1));
    $("#lbNext").addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb__stage")) close(); });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu();
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "Tab") { // keep focus inside the dialog
        const f = $$("button, a", lb);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    let sx = null;
    lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
  })();

  /* ======================================================================
     Parallax (contact background)
     ====================================================================== */
  const contactBg = $(".contact__bg");
  function parallax() {
    if (reduceMotion) return;
    const r = contactBg.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    contactBg.style.transform = `translate3d(0, ${(p * 60).toFixed(1)}px, 0)`;
  }

  /* ======================================================================
     Init
     ====================================================================== */
  $("#year").textContent = new Date().getFullYear();
  renderMarquee();
  setLang(detectLang());
  observeReveals();
  Strings.layout();
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  const ready = () => requestAnimationFrame(() => { Strings.layout(); document.body.classList.add("loaded"); });
  (document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve()).then(ready);
})();
