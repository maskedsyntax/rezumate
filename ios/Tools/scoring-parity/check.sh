#!/bin/bash
# Checks that the website's resume checker (web/lib/resume-preview.ts) scores every case
# exactly like the app (ATSScoringService.swift). Run after changing either one.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$here/.build/score"
mkdir -p "$here/.build"
swiftc -O -suppress-warnings -o "$bin" "$here/../../RezumateNative/Services/ATSScoringService.swift" "$here/main.swift"
status=0
for resume in "$here"/cases/*-resume.txt; do
  job="${resume%-resume.txt}-job.txt"
  name="$(basename "${resume%-resume.txt}")"
  python3 - "$name" "$("$bin" "$resume" "$job")" "$(node --no-warnings "$here/web.mjs" "$resume" "$job")" <<'PY' || status=1
import json, sys
name, app, web = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3])
diff = {k: {"app": app[k], "web": web[k]} for k in app if app[k] != web.get(k)}
print(f"{name}: {'same' if not diff else 'DIFFERENT'} (app score {app['score']})")
for k, v in diff.items(): print(f"  {k}: {json.dumps(v)}")
sys.exit(1 if diff else 0)
PY
done
exit $status
