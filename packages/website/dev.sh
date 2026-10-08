#!/usr/bin/env bash
set -euo pipefail

app="$BUILD_WORKSPACE_DIRECTORY/packages/website"
rm -f "$app/astro.config.dev.ts"
cp "$1" "$app/astro.config.dev.ts"
shift
cd "$app"
exec "$app/node_modules/.bin/astro" dev --config astro.config.dev.ts "$@"
