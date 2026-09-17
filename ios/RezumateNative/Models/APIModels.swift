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
    let partialMatches: [String]
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
    let jobTitle: String?
    let jobTitleMatched: Bool
    let educationRequirement: String?
    let educationMatched: Bool

    enum CodingKeys: String, CodingKey {
        case success
        case variantId = "variant_id"
        case score
        case matchedKeywords = "matched_keywords"
        case missingKeywords = "missing_keywords"
        case partialMatches = "partial_matches"
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
        case jobTitle = "job_title"
        case jobTitleMatched = "job_title_matched"
        case educationRequirement = "education_requirement"
        case educationMatched = "education_matched"
    }

    init(
        success: Bool,
        variantId: UUID,
        score: Int,
        matchedKeywords: [String],
        missingKeywords: [String],
        partialMatches: [String] = [],
        weakBullets: [String],
        bulletsWithoutMeasurableImpact: [String],
        bulletsWithoutMeasurableImpactCount: Int,
        formattingWarnings: [String],
        componentScores: [String: Int],
        analysisStatus: String?,
        aiModelName: String?,
        bulletCount: Int,
        keywordCoverage: Int,
        sections: [String: Bool],
        jobTitle: String? = nil,
        jobTitleMatched: Bool = false,
        educationRequirement: String? = nil,
        educationMatched: Bool = false
    ) {
        self.success = success
        self.variantId = variantId
        self.score = score
        self.matchedKeywords = matchedKeywords
        self.missingKeywords = missingKeywords
        self.partialMatches = partialMatches
        self.weakBullets = weakBullets
        self.bulletsWithoutMeasurableImpact = bulletsWithoutMeasurableImpact
        self.bulletsWithoutMeasurableImpactCount = bulletsWithoutMeasurableImpactCount
        self.formattingWarnings = formattingWarnings
        self.componentScores = componentScores
        self.analysisStatus = analysisStatus
        self.aiModelName = aiModelName
        self.bulletCount = bulletCount
        self.keywordCoverage = keywordCoverage
        self.sections = sections
        self.jobTitle = jobTitle
        self.jobTitleMatched = jobTitleMatched
        self.educationRequirement = educationRequirement
        self.educationMatched = educationMatched
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        success = try container.decode(Bool.self, forKey: .success)
        variantId = try container.decode(UUID.self, forKey: .variantId)
        score = try container.decode(Int.self, forKey: .score)
        matchedKeywords = try container.decode([String].self, forKey: .matchedKeywords)
        missingKeywords = try container.decode([String].self, forKey: .missingKeywords)
        partialMatches = try container.decodeIfPresent([String].self, forKey: .partialMatches) ?? []
        weakBullets = try container.decode([String].self, forKey: .weakBullets)
        bulletsWithoutMeasurableImpact = try container.decode([String].self, forKey: .bulletsWithoutMeasurableImpact)
        bulletsWithoutMeasurableImpactCount = try container.decode(Int.self, forKey: .bulletsWithoutMeasurableImpactCount)
        formattingWarnings = try container.decode([String].self, forKey: .formattingWarnings)
        componentScores = try container.decode([String: Int].self, forKey: .componentScores)
        analysisStatus = try container.decodeIfPresent(String.self, forKey: .analysisStatus)
        aiModelName = try container.decodeIfPresent(String.self, forKey: .aiModelName)
        bulletCount = try container.decode(Int.self, forKey: .bulletCount)
        keywordCoverage = try container.decode(Int.self, forKey: .keywordCoverage)
        sections = try container.decode([String: Bool].self, forKey: .sections)
        jobTitle = try container.decodeIfPresent(String.self, forKey: .jobTitle)
        jobTitleMatched = try container.decodeIfPresent(Bool.self, forKey: .jobTitleMatched) ?? false
        educationRequirement = try container.decodeIfPresent(String.self, forKey: .educationRequirement)
        educationMatched = try container.decodeIfPresent(Bool.self, forKey: .educationMatched) ?? false
    }

    static func from(variant: LocalVariant, analysisStatus: String = "complete") -> AnalyzeResponse {
        let result = variant.analysisFeedback
        let fit = JobFitExtractor.extract(
            jobDescription: variant.scoringJobDescription,
            resumeText: variant.tailoredContent
        )
        return AnalyzeResponse(
            success: true,
            variantId: variant.id,
            score: variant.atsScore,
            matchedKeywords: result.matchedKeywords,
            missingKeywords: result.missingKeywords,
            partialMatches: result.partialMatches,
            weakBullets: result.weakBullets,
            bulletsWithoutMeasurableImpact: result.bulletsWithoutMeasurableImpact,
            bulletsWithoutMeasurableImpactCount: result.bulletsWithoutMeasurableImpactCount,
            formattingWarnings: result.formattingWarnings,
            componentScores: result.componentScores,
            analysisStatus: analysisStatus,
            aiModelName: "Local Suggestion Engine",
            bulletCount: result.bulletCount,
            keywordCoverage: result.keywordCoverage,
            sections: result.sections,
            jobTitle: fit.jobTitle,
            jobTitleMatched: fit.jobTitleMatched,
            educationRequirement: fit.educationRequirement,
            educationMatched: fit.educationMatched
        )
    }
}

struct TailoringResponse: Equatable {
    let success: Bool
    let variantId: UUID
    let updatedResumeText: String
    let updatedAnalysis: AnalyzeResponse
    let originalScore: Int
    let placedKeyword: String
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
