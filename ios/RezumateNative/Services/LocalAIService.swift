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

        // Only strengthen wording already present in the resume. Missing job-description
        // keywords remain recommendations and are never inserted automatically.
        let unique = uniqued(weakBullets)
        for bullet in unique {
            guard text.contains(bullet) else { continue }
            let improved = strengthenBullet(bullet)
            text = text.replacingOccurrences(of: bullet, with: improved)
        }

        return text
    }

    // MARK: - Bullet strengthening

    private func strengthenBullet(_ bullet: String) -> String {
        var b = bullet.trimmingCharacters(in: .whitespaces)
        while let f = b.first, "•·-*".contains(f) {
            b = String(b.dropFirst()).trimmingCharacters(in: .whitespaces)
        }

        // Upgrade passive / weak verb at the start
        let upgrades: [(from: String, to: String)] = [
            ("worked on", "Contributed to"),
            ("helped with", "Contributed to"),
            ("involved in", "Contributed to"),
            ("assisted with", "Contributed to"),
            ("handled", "Managed"),
            ("participated in", "Contributed to"),
            ("did", "Executed"),
            ("made", "Created"),
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

        return uniqued([strengthenBullet(b), b])
    }

    // MARK: - Helpers

    private func uniqued(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { seen.insert($0).inserted }
    }

}
