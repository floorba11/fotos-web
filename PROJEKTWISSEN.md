# Projektwissen: floorba11 Fotos (fotos-web + fotos-server)

Gesamtüberblick über die Spieltagsgalerie von *floorba11 · Luc Maradan Fotografie*: was es gibt, wie es zusammenhängt,
wie es läuft und worauf man achten muss. Stand: November 2026.

---

## 1. Worum geht es?

Unihockey-Spielfotos (vor allem UH Regio Entlebuch, Frauen I/II) sollen für die Athletinnen und Athleten auffindbar und
in voller Auflösung herunterladbar sein, und zwar pro Spiel (Album) und pro Person (Gesichtserkennung).

Das System besteht aus **zwei Repositories**:

| Repo | Inhalt | Läuft auf dem Server in |
|---|---|---|
| `floorba11/fotos-server` | [Immich](https://immich.app) (Fotoverwaltung mit Gesichtserkennung) per Docker Compose, plus `album-sync` | `~/fotos` |
| `floorba11/fotos-web` | Öffentliche Website (Next.js) mit eigenem Design, liest Immich über die API | `~/fotos-web` |

Ein drittes, separates Projekt teilt sich die Maschine: das **Liveticker-Portal** `floorba11/unihockey-portal` in
`~/unihockey`. Es stellt den **Caddy**-Reverse-Proxy (HTTPS) und das Docker-Netzwerk `web` bereit, an das sich beide
Foto-Projekte anhängen.

---

## 2. Architektur

```
                 Cloudflare (orange Wolke, nur Website)
                               │
Internet ──► Caddy (Portal, ~/unihockey, Netzwerk "web")
               ├─ Liveticker-Domain        → Portal "web"
               ├─ IMMICH_DOMAIN (immich.…) → immich-server:2283   (Verwaltung, nur für Luc, "DNS only")
               └─ DOMAIN (fotos.…)         → fotos_web:3000       (öffentliche Website)
                                                 │  x-api-key (nur lesend)
                                                 ▼
                                          immich-server:2283 ──► Postgres, Valkey, Machine Learning
                                                 │
                     /mnt/fotos (Hetzner Storage Box, SMB 3, read-only) → /external/fotos (externe Bibliothek)
```

- Der Browser spricht **nie direkt mit Immich**. Der API-Schlüssel bleibt im Container `fotos_web`.
- Caddy-Konfigurationen werden von den `deploy.sh`-Skripten als `~/unihockey/sites/*.caddy` geschrieben
  (`immich.caddy`, `fotos-web.caddy`) und per `caddy reload` aktiviert. Beide setzen HSTS (1 Jahr).

### Hardware / Hosting

- **Hetzner CX23**: 2 vCPU, 4 GB RAM, 40 GB Disk, 2 GB Swap. Geteilt mit dem Liveticker → Ressourcen sind knapp.
- **Hetzner Storage Box BX11**: Originale (bearbeitete JPEGs). Samba-Support und externe Erreichbarkeit müssen an sein.
- **DNS bei Cloudflare**:
  - `immich.<domain>` → *DNS only* (graue Wolke), sonst 100-MB-Uploadlimit von Cloudflare.
  - `fotos.<domain>` → *Proxied* (orange Wolke), damit Cloudflare Analytics die Besuche zählt (Filter nach Host).

---

## 3. fotos-server (Immich)

### Dateien

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Immich-Stack (Projektname `immich`): Server, Machine Learning, Valkey, Postgres, `album-sync` |
| `env.example` | Vorlage für `~/fotos/.env` |
| `storagebox-einhaengen.sh` | Storage Box per CIFS dauerhaft unter `/mnt/fotos` einhängen (fstab, `vers=3,seal,nofail`) |
| `album-sync.py` | Python-Dienst: pro Ordner ein Album |
| `deploy.sh` | prüft `.env`, Mount, Netzwerk `web`; `docker compose up -d`; schreibt `immich.caddy`; Caddy-Reload |
| `.github/workflows/deploy.yml` | Push auf `main` → Dateien per `scp` nach `~/fotos`, dann `deploy.sh` (falls `.env` existiert) |

### Container und Grenzen

| Container | Image | RAM | Bemerkung |
|---|---|---|---|
| `immich_server` | `ghcr.io/immich-app/immich-server:${IMMICH_VERSION:-v3}` | 1536 MB | Netzwerke `default` + `web` |
| `immich_machine_learning` | `immich-machine-learning` | 1536 MB, 1 CPU | Gesichtserkennung auf CPU |
| `immich_redis` | `valkey:9` (gepinnt per Digest) | 128 MB | |
| `immich_postgres` | `ghcr.io/immich-app/postgres:14-vectorchord…` | 512 MB | Daten **lokal** in `./postgres` |
| `immich_album_sync` | `python:3.13-alpine` | 64 MB | führt `album-sync.py` aus |

- Die Storage Box wird mit `create_host_path: false` gebunden: fehlt der Mount, **startet Immich nicht**, statt mit
  leerem Ordner alle Fotos als gelöscht zu markieren.
- Uploads über die Weboberfläche landen lokal in `./library`, nicht auf der Storage Box.
- ML-Einstellungen in `.env`: `MACHINE_LEARNING_WORKERS=1`, `..._REQUEST_THREADS=1`, `..._MODEL_TTL=300`.
- In Immich unter *Administration → Jobs* die Parallelität auf 1 stellen.

### Wichtige `.env`-Variablen (`~/fotos/.env`)

`IMMICH_DOMAIN` (früher `FOTOS_DOMAIN`, wird noch als Fallback gelesen), `UPLOAD_LOCATION`, `DB_DATA_LOCATION`,
`TZ=Europe/Zurich`, `IMMICH_VERSION=v3`, `DB_PASSWORD` (nur alphanumerisch), `DB_USERNAME`, `DB_DATABASE_NAME`,
`IMMICH_API_KEY` (für album-sync, Vollzugriff), `ALBUM_SYNC_INTERVAL=300`.

### album-sync

- Läuft alle 5 Minuten (vorher 15). Nur Python-Standardbibliothek.
- Liest alle **externen** Bibliotheken (`GET /libraries`), holt die Assets per `POST /search/metadata` (`libraryId`).
- Ordnerpfad relativ zum Importpfad → Albumname mit Trenner ` – ` (Gedankenstrich mit Leerzeichen):
  `Saison_26-27/URE_D1_vs_Wizards/x.jpg` → Album **„Saison_26-27 – URE_D1_vs_Wizards"**.
- Dateien direkt im Importordner bekommen kein Album.
- Merkt sich `assetId → albumId` in `/state/state.json` (Volume `album-sync-state`). Wird ein Album in Immich gelöscht,
  vergisst es die Zuordnung und legt das Album beim nächsten Lauf neu an (gefahrlos).
- Sendet in Blöcken zu 500 Assets (`POST /albums` bzw. `PUT /albums/{id}/assets`).
- Ohne `IMMICH_API_KEY` wartet der Dienst nur. Log: `docker logs -f immich_album_sync`.

### Bekannte Eigenheiten

- Über SMB gibt es **keine Änderungsbenachrichtigung** → in Immich ein Scan-Intervall für die externe Bibliothek
  setzen (z.B. stündlich) oder von Hand scannen. album-sync sieht nur Fotos, die Immich schon eingelesen hat.
- Personen gehören einem Immich-Konto; deshalb übernimmt die eigene Website die Spieleransicht.
- **Backups**: Immich sichert die DB täglich nach `./library/backups`; diesen Ordner zusätzlich wegkopieren. Für die
  Storage Box Hetzner-Snapshots aktivieren (sonst nur ein Exemplar der Originale).
- **Updates**: `IMMICH_VERSION` erhöhen, Release Notes lesen, `bash deploy.sh`. Compose-Datei bei Versionssprüngen mit
  der offiziellen vergleichen.
- Grosse Scans nicht kurz vor oder während eines Spieltags mit Liveticker starten.

---

## 4. Ordner-Konventionen auf der Storage Box (zentral für alles)

| Ordner | Album in Immich | Auf der Website |
|---|---|---|
| `Saison_26-27/URE_D1_vs_Wizards/` | „Saison_26-27 – URE_D1_vs_Wizards" | Startseite „Spiele", Gruppe „Saison 26-27" |
| `weitere/Natur/Aletsch/` | „weitere – Natur – Aletsch" | Tab „Off-Court" (`/weitere`), Gruppe „Natur", Titel „Aletsch" |
| `_Privat/Hochzeit_Muster/` | „_Privat – Hochzeit_Muster" | **nie** (Alben mit `_` am Anfang sind verborgen) |
| `_Portraits/` | **keins**: in Immich unter Bibliothek → Ausschlussmuster `**/_Portraits/**` eintragen | Kaderporträts, nur über `/face/[id]` |
| Dateien ohne Unterordner | kein Album | nie |

Namenskonventionen im Spielordner, die die Website auswertet (`parseAlbumTitle`):

- `A vs B` → Heim- und Gastteam (auch `vs.`).
- `… in Ort` → Ort (letztes „ in ").
- `CUP`, optional mit Runde `1 16` / `1/16` (64/32/16/8/4/2) oder Feldart `GF`/`KF` → Badge „CUP 1/16-FINAL",
  „CUP VIERTELFINAL" (4), „CUP HALBFINAL" (2), „CUP GROSSFELD", „CUP KLEINFELD". Cup-Spiele werden hervorgehoben.
- `Heimrunde` oder `Runde N` → Badge „MEISTERSCHAFT".
- `_` wird zu Leerzeichen. Bekannte Tippfehler werden korrigiert (`TYPO_FIXES`, z.B. „Wohusen" → „Wolhusen").

---

## 5. fotos-web (Website)

### Technik

- **Next.js 16.4.2** (App Router, `output: "standalone"`), **React 19.3**, **TypeScript**, **sharp** (Gesichtsausschnitte),
  Node 24. Tests mit **Vitest 5**, Lint mit ESLint 9 (`eslint-config-next`).
- Alle Seiten `force-dynamic` (Daten zur Laufzeit aus Immich, `CONTACT_EMAIL` zur Laufzeit).
- Header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` auf allen Pfaden (auch Bilder, ZIPs) und `<meta robots>`.
  `robots.txt` erlaubt das Abrufen absichtlich: bei `Disallow: /` sähe Google das noindex nie und könnte verlinkte
  Adressen trotzdem als Treffer zeigen. Bereits indexierte Seiten: Google Search Console → Entfernen.
- Schrift: Barlow Condensed (Google Fonts, `--font-display`) für Schlagzeilen, sonst System/Inter.

### Seiten und Routen

| Pfad | Datei | Inhalt |
|---|---|---|
| `/` | `app/page.tsx` | Hero mit zufälligem Titelbild (Immich-Favorit im Querformat aus Spielalben, sonst Cover des neuesten Spiels), Slogan „Vollgas auf dem Feld. Für immer im Kasten.", schwebende Suche, Match-Poster nach Saison |
| `/album/[id]` | `app/album/[id]/page.tsx` | Kopf mit Saison, Wettbewerbs-Badge, Titel (`MatchTitle`), Datum, Anzahl, Ort; ZIP-Button; Filterleiste „In diesem Spiel markiert" (Gesichter); Galerie |
| `/spieler` | `app/spieler/page.tsx` | „Athleten-Roster – Finde dich.": alle benannten, nicht ausgeblendeten Personen, Namenssuche |
| `/spieler/[id]` | `app/spieler/[id]/page.tsx` | Profil mit Nachname als Wasserzeichen, Porträt, „N Action-Shots", ZIP, alle Fotos neueste zuerst |
| `/weitere` | `app/weitere/page.tsx` | „Off-Court – Abseits vom Spielfeld." Alben aus `weitere/` |
| `/weitere/[id]` | re-export der Albumseite | damit der Tab aktiv bleibt; ohne Personen-Filter |
| `/img/[id]/[size]` | Route Handler | `thumbnail`, `preview`, `original` (mit `?download=1` als Anhang). **Nur Fotos aus sichtbaren Alben**, sonst 404 |
| `/face/[id]` | Route Handler | Kaderporträt (Datei aus `_Portraits`, auf 240×240 zugeschnitten), sonst Gesicht aus neustem sichtbaren Foto (sharp, 240×240), sonst SVG-Platzhalter. Nie das Immich-Personen-Thumbnail (könnte aus privatem Foto stammen) |
| `/zip/[kind]/[id]` | Route Handler | `kind` = `album` oder `spieler`; ZIP über Immich `/download/info` + `/download/archive`, gestreamt; max. **3 gleichzeitig**, sonst 503 mit `Retry-After: 60` |
| `/robots.txt` | `app/robots.ts` | `Allow: /` (damit Google das noindex sieht) |

Navigation: **Spiele** · **Athleten** (früher „Spieler"; URL bleibt `/spieler`) · **Off-Court**.
Fuss: Fairplay-Banner, Copyright, optional Kontaktzeile mit `CONTACT_EMAIL`.

### Bibliotheken (`src/lib`)

| Datei | Aufgabe |
|---|---|
| `immich.ts` | API-Zugriff (`x-api-key`), In-Memory-Cache (`cached`, 2 Min. TTL), `getAlbums`, `getAlbum`, `getAlbumPhotos`, `getVisiblePhotoIds`, `getHeroPhotoIds`/`pickHeroPhotoId`, `getPersonPhotos`, `getFaceBox`, `getPeople`, `getPerson`, `getAlbumPeople`; `isHiddenAlbum` (`_`), `isUuid`, `ImmichError` |
| `format.ts` | `parseAlbumName` (Saison/Titel, `weitere` fällt weg), `isOtherAlbum`, `formatDate`/`formatDateRange` (de-CH, Europe/Zurich, „18.–19. Oktober 2026"), `groupBySeason` („Weitere" zuletzt) |
| `parseAlbumTitle.ts` | Wettbewerb, Teams, Ort, Tippfehler (siehe Abschnitt 4) |
| `matchMetadata.ts` | Von Hand gepflegte Resultate pro Spiel (`score`), Schlüssel Album-UUID oder normalisierter Titel (`ure-d1-vs-wolhusen`). Zurzeit leer |
| `portraits.ts` | Kaderporträts: Dateien `Vorname Nachname.jpg` im privaten Ordner `_Portraits` der Storage Box (Container: `/portraits`, `PORTRAITS_DIR`), dahinter der Startbestand `public/portraits` (von uh-regio-entlebuch.ch). Mehrere Namen: `Leandra Fischer = Leli Fischer.jpg`. Zuordnung über Namens-Token (Umlaute → ae/oe/ue, Reihenfolge egal, eindeutig, min. 2 Teile); Zuschnitt mit sharp |
| `face.ts` | `faceCrop` (quadratisch, ~2,6 × Gesicht, leicht nach unten), `newestFace` (sucht in den 5 neusten Fotos, Cache 10 Min.) |
| `limit.ts` | `createLimiter`, `guardStream` (gibt den ZIP-Slot bei Ende/Abbruch/Fehler frei) |
| `name.ts` | `splitName` → Vorname(n) / Nachname |
| `toast.ts` | Mini-Toast-Eventsystem (`fotos:toast`), `copyText` mit Fallback |

### Komponenten (`src/components`)

`AlbumBrowser` (Poster-Raster mit Suche, Highlight = Cup-Spiel oder neuestes Spiel der Saison, Badge Resultat oder
„N SHOTS"), `AlbumGallery` (Personenfilter), `Gallery` (Blocksatz-Raster nach Seitenverhältnis, Lightbox mit Pfeiltasten,
Esc, Wischen, Vorladen der Nachbarn, Original-Download), `PlayerBrowser`/`PlayerRoster` (Porträtkarten), `MatchTitle`,
`NavLink`, `Logo` (Blenden-Symbol + „floorba11 / Luc Maradan · Fotografie"), `FairplayBanner` („Fotos gratis, Credit
Pflicht", Buttons kopieren „@floorba11" bzw. „Foto: Luc Maradan"), `CopyButton`, `Toaster`, `DownloadLink`.

### Design

- „Maroon Mood": immer hell (`colorScheme: light`), Hintergrund Pale Rose `#f8f5f5`, Soft Black `#262626`,
  Akzent Maroon `#7a3b3b`. Gesamtes Design in `src/app/globals.css` (~1100 Zeilen), dazu `styles/album-filter.css`,
  `styles/fairplay.css`.
- Hero: Titelbild oben klar, unteres Drittel läuft in Soft Black aus; Suchleiste schwebt über dem unteren Rand.
- Match-Poster mit Cover, Badges oben, Teams in Sport-Schrift, „vs" als Maroon-Pille.

### Sichtbarkeitsregeln (Datenschutz-Logik im Code)

1. Alben mit `_` am Anfang oder 0 Fotos werden nie gelistet.
2. `/img/…` liefert nur Fotos, die in einem sichtbaren Album sind (`getVisiblePhotoIds`).
3. Spielerseiten, Spieler-ZIPs, Gesichtsbilder und Hero-Bild nutzen nur Fotos aus **Spielalben** (sichtbar und nicht
   `weitere`).
4. Personen ohne Namen oder in Immich ausgeblendet erscheinen nicht.
5. Videos werden nicht angezeigt (nur `type === "IMAGE"`).

### Immich-API-Hinweise

- Geprüft mit Immich **v3.3.5**. Fotosuche über `POST /search/metadata` mit `albumIds`, `personIds`, `page`
  (seit v3.2 „deprecated", funktioniert noch). Fällt das weg: `searchPhotos` in `immich.ts` auf `filter` umstellen.
- Personen: `GET /people?withHidden=false&size=500&page=N`. Gesichter: `GET /assets/{id}` → `people[].faces[]`.
- Website-Schlüssel nur mit: `album.read`, `asset.read`, `asset.view`, `asset.download`, `person.read`
  (nicht derselbe wie für album-sync).

### Betrieb

- `docker-compose.yml`: Dienst `fotos-web`, Container `fotos_web` (bewusst nicht `web`, Namenskonflikt im Netzwerk),
  Image `ghcr.io/floorba11/fotos-web:latest`, 256 MB RAM, Netzwerk `web`.
- `.env` (`~/fotos-web/.env`): `DOMAIN`, `IMMICH_API_KEY`, `CONTACT_EMAIL` (optional).
- `deploy.sh`: startet, schreibt `fotos-web.caddy` (zstd/gzip, HSTS, `flush_interval -1` für ZIP-Streaming), Caddy-Reload.
- `Dockerfile`: zweistufig, `node:24-bookworm-slim`, Standalone-Output, läuft als `node` auf Port 3000.
- **CI/CD** (`.github/workflows/deploy.yml`): Push auf `main` → Job `test` (`npm ci`, lint, typecheck, test) → Job
  `deploy` (Image bauen, nach ghcr.io mit Tags `latest` + SHA, GHA-Cache; per SSH Dateien kopieren, `docker login` mit
  dem kurzlebigen `GITHUB_TOKEN`, `docker compose pull`, `deploy.sh`, logout, `image prune`).
- Secrets in beiden Repos: `VM_HOST`, `VM_USER`, `VM_SSH_KEY` (dieselben wie beim Portal; Schlüssel als PEM oder base64).

### Entwickeln

```bash
npm install
IMMICH_URL=https://immich.<domain> IMMICH_API_KEY=… npm run dev
npm run lint && npm run typecheck && npm test
```

Tests in `tests/`: `face`, `format`, `immich`, `limit`, `name`, `parseAlbumTitle`, `portraits`, `toast`.

---

## 6. Spieltags-Ablauf (Ende-zu-Ende)

1. Bearbeitete JPEGs vom Mac per SMB/SFTP in einen Ordner pro Spiel auf die Storage Box legen
   (z.B. `Saison_26-27/URE_D1_vs_Wolhusen_CUP_1_16/`).
2. Immich scannt die externe Bibliothek (Intervall oder von Hand), erstellt Vorschauen, erkennt Gesichter (dauert auf CPU).
3. album-sync legt innerhalb von 5 Minuten das Album an.
4. Website zeigt es nach spätestens 2 Minuten Cache.
5. Einmalig pro neuer Person in Immich unter *Personen* den Namen eintragen; danach ordnet Immich selbst zu.
   Neues Kaderporträt? → Datei `Vorname Nachname.jpg` in den Ordner `_Portraits` der Storage Box legen (beliebige Grösse, wird zugeschnitten); nach spätestens 30 s aktiv, ohne Deploy.
6. Optional Resultat in `src/lib/matchMetadata.ts` eintragen und deployen. Lieblingsbilder in Immich mit Herz markieren
   → Kandidaten für das Titelbild.

---

## 7. Datenschutz und Recht

- Website ist **öffentlich ohne Login**; Suchmaschinen nur per Bitte ausgesperrt.
- Gesichtserkennung = biometrische Daten → Einwilligung der Abgebildeten (bei Minderjährigen der Eltern) nötig.
- Entfernen: Person in Immich ausblenden und Fotos aus dem Album nehmen. `CONTACT_EMAIL` für Löschwünsche.
- Private Aufträge in `_`-Ordnern; an Kunden direkt über Immich-Freigabelinks (Passwort/Ablaufdatum). Achtung: Immich
  erkennt auch dort Gesichter.
- Fairplay-Regel: Fotos gratis, beim Posten @floorba11 markieren bzw. „Foto: Luc Maradan".

---

## 8. Verlauf (wichtige Schritte)

**fotos-web**
1. Erste Version: Spiele, Spieler, Grossansicht, Downloads
2. Neutrales Design (openfloor-Stil), Spielersuche, Kaderporträts (#1)
3. Spielerfotos neueste zuerst, Gesicht aus neustem Foto, immer hell (#2)
4. Private Aufträge: `_`-Alben nirgends zeigen (#3)
5. Instagram-Link, Tab „Weitere Fotos" (#4); Next.js 16.4.2 wegen Sicherheitslücken (#5)
6. HSTS (#6); Cloudflare-Proxy-Doku (#7)
7. Dark-Arena-Design mit Hero aus Favoriten (#8); Gameday-Redesign „Maroon Mood": Match-Poster, Roster, Fairplay (#9)
8. Spiele im Fokus, „Spieler" → „Athleten" (#10); Hero klar mit schwebender Suche (#11); Download-Popup entfernt (#12)

**fotos-server**
1. Immich-Stack, album-sync (pro Ordner ein Album)
2. Immich auf eigene Adresse (`IMMICH_DOMAIN`), öffentliche Seite = fotos-web
3. album-sync 15 → 5 Minuten (#1); HSTS (#2); Cloudflare-Doku (#3)

---

## 9. Offene Punkte / Ideen

- Zugangsschutz (Passwort oder Link pro Spieler) – bisher bewusst nicht gebaut.
- `matchMetadata` ist leer; Resultate werden noch nicht gepflegt.
- Umstellung der Immich-Suche auf den neuen `filter`, sobald `albumIds`/`personIds` entfallen.
- Backup von `./library/backups` auf die Storage Box automatisieren – offen, klären ob eingerichtet.
- Server vergrössern, falls `docker stats` dauerhaft Swap-Nutzung zeigt.
- Kleine Inkonsistenzen: CSS-Kommentar „dunkles Sport-Theme" obwohl das Design hell ist; Seite `/weitere/[id]`-Kommentar
  spricht noch von „Weitere Fotos" statt „Off-Court"; README nennt noch „Spieler" statt „Athleten".
