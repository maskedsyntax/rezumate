// The one ATS-safe resume layout every template renders through.

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";

import {
  contactItems,
  sectionTitle,
  visibleSections,
  type Line,
  type ResumeDoc,
  type SectionKey
} from "../core/resume-document.ts";
import { fontFamily } from "./fonts.ts";
import { densityScale, scaleTemplate, type TemplateSpec } from "./templates.ts";

export type RenderOptions = { pageSize: "LETTER" | "A4"; density: keyof typeof densityScale; textScale?: number };

// Long dashes become hyphens, as in the app, so every ATS reads date ranges the same way.
const clean = (value: string) => value.replace(/[—–−]/g, "-").trim();
const filled = (lines: Line[]) => lines.map((l) => clean(l.text.replace(/^[•·\-*]\s+/, ""))).filter(Boolean);

export function ResumePdf({ doc, template, options }: { doc: ResumeDoc; template: TemplateSpec; options: RenderOptions }) {
  const t = scaleTemplate(template, options.textScale ?? 1);
  const k = densityScale[options.density];
  const family = fontFamily(t.font);
  const base: Style = { fontFamily: family, fontSize: t.body.size, lineHeight: t.body.lineHeight, color: t.colors.text };
  const meta: Style = { fontSize: t.meta.size, color: t.colors.muted };
  const bold: Style = { fontWeight: 600 };

  const row = (left: string, right: string, leftStyle: Style) => {
    if (!left && !right) return null;
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[{ flex: 1, paddingRight: right ? 8 : 0 }, leftStyle]}>{left}</Text>
        {right ? <Text style={[meta, { textAlign: "right", flexShrink: 0, maxWidth: "42%", paddingTop: (t.body.size - t.meta.size) / 2 }]}>{right}</Text> : null}
      </View>
    );
  };

  const bullets = (lines: Line[]) => filled(lines).map((text, index) => (
    <View key={index} style={{ flexDirection: "row", marginTop: t.bulletGap * k }} wrap={false}>
      <Text style={{ width: t.bulletIndent, paddingLeft: 2 }}>•</Text>
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  ));

  const heading = (key: SectionKey, first: boolean) => {
    const title = sectionTitle(doc, key);
    return (
      <View style={{ marginTop: first ? 2 : t.heading.gapBefore * k, marginBottom: t.heading.gapAfter * k }} minPresenceAhead={40}>
        <Text style={{ fontSize: t.heading.size, fontWeight: 700, lineHeight: 1.2 }}>
          {t.heading.uppercase ? title.toUpperCase() : title}
        </Text>
        {t.heading.rule ? <View style={{ marginTop: 2, borderBottomWidth: t.heading.rule.width, borderBottomColor: t.heading.rule.color }} /> : null}
      </View>
    );
  };

  const section = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return doc.summary.trim() ? <Text>{clean(doc.summary)}</Text> : null;
      case "experience": {
        const entries = doc.experience.filter((e) => e.company.trim() || e.title.trim() || filled(e.bullets).length);
        if (!entries.length) return null;
        return entries.map((entry, index) => (
          <View key={entry.id} style={{ marginTop: index === 0 ? 0 : t.entryGap * k }}>
            <View wrap={false}>
              {row(clean(entry.company || entry.title), clean(entry.dateRange), bold)}
              {entry.company.trim() && entry.title.trim() ? row(clean(entry.title), clean(entry.location), { fontStyle: "italic" }) : null}
            </View>
            {bullets(entry.bullets)}
          </View>
        ));
      }
      case "projects": {
        const entries = doc.projects.filter((p) => p.name.trim() || filled(p.bullets).length);
        if (!entries.length) return null;
        return entries.map((entry, index) => (
          <View key={entry.id} style={{ marginTop: index === 0 ? 0 : t.entryGap * k }}>
            {entry.name.trim() ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }} wrap={false}>
                <Text style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={bold}>{clean(entry.name)}</Text>
                  {entry.link.trim() ? <Text style={meta}>{"  "}<Link src={/^https?:/i.test(entry.link) ? entry.link.trim() : `https://${entry.link.trim()}`} style={{ color: t.colors.muted, textDecoration: "none" }}>{entry.link.trim().replace(/^https?:\/\//i, "")}</Link></Text> : null}
                </Text>
                {entry.dateRange.trim() ? <Text style={meta}>{clean(entry.dateRange)}</Text> : null}
              </View>
            ) : null}
            {bullets(entry.bullets)}
          </View>
        ));
      }
      case "skills": {
        const groups = doc.skills.filter((g) => g.items.trim());
        if (!groups.length) return null;
        return groups.map((group, index) => (
          <Text key={group.id} style={{ marginTop: index === 0 ? 0 : 2 * k }}>
            {group.name.trim() ? <Text style={bold}>{clean(group.name)}: </Text> : null}
            {clean(group.items)}
          </Text>
        ));
      }
      case "education": {
        const entries = doc.education.filter((e) => e.institution.trim() || e.degree.trim());
        if (!entries.length) return null;
        return entries.map((entry, index) => (
          <View key={entry.id} style={{ marginTop: index === 0 ? 0 : t.entryGap * k }} wrap={false}>
            {row(clean(entry.institution || entry.degree), clean(entry.dateRange), bold)}
            {entry.institution.trim() && entry.degree.trim() ? row(clean(entry.degree), clean(entry.location), { fontStyle: "italic" }) : null}
            {bullets(entry.details)}
          </View>
        ));
      }
      default: {
        const custom = doc.custom.find((c) => `custom:${c.id}` === key);
        const lines = custom?.lines.filter((l) => l.text.trim()) ?? [];
        if (!lines.length) return null;
        return lines.map((l) => {
          const text = l.text.trim();
          const isBullet = /^[•·\-*]\s+/.test(text);
          return isBullet ? <View key={l.id}>{bullets([l])}</View> : <Text key={l.id} style={{ marginTop: 1.5 * k }}>{clean(text)}</Text>;
        });
      }
    }
  };

  const contact = contactItems(doc.contact);
  const rendered = visibleSections(doc).map((key) => [key, section(key)] as const).filter(([, body]) => body !== null);
  const align = t.nameStyle.align === "center" ? "center" : "left";

  return (
    <Document title={doc.contact.name || "Resume"} author={doc.contact.name || undefined} creator="Rezumate" producer="Rezumate (rezumate.app)">
      <Page size={options.pageSize} style={[base, { paddingVertical: t.margin, paddingHorizontal: t.margin }]}>
        <View style={{ marginBottom: 8 * k }}>
          {doc.contact.name.trim() ? (
            <Text style={{ fontSize: t.nameStyle.size, fontWeight: t.nameStyle.weight, textAlign: align, lineHeight: 1.15 }}>
              {t.nameStyle.uppercase ? clean(doc.contact.name).toUpperCase() : clean(doc.contact.name)}
            </Text>
          ) : null}
          {doc.contact.headline.trim() ? (
            <Text style={{ fontSize: t.headline.size, color: t.colors.muted, textAlign: align, marginTop: 2 }}>{clean(doc.contact.headline)}</Text>
          ) : null}
          {contact.length ? (
            <Text style={{ fontSize: t.contact.size, textAlign: t.contact.align, marginTop: 4 }}>
              {contact.map((item, index) => (
                <Text key={item.text}>
                  {index > 0 ? t.contact.separator : ""}
                  {item.href ? <Link src={item.href} style={{ color: t.colors.text, textDecoration: "none" }}>{item.text}</Link> : item.text}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>
        {rendered.map(([key, body], index) => (
          <View key={key}>
            {heading(key, index === 0)}
            {body}
          </View>
        ))}
      </Page>
    </Document>
  );
}
