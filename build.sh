#!/usr/bin/env bash
# Rebuilds the composed artboards from src/ (shared head + per-screen body).
# DirectionPorcelain.dc.html and DirectionTabloid.dc.html are standalone and not built here.
set -euo pipefail
cd "$(dirname "$0")"

build() { cat src/_head.html "src/body_$1.html" src/_foot.html > "$2.dc.html"; echo "  $2.dc.html"; }

echo "building artboards:"
build main        Main
build confirm     Confirm
build gender      Gender
build match       Matchmaking
build found       MatchFound
build chat        Chat
build prompts     Prompts
build end         EndChat
build summary     Summary
build profile     Profile
build board       Leaderboard
build logosheet   LogoSheet
