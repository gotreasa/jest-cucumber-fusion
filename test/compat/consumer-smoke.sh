#!/usr/bin/env bash
# The packed package in a fresh consumer project, on whatever Node is on PATH.
#
# CI runs this once per supported Node floor (.github/workflows/integration.yml, job
# `compat`), after building the tarball on Node 24, because this repository's own suite needs
# Node 20.11 and so cannot run on the floors the package claims: Node 18.14 for CommonJS
# steps, Node 20.11 for ES module steps (README "Getting Started", docs/Migrating.md).
#
#   CommonJS steps must pass on every Node.
#   ES module steps must pass from Node 20.11, and below it must fail the documented way
#   (`SyntaxError: Unexpected token 'with'`, from @cucumber/gherkin's import attributes).
#
# Plain bash and CommonJS only, so it runs on the oldest Node it checks.
# usage: test/compat/consumer-smoke.sh path/to/package.tgz
set -euo pipefail

TARBALL="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
# node -e and an explicit string, not node -p: under FORCE_COLOR, node -p colours a boolean.
NODE_VERSION="$(node -e 'process.stdout.write(process.versions.node)')"
MODERN_ESM="$(node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.stdout.write(a > 20 || (a === 20 && b >= 11) ? "true" : "false")')"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
echo "Node $NODE_VERSION; ES module steps expected to run: $MODERN_ESM"

write_feature() {
  cat > "$1/launch.feature" <<'FEATURE'
Feature: Launch

  Scenario: Launching
    Given a rocket on the pad
    When it launches
    Then it reaches orbit
FEATURE
}

steps_body() {
  cat <<'STEPS'
let launched = false
Given( 'a rocket on the pad', () => { launched = false } )
When( 'it launches', () => { launched = true } )
Then( 'it reaches orbit', () => { expect( launched ).toBe( true ) } )
Fusion( 'launch.feature' )
STEPS
}

# One install, shared by both projects.
mkdir -p "$WORK/installed"
( cd "$WORK/installed" && npm init -y > /dev/null && npm install --no-audit --no-fund "$TARBALL" jest@30 > install.log 2>&1 ) || {
  cat "$WORK/installed/install.log"; exit 1; }

# CommonJS steps: must pass on every Node.
mkdir -p "$WORK/cjs"
ln -s "$WORK/installed/node_modules" "$WORK/cjs/node_modules"
printf '{ "name": "cjs", "private": true, "jest": { "testMatch": [ "**/*.steps.js" ] } }\n' > "$WORK/cjs/package.json"
write_feature "$WORK/cjs"
{ echo "const { Given, When, Then, Fusion } = require( '@g_package/jest-cucumber-fusion' )"; steps_body; } > "$WORK/cjs/launch.steps.js"
if ( cd "$WORK/cjs" && node node_modules/jest/bin/jest.js --ci > run.log 2>&1 ); then
  echo "CommonJS steps: passed"
else
  echo "CommonJS steps: FAILED on Node $NODE_VERSION"; cat "$WORK/cjs/run.log"; exit 1
fi

# ES module steps: pass from Node 20.11, fail the documented way below it.
mkdir -p "$WORK/esm"
ln -s "$WORK/installed/node_modules" "$WORK/esm/node_modules"
printf '{ "name": "esm", "private": true, "type": "module", "jest": { "testMatch": [ "**/*.steps.js" ] } }\n' > "$WORK/esm/package.json"
write_feature "$WORK/esm"
{ echo "import { Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'"; steps_body; } > "$WORK/esm/launch.steps.js"
if ( cd "$WORK/esm" && node --experimental-vm-modules node_modules/jest/bin/jest.js --ci > run.log 2>&1 ); then
  esm=passed
else
  esm=failed
fi
if [ "$MODERN_ESM" = true ] && [ "$esm" = passed ]; then
  echo "ES module steps: passed"
elif [ "$MODERN_ESM" = false ] && [ "$esm" = failed ] && grep -q "Unexpected token 'with'" "$WORK/esm/run.log"; then
  echo "ES module steps: failed below Node 20.11 as documented (Unexpected token 'with')"
else
  echo "ES module steps: $esm on Node $NODE_VERSION, which the documentation does not say"
  cat "$WORK/esm/run.log"; exit 1
fi
