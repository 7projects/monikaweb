# monikaleskovar.com

Statična web stranica bez build koraka: HTML + CSS + JavaScript.

## Struktura

```
index.html          stranica
css/style.css       dizajn
js/content.js       SAV SADRŽAJ: koncerti, snimke, galerija, tekstovi HR/EN/DE
js/peaks.js         valni oblici snimki (generirano iz MP3 datoteka)
js/main.js          ponašanje (izbornik, player, galerija, žice, jezici)
assets/
  photos/sm|lg/     optimizirane WebP fotografije (800px / 2000px)
  press/            originali u punoj rezoluciji (za preuzimanje iz galerije)
  hero/             pozadinske fotografije
  audio/            MP3 snimke
  docs/             biografija PDF/DOCX
```

## Česte izmjene

**Novi koncert:** u `js/content.js` dodaj red u `CONCERTS`:

```js
{ date: "2026-12-05", title: "Naziv koncerta", place: "Lisinski, Zagreb", url: "https://..." },
```

Budući datumi se prikazuju pod "Nadolazeći", a prošli automatski prelaze u "Arhivu".

**Tekstovi:** u `js/content.js` pod `I18N.hr`, `I18N.en` i `I18N.de`.

**Nova fotografija:** spremi WebP u `assets/photos/sm/` (800px) i `assets/photos/lg/` (2000px),
original u `assets/press/`, pa dodaj `["ime-datoteke", širina, visina]` u `PHOTOS`.

## Lokalni pregled

```
python -m http.server 8000
```

pa otvori http://localhost:8000

## Postavljanje

Kopirajte cijelu mapu na postojeći hosting (FTP) ili na Netlify / Cloudflare Pages / GitHub Pages.
