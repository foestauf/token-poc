#!/usr/bin/env bash
# Generate a dummy JWT for local development
# Usage: ./dev/generate-token.sh [audience] [expiration_seconds]

set -euo pipefail

AUDIENCE="${1:-token-service}"
EXPIRY_SECONDS="${2:-3600}"

NOW=$(date +%s)
EXP=$((NOW + EXPIRY_SECONDS))

HEADER=$(echo -n '{"alg":"RS256","kid":"dummy-key-id"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
PAYLOAD=$(cat <<EOF | tr -d '\n' | base64 -w0 | tr '+/' '-_' | tr -d '='
{"aud":["${AUDIENCE}"],"exp":${EXP},"iat":${NOW},"iss":"https://kubernetes.default.svc.cluster.local","kubernetes.io":{"namespace":"token-poc","pod":{"name":"consumer-service-dev-0","uid":"00000000-0000-0000-0000-000000000001"},"serviceaccount":{"name":"consumer-service","uid":"00000000-0000-0000-0000-000000000002"}},"nbf":${NOW},"sub":"system:serviceaccount:token-poc:consumer-service"}
EOF
)
SIGNATURE=$(echo -n "dummy-signature" | base64 -w0 | tr '+/' '-_' | tr -d '=')

TOKEN="${HEADER}.${PAYLOAD}.${SIGNATURE}"

# Write to dev tokens directory
mkdir -p dev/tokens
echo -n "$TOKEN" > dev/tokens/token

echo "Generated dummy JWT:"
echo "  Audience: ${AUDIENCE}"
echo "  Expires: $(date -d @${EXP} 2>/dev/null || date -r ${EXP} 2>/dev/null || echo ${EXP})"
echo "  Token path: dev/tokens/token"
echo ""
echo "Token: ${TOKEN}"
