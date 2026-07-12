import Foundation

struct AuthSession: Codable, Equatable {
    let token: String
    let user: AuthUser?
}

struct AuthUser: Codable, Equatable {
    let id: UUID
    let email: String
    let planTier: String

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case planTier = "plan_tier"
    }
}

struct AppleAuthRequest: Encodable {
    let identityToken: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case identityToken = "identity_token"
        case email
        case fullName = "full_name"
    }
}

struct AuthResponse: Decodable {
    let success: Bool
    let token: String
    let user: AuthUser
}

struct UploadResponse: Codable, Equatable {
    let success: Bool
    let filename: String
    let resumeId: UUID
    let extractedText: String
    let warnings: [String]
    let characterCount: Int

    enum CodingKeys: String, CodingKey {
        case success
        case filename
        case resumeId = "resume_id"
        case extractedText = "extracted_text"
        case warnings
        case characterCount = "character_count"
    }
}

struct AnalyzeRequest: Encodable {
    let resumeId: UUID
    let resumeText: String
    let jobDescription: String

    enum CodingKeys: String, CodingKey {
        case resumeId = "resume_id"
        case resumeText = "resume_text"
        case jobDescription = "job_description"
    }
}

struct AnalyzeResponse: Codable, Equatable, Hashable {
    let success: Bool
    let variantId: UUID
    let score: Int
    let matchedKeywords: [String]
    let missingKeywords: [String]
    let weakBullets: [String]
    let bulletsWithoutMeasurableImpact: [String]
    let bulletsWithoutMeasurableImpactCount: Int
    let formattingWarnings: [String]
    let componentScores: [String: Int]
    let analysisStatus: String?
    let aiModelName: String?
    let bulletCount: Int
    let keywordCoverage: Int
    let sections: [String: Bool]

    enum CodingKeys: String, CodingKey {
        case success
        case variantId = "variant_id"
        case score
        case matchedKeywords = "matched_keywords"
        case missingKeywords = "missing_keywords"
        case weakBullets = "weak_bullets"
        case bulletsWithoutMeasurableImpact = "bullets_without_measurable_impact"
        case bulletsWithoutMeasurableImpactCount = "bullets_without_measurable_impact_count"
        case formattingWarnings = "formatting_warnings"
        case componentScores = "component_scores"
        case analysisStatus = "analysis_status"
        case aiModelName = "ai_model_name"
        case bulletCount = "bullet_count"
        case keywordCoverage = "keyword_coverage"
        case sections
    }
}

struct RewriteBulletRequest: Encodable {
    let originalBullet: String
    let focusKeywords: [String]

    enum CodingKeys: String, CodingKey {
        case originalBullet = "original_bullet"
        case focusKeywords = "focus_keywords"
    }
}

struct RewriteBulletResponse: Decodable, Equatable {
    let success: Bool
    let originalBullet: String
    let rewrittenBullets: [String]
    let aiModelName: String

    enum CodingKeys: String, CodingKey {
        case success
        case originalBullet = "original_bullet"
        case rewrittenBullets = "rewritten_bullets"
        case aiModelName = "ai_model_name"
    }
}

struct HistoryResponse: Decodable {
    let success: Bool
    let variants: [VariantSummary]
}

struct VariantSummary: Decodable, Identifiable, Equatable {
    let id: UUID
    let resumeId: UUID
    let variantName: String
    let atsScore: Int?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case resumeId = "resume_id"
        case variantName = "variant_name"
        case atsScore = "ats_score"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct VariantDetailEnvelope: Decodable {
    let success: Bool
    let variant: VariantDetail
}

struct VariantDetail: Decodable, Equatable, Hashable {
    let id: UUID
    let resumeId: UUID
    let variantName: String
    let tailoredContent: TailoredContent
    let atsScore: Int?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case resumeId = "resume_id"
        case variantName = "variant_name"
        case tailoredContent = "tailored_content"
        case atsScore = "ats_score"
        case createdAt = "created_at"
    }
}

struct TailoredContent: Decodable, Equatable, Hashable {
    let rawText: String?

    enum CodingKeys: String, CodingKey {
        case rawText = "raw_text"
    }
}

struct APIErrorPayload: Decodable {
    let detail: String
}

struct AcceptRewriteResponse: Decodable {
    let success: Bool
    let variantId: UUID
    let updatedResumeText: String
}

struct ImproveResumeResponse: Decodable {
    let success: Bool
    let variantId: UUID
    let optimizedResumeText: String
    let updatedAnalysis: AnalyzeResponse
    let originalScore: Int
    let componentDeltas: [String: Int]
    let changedBullets: [String]
    let remainingBulletsWithoutMeasurableImpact: Int
}
