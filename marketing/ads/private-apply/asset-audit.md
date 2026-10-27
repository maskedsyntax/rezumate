# Asset audit

## Available

- App icon 1024px: `ios/RezumateNative/Resources/Assets.xcassets/AppIcon.appiconset/Icon-1024.png`
- Logo: `web/public/rezumate-logo.svg`, `.png`
- Design tokens + component styles: `ios/RezumateNative/Views/DesignSystem.swift` (warm paper bg, 2pt ink borders, hard 4pt offset shadow, status colors)
- Exact UI copy: `AnalyzeView.swift`, `ResultsView.swift`, `KeywordPlacementSheet`
- `ui.png`: early wireframe concept, **not** the shipped UI. Not used.

## Missing but useful

- Real simulator screen recordings of Analyze → Results → Add skill → Export
- Real exported PDF sample
- Licensed music bed

## Safe to simulate

- Taps, paste, scroll, sheet presentation, score count-up (the app animates these states)
- Sample resume/JD content (generic backend-engineer role)
- Device camera moves, macro crops, 3D tilt
- Synthesized music + UI SFX

## Must not fabricate

- User results presented as real customers, review stars, download counts
- Interview/offer outcomes after the tailored apply
- Real employer names/logos in the rejection inbox (use generic "Hiring Team")
- Android availability

Studio assets: `$STUDIO_ROOT/public/private-apply/` (icon, logo, synthesized audio).
