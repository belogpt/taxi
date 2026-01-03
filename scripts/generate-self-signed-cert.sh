#!/usr/bin/env bash

set -euo pipefail

CERTS_DIR="nginx/certs"
KEY_FILE="$CERTS_DIR/server.key"
CERT_FILE="$CERTS_DIR/server.crt"
FORCE="${FORCE:-0}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 primary-domain [alt-domain ...]"
  echo "Example: $0 example.com www.example.com"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is not installed."
  exit 1
fi

if [[ $FORCE -ne 1 ]] && { [[ -f "$KEY_FILE" ]] || [[ -f "$CERT_FILE" ]]; }; then
  echo "Error: $KEY_FILE or $CERT_FILE already exists. Set FORCE=1 to overwrite."
  exit 1
fi

mkdir -p "$CERTS_DIR"

primary_domain="$1"
shift
all_domains=("$primary_domain" "$@")

san_entries=$(
  IFS=,
  printf '%s' "$(printf 'DNS:%s,' "${all_domains[@]}" | sed 's/,$//')"
)

echo "Generating a self-signed certificate for: ${all_domains[*]}"
openssl req -x509 -nodes -days 365 -newkey rsa4096 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/CN=${primary_domain}" \
  -addext "subjectAltName=${san_entries}"

chmod 600 "$KEY_FILE"

echo "Done."
echo "Certificate: $CERT_FILE"
echo "Private key: $KEY_FILE"
