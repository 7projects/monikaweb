# monikaleskovar.com — verzija 2

Statična stranica na tri jezika, svaki na svojoj adresi:

| Jezik    | Datoteka          | Adresa                                  |
|----------|-------------------|-----------------------------------------|
| hrvatski | `index.html`      | https://www.monikaleskovar.com/         |
| engleski | `en/index.html`   | https://www.monikaleskovar.com/en/      |
| njemački | `de/index.html`   | https://www.monikaleskovar.com/de/      |

Te tri datoteke, `sitemap.xml` i `robots.txt` **generiraju se** — ne uređujte ih ručno.

## Kako mijenjati sadržaj

1. Uredi sadržaj:
   - `js/content.js` — koncerti, snimke, galerija, vremenska crta, svi kratki tekstovi (HR/EN/DE)
   - `js/bio.js` — puni tekst biografije
   - `src/template.html` — struktura stranice (samo ako se mijenja raspored)
2. Pokreni u mapi `verzija2`:
   ```
   node build.js
   ```
3. Na hosting prenesi promijenjene datoteke (obično `index.html`, `en/`, `de/`, `sitemap.xml`).

### Primjeri

- **Novi koncert** — u `CONCERTS`:
  `{ date: "2026-12-05", title: "Naziv", program: "Dvořák · Koncert u h-molu", place: "Lisinski, Zagreb", url: "https://..." }`
  Prošli datumi sami prelaze u arhivu (i bez ponovnog generiranja).
- **Uvodna rečenica** — `statement`; riječ u `*zvjezdicama*` ispisuje se jantarnim kurzivom.
- **Fotografija** — dodaj u seriju u `SERIES` (WebP u `assets/photos/sm` i `lg`, original u `assets/press`).

## Štimer (Accordatura)

Oznake „A = 442 Hz“ (hero, footer, izbornik na mobitelu) otvaraju štimer za violončelo: referentni tonovi
C G D A, mikrofon (obrada samo u pregledniku), podesivi A (415–446 Hz) i čiste/temperirane kvinte.
Izravna poveznica: `https://www.monikaleskovar.com/#accordatura`. Mikrofon radi samo preko HTTPS-a (ili `localhost`).

## Što je u mapi

```
index.html, en/, de/   generirane stranice
sitemap.xml, robots.txt
build.js               generator
src/template.html      predložak
css/style.css          dizajn
js/content.js          sadržaj (koriste ga i generator i preglednik)
js/bio.js              biografija (koristi ga samo generator)
js/peaks.js            valni oblici snimki
js/main.js             ponašanje u pregledniku
assets/                fotografije, snimke, dokumenti, og.jpg (slika za dijeljenje linka)
```

`build.js` i `src/` ne moraju na hosting (ne smeta ni ako su gore).

## Nakon objave

1. U Google Search Console (https://search.google.com/search-console) dodaj domenu i prijavi
   `https://www.monikaleskovar.com/sitemap.xml`.
2. Ako stranica neće biti na `https://www.monikaleskovar.com/` (npr. bez `www`), promijeni `SITE` na vrhu
   `build.js` i ponovno pokreni `node build.js`.

## Lokalni pregled

```
python -m http.server 8000
```
