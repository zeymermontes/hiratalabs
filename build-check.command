#!/bin/bash
# Verifica que la plataforma compila. Doble clic para correr; deja el resultado en build-check.log
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"
{
  echo "== $(date) =="
  node -v
  npm run build 2>&1
  echo "EXIT: $?"
} > build-check.log 2>&1
echo "Listo. Revisa build-check.log"
