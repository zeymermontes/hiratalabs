#!/bin/bash
# Doble clic: corre las migraciones pendientes contra la base real y levanta el
# servidor de desarrollo en http://localhost:3000 (tiendas en http://<slug>.localhost:3000).
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -d "$HOME/.nvm/versions/node" ]; then
  export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | sort -V | tail -1)/bin:$PATH"
fi
echo "== Hirata Commerce · dev =="
node -v
echo
echo "-- Migraciones --"
npm run -s migrate || { echo "Las migraciones fallaron; revisa arriba."; read -p "Enter para cerrar"; exit 1; }
echo
echo "-- Servidor --"
echo "Panel:  http://localhost:3000"
echo "Tienda: http://<subdominio>.localhost:3000"
npm run dev
