#!/usr/bin/env bash
# One-shot Railway deploy for Game is Game.
#
# Usage:
#   RAILWAY_API_TOKEN=<account-token> \
#   BOT_TOKEN=<from @BotFather> \
#   BOT_USERNAME=game_is_game_bot \
#   bash scripts/deploy-railway.sh
#
# RAILWAY_API_TOKEN is an *account* token from https://railway.app/account/tokens
# (lets the CLI create a project non-interactively). BOT_TOKEN is required for the
# bot to work; without it the service still deploys but runs in DEV MODE.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${RAILWAY_API_TOKEN:?Set RAILWAY_API_TOKEN (account token from railway.app/account/tokens)}"
export RAILWAY_API_TOKEN
BOT_USERNAME="${BOT_USERNAME:-game_is_game_bot}"
PROJECT_NAME="${PROJECT_NAME:-game-is-game}"

rand() { node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))'; }
JWT_SECRET="${JWT_SECRET:-$(rand)}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(rand)}"

echo "==> Creating Railway project: $PROJECT_NAME"
railway init --name "$PROJECT_NAME" >/dev/null

echo "==> Provisioning a /data volume (best effort)"
railway volume add -m /data >/dev/null 2>&1 || echo "   (volume step skipped; SQLite will fall back to a temp dir)"

echo "==> First deploy (creates the service, builds via Nixpacks)"
railway up -y --ci

echo "==> Generating a public domain"
DOMAIN_RAW="$(railway domain --json 2>/dev/null || railway domain 2>/dev/null || true)"
HOST="$(printf '%s' "$DOMAIN_RAW" | grep -oE '[a-zA-Z0-9._-]+\.up\.railway\.app' | head -1)"
if [ -z "$HOST" ]; then
  echo "   Could not auto-detect the domain. Set APP_URL manually after the run." >&2
  APP_URL=""
else
  APP_URL="https://$HOST"
  echo "   Domain: $APP_URL"
fi

echo "==> Setting environment variables"
ARGS=(
  "BOT_TOKEN=${BOT_TOKEN:-}"
  "BOT_USERNAME=$BOT_USERNAME"
  "JWT_SECRET=$JWT_SECRET"
  "WEBHOOK_SECRET=$WEBHOOK_SECRET"
  "DATA_DIR=/data"
  "NODE_ENV=production"
)
[ -n "$APP_URL" ] && ARGS+=("APP_URL=$APP_URL")
railway variable set "${ARGS[@]}"

echo "==> Done."
[ -n "$APP_URL" ] && echo "Launcher: $APP_URL"
echo "Setting APP_URL triggered a redeploy; the server registers the webhook, commands and menu button on boot."
[ -z "${BOT_TOKEN:-}" ] && echo "NOTE: BOT_TOKEN was not set, so the bot runs in DEV MODE. Add it in Railway to activate the bot."
