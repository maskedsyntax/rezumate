import Foundation

enum ResumeTailoringError: Error, LocalizedError, Equatable {
    case keywordAlreadyPresent
    case bulletNotFound
    case emptyKeyword

    var errorDescription: String? {
        switch self {
        case .keywordAlreadyPresent:
            return "This keyword is already on the resume."
        case .bulletNotFound:
            return "That bullet could not be found in the resume."
        case .emptyKeyword:
            return "Choose a keyword to add."
        }
    }
}

enum ResumeTailoringService {
    private static let skillsHeadings: Set<String> = [
        "skills",
        "technical skills",
        "technologies",
        "core competencies",
        "technical competencies",
    ]

    static func canPlace(_ keyword: String, in resumeText: String) -> Bool {
        let trimmed = keyword.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        return !ATSScoringService.containsKeyword(trimmed, in: resumeText)
    }

    static func placeInSkills(keyword: String, in resumeText: String) throws -> String {
        let trimmed = keyword.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw ResumeTailoringError.emptyKeyword }
        guard canPlace(trimmed, in: resumeText) else { throw ResumeTailoringError.keywordAlreadyPresent }

        let display = displayName(for: trimmed)
        let lines = resumeText.components(separatedBy: "\n")

        if let headingIndex = lines.firstIndex(where: { skillsHeadings.contains(normalizedHeading($0)) }) {
            var updated = lines
            var lastContentIndex = headingIndex
            var index = headingIndex + 1
            while index < updated.count {
                let line = updated[index]
                if isLikelySectionHeading(line, allowingSkills: false) {
                    break
                }
                if !line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    lastContentIndex = index
                }
                index += 1
            }

            if lastContentIndex == headingIndex {
                updated.insert(display, at: headingIndex + 1)
            } else {
                updated[lastContentIndex] = appendSkill(display, to: updated[lastContentIndex])
            }
            return updated.joined(separator: "\n")
        }

        var updated = resumeText
        if !updated.hasSuffix("\n") {
            updated.append("\n")
        }
        updated.append("\nSKILLS\n\(display)")
        return updated
    }

    static func placeInBullet(keyword: String, bullet: String, in resumeText: String) throws -> String {
        let trimmedKeyword = keyword.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBullet = bullet.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedKeyword.isEmpty else { throw ResumeTailoringError.emptyKeyword }
        guard !trimmedBullet.isEmpty else { throw ResumeTailoringError.bulletNotFound }
        guard resumeText.contains(trimmedBullet) else { throw ResumeTailoringError.bulletNotFound }

        if ATSScoringService.containsKeyword(trimmedKeyword, in: trimmedBullet) {
            return resumeText
        }

        let display = displayName(for: trimmedKeyword)
        let updatedBullet = appendKeyword(display, toBullet: trimmedBullet)
        return resumeText.replacingOccurrences(of: trimmedBullet, with: updatedBullet)
    }

    static func displayName(for keyword: String) -> String {
        switch keyword.lowercased() {
        case "ci/cd": return "CI/CD"
        case "rest api": return "REST API"
        case "next.js": return "Next.js"
        case "node.js": return "Node.js"
        case "c++": return "C++"
        case "c#": return "C#"
        case "aws": return "AWS"
        case "gcp": return "GCP"
        case "sql": return "SQL"
        case "html": return "HTML"
        case "css": return "CSS"
        case "ui": return "UI"
        case "api": return "API"
        case "llm": return "LLM"
        case "nlp": return "NLP"
        case "ml": return "ML"
        case "ai": return "AI"
        default:
            return keyword
                .split(separator: " ")
                .map { part in
                    let lower = part.lowercased()
                    guard let first = lower.first else { return String(part) }
                    return String(first).uppercased() + lower.dropFirst()
                }
                .joined(separator: " ")
        }
    }

    static func proofBullets(from resumeText: String) -> [String] {
        let document = ResumeParser.parse(resumeText)
        return document.experience.flatMap(\.bullets) + document.projects.flatMap(\.bullets)
    }

    private static func appendSkill(_ skill: String, to line: String) -> String {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return skill }
        if trimmed.hasSuffix(",") || trimmed.hasSuffix(";") {
            return "\(trimmed) \(skill)"
        }
        return "\(trimmed), \(skill)"
    }

    private static func appendKeyword(_ keyword: String, toBullet bullet: String) -> String {
        if bullet.hasSuffix(".") {
            return String(bullet.dropLast()) + " using \(keyword)."
        }
        return "\(bullet) using \(keyword)"
    }

    private static func normalizedHeading(_ line: String) -> String {
        line.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: ":"))
            .lowercased()
    }

    private static func isLikelySectionHeading(_ line: String, allowingSkills: Bool) -> Bool {
        let normalized = normalizedHeading(line)
        guard (3...50).contains(normalized.count) else { return false }
        if skillsHeadings.contains(normalized) {
            return allowingSkills
        }

        let known: Set<String> = [
            "summary", "profile", "objective",
            "experience", "work experience", "employment", "professional experience",
            "projects", "project experience",
            "education", "academic background",
            "certifications", "awards", "publications",
        ]
        if known.contains(normalized) {
            return true
        }

        let letters = line.unicodeScalars.filter { CharacterSet.letters.contains($0) }
        guard !letters.isEmpty else { return false }
        return letters.allSatisfy { CharacterSet.uppercaseLetters.contains($0) }
    }
}
