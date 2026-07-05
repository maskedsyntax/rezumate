import Foundation

struct ResumeParser {

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
            if sectionName(for: line) != nil { break }
            parseContactLine(line, into: &doc)
            idx += 1
        }

        // Section parsing via FSM
        var currentSection: String? = nil
        var sectionContent: [String] = []

        while idx < lines.count {
            let line = lines[idx]
            idx += 1

            if let section = sectionName(for: line) {
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

    private static func sectionName(for line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, trimmed.count >= 3, trimmed.count <= 50 else { return nil }

        let lower = trimmed.lowercased()
        if let canonical = sectionAliases[lower] { return canonical }

        // All-uppercase line (no digits, only letters and spaces)
        let scalars = trimmed.unicodeScalars
        let letters = scalars.filter { CharacterSet.letters.contains($0) }
        guard !letters.isEmpty else { return nil }
        let allUpper = letters.allSatisfy { CharacterSet.uppercaseLetters.contains($0) }
        if allUpper {
            return sectionAliases[lower] ?? lower
        }

        return nil
    }

    // MARK: - Contact parsing

    private static func parseContactLine(_ line: String, into doc: inout ResumeDocument) {
        let parts = line
            .components(separatedBy: CharacterSet(charactersIn: "|•·$"))
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        for part in (parts.count > 1 ? parts : [line]) {
            let lower = part.lowercased()

            if doc.email == nil, let email = extractEmail(from: part) {
                doc.email = email
            } else if lower.contains("linkedin.com/in/") {
                doc.linkedin = doc.linkedin ?? (extractLinkedIn(from: part) ?? part)
            } else if lower.contains("github.com/") {
                doc.github = doc.github ?? (extractGitHub(from: part) ?? part)
            } else if lower.hasPrefix("http") || lower.hasPrefix("www.")
                || lower.contains(".dev") || lower.contains(".io")
                || (lower.contains(".com") && !lower.contains("@"))
                || (lower.contains(".app") && !lower.contains("@")) {
                if doc.website == nil { doc.website = part }
            } else if doc.phone == nil, let phone = extractPhone(from: part) {
                doc.phone = phone
            } else if isLikelyLocation(part) {
                if doc.location == nil { doc.location = part }
            }
        }
    }

    private static func extractEmail(from text: String) -> String? {
        let pattern = #"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"#
        guard let rx = try? NSRegularExpression(pattern: pattern),
              let m = rx.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let r = Range(m.range, in: text) else { return nil }
        return String(text[r])
    }

    private static func extractPhone(from text: String) -> String? {
        let pattern = #"[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}"#
        guard let rx = try? NSRegularExpression(pattern: pattern),
              let m = rx.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let r = Range(m.range, in: text) else { return nil }
        return String(text[r])
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
        // Short, title-cased, no special chars → likely a city/country
        let words = text.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        if words.count <= 3 && !text.contains("@") && !text.contains(".") && !text.contains("/") {
            let allCapped = words.allSatisfy { $0.first?.isUppercase == true }
            if allCapped && words.count == 1 && text.count >= 3 { return true }
        }
        return false
    }

    // MARK: - Section processing

    private static func processSection(_ section: String, lines: [String], into doc: inout ResumeDocument) {
        switch section {
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
            break
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

    // Splits "Company Name Feb. 2026 -- Present" → ("Company Name", "Feb. 2026 -- Present")
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

    // Splits "Founder & Lead Engineer Remote" → ("Founder & Lead Engineer", "Remote")
    private static func splitTitleAndLocation(_ line: String) -> (String, String) {
        let words = line.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        guard words.count > 1 else { return (line, "") }

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
        // "Title, ST" state abbreviation
        if let r = line.range(of: #",\s*[A-Z]{2}$"#, options: .regularExpression) {
            let loc = String(line[r]).trimmingCharacters(in: CharacterSet(charactersIn: ", "))
            let title = String(line[..<r.lowerBound]).trimmingCharacters(in: .whitespaces)
            if !title.isEmpty { return (title, loc) }
        }
        return (line, "")
    }
}
