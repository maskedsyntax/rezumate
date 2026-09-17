import Foundation

struct JobFit: Equatable {
    var jobTitle: String?
    var jobTitleMatched: Bool
    var educationRequirement: String?
    var educationMatched: Bool
}

enum JobFitExtractor {
    static func extract(jobDescription: String, resumeText: String) -> JobFit {
        let title = extractJobTitle(from: jobDescription)
        let education = extractEducationRequirement(from: jobDescription)
        let resumeLower = resumeText.lowercased()

        return JobFit(
            jobTitle: title,
            jobTitleMatched: title.map { resumeContainsTitle($0, resumeLower: resumeLower) } ?? false,
            educationRequirement: education,
            educationMatched: education.map { resumeContainsEducation($0, resumeLower: resumeLower) } ?? false
        )
    }

    static func extractJobTitle(from jobDescription: String) -> String? {
        let labeled = firstCapture(
            in: jobDescription,
            pattern: #"(?i)(?:job\s+title|title|role|position)\s*[:\-]\s*([^\n]{4,80})"#
        )
        if let labeled = cleanupTitle(labeled) {
            return labeled
        }

        let hiring = firstCapture(
            in: jobDescription,
            pattern: #"(?i)(?:we are )?(?:hiring|seeking|looking for)\s+(?:an?\s+)?([^.\n]{4,80})"#
        )
        return cleanupTitle(hiring)
    }

    static func extractEducationRequirement(from jobDescription: String) -> String? {
        let lower = jobDescription.lowercased()
        let checks: [(label: String, pattern: String)] = [
            ("PhD", #"\bph\.?d\b|\bdoctorate\b"#),
            ("MBA", #"\bmba\b"#),
            ("Master's degree", #"\bmaster'?s\b|\bm\.?s\.?\b|\bm\.?a\.?\b"#),
            ("Bachelor's degree", #"\bbachelor'?s\b|\bb\.?s\.?\b|\bb\.?a\.?\b|\bbachelor\b"#),
            ("Associate degree", #"\bassociate(?:'s)?\s+degree\b"#),
        ]

        for check in checks {
            if matches(check.pattern, in: lower) {
                return check.label
            }
        }
        return nil
    }

    private static func resumeContainsTitle(_ title: String, resumeLower: String) -> Bool {
        let lower = title.lowercased()
        if resumeLower.contains(lower) {
            return true
        }

        let tokens = lower
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.count >= 4 && !titleNoise.contains($0) }
        guard tokens.count >= 2 else {
            return tokens.contains(where: { resumeLower.contains($0) })
        }
        let hits = tokens.filter { resumeLower.contains($0) }.count
        return hits >= max(2, tokens.count - 1)
    }

    private static func resumeContainsEducation(_ requirement: String, resumeLower: String) -> Bool {
        switch requirement {
        case "PhD":
            return matches(#"\bph\.?d\b|\bdoctorate\b"#, in: resumeLower)
        case "MBA":
            return matches(#"\bmba\b"#, in: resumeLower)
        case "Master's degree":
            return matches(#"\bmaster'?s\b|\bm\.?s\.?\b|\bm\.?sc\b"#, in: resumeLower)
        case "Bachelor's degree":
            return matches(#"\bbachelor'?s\b|\bb\.?s\.?\b|\bb\.?a\.?\b|\bb\.s\b|\bbachelor\b"#, in: resumeLower)
        case "Associate degree":
            return matches(#"\bassociate(?:'s)?\b"#, in: resumeLower)
        default:
            return resumeLower.contains(requirement.lowercased())
        }
    }

    private static func cleanupTitle(_ raw: String?) -> String? {
        guard var title = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty else {
            return nil
        }

        let cutTokens = [" to ", " who ", " that ", " with ", " for ", " in ", ","]
        let lowered = title.lowercased()
        var earliest: String.Index?
        for token in cutTokens {
            if let range = lowered.range(of: token) {
                if earliest == nil || range.lowerBound < earliest! {
                    earliest = range.lowerBound
                }
            }
        }
        if let earliest {
            title = String(title[..<earliest])
        }

        title = title.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters))
        let words = title.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        guard (2...8).contains(words.count) else { return nil }
        guard !titleNoise.contains(title.lowercased()) else { return nil }
        return title
    }

    private static let titleNoise: Set<String> = [
        "team", "someone", "candidate", "candidates", "person", "people", "individual", "role"
    ]

    private static func firstCapture(in text: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, options: [], range: range),
              match.numberOfRanges > 1,
              let capture = Range(match.range(at: 1), in: text) else {
            return nil
        }
        return String(text[capture])
    }

    private static func matches(_ pattern: String, in text: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return false }
        let range = NSRange(text.startIndex..., in: text)
        return regex.firstMatch(in: text, options: [], range: range) != nil
    }
}
