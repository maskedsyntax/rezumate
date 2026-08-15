import Foundation

struct ReviewPromptTracker {
    private enum Key {
        static let successfulAnalyses = "rezumate.review.successful-analyses"
        static let successfulExports = "rezumate.review.successful-exports"
        static let lastPromptedVersion = "rezumate.review.last-prompted-version"
    }

    static func recordSuccessfulAnalysis(defaults: UserDefaults = .standard) {
        defaults.set(defaults.integer(forKey: Key.successfulAnalyses) + 1, forKey: Key.successfulAnalyses)
    }

    static func recordSuccessfulExport(defaults: UserDefaults = .standard) {
        defaults.set(defaults.integer(forKey: Key.successfulExports) + 1, forKey: Key.successfulExports)
    }

    static func isEligible(
        marketingVersion: String,
        defaults: UserDefaults = .standard
    ) -> Bool {
        defaults.integer(forKey: Key.successfulAnalyses) >= 2
            && defaults.integer(forKey: Key.successfulExports) >= 1
            && defaults.string(forKey: Key.lastPromptedVersion) != marketingVersion
    }

    static func markPrompted(
        marketingVersion: String,
        defaults: UserDefaults = .standard
    ) {
        defaults.set(marketingVersion, forKey: Key.lastPromptedVersion)
    }
}
