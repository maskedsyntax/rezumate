import Foundation

struct ResumeParser {

    private struct DetectedSection {
        let key: String
        let title: String
    }

    private static let sectionAliases: [String: String] = [
        "summary": "summary",
        "objective": "summary",
        "professional summary": "summary",
        "career summary": "summary",
        "profile": "summary",
        "about": "summary",
        "experience": "experience",
        "work experience": "experience",
        "professional experience": "experience",
        "employment": "experience",
        "employment history": "experience",
        "work history": "experience",
        "projects": "projects",
        "personal projects": "projects",
        "project experience": "projects",
        "side projects": "projects",
        "open source": "projects",
        "education": "education",
        "academic background": "education",
        "academic history": "education",
        "skills": "skills",
        "technical skills": "skills",
        "technologies": "skills",
        "core competencies": "skills",
        "technical competencies": "skills",
        "certifications": "certifications",
        "awards": "awards",
        "publications": "publications",
        "volunteer": "volunteer",
        "volunteering": "volunteer",
    ]

    // Known single-word or short location indicators
    private static let knownLocations: Set<String> = [
        "remote", "india", "usa", "us", "uk", "united kingdom", "united states",
        "new york", "san francisco", "los angeles", "london", "berlin", "toronto",
        "singapore", "australia", "canada", "germany", "france", "europe", "asia",
        "worldwide", "globally", "anywhere", "hybrid"
    ]

    // Compiled date-range regex (matches "Jan. 2022 -- Present", "2019 - 2022", etc.)
    private static let dateRegex: NSRegularExpression? = {
        let pattern =
            #"(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?"# +
            #"\d{4}\s*[-–—]+\s*(?:Present|Current|\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4})"#
        return try? NSRegularExpression(pattern: pattern, options: .caseInsensitive)
    }()

    // MARK: - Public

    static func parse(_ text: String) -> ResumeDocument {
        var doc = ResumeDocument()
        let lines = text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }

        guard !lines.isEmpty else { return doc }

        var idx = 0

        // Skip leading blanks, then grab name
        while idx < lines.count, lines[idx].isEmpty { idx += 1 }
        guard idx < lines.count else { return doc }
        doc.name = lines[idx]
        idx += 1

        // Contact block: lines before the first section header
        while idx < lines.count {
            let line = lines[idx]
            if line.isEmpty { idx += 1; continue }
            if detectedSection(for: line) != nil { break }
            if !parseContactLine(line, into: &doc) {
                doc.unmappedContent.append(line)
            }
            idx += 1
        }

        // Section parsing via FSM
        var currentSection: DetectedSection? = nil
        var sectionContent: [String] = []

        while idx < lines.count {
            let line = lines[idx]
            idx += 1

            if let section = detectedSection(for: line) {
                if let prev = currentSection {
                    processSection(prev, lines: sectionContent, into: &doc)
                }
                currentSection = section
                sectionContent = []
            } else {
                sectionContent.append(line)
            }
        }

        if let section = currentSection {
            processSection(section, lines: sectionContent, into: &doc)
        }

        return doc
    }

    // MARK: - Section detection

    private static func detectedSection(for line: String) -> DetectedSection? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, trimmed.count >= 3, trimmed.count <= 50 else { return nil }

        let lower = trimmed.lowercased()
        if let canonical = sectionAliases[lower] {
            return DetectedSection(key: canonical, title: trimmed)
        }

        // All-uppercase line (no digits, only letters and spaces)
        let scalars = trimmed.unicodeScalars
        let letters = scalars.filter { CharacterSet.letters.contains($0) }
        guard !letters.isEmpty else { return nil }
        let allUpper = letters.allSatisfy { CharacterSet.uppercaseLetters.contains($0) }
        if allUpper {
            return DetectedSection(key: sectionAliases[lower] ?? lower, title: trimmed)
        }

        return nil
    }

    // MARK: - Contact parsing

    @discardableResult
    private static func parseContactLine(_ line: String, into doc: inout ResumeDocument) -> Bool {
        let parts = line
            .components(separatedBy: CharacterSet(charactersIn: "|•·$"))
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        var parsedAny = false
        for part in (parts.count > 1 ? parts : [line]) {
            let lower = part.lowercased()

            if doc.email == nil, let email = extractEmail(from: part) {
                doc.email = email
                parsedAny = true
            } else if lower.contains("linkedin.com/in/") {
                doc.linkedin = doc.linkedin ?? (extractLinkedIn(from: part) ?? part)
                parsedAny = true
            } else if lower.contains("github.com/") {
                doc.github = doc.github ?? (extractGitHub(from: part) ?? part)
                parsedAny = true
            } else if lower.hasPrefix("http") || lower.hasPrefix("www.")
                || lower.contains(".dev") || lower.contains(".io")
                || (lower.contains(".com") && !lower.contains("@"))
                || (lower.contains(".app") && !lower.contains("@")) {
                if doc.website == nil { doc.website = part }
                parsedAny = true
            } else if doc.phone == nil, let phone = extractPhone(from: part) {
                doc.phone = phone
                parsedAny = true
            } else if isLikelyLocation(part) {
                if doc.location == nil { doc.location = part }
                parsedAny = true
            }
        }
        return parsedAny
    }

    private static func extractEmail(from text: String) -> String? {
        let pattern = #"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"#
        guard let rx = try? NSRegularExpression(pattern: pattern),
              let m = rx.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let r = Range(m.range, in: text) else { return nil }
        return String(text[r])
    }

    private static func extractPhone(from text: String) -> String? {
        let pattern = #"(?<![A-Za-z0-9])\+?[0-9(][0-9\s().-]{8,}[0-9](?![A-Za-z0-9])"#
        guard let rx = try? NSRegularExpression(pattern: pattern) else { return nil }

        for match in rx.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let range = Range(match.range, in: text) else { continue }
            let candidate = String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
            let digitCount = candidate.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) }.count
            if (10...15).contains(digitCount) {
                return candidate
            }
        }
        return nil
    }

    private static func extractLinkedIn(from text: String) -> String? {
        let pattern = #"linkedin\.com/in/([a-zA-Z0-9\-]+)"#
        guard let rx = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = rx.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              m.numberOfRanges > 1,
              let r = Range(m.range(at: 1), in: text) else { return nil }
        return String(text[r])
    }

    private static func extractGitHub(from text: String) -> String? {
        let pattern = #"github\.com/([a-zA-Z0-9\-]+)"#
        guard let rx = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = rx.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              m.numberOfRanges > 1,
              let r = Range(m.range(at: 1), in: text) else { return nil }
        return String(text[r])
    }

    private static func isLikelyLocation(_ text: String) -> Bool {
        let lower = text.lowercased().trimmingCharacters(in: .whitespaces)
        if knownLocations.contains(lower) { return true }
        // "City, ST" pattern
        if lower.range(of: #"^[a-z\s]+,\s*[a-z]{2}$"#, options: .regularExpression) != nil { return true }
        // Short, title-cased, no special chars means likely a city/country.
        let words = text.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        if words.count <= 3 && !text.contains("@") && !text.contains(".") && !text.contains("/") {
            let allCapped = words.allSatisfy { $0.first?.isUppercase == true }
            if allCapped && words.count == 1 && text.count >= 3 { return true }
        }
        return false
    }

    // MARK: - Section processing

    private static func processSection(_ section: DetectedSection, lines: [String], into doc: inout ResumeDocument) {
        switch section.key {
        case "summary":
            doc.summary = lines.filter { !$0.isEmpty }.joined(separator: " ")
        case "experience":
            doc.experience = parseExperienceEntries(lines)
        case "projects":
            doc.projects = parseProjectEntries(lines)
        case "education":
            doc.education = parseEducationEntries(lines)
        case "skills":
            doc.skillCategories = parseSkillsSection(lines)
        default:
            let meaningfulLines = lines.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            if !meaningfulLines.isEmpty {
                doc.additionalSections.append(
                    AdditionalResumeSection(title: section.title, lines: meaningfulLines)
                )
            }
        }
    }

    // MARK: - Experience

    private static func parseExperienceEntries(_ lines: [String]) -> [ExperienceEntry] {
        var entries: [ExperienceEntry] = []
        var current: ExperienceEntry? = nil
        var expectTitle = false

        for line in lines {
            if line.isEmpty { continue }

            if let bullet = asBullet(line) {
                current?.bullets.append(bullet)
                expectTitle = false
                continue
            }

            if current == nil {
                var e = ExperienceEntry()
                let (name, date) = splitNameAndDate(line)
                e.company = name
                e.dateRange = date
                current = e
                expectTitle = true
            } else if expectTitle {
                let (title, loc) = splitTitleAndLocation(line)
                current!.title = title
                current!.location = loc
                expectTitle = false
            } else if shouldContinuePreviousBullet(line, current: current) {
                var updated = current!
                appendToLastBullet(line, entry: &updated)
                current = updated
            } else {
                entries.append(current!)
                var e = ExperienceEntry()
                let (name, date) = splitNameAndDate(line)
                e.company = name
                e.dateRange = date
                current = e
                expectTitle = true
            }
        }

        if let last = current { entries.append(last) }
        return entries
    }

    // MARK: - Projects

    private static func parseProjectEntries(_ lines: [String]) -> [ProjectEntry] {
        var entries: [ProjectEntry] = []
        var current: ProjectEntry? = nil

        for line in lines {
            if line.isEmpty { continue }

            if let bullet = asBullet(line) {
                if current == nil { current = ProjectEntry(name: "") }
                current!.bullets.append(bullet)
                continue
            }

            if shouldContinuePreviousProjectBullet(line, current: current) {
                var updated = current!
                appendToLastProjectBullet(line, entry: &updated)
                current = updated
                continue
            }

            if let prev = current { entries.append(prev) }
            // Strip trailing date range from project name line
            let (name, _) = splitNameAndDate(line)
            current = ProjectEntry(name: name.isEmpty ? line : name)
        }

        if let last = current { entries.append(last) }
        return entries
    }

    // MARK: - Education

    private static func parseEducationEntries(_ lines: [String]) -> [EducationEntry] {
        var entries: [EducationEntry] = []
        var current: EducationEntry? = nil
        var expectDegree = false

        for line in lines {
            if line.isEmpty { continue }

            if let bullet = asBullet(line) {
                current?.details.append(bullet)
                expectDegree = false
                continue
            }

            if current == nil {
                var e = EducationEntry()
                let (inst, date) = splitNameAndDate(line)
                e.institution = inst
                e.dateRange = date
                current = e
                expectDegree = true
            } else if expectDegree {
                let (deg, loc) = splitTitleAndLocation(line)
                current!.degree = deg
                current!.location = loc
                expectDegree = false
            } else {
                entries.append(current!)
                var e = EducationEntry()
                let (inst, date) = splitNameAndDate(line)
                e.institution = inst
                e.dateRange = date
                current = e
                expectDegree = true
            }
        }

        if let last = current { entries.append(last) }
        return entries
    }

    // MARK: - Skills

    private static func parseSkillsSection(_ lines: [String]) -> [SkillCategory] {
        var cats: [SkillCategory] = []

        for line in lines {
            if line.isEmpty { continue }
            if let colonIdx = line.firstIndex(of: ":") {
                let name = String(line[..<colonIdx]).trimmingCharacters(in: .whitespaces)
                let items = String(line[line.index(after: colonIdx)...]).trimmingCharacters(in: .whitespaces)
                if !name.isEmpty && !items.isEmpty && name.count < 40 {
                    cats.append(SkillCategory(name: name, items: items))
                    continue
                }
            }
            cats.append(SkillCategory(name: "", items: line))
        }

        return cats
    }

    // MARK: - Helpers

    private static func asBullet(_ line: String) -> String? {
        let t = line.trimmingCharacters(in: .whitespaces)
        let bulletChars: Set<Character> = ["•", "·", "▪", "▸", "◦", "‣", "–", "—"]
        if let first = t.first, bulletChars.contains(first) {
            return String(t.dropFirst()).trimmingCharacters(in: .whitespaces)
        }
        if t.hasPrefix("- ") { return String(t.dropFirst(2)).trimmingCharacters(in: .whitespaces) }
        if t.hasPrefix("* ") { return String(t.dropFirst(2)).trimmingCharacters(in: .whitespaces) }
        return nil
    }

    private static func shouldContinuePreviousBullet(_ line: String, current: ExperienceEntry?) -> Bool {
        guard let current, !current.bullets.isEmpty else { return false }
        let (_, date) = splitNameAndDate(line)
        return date.isEmpty
    }

    private static func appendToLastBullet(_ line: String, entry: inout ExperienceEntry) {
        guard !entry.bullets.isEmpty else { return }
        let continuation = line.trimmingCharacters(in: .whitespaces)
        guard !continuation.isEmpty else { return }
        entry.bullets[entry.bullets.count - 1] += " " + continuation
    }

    private static func shouldContinuePreviousProjectBullet(_ line: String, current: ProjectEntry?) -> Bool {
        guard let current, !current.bullets.isEmpty else { return false }
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return false }
        if splitNameAndDate(trimmed).1.isEmpty == false { return false }
        if trimmed.count > 38 { return true }
        if let first = trimmed.first, first.isLowercase || "(),;:/".contains(first) { return true }
        return false
    }

    private static func appendToLastProjectBullet(_ line: String, entry: inout ProjectEntry) {
        guard !entry.bullets.isEmpty else { return }
        let continuation = line.trimmingCharacters(in: .whitespaces)
        guard !continuation.isEmpty else { return }
        entry.bullets[entry.bullets.count - 1] += " " + continuation
    }

    // Splits "Company Name Feb. 2026 -- Present" -> ("Company Name", "Feb. 2026 -- Present")
    private static func splitNameAndDate(_ line: String) -> (String, String) {
        guard let regex = dateRegex else { return (line, "") }

        var lastMatch: NSTextCheckingResult? = nil
        regex.enumerateMatches(in: line, range: NSRange(line.startIndex..., in: line)) { m, _, _ in
            lastMatch = m
        }

        guard let match = lastMatch, let matchRange = Range(match.range, in: line) else {
            return (line, "")
        }

        let date = String(line[matchRange]).trimmingCharacters(in: .whitespaces)
        let name = String(line[..<matchRange.lowerBound]).trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? (line, "") : (name, date)
    }

    // Splits "Founder & Lead Engineer Remote" -> ("Founder & Lead Engineer", "Remote")
    private static func splitTitleAndLocation(_ line: String) -> (String, String) {
        let words = line.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        guard words.count > 1 else { return (line, "") }

        // Preserve a complete "City, ST" suffix. PDF text extraction commonly removes
        // column spacing, so a row such as "iOS Engineer  San Francisco, CA" arrives as
        // one line. Prefer a known multi-word city, then fall back to the last word.
        if let comma = line.lastIndex(of: ",") {
            let state = line[line.index(after: comma)...].trimmingCharacters(in: .whitespaces)
            let beforeComma = line[..<comma].trimmingCharacters(in: .whitespaces)
            if state.range(of: #"^[A-Za-z]{2}$"#, options: .regularExpression) != nil {
                let lowerBeforeComma = beforeComma.lowercased()
                let knownCity = knownLocations
                    .sorted { $0.count > $1.count }
                    .first { lowerBeforeComma == $0 || lowerBeforeComma.hasSuffix(" \($0)") }

                let city: String
                let rawTitle: String
                if let knownCity {
                    city = String(beforeComma.suffix(knownCity.count))
                    rawTitle = String(beforeComma.dropLast(knownCity.count))
                } else if let cityStart = beforeComma.lastIndex(where: { $0.isWhitespace }) {
                    city = String(beforeComma[beforeComma.index(after: cityStart)...])
                    rawTitle = String(beforeComma[..<cityStart])
                } else {
                    city = ""
                    rawTitle = ""
                }

                let title = rawTitle.trimmingCharacters(in: CharacterSet(charactersIn: " |–—-\t"))
                if !title.isEmpty, !city.isEmpty {
                    return (title, "\(city), \(state.uppercased())")
                }
            }
        }

        if let last = words.last, knownLocations.contains(last.lowercased()) {
            let title = words.dropLast().joined(separator: " ")
            return (title.isEmpty ? line : title, last)
        }
        if words.count >= 3 {
            let lastTwo = words.suffix(2).joined(separator: " ")
            if knownLocations.contains(lastTwo.lowercased()) {
                let title = words.dropLast(2).joined(separator: " ")
                return (title.isEmpty ? line : title, lastTwo)
            }
        }
        return (line, "")
    }
}
