#!/bin/sh
set -eu

node /app/backend/dist/backend/src/index.js &
backend_pid="$!"

nginx -g "daemon off;" &
nginx_pid="$!"

stop() {
  kill "$backend_pid" "$nginx_pid" 2>/dev/null || true
}

trap stop INT TERM

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    wait "$backend_pid"
    exit "$?"
  fi

  if ! kill -0 "$nginx_pid" 2>/dev/null; then
    wait "$nginx_pid"
    exit "$?"
  fi

  sleep 1
done
