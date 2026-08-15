import UIKit

// Renders a ResumeDocument as a PDF matching the visual style of the LaTeX resume template
// (IBM Plex Sans approximated by system fonts, two-column entry layout, 2pt rule section headers)
struct LaTeXStylePDFRenderer {

    // US Letter at 72dpi
    private static let pageW: CGFloat = 612
    private static let pageH: CGFloat = 792

    // Effective margins matching the LaTeX template's \addtolength adjustments (~0.5in each side)
    private static let mL: CGFloat = 36
    private static let mR: CGFloat = 36
    private static let mT: CGFloat = 36
    private static let mB: CGFloat = 36
    private static var tW: CGFloat { pageW - mL - mR }

    // Colors from the LaTeX template
    private static let cLight = UIColor(white: 0.83, alpha: 1)  // light-grey (section rule)
    private static let cDark  = UIColor(white: 0.30, alpha: 1)  // dark-grey  (dates, locations)
    private static let cText  = UIColor(white: 0.08, alpha: 1)  // text-grey  (body)

    // Fonts approximating the LaTeX template (IBM Plex Sans to San Francisco)
    private static let fName:    UIFont = .systemFont(ofSize: 18, weight: .heavy)
    private static let fContact: UIFont = .systemFont(ofSize: 8)
    private static let fSection: UIFont = .systemFont(ofSize: 11, weight: .bold)
    private static let fBody:    UIFont = .systemFont(ofSize: 10)
    private static let fBold:    UIFont = .systemFont(ofSize: 10, weight: .semibold)
    private static let fItalic:  UIFont = .italicSystemFont(ofSize: 10)
    private static let fSmall:   UIFont = .systemFont(ofSize: 8.5)

    // MARK: - Public

    static func render(_ document: ResumeDocument) -> Data {
        let pageRect = CGRect(x: 0, y: 0, width: pageW, height: pageH)
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextTitle   as String: document.name,
            kCGPDFContextCreator as String: "Rezumate"
        ] as [String: Any]

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)
        var y: CGFloat = 0

        return renderer.pdfData { ctx in
            ctx.beginPage()
            y = mT

            drawName(document.name, ctx: ctx, y: &y)
            drawContactBar(document, ctx: ctx, y: &y)

            if let summary = document.summary, !summary.isEmpty {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader("SUMMARY", ctx: ctx, y: &y)
                drawBodyText(summary, ctx: ctx, y: &y)
                y += 8
            }

            if !document.experience.isEmpty {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader("EXPERIENCE", ctx: ctx, y: &y)
                for entry in document.experience {
                    drawExperienceEntry(entry, ctx: ctx, y: &y)
                }
                y += 2
            }

            if !document.projects.isEmpty {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader("PROJECTS", ctx: ctx, y: &y)
                for project in document.projects {
                    drawProjectEntry(project, ctx: ctx, y: &y)
                }
                y += 2
            }

            if !document.skillCategories.isEmpty {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader("SKILLS", ctx: ctx, y: &y)
                drawSkillsSection(document.skillCategories, ctx: ctx, y: &y)
            }

            if !document.education.isEmpty {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader("EDUCATION", ctx: ctx, y: &y)
                for entry in document.education {
                    drawEducationEntry(entry, ctx: ctx, y: &y)
                }
            }

            for section in document.additionalSections {
                breakIfNeeded(36, ctx: ctx, y: &y)
                drawSectionHeader(section.title.uppercased(), ctx: ctx, y: &y)
                for line in section.lines {
                    if let bullet = strippedBullet(line) {
                        drawBullet(bullet, ctx: ctx, y: &y)
                    } else {
                        drawBodyText(line, ctx: ctx, y: &y)
                        y += 2
                    }
                }
                y += 4
            }
        }
    }

    // MARK: - Page management

    private static func breakIfNeeded(_ needed: CGFloat, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        if y + needed > pageH - mB {
            ctx.beginPage()
            y = mT
        }
    }

    // MARK: - Header

    private static func drawName(_ name: String, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        guard !name.isEmpty else { return }
        let attrs: [NSAttributedString.Key: Any] = [.font: fName, .foregroundColor: cText]
        let str = NSAttributedString(string: cleanText(name), attributes: attrs)
        let h = strH(str, width: tW)
        let intrinsicW = str.size().width
        let x = mL + max(0, (tW - intrinsicW) / 2)
        str.draw(at: CGPoint(x: x, y: y))
        y += h + 4
    }

    private static func drawContactBar(_ doc: ResumeDocument, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        var parts: [String] = []
        if let v = doc.email    { parts.append(cleanText(v)) }
        if let v = doc.phone    { parts.append(cleanText(v)) }
        if let v = doc.website  { parts.append(cleanText(v)) }
        if let v = doc.github   { parts.append(cleanText(v)) }
        if let v = doc.linkedin { parts.append(cleanText(v)) }
        if let v = doc.location { parts.append(cleanText(v)) }
        guard !parts.isEmpty else { y += 4; return }

        let text = parts.joined(separator: "  |  ")
        let attrs: [NSAttributedString.Key: Any] = [.font: fContact, .foregroundColor: cText]
        let str = NSAttributedString(string: cleanText(text), attributes: attrs)
        let h = strH(str, width: tW)
        let intrinsicW = str.size().width
        let x = mL + max(0, (tW - intrinsicW) / 2)
        str.draw(in: CGRect(x: x, y: y, width: tW, height: h))
        y += h + 10
    }

    // MARK: - Section header (bold title + 2pt light-grey rule)

    private static func drawSectionHeader(_ title: String, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        let attrs: [NSAttributedString.Key: Any] = [.font: fSection, .foregroundColor: cText]
        let str = NSAttributedString(string: title, attributes: attrs)
        let h = strH(str, width: tW)
        str.draw(at: CGPoint(x: mL, y: y))
        y += h + 2

        // 2pt light-grey rule beneath the header
        let cgCtx = ctx.cgContext
        cgCtx.saveGState()
        cgCtx.setStrokeColor(cLight.cgColor)
        cgCtx.setLineWidth(2)
        cgCtx.move(to: CGPoint(x: mL, y: y + 1))
        cgCtx.addLine(to: CGPoint(x: mL + tW, y: y + 1))
        cgCtx.strokePath()
        cgCtx.restoreGState()
        y += 7
    }

    // MARK: - Body text

    private static func drawBodyText(_ text: String, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        let attrs: [NSAttributedString.Key: Any] = [.font: fBody, .foregroundColor: cText]
        let str = NSAttributedString(string: cleanText(text), attributes: attrs)
        let h = strH(str, width: tW)
        breakIfNeeded(h, ctx: ctx, y: &y)
        str.draw(in: CGRect(x: mL, y: y, width: tW, height: h))
        y += h
    }

    // MARK: - Two-column row (left text | right text right-aligned)

    private static func drawTwoColumnRow(
        leftText: String, leftFont: UIFont,
        rightText: String, rightFont: UIFont,
        ctx: UIGraphicsPDFRendererContext,
        y: inout CGFloat
    ) {
        guard !leftText.isEmpty else { return }

        let rightAttrs: [NSAttributedString.Key: Any] = [.font: rightFont, .foregroundColor: cDark]
        let safeRightText = cleanText(rightText)
        let safeLeftText = cleanText(leftText)
        let rightStr = NSAttributedString(string: safeRightText, attributes: rightAttrs)
        let rightW = safeRightText.isEmpty ? 0 : min(rightStr.size().width + 2, tW * 0.42)
        let leftW = tW - rightW - (rightW > 0 ? 6 : 0)

        let leftAttrs: [NSAttributedString.Key: Any] = [.font: leftFont, .foregroundColor: cText]
        let leftStr = NSAttributedString(string: safeLeftText, attributes: leftAttrs)

        let leftH = strH(leftStr, width: leftW)
        let rightH = safeRightText.isEmpty ? 0 : ceil(rightStr.size().height) + 1
        let rowH = max(leftH, rightH)

        breakIfNeeded(rowH, ctx: ctx, y: &y)

        leftStr.draw(in: CGRect(x: mL, y: y, width: leftW, height: rowH))
        if !safeRightText.isEmpty {
            rightStr.draw(at: CGPoint(x: mL + tW - rightW, y: y))
        }
        y += rowH + 1
    }

    // MARK: - Bullet item

    private static func drawBullet(_ text: String, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        let indentX: CGFloat = mL + 12
        let contentW: CGFloat = tW - 12 - 4

        let attrs: [NSAttributedString.Key: Any] = [.font: fBody, .foregroundColor: cText]
        let textStr = NSAttributedString(string: cleanText(text), attributes: attrs)
        let h = strH(textStr, width: contentW)

        breakIfNeeded(h, ctx: ctx, y: &y)

        // Bullet character
        NSAttributedString(string: "•", attributes: attrs).draw(at: CGPoint(x: mL + 3, y: y))
        // Bullet content
        textStr.draw(in: CGRect(x: indentX, y: y, width: contentW, height: h))
        y += h + 1.5
    }

    // MARK: - Experience entry

    private static func drawExperienceEntry(_ entry: ExperienceEntry, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        breakIfNeeded(28, ctx: ctx, y: &y)

        // Row 1: Company (bold) | Date range (small dark-grey)
        drawTwoColumnRow(
            leftText: entry.company, leftFont: fBold,
            rightText: entry.dateRange, rightFont: fSmall,
            ctx: ctx, y: &y
        )

        // Row 2: Job title (italic) | Location (small dark-grey)
        if !entry.title.isEmpty {
            drawTwoColumnRow(
                leftText: entry.title, leftFont: fItalic,
                rightText: entry.location, rightFont: fSmall,
                ctx: ctx, y: &y
            )
        }

        for bullet in entry.bullets {
            drawBullet(bullet, ctx: ctx, y: &y)
        }

        y += 4
    }

    // MARK: - Project entry

    private static func drawProjectEntry(_ entry: ProjectEntry, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        guard !entry.name.isEmpty || !entry.bullets.isEmpty else { return }
        breakIfNeeded(20, ctx: ctx, y: &y)

        if !entry.name.isEmpty {
            let attrs: [NSAttributedString.Key: Any] = [.font: fBold, .foregroundColor: cText]
            let str = NSAttributedString(string: cleanText(entry.name), attributes: attrs)
            let h = strH(str, width: tW)
            str.draw(in: CGRect(x: mL, y: y, width: tW, height: h))
            y += h + 2
        }

        for bullet in entry.bullets {
            drawBullet(bullet, ctx: ctx, y: &y)
        }

        y += 3
    }

    // MARK: - Education entry

    private static func drawEducationEntry(_ entry: EducationEntry, ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        breakIfNeeded(28, ctx: ctx, y: &y)

        drawTwoColumnRow(
            leftText: entry.institution, leftFont: fBold,
            rightText: entry.dateRange, rightFont: fSmall,
            ctx: ctx, y: &y
        )

        if !entry.degree.isEmpty {
            drawTwoColumnRow(
                leftText: entry.degree, leftFont: fItalic,
                rightText: entry.location, rightFont: fSmall,
                ctx: ctx, y: &y
            )
        }

        for detail in entry.details {
            drawBullet(detail, ctx: ctx, y: &y)
        }

        y += 4
    }

    // MARK: - Skills section

    private static func drawSkillsSection(_ categories: [SkillCategory], ctx: UIGraphicsPDFRendererContext, y: inout CGFloat) {
        for category in categories {
            let combined = NSMutableAttributedString()
            if !category.name.isEmpty {
                combined.append(NSAttributedString(
                    string: "\(cleanText(category.name)): ",
                    attributes: [.font: fBold, .foregroundColor: cText]
                ))
            }
            if !category.items.isEmpty {
                combined.append(NSAttributedString(
                    string: cleanText(category.items),
                    attributes: [.font: fBody, .foregroundColor: cText]
                ))
            }
            guard combined.length > 0 else { continue }

            let h = strH(combined, width: tW)
            breakIfNeeded(h, ctx: ctx, y: &y)
            combined.draw(in: CGRect(x: mL, y: y, width: tW, height: h))
            y += h + 2
        }
    }

    // MARK: - Utility

    private static func strH(_ str: NSAttributedString, width: CGFloat) -> CGFloat {
        let rect = str.boundingRect(
            with: CGSize(width: max(1, width), height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        )
        return ceil(rect.height) + 1
    }

    private static func cleanText(_ text: String) -> String {
        text
            .replacingOccurrences(of: "—", with: "-")
            .replacingOccurrences(of: "–", with: "-")
            .replacingOccurrences(of: "−", with: "-")
    }

    private static func strippedBullet(_ line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        let prefixes = ["• ", "- ", "* "]
        guard let prefix = prefixes.first(where: { trimmed.hasPrefix($0) }) else { return nil }
        return String(trimmed.dropFirst(prefix.count)).trimmingCharacters(in: .whitespaces)
    }
}
