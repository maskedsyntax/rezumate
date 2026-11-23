// Embedded IBM Plex fonts (OFL, public/fonts), the full builds so names like "Łukasz" or
// "Şahin" render in one font. Splitting a word across fallback fonts would make an ATS
// read it as "Ł ukasz".

import { Font } from "@react-pdf/renderer";

import type { FontKey } from "./templates.ts";

const files: Record<FontKey, string> = { sans: "IBMPlexSans", serif: "IBMPlexSerif" };
const weights = [
  [400, "Regular", "Italic"],
  [600, "SemiBold", "SemiBoldItalic"],
  [700, "Bold", "BoldItalic"]
] as const;

let registeredBase: string | null = null;

/** `base` is "/fonts" in the browser, or a directory path in Node. */
export function registerFonts(base = "/fonts") {
  if (registeredBase === base) return;
  registeredBase = base;
  for (const [family, file] of Object.entries(files)) {
    Font.register({
      family,
      fonts: weights.flatMap(([fontWeight, normal, italic]) => [
        { src: `${base}/${file}-${normal}.woff`, fontWeight, fontStyle: "normal" as const },
        { src: `${base}/${file}-${italic}.woff`, fontWeight, fontStyle: "italic" as const }
      ])
    });
  }
  // Hyphenated words can split a keyword across lines and hide it from an ATS.
  Font.registerHyphenationCallback((word) => [word]);
}

export function fontFamily(key: FontKey): string {
  return key;
}
