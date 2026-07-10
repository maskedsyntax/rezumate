import Foundation

final class LocalAIService {
    static let shared = LocalAIService()

    private init() {}

    // MARK: - Public

    func rewriteBullet(_ bullet: String, focusKeywords: [String]) async throws -> [String] {
        generateBulletVariants(bullet: bullet, focusKeywords: focusKeywords)
    }

    func improveResume(_ resumeText: String, weakBullets: [String], focusKeywords: [String]) async throws -> String {
        var text = resumeText

        // Step 1 - inject missing keywords into the skills section.
        // keyword_coverage is 45% of the ATS score; this is the highest-leverage move.
        text = injectKeywordsIntoSkillsSection(text, keywords: focusKeywords)

        // Step 2 - strengthen weak bullets without inventing metrics or experience.
        let unique = uniqued(weakBullets)
        for bullet in unique {
            guard text.contains(bullet) else { continue }
            let improved = strengthenBullet(bullet, keywords: focusKeywords)
            text = text.replacingOccurrences(of: bullet, with: improved)
        }

        return text
    }

    // MARK: - Keyword injection

    private func injectKeywordsIntoSkillsSection(_ text: String, keywords: [String]) -> String {
        guard !keywords.isEmpty else { return text }

        var lines = text.components(separatedBy: "\n")
        let skillsHeaders: Set<String> = [
            "skills", "technical skills", "technologies",
            "core competencies", "technical competencies"
        ]

        var inSkills = false
        var lastContentLineIdx: Int? = nil

        for (i, line) in lines.enumerated() {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            let lower   = trimmed.lowercased()

            if !inSkills {
                if skillsHeaders.contains(lower) || skillsHeaders.contains(where: {
                    lower.hasPrefix($0) && lower.count <= $0.count + 3
                }) {
                    inSkills = true
                }
            } else {
                if trimmed.isEmpty { continue }

                // A short all-uppercase line after the skills header means a new section started
                let letters = trimmed.filter(\.isLetter)
                let allCaps = !letters.isEmpty && letters.allSatisfy(\.isUppercase)
                if allCaps && trimmed.count >= 3 && trimmed.count <= 35 {
                    break
                }
                lastContentLineIdx = i
            }
        }

        let injected = "Additional Technologies: " + keywords.map(displayKeyword).joined(separator: ", ")

        if let idx = lastContentLineIdx {
            lines.insert(injected, at: idx + 1)
        } else if inSkills {
            lines.append(injected)
        } else {
            lines += ["", "SKILLS", injected]
        }

        return lines.joined(separator: "\n")
    }

    // MARK: - Bullet strengthening

    private func strengthenBullet(_ bullet: String, keywords: [String]) -> String {
        var b = bullet.trimmingCharacters(in: .whitespaces)
        while let f = b.first, "•·-*".contains(f) {
            b = String(b.dropFirst()).trimmingCharacters(in: .whitespaces)
        }

        // Upgrade passive / weak verb at the start
        let upgrades: [(from: String, to: String)] = [
            ("worked on", "Engineered"),
            ("helped with", "Contributed to"),
            ("responsible for", "Led"),
            ("involved in", "Built"),
            ("assisted with", "Enhanced"),
            ("handled", "Managed"),
            ("participated in", "Delivered"),
            ("did", "Executed"),
            ("made", "Produced"),
        ]
        let bLower = b.lowercased()
        for (weak, strong) in upgrades {
            if bLower.hasPrefix(weak) {
                b = strong + b.dropFirst(weak.count)
                break
            }
        }

        return b
    }

    // MARK: - Bottom-sheet bullet variants

    private func generateBulletVariants(bullet: String, focusKeywords: [String]) -> [String] {
        var b = bullet.trimmingCharacters(in: .whitespacesAndNewlines)
        while b.hasPrefix("•") || b.hasPrefix("-") || b.hasPrefix("*") {
            b = String(b.dropFirst()).trimmingCharacters(in: .whitespacesAndNewlines)
        }

        let words    = b.components(separatedBy: .whitespaces)
        let firstWord = words.first ?? ""
        let rest     = words.dropFirst().joined(separator: " ")

        let replaceable = ["shipped","built","created","developed","designed",
                           "implemented","optimized","integrated","launched",
                           "led","maintained","managed","worked"]

        let base = replaceable.contains(firstWord.lowercased()) && !rest.isEmpty ? rest : b

        let keywordContext = focusKeywords.prefix(2).map(displayKeyword).joined(separator: " and ")
        let keywordPhrase = keywordContext.isEmpty ? "" : " with relevant \(keywordContext) context"

        return [
            "Engineered \(base)\(keywordPhrase), clarifying scope, implementation details, and user impact",
            "Built and shipped \(base)\(keywordPhrase), emphasizing ownership, delivery, and technical depth",
            "Delivered \(base)\(keywordPhrase), connecting the work to reliability, usability, or business outcomes",
        ]
    }

    // MARK: - Helpers

    private func uniqued(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { seen.insert($0).inserted }
    }

    private func displayKeyword(_ keyword: String) -> String {
        let normalized = keyword.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let displayNames: [String: String] = [
            "api": "API",
            "rest api": "REST API",
            "ci/cd": "CI/CD",
            "css": "CSS",
            "html": "HTML",
            "json": "JSON",
            "ui": "UI",
            "ml": "ML",
            "ai": "AI",
            "llm": "LLM",
            "nlp": "NLP",
            "aws": "AWS",
            "gcp": "GCP",
            "sql": "SQL",
            "nosql": "NoSQL",
            "graphql": "GraphQL",
            "next.js": "Next.js",
            "node.js": "Node.js",
            "tailwind css": "Tailwind CSS",
            "pytorch": "PyTorch",
            "tensorflow": "TensorFlow",
            "scikit-learn": "scikit-learn"
        ]
        if let display = displayNames[normalized] {
            return display
        }
        return normalized
            .split(separator: " ")
            .map { part in part.prefix(1).uppercased() + String(part.dropFirst()) }
            .joined(separator: " ")
    }
}
