import Foundation
import UniformTypeIdentifiers

enum APIClientError: Error, LocalizedError {
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The server returned an invalid response."
        case .server(let message):
            return message
        }
    }
}

struct APIClient {
    func authenticateWithApple(identityToken: String, email: String?, fullName: String?) async throws -> AuthResponse {
        // Return a local guest user session instantly
        let user = AuthUser(id: UUID(), email: email ?? "local.user@rezumate.local", planTier: "free")
        return AuthResponse(success: true, token: "local-session-token", user: user)
    }

    func uploadResume(fileURL: URL, token: String) async throws -> UploadResponse {
        let data = try Data(contentsOf: fileURL)
        let result: ExtractionResult
        
        if fileURL.pathExtension.lowercased() == "docx" {
            result = DocxTextExtractor.extractText(from: data)
        } else {
            result = PDFTextExtractor.extractText(from: data)
        }
        
        guard result.status != "failed" else {
            throw APIClientError.server(result.warnings.first ?? "Failed to extract text from document.")
        }
        guard result.status != "empty" else {
            throw AnalysisInputError.resumeHasNoText
        }
        
        return UploadResponse(
            success: true,
            filename: fileURL.lastPathComponent,
            resumeId: UUID(),
            extractedText: result.text,
            warnings: result.warnings,
            characterCount: result.characterCount
        )
    }

    func analyzeResume(resumeId: UUID, resumeText: String, jobDescription: String, token: String, shouldSave: Bool = true) async throws -> AnalyzeResponse {
        let validatedResume = try AnalysisInputValidator.validatedResumeText(resumeText)
        let validatedJobDescription = try AnalysisInputValidator.validatedJobDescription(jobDescription)
        let result = ATSScoringService.analyzeResume(resumeText: validatedResume, jobDescription: validatedJobDescription)
        let variantId = UUID()
        let fit = JobFitExtractor.extract(jobDescription: validatedJobDescription, resumeText: validatedResume)
        let variantName = Self.variantName(jobTitle: fit.jobTitle)

        let localVariant = LocalVariant(
            id: variantId,
            resumeId: resumeId,
            variantName: variantName,
            tailoredContent: validatedResume,
            atsScore: result.score,
            analysisFeedback: result,
            createdAt: Date(),
            updatedAt: Date(),
            jobDescription: validatedJobDescription
        )
        
        if shouldSave {
            LocalStorageManager.shared.saveVariant(localVariant)
        } else {
            LocalStorageManager.shared.saveTransientVariant(localVariant)
        }
        
        return AnalyzeResponse.from(variant: localVariant)
    }

    func rewriteBullet(_ bullet: String, focusKeywords: [String], token: String) async throws -> RewriteBulletResponse {
        let rewrites = try await LocalAIService.shared.rewriteBullet(bullet, focusKeywords: focusKeywords)
        return RewriteBulletResponse(
            success: true,
            originalBullet: bullet,
            rewrittenBullets: rewrites,
            aiModelName: "Local Suggestion Engine"
        )
    }

    func history(token: String) async throws -> [VariantSummary] {
        let list = LocalStorageManager.shared.loadHistory()
        return list.map { v in
            VariantSummary(
                id: v.id,
                resumeId: v.resumeId,
                variantName: v.variantName,
                atsScore: v.atsScore,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt
            )
        }
    }

    func variant(id: UUID, token: String) async throws -> VariantDetail {
        guard let v = LocalStorageManager.shared.loadVariant(id: id) else {
            throw APIClientError.server("Variant not found.")
        }
        return VariantDetail(
            id: v.id,
            resumeId: v.resumeId,
            variantName: v.variantName,
            tailoredContent: TailoredContent(rawText: v.tailoredContent),
            atsScore: v.atsScore,
            createdAt: v.createdAt
        )
    }

    func analysisResult(id: UUID, token: String) async throws -> AnalyzeResponse {
        guard let v = LocalStorageManager.shared.loadVariant(id: id) else {
            throw APIClientError.server("Variant not found.")
        }
        return AnalyzeResponse.from(variant: v)
    }

    func acceptRewrite(variantId: UUID, originalBullet: String, rewrittenBullet: String, token: String) async throws -> AcceptRewriteResponse {
        guard var v = LocalStorageManager.shared.loadVariant(id: variantId) else {
            throw APIClientError.server("Variant not found.")
        }
        
        let text = v.tailoredContent
        guard text.contains(originalBullet) else {
            throw APIClientError.server("Original bullet not found in resume.")
        }
        
        let updatedText = text.replacingOccurrences(of: originalBullet, with: rewrittenBullet)
        v.tailoredContent = updatedText
        
        let result = ATSScoringService.analyzeResume(
            resumeText: updatedText,
            jobDescription: v.scoringJobDescription
        )
        v.atsScore = result.score
        v.analysisFeedback = result
        v.updatedAt = Date()
        
        LocalStorageManager.shared.updateVariant(v)
        
        return AcceptRewriteResponse(success: true, variantId: v.id, updatedResumeText: updatedText)
    }

    func improveResume(variantId: UUID, token: String) async throws -> ImproveResumeResponse {
        guard var variant = LocalStorageManager.shared.loadVariant(id: variantId) else {
            throw APIClientError.server("Variant not found.")
        }

        let feedback = variant.analysisFeedback
        let originalScore = variant.atsScore
        let originalComponents = feedback.componentScores
        let weakPoints = uniqueItems(feedback.weakBullets + feedback.bulletsWithoutMeasurableImpact)
        let optimizedText = try await LocalAIService.shared.improveResume(
            variant.tailoredContent,
            weakBullets: weakPoints,
            focusKeywords: []
        )

        variant.tailoredContent = optimizedText
        let updatedFeedback = ATSScoringService.analyzeResume(
            resumeText: optimizedText,
            jobDescription: variant.scoringJobDescription
        )
        variant.atsScore = updatedFeedback.score
        variant.analysisFeedback = updatedFeedback
        variant.updatedAt = Date()
        LocalStorageManager.shared.updateVariant(variant)

        let updatedAnalysis = AnalyzeResponse.from(variant: variant)

        return ImproveResumeResponse(
            success: true,
            variantId: variant.id,
            optimizedResumeText: optimizedText,
            updatedAnalysis: updatedAnalysis,
            originalScore: originalScore,
            componentDeltas: componentDeltas(from: originalComponents, to: updatedFeedback.componentScores),
            changedBullets: weakPoints.filter { !optimizedText.contains($0) },
            remainingBulletsWithoutMeasurableImpact: updatedFeedback.bulletsWithoutMeasurableImpactCount
        )
    }

    func placeKeyword(
        variantId: UUID,
        keyword: String,
        alsoInBullet: String?,
        token: String
    ) async throws -> TailoringResponse {
        guard var variant = LocalStorageManager.shared.loadVariant(id: variantId) else {
            throw APIClientError.server("Variant not found.")
        }

        let originalScore = variant.atsScore
        var updatedText = try ResumeTailoringService.placeInSkills(
            keyword: keyword,
            in: variant.tailoredContent
        )
        if let alsoInBullet, !alsoInBullet.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            updatedText = try ResumeTailoringService.placeInBullet(
                keyword: keyword,
                bullet: alsoInBullet,
                in: updatedText
            )
        }

        variant = rescore(variant, resumeText: updatedText)
        LocalStorageManager.shared.updateVariant(variant)

        return TailoringResponse(
            success: true,
            variantId: variant.id,
            updatedResumeText: updatedText,
            updatedAnalysis: AnalyzeResponse.from(variant: variant),
            originalScore: originalScore,
            placedKeyword: keyword
        )
    }

    func replaceTailoredContent(
        variantId: UUID,
        resumeText: String,
        token: String
    ) async throws -> AnalyzeResponse {
        guard var variant = LocalStorageManager.shared.loadVariant(id: variantId) else {
            throw APIClientError.server("Variant not found.")
        }
        variant = rescore(variant, resumeText: resumeText)
        LocalStorageManager.shared.updateVariant(variant)
        return AnalyzeResponse.from(variant: variant)
    }

    func exportVariant(id: UUID, token: String) async throws -> ExportArtifact {
        guard let v = LocalStorageManager.shared.loadVariant(id: id) else {
            throw APIClientError.server("Variant not found.")
        }
        return try PDFExportService.prepare(textContent: v.tailoredContent, variantId: id)
    }

    private func rescore(_ variant: LocalVariant, resumeText: String) -> LocalVariant {
        var updated = variant
        let result = ATSScoringService.analyzeResume(
            resumeText: resumeText,
            jobDescription: variant.scoringJobDescription
        )
        updated.tailoredContent = resumeText
        updated.atsScore = result.score
        updated.analysisFeedback = result
        updated.updatedAt = Date()
        return updated
    }

    private static func variantName(jobTitle: String?) -> String {
        if let jobTitle, !jobTitle.isEmpty {
            return String(jobTitle.prefix(48))
        }
        return "Analysis \(Date().formatted(date: .abbreviated, time: .shortened))"
    }

    private func uniqueItems(_ values: [String]) -> [String] {
        var seen: Set<String> = []
        var result: [String] = []
        for value in values {
            if seen.insert(value).inserted {
                result.append(value)
            }
        }
        return result
    }

    private func componentDeltas(from old: [String: Int], to new: [String: Int]) -> [String: Int] {
        var deltas: [String: Int] = [:]
        for key in Set(old.keys).union(new.keys) {
            deltas[key] = (new[key] ?? 0) - (old[key] ?? 0)
        }
        return deltas
    }
}
