#!/usr/bin/env bash
# Läuft auf dem Server in ~/fotos-web: Website starten und beim Caddy des Portals (~/unihockey) eintragen.
# Wird von der GitHub Action aufgerufen, geht aber auch von Hand: bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo ".env fehlt – Vorlage: env.example"; exit 1; }
set -a; . ./.env; set +a
[ -n "${DOMAIN:-}" ] || { echo "DOMAIN fehlt in .env"; exit 1; }
docker network inspect web >/dev/null 2>&1 || { echo "Netzwerk 'web' fehlt – zuerst das Portal in ~/unihockey starten"; exit 1; }
docker ps --format '{{.Names}}' | grep -qx immich_server || echo "Hinweis: Immich (immich_server) läuft nicht – die Seite zeigt dann nur eine Fehlerseite."

docker compose up -d --remove-orphans

# Caddy des Portals bedient die Domain und liest ~/unihockey/sites/*.caddy
mkdir -p ../unihockey/sites
cat > ../unihockey/sites/fotos-web.caddy <<CADDY
$DOMAIN {
	encode zstd gzip
	reverse_proxy fotos_web:3000 {
		# ZIP-Downloads sofort weiterreichen, nicht puffern
		flush_interval -1
	}
}
CADDY
(cd ../unihockey && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile)
echo "Foto-Website läuft: https://$DOMAIN"
