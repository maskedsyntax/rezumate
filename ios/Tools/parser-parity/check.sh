#!/bin/bash
# Checks that the website's resume parser (web/lib/core/resume-parser.ts) parses every case
# exactly like the app (ResumeParser.swift). Run after changing either one.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$here/.build/parse"
mkdir -p "$here/.build"
swiftc -O -suppress-warnings -o "$bin" "$here/../../RezumateNative/Models/ResumeDocument.swift" "$here/../../RezumateNative/Services/ResumeParser.swift" "$here/main.swift"
status=0
for resume in "$here"/cases/*.txt "$here"/../scoring-parity/cases/*-resume.txt; do
  name="$(basename "$resume" .txt)"
  python3 - "$name" "$("$bin" "$resume")" "$(node --no-warnings "$here/web.mjs" "$resume")" <<'PY' || status=1
import json, sys
name, app, web = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3])
diff = {k: {"app": app[k], "web": web.get(k)} for k in app if app[k] != web.get(k)}
print(f"{name}: {'same' if not diff else 'DIFFERENT'}")
for k, v in diff.items(): print(f"  {k}: {json.dumps(v)}")
sys.exit(1 if diff else 0)
PY
done
exit $status
