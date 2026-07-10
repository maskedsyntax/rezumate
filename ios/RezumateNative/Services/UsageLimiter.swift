import Foundation

struct UsageSnapshot: Codable, Equatable {
    var dayKey: String
    var analysesUsed: Int
    var improvementsUsed: Int
}

enum UsageLimiter {
    static let freeDailyAnalyses = 3
    static let freeDailyImprovements = 3
    static let freeSavedVariants = 2

    private static let storageKey = "rezumate.usage.snapshot"

    static func loadSnapshot() -> UsageSnapshot {
        let today = currentDayKey()
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              var snapshot = try? JSONDecoder().decode(UsageSnapshot.self, from: data) else {
            return UsageSnapshot(dayKey: today, analysesUsed: 0, improvementsUsed: 0)
        }

        if snapshot.dayKey != today {
            snapshot = UsageSnapshot(dayKey: today, analysesUsed: 0, improvementsUsed: 0)
            saveSnapshot(snapshot)
        }

        return snapshot
    }

    static func recordAnalysis() -> UsageSnapshot {
        var snapshot = loadSnapshot()
        snapshot.analysesUsed += 1
        saveSnapshot(snapshot)
        return snapshot
    }

    static func recordImprovement() -> UsageSnapshot {
        var snapshot = loadSnapshot()
        snapshot.improvementsUsed += 1
        saveSnapshot(snapshot)
        return snapshot
    }

    static func remainingAnalyses(in snapshot: UsageSnapshot) -> Int {
        max(0, freeDailyAnalyses - snapshot.analysesUsed)
    }

    static func remainingImprovements(in snapshot: UsageSnapshot) -> Int {
        max(0, freeDailyImprovements - snapshot.improvementsUsed)
    }

    private static func saveSnapshot(_ snapshot: UsageSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private static func currentDayKey() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
