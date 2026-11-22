#!/bin/bash
# Builds the CLI from the app's own source files (rebuilding only when they change), then runs it.
#   ./run.sh resume.pdf job.txt [--text] [--ai] [--facts facts.json] [--cover-letter]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
app="$here/../../RezumateNative"
bin="$here/.build/rezumate-cli"

sources=(
  "$here/main.swift"
  "$app"/Models/*.swift
  "$app"/Services/{AIClient,AIRewriteService,AnalysisInputValidator,ATSScoringService,DocxTextExtractor,JobFitExtractor,LocalAIService,LocalStorageManager,PDFTextExtractor,PIIRedactor,ResumeParser,ResumeTailoringService,RewriteValidator}.swift
)

if [[ ! -x "$bin" ]] || [[ -n "$(find "${sources[@]}" -newer "$bin" 2>/dev/null)" ]]; then
  mkdir -p "$here/.build"
  swiftc -O -suppress-warnings -D REZUMATE_CLI -module-name RezumateCLI -o "$bin" "${sources[@]}" >&2
fi
exec "$bin" "$@"
