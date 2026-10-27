# Storyboard: private-apply (30s · 1080×1920 · 30fps · 120 BPM, beat = 15f)

Palette = app tokens: paper #F4F1EB, ink #090909, success #89DC5F, warning #FFD84D, error #FF6B5F, violet #C7A3FF, blue wash #E8F1FF. Everything uses brutalist 2pt ink borders + hard offset shadows (scaled ×2.5 on screen). Type: SF Pro Black for statements, New York serif italic for a single emphasized word per line.

| # | Frames (s) | Purpose | Camera / framing / scale | Product position & UI state | UI action | Type (≤7 words) | Transition out | Sound | Emotion |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0–75 (0–2.5) | Hook: the apply loop | Extreme macro on a SUBMIT APPLICATION button (fills ~80% width), slight 4° tilt; snap pull-out after the tap | No product. A generic job-board button | Finger tap at f8, shadow collapses, a resume sheet launches up with motion blur; 5 "Unfortunately…" email cards slam in from below, stacking and rotating | "Applied." → "Again." | Whip-pan up (blur) | Tick-tock pad, tap click, thud per card | Déjà vu, quiet sting |
| 2 | 75–150 (2.5–5) | Name the unseen filter | Top-down on a resume page, 3D rotateX 18°, slow push-in | No product. The resume is scanned by a horizontal red laser | Laser sweeps down; JD keywords on the right get ✕ marks (Kubernetes, CI/CD, TypeScript) and one ✓ (Go) | "Did it even pass the *filter*?" | Page flips flat into shot 3 (match on paper) | Scan sweep, low pulse | Suspicion |
| 3 | 150–240 (5–8) | Privacy pivot (contrarian) | Paper centered, type layered behind; at f205 an iPhone rises from the bottom (partial framing, top 60% visible) | Name / phone / email / address fields lift off as chips toward a dashed "UPLOAD" cloud | Chips drift up, the cloud gets crossed out by a thick ink stroke, the chips reverse and fall into the phone screen | "Upload your whole *career* to check it?" → "Keep it on your iPhone." | Phone continues up into full frame (push) | Riser, silence at 7.9s | Protective, relief |
| 4 | 240–345 (8–11.5) | Product: set up the check | Phone 3/4 view (rotateY −22°) swinging to 0°, then offset right; big side-type on the left in z-space | Analyze screen: header, dashed drop zone, Job Description editor | Tap the drop zone → "Resume attached" + green check, file row; tap "Paste from Clipboard" → JD text fills in line by line | "Upload." "Paste." (stacked, oversized, cropped at the left edge) | Push into the Analyze button | DROP on f240, taps, paste swish | Momentum |
| 5 | 345–465 (11.5–15.5) | The score | Macro push-in on the score card (UI scaled ×2.2, full-bleed, no chrome), then pull out to the breakdown | Results: score box counts 0→58 (red→yellow), "Good base. Close keyword and impact gaps."; 4 component bars fill | Tap ANALYZE RESUME at f350 → count-up → bars stagger | "Scored against *this* job." | Card slides up, chips arrive | Count ticks, soft chime at 58 | Clarity |
| 6 | 465–585 (15.5–19.5) | Add skills you have | Full-bleed UI at ×1.9, gentle 2° tilt; sheet rises in from the bottom | Missing hard skills card (yellow chips) + mini score box pinned at the top | Tap "+ Kubernetes" → sheet "Only add this if you actually have it." → tap ADD TO SKILLS → chip flies into the Matched row (turns green) → score 58→66 "+8" | "Add skills you *actually* have." | Whip-zoom into one bullet | Pop, confirm chime | Control, honesty |
| 7 | 585–675 (19.5–22.5) | Truthful rewrite | Extreme macro on two resume bullets (text ~70px), slow lateral pan | Improve Resume: verbs swap | Tap IMPROVE RESUME → "Worked on" wipes to "Contributed to", "Handled" to "Managed" (highlighter sweep) | "Stronger wording. Nothing *invented*." | Pull out to the score | Two ticks, swish | Trust |
| 8 | 675–750 (22.5–25) | Result + export | Pull-out: score box turns green 81 + OPTIMIZED; tap Preview & Export → PDF slides out of the phone toward the camera, full-bleed | LaTeX-style PDF (centered name, section rules) | Export tap; the PDF grows past the frame | "ATS-safe PDF. Ready." | PDF shrinks into shot 9 (match cut on the sheet) | Chime, whoosh | Pride |
| 9 | 750–810 (25–27) | Callback: apply again, differently | Same macro SUBMIT button as shot 1 (mirrors the framing) | Tailored PDF drops onto the button | Tap. The button turns green with a ✓ | "Applied. *Tailored.*" | Iris/scale to end card | Tap, big hit at 810 | Confidence |
| 10 | 810–900 (27–30) | End card / CTA | Static-ish, slow 2% push; icon pops with a spring | App icon, "Rezumate", subtitle, three proof pills, App Store pill | Pills stagger in | "Know before you apply." · "Private ATS resume checker for iPhone" · On-device · No account · No upload · Download on the App Store | End | Pad resolve | Resolve |

Fine print on the end card: "Sample resume shown. Scores vary by resume and job."

## Slideshow tests

1. PowerPoint test: shots 1/2/3 are physical-object shots (a button, a laser scan, chips flying); 4–8 move the camera through the UI at 3+ scales. Pass.
2. Composition change: macro → top-down 3D → phone rising → 3/4 phone → full-bleed macro → sheet → extreme text macro → pull-out → macro callback → end card. No two consecutive shots share scale or angle. Pass.
3. Copy removed: the button tap + rejection stack, the laser scan, chips pulled into the phone, and the score counting up still read without copy. Pass.

## Revisions after render review

- Shot 1 opens on an "APPLICATION Nº 29→38" counter; the macro is ×1.5 so the button reads in full.
- Shot 4 starts as a match cut on shot 3's phone (same position/scale), and the lock screen dissolves into Analyze before the phone swings right. Step tags: Upload. / Paste. / Check.
- Shot 7 has no lateral pan: two huge verbs roll from the yellow highlight (old) to the green highlight (new), with the rest of each bullet underneath.
- Shot 8 headline: "ATS-safe PDF. Ready to send."
