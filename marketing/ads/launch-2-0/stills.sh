#!/bin/zsh
# Render stills at given times and tile them in time order into out/sheet.png
cd "${0:A:h}/src"
export PW_PATH=${PW_PATH:-/private/tmp/claude-501/-Users-batman-maskedsyntax-rezumate/a883970a-774d-4eff-be5a-53516911d491/scratchpad/rt}
APP=$(ls -d $HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/*.app)
export CHROME="$APP/Contents/MacOS/$(basename "$APP" .app)"
rm -rf ../out/stills
node render.mjs stills "$@" || exit 1
cd ../out/stills
ls t-*.png | sort -t- -k2 -n | sed 's/^/file /' > list.txt
ffmpeg -y -loglevel error -f concat -i list.txt -vf "scale=${SCALE:-360:450},tile=5x${ROWS:-3}:padding=6:color=gray" -frames:v 1 ../sheet.png
