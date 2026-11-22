import Foundation

struct ATSAnalysisResult: Codable, Equatable, Hashable {
    let scoreVersion: String
    let score: Int
    let jdKeywords: [String]
    let matchedKeywords: [String]
    let missingKeywords: [String]
    let partialMatches: [String]
    let keywordCoverage: Int
    let bulletCount: Int
    let weakBulletCount: Int
    let bulletsWithoutMeasurableImpactCount: Int
    let weakBullets: [String]
    let bulletsWithoutMeasurableImpact: [String]
    let sections: [String: Bool]
    let formattingWarnings: [String]
    let estimatedResumeLengthWords: Int
    let componentScores: [String: Int]
}

struct ATSScoringService {
    
    static let scoreVersion = "ats-v3"
    
    static let sectionAliases: [String: [String]] = [
        "summary": ["summary", "profile", "objective"],
        "experience": ["experience", "work experience", "employment", "professional experience"],
        "projects": ["projects", "project experience"],
        "skills": ["skills", "technical skills", "technologies"],
        "education": ["education", "academic background"]
    ]
    
    static let knownSkills: Set<String> = [
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "linux",
        "python", "java", "javascript", "typescript", "go", "golang", "rust",
        "c++", "c#", "react", "next.js", "node.js", "fastapi", "django",
        "flask", "spring", "postgresql", "postgres", "mysql", "mongodb",
        "redis", "graphql", "rest", "api", "microservices", "ci/cd", "git",
        "github", "sql", "nosql", "spark", "kafka", "airflow", "pandas",
        "machine learning", "ml", "ai", "llm", "nlp", "tensorflow",
        "pytorch", "scikit-learn", "data analysis", "analytics", "excel",
        "power bi", "tableau", "figma", "product management", "agile", "scrum",
        "html", "css", "json", "rest api", "rest apis", "responsive design",
        "accessibility", "web applications", "ui", "frontend", "nextjs",
        "tailwind", "tailwind css", "node", "apis",
        // Mobile
        "ios", "swift", "swiftui", "uikit", "objective-c", "xcode", "xctest",
        "core data", "swiftdata", "app store", "testflight", "android", "kotlin",
        "jetpack compose", "react native", "flutter", "unit testing", "ui testing",
        "unit tests", "unit test", "ui tests", "ui test", "push notifications", "push notification",
        "xcode cloud", "github actions", "gitlab ci",
        // Healthcare
        "patient care", "patient education", "medication administration", "triage",
        "bls", "acls", "pals", "ehr", "emr", "telemetry", "icu", "infection control",
        "care planning", "vital signs", "hipaa",
        // Marketing
        "seo", "sem", "ppc", "google analytics", "google ads", "hubspot", "salesforce",
        "crm", "content marketing", "email marketing", "social media", "copywriting",
        "a/b testing", "marketing automation", "campaign management", "brand strategy"
    ]
    
    static let canonicalKeywords: [String: String] = [
        "apis": "api",
        "api": "api",
        "nextjs": "next.js",
        "postgres": "postgresql",
        "postgresql": "postgresql",
        "next.js": "next.js",
        "node": "node.js",
        "node.js": "node.js",
        "rest": "rest api",
        "rest api": "rest api",
        "rest apis": "rest api",
        "tailwind": "tailwind css",
        "tailwind css": "tailwind css",
        "unit tests": "unit testing",
        "unit test": "unit testing",
        "ui tests": "ui testing",
        "ui test": "ui testing",
        "push notification": "push notifications"
    ]

    /// Other spellings that count as the same skill on a resume ("unit tests" for "unit testing").
    static let keywordVariants: [String: [String]] = [
        "unit testing": ["unit tests", "unit test"],
        "ui testing": ["ui tests", "ui test"],
        "push notifications": ["push notification"]
    ]

    /// Separators that make neighbouring skills alternatives: "Core Data or SwiftData",
    /// "AWS, GCP, or Azure", "Kotlin/Java". Commas alone only count inside a group that has an "or".
    static let alternativeSeparatorRegex = try! NSRegularExpression(
        pattern: #"^[ \t]*(?:,[ \t]*)?(?:or|and/or|/)[ \t]*$"#, options: []
    )
    static let commaSeparatorRegex = try! NSRegularExpression(pattern: #"^[ \t]*,[ \t]*$"#, options: [])
    
    static let redundantKeywords: [String: Set<String>] = [
        "api": ["rest api", "graphql", "fastapi"],
        "ui": ["swiftui", "uikit", "ui testing", "jetpack compose", "frontend", "figma"]
    ]

    // Words too common to signal a partial match on their own ("data" in "Core Data").
    static let genericKeywordParts: Set<String> = [
        "administration", "analysis", "api", "apis", "app", "applications", "automation",
        "brand", "campaign", "care", "compose", "content", "control", "core", "data",
        "design", "education", "email", "google", "infection", "learning", "machine",
        "management", "marketing", "media", "medication", "objective", "patient",
        "planning", "power", "product", "responsive", "signs", "social", "store",
        "strategy", "test", "testing", "unit", "vital", "web"
    ]

    static let optionalHeadingRegex = try! NSRegularExpression(
        pattern: #"nice[\s-]to[\s-]have|preferred|bonus|good to have|desired|desirable|pluses|optional"#,
        options: .caseInsensitive
    )

    static let optionalInlineRegex = try! NSRegularExpression(
        pattern: #"\ba plus\b|nice[\s-]to[\s-]have|\bpreferred\b|\bbonus\b"#,
        options: .caseInsensitive
    )

    // Profile links like github.com/name would otherwise match the "github" skill.
    static let linkRegex = try! NSRegularExpression(
        pattern: #"(?:https?://|www\.)\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|io|dev|org|me|co|app|ai)(?:/\S*)?"#,
        options: .caseInsensitive
    )
    
    static let keywordNoise: Set<String> = [
        "ability", "basic", "collaborating", "communication", "developer",
        "development", "engineer", "engineering", "experience", "familiarity",
        "good", "intern", "internship", "knowledge", "learn", "learning",
        "nice", "requirements", "responsibilities", "responsibility", "role",
        "strong", "understanding", "web", "willingness", "work", "working"
    ]
    
    static let weakBulletStarters: [String] = [
        "worked on", "helped with", "responsible for", "involved in",
        "participated in", "assisted with", "handled", "did", "made"
    ]
    
    static let actionLineStarters: [String] = [
        "built", "created", "developed", "designed", "implemented", "improved",
        "integrated", "launched", "led", "maintained", "managed", "optimized",
        "shipped", "worked on", "helped with", "responsible for", "assisted with"
    ]
    
    static let impactSignalWeight = 0.75
    static let strongWordingWeight = 0.25

    static let measurableImpactRegex = try! NSRegularExpression(
        pattern: #"(\d+[%+]?|\$[\d,.]+|[<>]\s*\d+|\b\d+\s*(x|k|m|million|billion|users|customers|requests|seconds|minutes|hours|days)\b)"#,
        options: .caseInsensitive
    )

    static let qualitativeImpactSignals: [String] = [
        "improved", "improving", "reduced", "increased", "optimized",
        "streamlined", "accelerated", "enabled", "delivered", "supporting",
        "resulting", "reliability", "performance", "usability", "quality",
        "efficiency", "accuracy", "scalability", "maintainability"
    ]
    
    static func containsKeyword(_ keyword: String, in resumeText: String) -> Bool {
        keywordInText(keyword, textLower: removingLinks(from: resumeText.lowercased()))
    }

    static func analyzeResume(resumeText: String, jobDescription: String) -> ATSAnalysisResult {
        let resumeLower = removingLinks(from: resumeText.lowercased())
        // "Core Data or SwiftData": having one option meets the requirement, so the others
        // are neither missing nor counted.
        var jdKeywords = extractKeywords(from: jobDescription)
        for group in alternativeGroups(in: jobDescription) {
            let have = group.filter { keywordInText($0, textLower: resumeLower) }
            if !have.isEmpty {
                let dropped = Set(group).subtracting(have)
                jdKeywords.removeAll { dropped.contains($0) }
            }
        }

        var matchedKeywords: [String] = []
        var missingKeywords: [String] = []
        var partialMatches: [String] = []

        // Free shows only the first few of each list, so required skills must come first.
        for keyword in prioritizedKeywords(jdKeywords, in: jobDescription) {
            let keywordLower = keyword.lowercased()
            if keywordInText(keywordLower, textLower: resumeLower) {
                matchedKeywords.append(keyword)
            } else if partialKeywordMatch(keywordLower, resumeLower: resumeLower) {
                partialMatches.append(keyword)
            } else {
                missingKeywords.append(keyword)
            }
        }
        
        let bullets = extractBullets(from: resumeText)
        let weakBullets = bullets.filter { isWeakBullet($0) }
        
        let bulletsWithoutImpact = bullets.filter { !hasImpactSignal($0) }
        
        let sections = detectSections(in: resumeText)
        let formattingWarnings = detectFormattingWarnings(in: resumeText)
        // Length is still reported, but it says nothing about layout, so it doesn't cost formatting points.
        let lengthWarnings = detectLengthWarnings(in: resumeText)

        let keywordCoverage = calculatePercentage(
            numerator: Double(matchedKeywords.count) + (0.5 * Double(partialMatches.count)),
            denominator: jdKeywords.count
        )
        
        // A bullet earns most of its credit for showing an outcome and the rest for strong
        // wording, so fixing "Worked on..." counts even when no number can be added.
        let impactPoints = bullets.reduce(0.0) { total, bullet in
            total + (hasImpactSignal(bullet) ? impactSignalWeight : 0) + (isWeakBullet(bullet) ? 0 : strongWordingWeight)
        }
        let impactQuality = calculatePercentage(numerator: impactPoints, denominator: bullets.count)
        
        let structureQuality = calculatePercentage(
            numerator: Double(sections.values.filter { $0 }.count),
            denominator: sections.count
        )
        
        let formattingQuality = max(0.0, 100.0 - (Double(formattingWarnings.count) * 20.0))
        
        let score = Int(round(
            (keywordCoverage * 0.45)
            + (impactQuality * 0.25)
            + (structureQuality * 0.20)
            + (formattingQuality * 0.10)
        ))
        
        let words = resumeText.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        
        return ATSAnalysisResult(
            scoreVersion: scoreVersion,
            score: score,
            jdKeywords: jdKeywords,
            matchedKeywords: matchedKeywords,
            missingKeywords: missingKeywords,
            partialMatches: partialMatches,
            keywordCoverage: Int(round(keywordCoverage)),
            bulletCount: bullets.count,
            weakBulletCount: weakBullets.count,
            bulletsWithoutMeasurableImpactCount: bulletsWithoutImpact.count,
            weakBullets: Array(weakBullets.prefix(8)),
            bulletsWithoutMeasurableImpact: Array(bulletsWithoutImpact.prefix(8)),
            sections: sections,
            formattingWarnings: lengthWarnings + formattingWarnings,
            estimatedResumeLengthWords: words.count,
            componentScores: [
                "keyword_coverage": Int(round(keywordCoverage)),
                "impact_quality": Int(round(impactQuality)),
                "structure_readability": Int(round(structureQuality)),
                "formatting_risk": Int(round(formattingQuality))
            ]
        )
    }
    
    static func extractKeywords(from text: String) -> [String] {
        let found = Set(skillMentions(in: text).map(\.keyword))
        return removeRedundantKeywords(found).sorted()
    }

    /// Every skill the text mentions, with where. Longer skills are matched first and their
    /// text is blanked out, so "GitHub Actions" doesn't also count as "GitHub" and
    /// "React Native" doesn't also count as "React".
    static func skillMentions(in text: String) -> [(keyword: String, range: NSRange)] {
        var textLower = removingLinks(from: text.lowercased()) as NSString
        var mentions: [(keyword: String, range: NSRange)] = []
        for skill in skillsLongestFirst {
            let keyword = canonicalizeKeyword(skill)
            for pattern in patterns(for: skill) {
                guard let regex = cachedRegex(pattern) else { continue }
                let current = textLower as String
                let matches = regex.matches(in: current, options: [], range: NSRange(location: 0, length: textLower.length))
                guard !matches.isEmpty else { continue }
                let masked = NSMutableString(string: current)
                for match in matches {
                    mentions.append((keyword, match.range))
                    masked.replaceCharacters(in: match.range, with: String(repeating: " ", count: match.range.length))
                }
                textLower = masked
            }
        }
        return mentions.sorted { $0.range.location < $1.range.location }
    }

    private static let skillsLongestFirst = knownSkills.filter { !keywordNoise.contains($0) }
        .sorted { $0.count != $1.count ? $0.count > $1.count : $0 < $1 }

    // Scoring runs these patterns many times per analysis, so each is compiled once.
    private static let regexCache = NSCache<NSString, NSRegularExpression>()

    private static func cachedRegex(_ pattern: String) -> NSRegularExpression? {
        if let regex = regexCache.object(forKey: pattern as NSString) { return regex }
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return nil }
        regexCache.setObject(regex, forKey: pattern as NSString)
        return regex
    }

    /// Groups of skills the job offers as alternatives, such as ["core data", "swiftdata"].
    static func alternativeGroups(in jobDescription: String) -> [[String]] {
        let text = removingLinks(from: jobDescription.lowercased()) as NSString
        let mentions = skillMentions(in: jobDescription)
        var groups: [[String]] = []
        var current: [String] = []
        var hasOr = false
        func close() {
            if hasOr, Set(current).count > 1 { groups.append(Array(Set(current)).sorted()) }
            current = []
            hasOr = false
        }
        for (index, mention) in mentions.enumerated() {
            if index > 0 {
                let previous = mentions[index - 1].range
                let gapStart = previous.location + previous.length
                let gap = gapStart <= mention.range.location
                    ? text.substring(with: NSRange(location: gapStart, length: mention.range.location - gapStart))
                    : ""
                let gapRange = NSRange(location: 0, length: (gap as NSString).length)
                if alternativeSeparatorRegex.firstMatch(in: gap, options: [], range: gapRange) != nil {
                    hasOr = true
                } else if commaSeparatorRegex.firstMatch(in: gap, options: [], range: gapRange) == nil {
                    close()
                }
            }
            current.append(mention.keyword)
        }
        close()
        return groups
    }

    /// Orders keywords by how central they are to the job: skills outside a "nice to have"
    /// section first, then by how often the job mentions them, then by first mention.
    static func prioritizedKeywords(_ keywords: [String], in jobDescription: String) -> [String] {
        let lines = removingLinks(from: jobDescription.lowercased()).components(separatedBy: .newlines)
        var inOptionalSection = false
        var lineIsOptional: [Bool] = []

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            let wordCount = trimmed.split(separator: " ").count
            let isHeading = wordCount > 0 && wordCount <= 6 && !trimmed.hasPrefix("-") && !trimmed.hasPrefix("•") && !trimmed.hasPrefix("*")
            if isHeading {
                inOptionalSection = matchesRegex(optionalHeadingRegex, in: trimmed)
            }
            lineIsOptional.append(inOptionalSection || matchesRegex(optionalInlineRegex, in: trimmed))
        }

        struct Importance {
            var requiredHits = 0
            var optionalHits = 0
            var firstLine = Int.max
        }

        let importance = Dictionary(uniqueKeysWithValues: keywords.map { keyword -> (String, Importance) in
            var value = Importance()
            for (index, line) in lines.enumerated() where keywordInText(keyword, textLower: line) {
                if lineIsOptional[index] { value.optionalHits += 1 } else { value.requiredHits += 1 }
                value.firstLine = min(value.firstLine, index)
            }
            // Canonical forms ("rest api" from "REST") may not match line by line; treat as required.
            if value.requiredHits + value.optionalHits == 0 { value.requiredHits = 1 }
            return (keyword, value)
        })

        return keywords.sorted { lhs, rhs in
            let a = importance[lhs]!, b = importance[rhs]!
            if (a.requiredHits > 0) != (b.requiredHits > 0) { return a.requiredHits > 0 }
            if a.requiredHits != b.requiredHits { return a.requiredHits > b.requiredHits }
            if a.firstLine != b.firstLine { return a.firstLine < b.firstLine }
            return lhs < rhs
        }
    }

    static func removingLinks(from text: String) -> String {
        let range = NSRange(location: 0, length: text.utf16.count)
        return linkRegex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: " ")
    }

    private static func matchesRegex(_ regex: NSRegularExpression, in text: String) -> Bool {
        regex.firstMatch(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count)) != nil
    }

    static func hasImpactSignal(_ bullet: String) -> Bool {
        let range = NSRange(location: 0, length: bullet.utf16.count)
        if measurableImpactRegex.firstMatch(in: bullet, options: [], range: range) != nil {
            return true
        }

        let lowered = bullet.lowercased()
        return qualitativeImpactSignals.contains(where: { lowered.contains($0) })
    }
    
    static func extractBullets(from text: String) -> [String] {
        var bullets: [String] = []
        let lines = text.components(separatedBy: .newlines)
        let bulletPrefixRegex = try! NSRegularExpression(pattern: #"^([\-*•]|\d+[.)])\s+"#, options: [])
        
        for line in lines {
            let stripped = line.trimmingCharacters(in: .whitespacesAndNewlines)
            let range = NSRange(location: 0, length: stripped.utf16.count)
            if bulletPrefixRegex.firstMatch(in: stripped, options: [], range: range) != nil {
                let bulletText = bulletPrefixRegex.stringByReplacingMatches(
                    in: stripped,
                    options: [],
                    range: range,
                    withTemplate: ""
                ).trimmingCharacters(in: .whitespacesAndNewlines)
                
                if isValidBulletText(bulletText) {
                    bullets.append(bulletText)
                }
            } else if looksLikeResumeActionLine(stripped) && isValidBulletText(stripped) {
                bullets.append(stripped)
            }
        }
        return bullets
    }
    
    static func isWeakBullet(_ bullet: String) -> Bool {
        let normalized = bullet.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if normalized.isEmpty || !isValidBulletText(bullet) {
            return false
        }
        
        let startsWithWeakStarter = weakBulletStarters.contains(where: { normalized.hasPrefix($0) })
        let isTooShort = normalized.components(separatedBy: .whitespaces).filter({ !$0.isEmpty }).count < 7
        return startsWithWeakStarter || isTooShort
    }
    
    static func isValidBulletText(_ value: String) -> Bool {
        let normalized = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        if normalized.count < 12 || normalized.count > 320 {
            return false
        }
        if hasRepetitiveNoise(normalized) {
            return false
        }
        
        guard let wordRegex = try? NSRegularExpression(pattern: #"[A-Za-z][A-Za-z+#./-]*"#, options: []) else { return false }
        let range = NSRange(location: 0, length: normalized.utf16.count)
        let matches = wordRegex.matches(in: normalized, options: [], range: range)
        let words = matches.map { result -> String in
            let r = Range(result.range, in: normalized)!
            return String(normalized[r])
        }
        
        if words.count < 3 {
            return false
        }
        
        let totalLength = words.reduce(0) { $0 + $1.count }
        let averageWordLength = Double(totalLength) / Double(words.count)
        return averageWordLength <= 18
    }
    
    /// Regexes that find the skill as a whole word, including its known spellings.
    private static func patterns(for keyword: String) -> [String] {
        let wholeWord = { (term: String) -> String in
            let escaped = NSRegularExpression.escapedPattern(for: term.lowercased())
                .replacingOccurrences(of: "\\ ", with: "\\s+")
            return "(?<![a-z0-9])\(escaped)(?![a-z0-9])"
        }
        return ([keyword] + (keywordVariants[keyword] ?? [])).map(wholeWord)
    }

    private static func keywordInText(_ keyword: String, textLower: String) -> Bool {
        if patterns(for: keyword).contains(where: { matchesPattern($0, in: textLower) }) {
            return true
        }
        
        if keyword == "api" {
            return matchesPattern("(?<![a-z0-9])apis?(?![a-z0-9])", in: textLower)
        }
        if keyword == "rest api" {
            return matchesPattern("(?<![a-z0-9])rest\\s+apis?(?![a-z0-9])", in: textLower)
        }
        if keyword == "postgresql" {
            return matchesPattern("(?<![a-z0-9])postgres(?:ql)?(?![a-z0-9])", in: textLower)
        }
        if keyword == "next.js" {
            return matchesPattern("(?<![a-z0-9])next[.\\s-]?js(?![a-z0-9])", in: textLower)
        }
        if keyword == "node.js" {
            return matchesPattern("(?<![a-z0-9])node[.\\s-]?js(?![a-z0-9])", in: textLower)
        }
        
        return false
    }
    
    private static func matchesPattern(_ pattern: String, in text: String) -> Bool {
        guard let regex = cachedRegex(pattern) else { return false }
        let range = NSRange(location: 0, length: text.utf16.count)
        return regex.firstMatch(in: text, options: [], range: range) != nil
    }
    
    private static func partialKeywordMatch(_ keyword: String, resumeLower: String) -> Bool {
        // Only multi-word skills can partially match; a single word inside another
        // ("excel" in "excellent", "java" in "javascript") is not the same skill.
        // They need a distinctive word, matched whole: "jetpack" for "jetpack compose".
        return keyword.components(separatedBy: CharacterSet(charactersIn: " /+-"))
            .filter { $0.count > 2 }
            .filter { !genericKeywordParts.contains($0) }
            .contains(where: { keywordInText($0, textLower: resumeLower) })
    }
    
    private static func canonicalizeKeyword(_ keyword: String) -> String {
        return canonicalKeywords[keyword] ?? keyword
    }
    
    private static func removeRedundantKeywords(_ keywords: Set<String>) -> Set<String> {
        var cleaned = keywords
        for (keyword, strongerMatches) in redundantKeywords {
            if cleaned.contains(keyword) {
                let hasStronger = !cleaned.intersection(strongerMatches).isEmpty
                if hasStronger {
                    cleaned.remove(keyword)
                }
            }
        }
        return cleaned
    }
    
    private static func hasRepetitiveNoise(_ value: String) -> Bool {
        let lowered = value.lowercased()
        guard let repeatRegex = try? NSRegularExpression(pattern: #"([a-z])\1{7,}"#, options: []) else { return false }
        let range = NSRange(location: 0, length: lowered.utf16.count)
        if repeatRegex.firstMatch(in: lowered, options: [], range: range) != nil {
            return true
        }
        
        let compact = lowered.replacingOccurrences(of: "[^a-z]", with: "", options: .regularExpression)
        if compact.count >= 40 {
            let uniqueChars = Set(compact)
            if uniqueChars.count <= 5 {
                return true
            }
        }
        return false
    }
    
    private static func looksLikeResumeActionLine(_ value: String) -> Bool {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if normalized.isEmpty || normalized.components(separatedBy: .whitespaces).filter({ !$0.isEmpty }).count < 5 {
            return false
        }
        if normalized.hasSuffix(":") {
            return false
        }
        return actionLineStarters.contains(where: { normalized.hasPrefix($0) })
    }
    
    private static func detectSections(in text: String) -> [String: Bool] {
        let lines = text.components(separatedBy: .newlines)
        let loweredLines = Set(lines.map {
            $0.trimmingCharacters(in: .whitespacesAndNewlines)
              .lowercased()
              .trimmingCharacters(in: CharacterSet(charactersIn: ":"))
        })
        
        var result: [String: Bool] = [:]
        for (section, aliases) in sectionAliases {
            result[section] = aliases.contains(where: { loweredLines.contains($0) })
        }
        return result
    }
    
    private static func detectLengthWarnings(in text: String) -> [String] {
        var warnings: [String] = []
        let words = text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        let wordCount = words.count

        if wordCount < 250 {
            warnings.append("Resume appears unusually short after extraction.")
        }
        if wordCount > 1200 {
            warnings.append("Resume appears long; consider tightening for ATS and recruiter scanning.")
        }
        return warnings
    }

    private static func detectFormattingWarnings(in text: String) -> [String] {
        var warnings: [String] = []
        if text.contains("\t") {
            warnings.append("Tabs were detected and may indicate table-like formatting.")
        }
        
        let longLines = text.components(separatedBy: .newlines).filter { $0.count > 140 }
        if longLines.count >= 5 {
            warnings.append("Several very long lines were detected, which may indicate layout extraction issues.")
        }
        
        return warnings
    }
    
    private static func calculatePercentage(numerator: Double, denominator: Int) -> Double {
        if denominator <= 0 {
            return 0.0
        }
        return max(0.0, min(100.0, (numerator / Double(denominator)) * 100.0))
    }
}
