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
    
    static let scoreVersion = "ats-v2"
    
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
        "tailwind", "tailwind css", "node", "apis"
    ]
    
    static let canonicalKeywords: [String: String] = [
        "apis": "api",
        "api": "api",
        "nextjs": "next.js",
        "next.js": "next.js",
        "node": "node.js",
        "node.js": "node.js",
        "rest": "rest api",
        "rest api": "rest api",
        "rest apis": "rest api",
        "tailwind": "tailwind css",
        "tailwind css": "tailwind css"
    ]
    
    static let redundantKeywords: [String: Set<String>] = [
        "api": ["rest api", "graphql", "fastapi"]
    ]
    
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
    
    static func analyzeResume(resumeText: String, jobDescription: String) -> ATSAnalysisResult {
        let jdKeywords = extractKeywords(from: jobDescription)
        let resumeLower = resumeText.lowercased()
        
        var matchedKeywords: [String] = []
        var missingKeywords: [String] = []
        var partialMatches: [String] = []
        
        for keyword in jdKeywords {
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
        
        let keywordCoverage = calculatePercentage(
            numerator: Double(matchedKeywords.count) + (0.5 * Double(partialMatches.count)),
            denominator: jdKeywords.count
        )
        
        let impactQuality = calculatePercentage(
            numerator: Double(bullets.count - bulletsWithoutImpact.count),
            denominator: bullets.count
        )
        
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
            formattingWarnings: formattingWarnings,
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
        let textLower = text.lowercased()
        var found: Set<String> = []
        
        for skill in knownSkills {
            if !keywordNoise.contains(skill) && keywordInText(skill, textLower: textLower) {
                found.insert(canonicalizeKeyword(skill))
            }
        }
        
        return removeRedundantKeywords(found).sorted()
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
    
    private static func keywordInText(_ keyword: String, textLower: String) -> Bool {
        let escaped = NSRegularExpression.escapedPattern(for: keyword.lowercased())
            .replacingOccurrences(of: "\\ ", with: "\\s+")
        let pattern = "(?<![a-z0-9])\(escaped)(?![a-z0-9])"
        
        if matchesPattern(pattern, in: textLower) {
            return true
        }
        
        if keyword == "api" {
            return matchesPattern("(?<![a-z0-9])apis?(?![a-z0-9])", in: textLower)
        }
        if keyword == "rest api" {
            return matchesPattern("(?<![a-z0-9])rest\\s+apis?(?![a-z0-9])", in: textLower)
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
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return false }
        let range = NSRange(location: 0, length: text.utf16.count)
        return regex.firstMatch(in: text, options: [], range: range) != nil
    }
    
    private static func partialKeywordMatch(_ keyword: String, resumeLower: String) -> Bool {
        let parts = keyword.components(separatedBy: CharacterSet(charactersIn: " /+-"))
            .filter { $0.count > 2 }
        return !parts.isEmpty && parts.contains(where: { resumeLower.contains($0) })
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
    
    private static func detectFormattingWarnings(in text: String) -> [String] {
        var warnings: [String] = []
        let words = text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        let wordCount = words.count
        
        if wordCount < 250 {
            warnings.append("Resume appears unusually short after extraction.")
        }
        if wordCount > 1200 {
            warnings.append("Resume appears long; consider tightening for ATS and recruiter scanning.")
        }
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
