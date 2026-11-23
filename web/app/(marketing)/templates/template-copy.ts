// Marketing copy for each template's page. Layout specs live in lib/pdf/templates.ts.
export const templateCopy: Record<string, { title: string; bestFor: string[]; about: string }> = {
  classic: {
    title: "Classic ATS resume template",
    bestFor: ["Software, data, and engineering roles", "Anyone who wants the familiar LaTeX look", "Applying through Workday, Greenhouse, or Lever"],
    about: "A centered header, light rules under each heading, and dates aligned right. It's the same layout the Rezumate iPhone app exports, modeled on the LaTeX resumes engineers pass around."
  },
  modern: {
    title: "Modern resume template",
    bestFor: ["Product, design, and marketing roles", "A headline under your name", "Roomier, easy-to-skim pages"],
    about: "A left-aligned header with space for a headline, thin ink rules, and slightly more room between roles. Clean enough for a recruiter's six-second skim, plain enough for an ATS."
  },
  compact: {
    title: "Compact one-page resume template",
    bestFor: ["Fitting 5–10 years onto one page", "Students with many projects", "Dense technical resumes"],
    about: "Smaller type and tighter spacing so more fits on one page, without shrinking text to the point a reader squints. Still one column, still real text."
  },
  executive: {
    title: "Executive resume template",
    bestFor: ["Senior, lead, and director roles", "Consulting, finance, and law", "A traditional serif look"],
    about: "IBM Plex Serif, a larger name, and generous margins for a calm, senior feel. The structure stays standard so the content is what stands out."
  }
};

export const atsFacts = [
  "Single column, so text is read in the right order",
  "Real, selectable text with embedded fonts. No images of text",
  "Standard section headings like Experience and Education",
  "No tables, text boxes, icons, or skill bars",
  "Dates written the way parsers expect, like “Mar 2022 - Present”",
  "Free to export as PDF, with no watermark"
];
