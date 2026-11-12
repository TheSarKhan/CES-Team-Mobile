#!/usr/bin/env bash
set -Eeuo pipefail
sha="${1:?Commit SHA required}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]]
base=/var/www/ces-team
cd "$base/releases/mobile-$sha"
test -s dist-web/index.html && test -s dist-web/sw.js
web=/var/www/ces-team-web
stage="${web}.stage-$sha"
mkdir "$stage"
cp -a dist-web/. "$stage/"
chown -R www-data:www-data "$stage"
if [ -d "${web}.ci-previous" ]; then mv "${web}.ci-previous" "${web}.previous-$(date +%s)-$sha"; fi
mv "$web" "${web}.ci-previous"
if ! mv "$stage" "$web"; then mv "${web}.ci-previous" "$web"; exit 1; fi
printf '%s\n' "$sha" > "$base/current-mobile-ci-release"
