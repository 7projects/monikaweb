#!/usr/bin/env node
/* ==========================================================================
   Slaže stranicu za svaki jezik iz src/template.html + js/content.js + js/bio.js
     index.html      hrvatski   https://www.monikaleskovar.com/
     en/index.html   engleski   https://www.monikaleskovar.com/en/
     de/index.html   njemački   https://www.monikaleskovar.com/de/
   te sitemap.xml i robots.txt.

   Pokretanje:  node build.js
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SITE = "https://www.monikaleskovar.com/";
const DIR = __dirname;
const LANGS = [
  { code: "hr", dir: "", locale: "hr_HR", name: "Hrvatski" },
  { code: "en", dir: "en/", locale: "en_GB", name: "English" },
  { code: "de", dir: "de/", locale: "de_DE", name: "Deutsch" },
];

// --- load the same data files the browser uses -----------------------------
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["js/content.js", "js/bio.js", "js/peaks.js"]) {
  vm.runInContext(fs.readFileSync(path.join(DIR, f), "utf8"), sandbox, { filename: f });
}
const { CONCERTS, TRACKS, DISCOGRAPHY, SERIES, PRESS_EXT, COLLABORATORS, I18N, BIO, BIO_DOCS, PEAKS } = sandbox.window;

const template = fs.readFileSync(path.join(DIR, "src/template.html"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/<!--\s*NE UREĐUJTE[\s\S]*?-->\n/, "");

// --- helpers ----------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const clock = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const SERIES_ORDER = ["portraits", "elements", "chiaroscuro", "stage"];
const fit = (w, h, max) => { const k = Math.min(1, max / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)]; };

/* Pack a series into half-row blocks (one landscape, or two portraits), so rows are always
   complete on a 12-column desktop grid and on a 6-column phone grid. Must match main.js. */
function pack(items) {
  const out = [];
  let waiting = null;
  for (const p of items) {
    if (p.w > p.h) out.push(p);
    else if (waiting) { out.push(waiting, p); waiting = null; }
    else waiting = p;
  }
  if (waiting) out.push(waiting);
  return out;
}

function concertRow(c, lang) {
  const [y, m, d] = c.date.split("-");
  const inner = `
          <time class="dt" datetime="${esc(c.date)}">${d}.${m}.${y}</time>
          <span class="t">${esc(c.title)}</span>
          <span class="pl">${esc(c.place || "")}</span>${c.program ? `
          <span class="pg">${esc(c.program)}</span>` : ""}`;
  return `
        <li data-date="${esc(c.date)}">${c.url
    ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="row">${inner}</div>`}</li>`;
}

function buildPage(L) {
  const T = (k) => {
    const v = (I18N[L.code] && I18N[L.code][k]) ?? I18N.en[k];
    if (v === undefined) throw new Error(`Missing I18N key "${k}"`);
    return v;
  };
  const root = L.dir ? "../" : "";
  const url = SITE + L.dir;
  const today = new Date().toISOString().slice(0, 10);

  // statement: one span per word, *word* = emphasised
  const statement = T("statement").split(" ").map((w) =>
    `<span class="w${/^\*.*\*[.,]?$/.test(w) ? " em" : ""}">${esc(w.replace(/\*/g, ""))}</span>`).join(" ");

  const timeline = T("timeline").map(([y, h, p]) => `
            <li class="tl${y === "1995" ? " peak" : ""}">
              <span class="tl__year">${esc(y)}</span><span class="tl__dot" aria-hidden="true"></span>
              <h3>${esc(h)}</h3><p>${esc(p)}</p>
            </li>`).join("") + "\n          ";

  const bio = (BIO[L.code] || BIO.en).map((p) => `\n              <p>${esc(p)}</p>`).join("") + "\n            ";

  const tracks = TRACKS.map((tr, i) => `
            <li data-i="${i}"><button data-cursor="play">
              <span class="n">${ROMAN[i]}.</span>
              <span class="c">${esc(tr.composer)}</span>
              <span class="d">${PEAKS[tr.id] ? clock(PEAKS[tr.id].duration) : ""}</span>
              <span class="wk">${esc(tr.work)}${tr.detail ? " — " + esc(tr.detail) : ""}</span>
            </button></li>`).join("") + "\n          ";

  // Discography: every album gets a full card (all visible without JS); with JS only the chosen one shows
  // and the shelf of covers below switches between them.
  const tx = (v) => (typeof v === "string" ? v : v[L.code] || v.en);
  const cover = (a) => `${root}assets/discography/${a.cover}.webp`;
  const albums = DISCOGRAPHY.map((a, i) => {
    const spotify = `https://open.spotify.com/album/${a.spotify}`;
    const row = (label, value) => value ? `
                <div><dt class="mono">${esc(T(label))}</dt><dd>${esc(value)}</dd></div>` : "";
    return `
          <article class="album${i === 0 ? " on" : ""}" id="album-${i + 1}">
            <img class="album__cover" src="${cover(a)}" width="600" height="600" alt="${esc(a.title)}" loading="lazy" decoding="async">
            <div class="album__body">
              <p class="mono album__meta">${a.year} · ${esc(a.label)}</p>
              <h3 class="album__title">${esc(a.title)}</h3>
              <dl class="album__dl">${row("disco.works", a.composer)}${row("disco.plays", tx(a.work))}${row("disco.with", (a.with || []).join(" · "))}
              </dl>
              <div class="album__actions">
                <a class="album__play" href="${spotify}" target="_blank" rel="noopener" data-spotify="${esc(a.spotify)}" data-cursor="play">
                  <span class="album__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
                  <span>${esc(T("disco.listen"))}</span>
                </a>${a.shop ? `
                <a class="pill" href="${esc(a.shop)}" target="_blank" rel="noopener">${esc(T("disco.buy"))} ↗</a>` : ""}
                <a class="pill" href="${spotify}" target="_blank" rel="noopener">Spotify ↗</a>
              </div>
              <p class="album__note">${esc(T("disco.note"))}</p>
            </div>
          </article>`;
  }).join("");
  const shelf = DISCOGRAPHY.map((a, i) => `
            <li><a href="#album-${i + 1}" data-album="${i + 1}"${i === 0 ? ' aria-current="true"' : ""}>
              <img src="${cover(a)}" width="600" height="600" alt="" loading="lazy" decoding="async">
              <span class="mono">${a.year}</span>
              <span class="shelf__t">${esc(a.title)}</span>
            </a></li>`).join("");
  const discography = `${albums}
          <ol class="shelf" aria-label="${esc(T("disco.all"))}">${shelf}
          </ol>
        `;

  const total = SERIES_ORDER.reduce((n, s) => n + SERIES[s].length, 0);
  const filters = [["all", total], ...SERIES_ORDER.map((s) => [s, SERIES[s].length])].map(([s, n], i) => `
          <button role="tab" data-series="${s}" aria-selected="${i === 0}"><span>${esc(T("gallery." + s))}</span><sup>${n}</sup></button>`).join("") + "\n        ";

  let n = 0;
  const gallery = SERIES_ORDER.map((s) => {
    const items = pack(SERIES[s].map(([name, w, h]) => ({ name, w, h })));
    return `
          <div class="set" data-series="${s}">
            <h3 class="set__h mono"><span>${esc(T("gallery." + s))}</span><sup>${pad(items.length)}</sup></h3>
            <div class="grid">${items.map((p) => {
      n++;
      const [sw, sh] = fit(p.w, p.h, 800);
      const ext = PRESS_EXT[p.name] || "jpg";
      return `
              <a class="tile${p.w > p.h ? " tile--wide" : ""}" href="${root}assets/photos/lg/${p.name}.webp" data-name="${p.name}" data-w="${p.w}" data-h="${p.h}" data-ext="${ext}" data-cursor="view">
                <img src="${root}assets/photos/sm/${p.name}.webp" width="${sw}" height="${sh}" alt="${esc(T("gallery.alt"))} — ${esc(T("gallery." + s))} ${pad(n)}" loading="lazy" decoding="async">
                <span class="tile__n mono" aria-hidden="true">V.${pad(n)}</span>
              </a>`;
    }).join("")}
            </div>
          </div>`;
  }).join("") + "\n        ";

  const up = CONCERTS.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = CONCERTS.filter((c) => c.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const empty = `
        <li class="empty">${esc(T("concerts.empty"))}<br><a href="#coda">${esc(T("concerts.booking"))} →</a></li>`;

  const langLink = (o, label) => `<a href="${root}${o.dir}" hreflang="${o.code}" lang="${o.code}" data-lang="${o.code}"${o.code === L.code ? ' aria-current="page" class="on"' : ""}>${label}</a>`;
  const hreflang = LANGS.map((o) => `  <link rel="alternate" hreflang="${o.code}" href="${SITE}${o.dir}">`)
    .concat(`  <link rel="alternate" hreflang="x-default" href="${SITE}en/">`).join("\n");

  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Monika Leskovar",
    jobTitle: T("hero.role"),
    description: T("meta.description"),
    nationality: { "@type": "Country", name: "Croatia" },
    birthDate: "1981-03-15",
    birthPlace: { "@type": "Place", name: "Kreuztal, Germany" },
    url,
    image: SITE + "assets/og.jpg",
    email: "mailto:info@monikaleskovar.com",
    alumniOf: { "@type": "CollegeOrUniversity", name: "Hochschule für Musik Hanns Eisler Berlin" },
    worksFor: { "@type": "CollegeOrUniversity", name: "Academy of Music, University of Zagreb" },
    award: ["International Tchaikovsky Competition for Young Musicians, 1st prize (1995)", "ARD International Music Competition (2001)"],
    sameAs: ["https://www.instagram.com/monikaleskovarcello", "https://www.facebook.com/monika.leskovar.5"],
  }, null, 2).replace(/</g, "\\u003c");

  const blocks = {
    lang: L.code, url, site: SITE, locale: L.locale, hreflang, jsonld,
    isHome: String(L.code === "hr"),
    langShort: LANGS.map((o) => langLink(o, o.code.toUpperCase())).join(""),
    langLong: LANGS.map((o) => langLink(o, o.name)).join(""),
    statement, timeline, bio, tracks, discography, filters, gallery,
    bioPdf: BIO_DOCS[L.code].pdf, bioDocx: BIO_DOCS[L.code].docx,
    with: COLLABORATORS.map(([name, href]) => href
      ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(name)}</a>`
      : `<span>${esc(name)}</span>`).join("<b aria-hidden=\"true\">◆</b>"),
    firstComposer: esc(TRACKS[0].composer),
    firstDuration: PEAKS[TRACKS[0].id] ? clock(PEAKS[TRACKS[0].id].duration) : "00:00",
    upcoming: (up.length ? up.map((c) => concertRow(c, L)).join("") : empty) + "\n            ",
    past: past.map((c) => concertRow(c, L)).join("") + "\n            ",
    pastHidden: past.length ? "" : " hidden",
    year: String(new Date().getFullYear()),
  };

  return template
    .replace(/\[\[(\w+)\]\]/g, (_, k) => { if (!(k in blocks)) throw new Error(`Unknown block [[${k}]]`); return blocks[k]; })
    .replace(/\{\{\{([\w.]+)\}\}\}/g, (_, k) => T(k))
    .replace(/\{\{([\w.]+)\}\}/g, (_, k) => esc(T(k)))
    .replace(/@\//g, root);
}

// --- write pages --------------------------------------------------------------
for (const L of LANGS) {
  const out = path.join(DIR, L.dir, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buildPage(L));
  console.log("✓", path.relative(DIR, out));
}

const lastmod = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map((L) => `  <url>
    <loc>${SITE}${L.dir}</loc>
    <lastmod>${lastmod}</lastmod>
${LANGS.map((o) => `    <xhtml:link rel="alternate" hreflang="${o.code}" href="${SITE}${o.dir}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}en/"/>
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIR, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(DIR, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
console.log("✓ sitemap.xml\n✓ robots.txt");
