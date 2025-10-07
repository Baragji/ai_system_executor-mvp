#!/usr/bin/env bash
set -euo pipefail
TARGET_CHROME="${PLAYWRIGHT_CHROME:-${CHROME_PATH:-}}"
if [[ -z "${TARGET_CHROME}" ]]; then
  echo "PLAYWRIGHT_CHROME or CHROME_PATH must be set" >&2
  exit 1
fi
echo "[$(date --iso-8601=seconds)] Launching Chrome wrapper -> ${TARGET_CHROME} $*" >> /tmp/chrome-wrapper.log
exec "${TARGET_CHROME}" --no-sandbox --disable-dev-shm-usage "$@"
