#!/usr/bin/env bash
set -euo pipefail
mkdir -p ui-smoke-artifacts
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort > ui-smoke-artifacts/vite-preview.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for i in $(seq 1 35); do
  if curl --fail --silent http://127.0.0.1:4173/login > /dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:4173/login > /dev/null

browser="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$browser" ]]; then
  echo "ERROR: Chromium-compatible browser unavailable on CI runner" >&2
  exit 1
fi

flags=("--headless=new" "--no-sandbox" "--disable-gpu" "--disable-dev-shm-usage" "--hide-scrollbars" "--virtual-time-budget=5000")
for page in login register; do
  "$browser" "${flags[@]}" --window-size=1440,900 --dump-dom "http://127.0.0.1:4173/$page" > "ui-smoke-artifacts/$page-desktop-dom.html" 2> "ui-smoke-artifacts/$page-browser.log"
  if ! grep -q 'ox-auth-screen' "ui-smoke-artifacts/$page-desktop-dom.html"; then
    echo "ERROR: $page React page did not render" >&2
    exit 1
  fi
  "$browser" "${flags[@]}" --window-size=1440,900 --screenshot="ui-smoke-artifacts/$page-desktop.png" "http://127.0.0.1:4173/$page" > /dev/null 2>&1
  "$browser" "${flags[@]}" --window-size=390,844 --screenshot="ui-smoke-artifacts/$page-mobile.png" "http://127.0.0.1:4173/$page" > /dev/null 2>&1
done
grep -q 'ox-login-email' ui-smoke-artifacts/login-desktop-dom.html
grep -q 'ox-register-email' ui-smoke-artifacts/register-desktop-dom.html
BROWSER_EXECUTABLE="$browser" node scripts/smoke-authenticated.mjs
echo "Frontend React smoke checks passed for login/register and authenticated desktop/mobile workspace."
