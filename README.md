# tischleinfahrdich.ch

Statische Website für kuratierte Oldtimer-Ausfahrten mit Mittagessen ab Thun und Bern (ohne Framework, ohne Build-Schritt).

## 1. Lokale Vorschau

Da der Konfigurator `/data/config.json` per `fetch` lädt, die Seite über einen lokalen Webserver öffnen (nicht per Doppelklick als `file://`):

```bash
python3 -m http.server 8000
```

Danach im Browser öffnen:
- Startseite: `http://localhost:8000/`
- Konfigurator: `http://localhost:8000/anfrage/`
- Test mit Vorauswahl: `http://localhost:8000/anfrage/?ziel=loewen-riffenmatt`

*(Bilder aus Google Drive «Fahrzeuge Sommer 2027» in den Ordner `/img/` legen: `hero-sbarro-montreux.jpg`, `sbarro-bmw-328.jpg`, `porsche-356-b.jpg`, `porsche-boxster-s.jpg`, `peugeot-203-c.jpg`, `sbarro-avezzano.jpg`.)*

## 2. Deploy auf Cloudflare Pages

1. Repository `Beat1966/tischleinfahrdich` auf GitHub pushen (Branch `main`).
2. In Cloudflare Pages ein neues Projekt mit dem Repo `Beat1966/tischleinfahrdich` verbinden.
3. Einstellungen:
   - **Production branch:** `main`
   - **Build command:** *(leer lassen)*
   - **Build output directory:** `/` (oder `.`)
4. Custom Domain `tischleinfahrdich.ch` verbinden.

## 3. Google Apps Script einrichten (`/apps-script/Code.gs`)

1. Neues Google Sheet erstellen (z. B. «Tischlein fahr dich – Anfragen»).
2. Menü **Erweiterungen → Apps Script** öffnen.
3. Den Inhalt von `/apps-script/Code.gs` einfügen und `NOTIFY_EMAIL` auf Beats E-Mail-Adresse setzen.
4. Oben rechts auf **Bereitstellen → Neue Bereitstellung** klicken:
   - Typ: **Web-App**
   - Ausführen als: **Ich**
   - Zugriff: **Jeder**
5. Berechtigungen bestätigen und die erzeugte Web-App-URL kopieren.
6. Die URL in `/data/config.json` unter `"anfrageEndpoint"` eintragen (und `"empfaengerEmail"` als Fallback setzen).

## 4. Launch-Checkliste (vor Go-Live)

- [ ] Alle `[OFFEN]`-Platzhalter aus der Liste unten ersetzen.
- [ ] Alle 6 Fahrzeugbilder (inkl. WebP-Optimierung falls gewünscht) und später Restaurant-Fotos in `/img/` ablegen.
- [ ] Apps Script deployen, `anfrageEndpoint` testen (Testanfrage ins Sheet + E-Mail-Eingang prüfen).
- [ ] In **allen 17 HTML-Dateien** `<meta name="robots" content="noindex, nofollow">` entfernen.
- [ ] `robots.txt` auf produktiv umstellen:
  ```txt
  User-agent: *
  Allow: /
  Sitemap: https://tischleinfahrdich.ch/sitemap.xml
  ```
- [ ] Property in **Google Search Console** anlegen und `https://tischleinfahrdich.ch/sitemap.xml` einreichen.
- [ ] Property in **Bing Webmaster Tools** anlegen und `sitemap.xml` einreichen.
- [ ] Lighthouse-Prüfung (Performance, Accessibility, Best Practices, SEO je ≥ 90) durchführen.

## 5. Verbliebene `[OFFEN]`-Platzhalter

| Datei | Stelle | Platzhalter |
|---|---|---|
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 133 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 205 | `[OFFEN: Distanz und Fahrzeit ab Thun]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 209 | `[OFFEN: Distanz und Fahrzeit ab Bern]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 217 | `[OFFEN: 3–4 Sätze zum Zurflüh's Bahnhöfli in Steffisburg]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 229 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 238 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 239 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 240 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 241 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 242 | `[OFFEN]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 245 | `[OFFEN: Datum]` |
| `ziele/bahnhoefli-steffisburg/index.html` | Zeile 264 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 126 | `[OFFEN: Küchenzeiten Mittag]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 134 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 206 | `[OFFEN: Distanz und Fahrzeit ab Thun]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 210 | `[OFFEN: Distanz und Fahrzeit ab Bern]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 218 | `[OFFEN: 3–4 Sätze zur Hirsere in Ursenbach]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 230 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 239 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 240 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 241 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 242 | `[OFFEN]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 246 | `[OFFEN: Datum]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 264 | `[OFFEN: Küchenzeiten Mittag]` |
| `ziele/hirsernbad-ursenbach/index.html` | Zeile 265 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 132 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 204 | `[OFFEN: Distanz und Fahrzeit ab Thun]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 208 | `[OFFEN: Distanz und Fahrzeit ab Bern]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 216 | `[OFFEN: 3–4 Sätze zum Kemmeriboden-Bad in Schangnau]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 228 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 237 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 238 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 239 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 240 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 241 | `[OFFEN]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 244 | `[OFFEN: Datum]` |
| `ziele/kemmeriboden-schangnau/index.html` | Zeile 263 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 125 | `[OFFEN: Küchenzeiten Mittag]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 133 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 205 | `[OFFEN: Distanz und Fahrzeit ab Thun]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 209 | `[OFFEN: Distanz und Fahrzeit ab Bern]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 217 | `[OFFEN: 3–4 Sätze zum Landgasthof Löwen in Riffenmatt]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 229 | `[OFFEN: Küchenzeiten Mittag]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 238 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 239 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 240 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 241 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 242 | `[OFFEN]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 245 | `[OFFEN: Datum]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 263 | `[OFFEN: Küchenzeiten Mittag]` |
| `ziele/loewen-riffenmatt/index.html` | Zeile 264 | `[OFFEN]` |

## 6. Zeitplan und Fahrzeiten

Jede Ausfahrt ist so geplant, dass wir um 11:30 Uhr im Restaurant sind; das Essen beginnt zwischen 11:45 und 12:00 Uhr.
Die Abfahrt wird rückwärts gerechnet: `ankunftRestaurant` minus `ziele[].fahrzeitMinuten.bern|thun` in `/data/config.json`.
Treffpunkte: Bern, Hotel Bellevue Palace · Thun, Rathausplatz (Restaurant Krone) · Wunschort auf Anfrage.
Verrechnet wird nur die Fahrzeit hin und zurück, aufgerundet auf ganze Stunden (`abrundungMinuten`), CHF 170 pro Stunde.
Die Fahrzeiten sind Schätzungen (Stand 22.11.2026) und auf den Zielseiten in der Tabelle «Die Strecke» ebenfalls eingetragen.
