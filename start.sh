#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Install Node.js from https://nodejs.org/"
  exit 1
fi
if [ ! -d node_modules/electron ]; then
  echo "Installing dependencies first time..."
  npm install
fi
echo "Starting Zaiken..."
npx --yes electron .
