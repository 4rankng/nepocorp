#!/bin/sh
# Use this script to wait for a service to be available
# Example: ./wait-for-it.sh host:port -t timeout

set -e

host="$(echo "$1" | cut -d: -f1)"
port="$(echo "$1" | cut -d: -f2)"
shift

timeout="${2:-30}"  # Default timeout: 30 seconds

until nc -z "$host" "$port" >/dev/null 2>&1; do
  echo "Waiting for $host:$port..."
  sleep 1
  timeout=$((timeout - 1))
  if [ "$timeout" -le 0 ]; then
    echo "Timeout waiting for $host:$port" >&2
    exit 1
  fi
done

echo "$host:$port is available!"
exec "$@"
