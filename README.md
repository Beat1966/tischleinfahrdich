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

Keine mehr (Stand 23.11.2026). Unbekannte Restaurantangaben stehen als «Auf Anfrage»; Küchenzeiten werden nicht angegeben.

## 6. Zeitplan und Fahrzeiten

Jede Ausfahrt ist so geplant, dass wir um 11:30 Uhr im Restaurant sind; das Essen beginnt zwischen 11:45 und 12:00 Uhr.
Ausnahme Kemmeriboden-Bad: Ankunft 11:45 Uhr (`ziele[].ankunft`, Restaurant öffnet erst dann).
Die Abfahrt wird rückwärts gerechnet: `ziele[].ankunft` bzw. `ankunftRestaurant` minus `ziele[].fahrzeitMinuten.bern|thun` in `/data/config.json`.
Treffpunkte: Bern, Hotel Bellevue Palace · Thun, Rathausplatz (Restaurant Krone) · Wunschort auf Anfrage.
Verrechnet wird nur die Fahrzeit hin und zurück, aufgerundet auf ganze Stunden (`abrundungMinuten`), CHF 170 pro Stunde.
Die Fahrzeiten sind Schätzungen (Stand 22.11.2026) und auf den Zielseiten in der Tabelle «Die Strecke» ebenfalls eingetragen.
