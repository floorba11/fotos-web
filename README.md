# fotos-web – Foto-Website für die Spieler

Eigene Website mit eigenem Design (Next.js) für die Spieltagsfotos. Sie zeigt alle Spiele als Alben und alle Spielerinnen
und Spieler mit ihren Fotos aus allen Spielen. Die Fotos selbst verwaltet [Immich](https://immich.app) (Projekt
`fotos-server`); diese Website liest Alben und Personen per Immich-API und liefert die Bilder durch.

```
Besucher → Caddy (Portal, ~/unihockey) → fotos_web:3000 → Immich-API (immich-server:2283)
```

- **Spiele** (`/`): Alben nach Saison gruppiert, mit Suche. Album = Ordner auf der Storage Box (macht `album-sync`).
- **Album** (`/album/<id>`): Fotoraster, Grossansicht (Pfeiltasten, Wischen), Original- und ZIP-Download.
- **Spieler** (`/spieler`, `/spieler/<id>`): benannte Personen aus Immich, alle Fotos der Person, ZIP-Download.
- Der API-Schlüssel bleibt auf dem Server. Der Browser spricht nur mit dieser Website, nie direkt mit Immich.

## Datenschutz (bitte lesen)

Die Website ist **öffentlich**, ohne Anmeldung. Wer die Adresse kennt, sieht alle Alben und alle Spielerseiten samt Gesichtern.

- Suchmaschinen sind ausgesperrt (`robots.txt`, `X-Robots-Tag`, `<meta robots>`), das ist aber nur eine Bitte.
- **Einwilligung** der Spieler einholen, bei Minderjährigen der Eltern. Gesichtserkennung verarbeitet biometrische Daten.
- Wer nicht erscheinen soll: in Immich die Person **ausblenden** (verschwindet aus `/spieler`) und die Fotos aus dem Album
  nehmen. Alben, deren Name mit `_` beginnt, zeigt die Website nie.
- `CONTACT_EMAIL` setzen, dann steht im Fuss eine Adresse für „Foto soll weg".
- Falls die Seite doch geschützt sein soll (Passwort oder Link pro Spieler), ist das ein späterer Ausbau.

## Einrichten

Voraussetzung: Portal (`~/unihockey`) und Immich (`~/fotos`) laufen auf dem Server, Immich hat schon Alben.

1. **Immich-Schlüssel** für die Website: Immich → *Kontoeinstellungen → API-Schlüssel → Neuer Schlüssel*, **nur** die
   Berechtigungen `album.read`, `asset.read`, `asset.view`, `asset.download`, `person.read`. Nicht denselben Schlüssel wie
   für `album-sync` verwenden.
2. **Immich auf eine eigene Adresse legen**, damit diese Website die bekannte Adresse bekommt: DNS-A-Eintrag
   `immich.<domain>` auf den Server („DNS only"), in `~/fotos/.env` `IMMICH_DOMAIN=immich.<domain>` eintragen (bisher
   `FOTOS_DOMAIN`), dann in `~/fotos`: Dateien aus dem Repo `fotos-server` holen und `bash deploy.sh`.
3. In diesem Repo die Secrets `VM_HOST`, `VM_USER`, `VM_SSH_KEY` setzen (dieselben wie beim Portal).
4. Erster Deploy: *Actions → Deploy → Run workflow*. Er kopiert die Dateien nach `~/fotos-web`.
5. Auf dem Server `.env` anlegen und starten:
   ```bash
   cd ~/fotos-web
   cp env.example .env && nano .env     # DOMAIN, IMMICH_API_KEY, CONTACT_EMAIL
   docker compose pull && bash deploy.sh
   ```
   `deploy.sh` startet die Website und trägt die Domain beim Caddy des Portals ein (Zertifikat automatisch).
6. Danach genügt ein Push auf `main`: Tests laufen, das Image wird gebaut und auf dem Server gestartet.

## Entwickeln

```bash
npm install
IMMICH_URL=https://immich.<domain> IMMICH_API_KEY=… npm run dev
npm run lint && npm run typecheck && npm test
```

| Datei | Zweck |
|---|---|
| `src/lib/immich.ts` | Immich-API (Alben, Fotos, Personen), kleiner Zwischenspeicher (2 Min.) |
| `src/lib/format.ts` | Albumnamen („Saison – Spiel") → Saison/Titel, Datum, Gruppierung |
| `src/lib/limit.ts` | höchstens 3 gleichzeitige ZIP-Downloads |
| `src/app/img/…`, `src/app/face/…`, `src/app/zip/…` | Bilder, Gesichter und ZIP-Archive aus Immich durchreichen |
| `src/app/globals.css` | das gesamte Design |

Hinweise zur Immich-Schnittstelle (v3.3.5): Die Fotosuche nutzt `POST /search/metadata` mit `albumIds`, `personIds` und `page`.
Diese Felder sind seit Immich v3.2 als „deprecated" markiert, funktionieren aber noch. Fällt das in einer späteren Version weg,
muss `searchPhotos` in `src/lib/immich.ts` auf den neuen `filter` umgestellt werden. Videos werden nicht angezeigt.

Alben und Personen werden 2 Minuten zwischengespeichert; neue Alben erscheinen also kurz nach dem nächsten `album-sync`-Lauf.
