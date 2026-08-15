import Foundation

enum AnalysisInputError: Error, LocalizedError, Equatable {
    case resumeHasNoText
    case jobDescriptionTooShort
    case jobDescriptionTooLong
    case noSupportedKeywords

    var errorDescription: String? {
        switch self {
        case .resumeHasNoText:
            return "No extractable resume text was found. Use a text-based PDF or DOCX file."
        case .jobDescriptionTooShort:
            return "Paste a fuller job description (at least 120 characters) so Rezumate can produce a meaningful comparison."
        case .jobDescriptionTooLong:
            return "Job descriptions can contain up to 5,000 characters. Shorten this one before analyzing."
        case .noSupportedKeywords:
            return "Rezumate could not identify supported skills or tools in this job description. Paste the complete role description and try again."
        }
    }
}

struct AnalysisInputValidator {
    static let minimumJobDescriptionCharacters = 120
    static let maximumJobDescriptionCharacters = 5_000

    static func validatedResumeText(_ value: String) throws -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw AnalysisInputError.resumeHasNoText }
        return trimmed
    }

    static func validatedJobDescription(_ value: String) throws -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= minimumJobDescriptionCharacters else {
            throw AnalysisInputError.jobDescriptionTooShort
        }
        guard trimmed.count <= maximumJobDescriptionCharacters else {
            throw AnalysisInputError.jobDescriptionTooLong
        }
        guard !ATSScoringService.extractKeywords(from: trimmed).isEmpty else {
            throw AnalysisInputError.noSupportedKeywords
        }
        return trimmed
    }
}
