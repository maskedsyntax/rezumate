import Foundation

struct LocalVariant: Codable, Identifiable, Equatable {
    var id: UUID
    var resumeId: UUID
    var variantName: String
    var tailoredContent: String
    var atsScore: Int
    var analysisFeedback: ATSAnalysisResult
    var createdAt: Date
    var updatedAt: Date
    var jobDescription: String = ""

    var scoringJobDescription: String {
        jobDescription.isEmpty
            ? analysisFeedback.jdKeywords.joined(separator: " ")
            : jobDescription
    }

    enum CodingKeys: String, CodingKey {
        case id
        case resumeId
        case variantName
        case tailoredContent
        case atsScore
        case analysisFeedback
        case createdAt
        case updatedAt
        case jobDescription
    }

    init(
        id: UUID,
        resumeId: UUID,
        variantName: String,
        tailoredContent: String,
        atsScore: Int,
        analysisFeedback: ATSAnalysisResult,
        createdAt: Date,
        updatedAt: Date,
        jobDescription: String = ""
    ) {
        self.id = id
        self.resumeId = resumeId
        self.variantName = variantName
        self.tailoredContent = tailoredContent
        self.atsScore = atsScore
        self.analysisFeedback = analysisFeedback
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.jobDescription = jobDescription
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        resumeId = try container.decode(UUID.self, forKey: .resumeId)
        variantName = try container.decode(String.self, forKey: .variantName)
        tailoredContent = try container.decode(String.self, forKey: .tailoredContent)
        atsScore = try container.decode(Int.self, forKey: .atsScore)
        analysisFeedback = try container.decode(ATSAnalysisResult.self, forKey: .analysisFeedback)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        jobDescription = try container.decodeIfPresent(String.self, forKey: .jobDescription) ?? ""
    }
}

class LocalStorageManager {
    static let shared = LocalStorageManager()
    
    private let fileManager = FileManager.default
    private var transientVariants: [UUID: LocalVariant] = [:]

    private var historyURL: URL {
        let paths = fileManager.urls(for: .documentDirectory, in: .userDomainMask)
        return paths[0].appendingPathComponent("rezumate_history.json")
    }
    
    func saveVariant(_ variant: LocalVariant) {
        var currentHistory = loadHistory()
        if let idx = currentHistory.firstIndex(where: { $0.id == variant.id }) {
            currentHistory[idx] = variant
        } else {
            currentHistory.insert(variant, at: 0)
        }
        saveHistory(currentHistory)
    }

    func saveTransientVariant(_ variant: LocalVariant) {
        transientVariants[variant.id] = variant
    }

    func loadVariant(id: UUID) -> LocalVariant? {
        if let transient = transientVariants[id] {
            return transient
        }
        return loadHistory().first(where: { $0.id == id })
    }

    func updateVariant(_ variant: LocalVariant) {
        if transientVariants[variant.id] != nil {
            transientVariants[variant.id] = variant
        } else {
            saveVariant(variant)
        }
    }

    func clearTransientVariants() {
        transientVariants.removeAll()
    }
    
    func loadHistory() -> [LocalVariant] {
        guard fileManager.fileExists(atPath: historyURL.path) else { return [] }
        do {
            let data = try Data(contentsOf: historyURL)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode([LocalVariant].self, from: data)
        } catch {
            print("Failed to load history: \(error)")
            return []
        }
    }
    
    func deleteVariant(id: UUID) {
        var currentHistory = loadHistory()
        currentHistory.removeAll(where: { $0.id == id })
        saveHistory(currentHistory)
    }
    
    private func saveHistory(_ history: [LocalVariant]) {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(history)
            try data.write(to: historyURL, options: .atomic)
        } catch {
            print("Failed to save history: \(error)")
        }
    }
}
