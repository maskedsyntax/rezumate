import Foundation

enum RewriteRejection: Equatable {
    case empty
    case inventedNumber(String)
    case inventedSkill(String)
    case inventedName(String)
    case overstatedRole(String)
    case firstPerson
    case tooLong
}

/// Checks AI output against the text it was generated from. Anything the user did not
/// already write (or explicitly confirm) is treated as invented and rejected.
enum RewriteValidator {
    /// Capitalized words that commonly start clauses in resume writing and are not names.
    private static let commonCapitalized: Set<String> = [
        "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or",
        "the", "to", "with", "while", "across", "after", "before", "through", "using",
        "dear", "hiring", "manager", "team", "sincerely", "regards", "best", "thank", "thanks",
        "i", "my", "this", "that", "these", "those", "it", "its", "our", "your"
    ]

    private static let numberRegex = try! NSRegularExpression(
        pattern: #"[$€£]?\d[\d,.]*\s?(%|k|m|b|x|\+)?"#,
        options: [.caseInsensitive]
    )

    private static let firstPersonRegex = try! NSRegularExpression(
        pattern: #"\b(i|me|my|mine|we|our|us)\b"#,
        options: [.caseInsensitive]
    )

    /// Wording that describes a supporting role.
    private static let modestRoleRegex = try! NSRegularExpression(
        pattern: #"\b(helped|helping|assisted|assisting|supported|supporting|contributed|contributing|participated|worked on|worked with|involved in|part of)\b"#,
        options: [.caseInsensitive]
    )

    /// Wording that claims ownership or leadership.
    private static let ownershipRegex = try! NSRegularExpression(
        pattern: #"\b(led|lead|leading|managed|manage|managing|owned|own|owning|headed|directed|oversaw|oversee|drove|spearheaded|championed|architected|supervised|ran)\b"#,
        options: [.caseInsensitive]
    )

    private static let capitalizedWordRegex = try! NSRegularExpression(
        pattern: #"(?<![.!?:]\s)(?<!^)\b[A-Z][A-Za-z0-9&+.#-]*[A-Za-z0-9+#]"#,
        options: [.anchorsMatchLines]
    )

    /// Validates a rewrite of a single resume bullet. Facts may come only from that bullet,
    /// details the user typed in about it, and skills they confirmed, so nothing moves in
    /// from another job.
    static func validateBullet(
        _ rewrite: String,
        original: String,
        details: [String] = [],
        allowedKeywords: [String] = []
    ) -> RewriteRejection? {
        let trimmed = rewrite.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return .empty }

        if firstMatch(of: firstPersonRegex, in: trimmed) != nil {
            return .firstPerson
        }

        let maxLength = max(original.count * 2, original.count + (details.isEmpty ? 120 : 200))
        if trimmed.count > maxLength {
            return .tooLong
        }

        let sources = [original] + details
        if let claim = overstatedRole(in: trimmed, sources: sources) {
            return .overstatedRole(claim)
        }

        return validateFacts(
            trimmed,
            numberSources: sources,
            nameSources: sources,
            skillSources: sources,
            allowedKeywords: allowedKeywords
        )
    }

    /// Validates long-form writing such as a cover letter. First person is expected here.
    /// Names may come from the job description, but numbers and skills only from the
    /// resume (or the confirmed list), so the letter never claims what the user lacks.
    static func validateLongForm(
        _ text: String,
        resumeText: String,
        jobDescription: String,
        allowedKeywords: [String] = []
    ) -> RewriteRejection? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return .empty }
        return validateFacts(
            trimmed,
            numberSources: [resumeText],
            nameSources: [resumeText, jobDescription],
            skillSources: [resumeText],
            allowedKeywords: allowedKeywords
        )
    }

    /// "Helped with onboarding" must not become "Led onboarding", unless the user's own
    /// details say they led it.
    private static func overstatedRole(in rewrite: String, sources: [String]) -> String? {
        guard let original = sources.first, firstMatch(of: modestRoleRegex, in: original) != nil else { return nil }
        let originalWords = Set(sources.joined(separator: " ").lowercased().split { !$0.isLetter }.map(String.init))
        let matches = ownershipRegex.matches(in: rewrite, range: NSRange(rewrite.startIndex..., in: rewrite))
        for match in matches {
            guard let range = Range(match.range, in: rewrite) else { continue }
            let claim = String(rewrite[range])
            if !originalWords.contains(claim.lowercased()) { return claim }
        }
        return nil
    }


    // MARK: - Fact checks

    private static func validateFacts(
        _ text: String,
        numberSources: [String],
        nameSources: [String],
        skillSources: [String],
        allowedKeywords: [String]
    ) -> RewriteRejection? {
        let sourceText = (numberSources + allowedKeywords).joined(separator: "\n")
        let sourceLower = (nameSources + allowedKeywords).joined(separator: "\n").lowercased()

        let sourceNumbers = Set(numbers(in: sourceText))
        for number in numbers(in: text) where !sourceNumbers.contains(number) {
            return .inventedNumber(number)
        }

        let allowedSkills = Set(ATSScoringService.extractKeywords(from: (skillSources + allowedKeywords).joined(separator: "\n")))
        for skill in ATSScoringService.extractKeywords(from: text) where !allowedSkills.contains(skill) {
            return .inventedSkill(skill)
        }

        for word in capitalizedWords(in: text) {
            let lower = word.lowercased()
            if commonCapitalized.contains(lower) { continue }
            if sourceLower.contains(lower) { continue }
            return .inventedName(word)
        }

        return nil
    }

    /// Normalized numeric tokens, e.g. "$1,200" → "1200", "35 %" → "35%".
    static func numbers(in text: String) -> [String] {
        let range = NSRange(text.startIndex..., in: text)
        return numberRegex.matches(in: text, range: range).compactMap { match in
            guard let r = Range(match.range, in: text) else { return nil }
            var token = String(text[r]).lowercased()
            token.removeAll { "$€£, ".contains($0) }
            while token.hasSuffix(".") { token.removeLast() }
            return token.isEmpty ? nil : token
        }
    }

    private static func capitalizedWords(in text: String) -> [String] {
        let range = NSRange(text.startIndex..., in: text)
        return capitalizedWordRegex.matches(in: text, range: range).compactMap { match in
            Range(match.range, in: text).map { String(text[$0]) }
        }
    }

    private static func firstMatch(of regex: NSRegularExpression, in text: String) -> NSTextCheckingResult? {
        regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))
    }
}
