import PDFKit
import XCTest
@testable import RezumateNative

final class AnalysisInputValidatorTests: XCTestCase {
    func testRejectsBlankResumeText() {
        XCTAssertThrowsError(try AnalysisInputValidator.validatedResumeText(" \n ")) { error in
            XCTAssertEqual(error as? AnalysisInputError, .resumeHasNoText)
        }
    }

    func testRejectsShortJobDescription() {
        XCTAssertThrowsError(try AnalysisInputValidator.validatedJobDescription("Python role")) { error in
            XCTAssertEqual(error as? AnalysisInputError, .jobDescriptionTooShort)
        }
    }

    func testRejectsLongJobDescription() {
        let description = String(repeating: "Python ", count: 800)
        XCTAssertThrowsError(try AnalysisInputValidator.validatedJobDescription(description)) { error in
            XCTAssertEqual(error as? AnalysisInputError, .jobDescriptionTooLong)
        }
    }

    func testRejectsDescriptionWithoutSupportedKeywords() {
        let description = String(
            repeating: "Coordinate partners and communicate clearly across multiple teams and business functions. ",
            count: 3
        )
        XCTAssertThrowsError(try AnalysisInputValidator.validatedJobDescription(description)) { error in
            XCTAssertEqual(error as? AnalysisInputError, .noSupportedKeywords)
        }
    }

    func testAcceptsCompleteDescriptionWithSupportedKeywords() throws {
        let description = "Build accessible web applications with React and TypeScript. Work with product and design partners, review code, improve quality, and ship reliable customer experiences across the frontend platform."
        XCTAssertEqual(try AnalysisInputValidator.validatedJobDescription(description), description)
    }
}

final class ATSScoringServiceTests: XCTestCase {
    func testZeroKeywordCoverageIsZero() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "Alex Doe\nEXPERIENCE\nAcme\nEngineer\n• Built internal reporting workflows",
            jobDescription: "Seeking Python, Kubernetes, and Terraform experience for production infrastructure."
        )

        XCTAssertEqual(result.scoreVersion, "ats-v3")
        XCTAssertEqual(result.keywordCoverage, 0)
        XCTAssertTrue(result.matchedKeywords.isEmpty)
        XCTAssertEqual(Set(result.missingKeywords), Set(["kubernetes", "python", "terraform"]))
    }

    func testStrongWordingEarnsPartialImpactCredit() {
        let resume = { (bullet: String) in "EXPERIENCE\nAcme\nEngineer\n- \(bullet)" }
        let jd = "Python role"
        let weak = ATSScoringService.analyzeResume(resumeText: resume("Helped with REST API integrations for the iOS team"), jobDescription: jd)
        let strong = ATSScoringService.analyzeResume(resumeText: resume("Integrated REST APIs and ran release checks for the iOS team"), jobDescription: jd)
        let withOutcome = ATSScoringService.analyzeResume(resumeText: resume("Integrated REST APIs for the iOS team, cutting release checks to 2 hours"), jobDescription: jd)

        XCTAssertEqual(weak.componentScores["impact_quality"], 0)
        XCTAssertEqual(strong.componentScores["impact_quality"], 25)
        XCTAssertEqual(withOutcome.componentScores["impact_quality"], 100)
    }

    func testRecognizesMobileHealthcareAndMarketingKeywords() {
        let keywords = ATSScoringService.extractKeywords(
            from: "Swift, SwiftUI and XCTest. BLS and ACLS required. SEO and email marketing experience."
        )
        XCTAssertTrue(Set(["swift", "swiftui", "xctest", "bls", "acls", "seo", "email marketing"]).isSubset(of: Set(keywords)))
    }

    func testMissingKeywordsListRequiredSkillsBeforeNiceToHaves() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\niOS Engineer\n- Built SwiftUI screens for 12,000 users",
            jobDescription: """
            Requirements
            - Expert in Swift, UIKit and XCTest.
            - Experience with Core Data and XCTest automation.

            Nice to have
            - Analytics, GraphQL and Kotlin experience.
            """
        )

        XCTAssertEqual(result.missingKeywords, ["xctest", "swift", "uikit", "core data", "analytics", "graphql", "kotlin"])
    }

    func testPartialMatchesIgnoreGenericWords() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Built data validation tooling for the app team",
            jobDescription: "Ship features with Core Data, publish to the App Store, and use Jetpack Compose."
        )

        XCTAssertTrue(result.partialMatches.isEmpty)
        XCTAssertTrue(Set(["core data", "app store", "jetpack compose"]).isSubset(of: Set(result.missingKeywords)))
    }

    func testProfileLinksDoNotCountAsSkills() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "Avery Morgan\ngithub.com/averymorgan | avery@example.com\nEXPERIENCE\nAcme\nEngineer\n- Built Swift tooling",
            jobDescription: "Maintain CI pipelines with GitHub Actions and Swift."
        )

        XCTAssertEqual(result.matchedKeywords, ["swift"])
        // The job names the product "GitHub Actions"; the github.com link still doesn't count.
        XCTAssertEqual(result.missingKeywords, ["github actions"])
    }

    func testSingleWordSkillsDoNotPartiallyMatchLongerWords() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Built excellent JavaScript dashboards for trusted reactive clients",
            jobDescription: "Strong Excel, Java, Rust and React skills required."
        )

        XCTAssertTrue(result.partialMatches.isEmpty)
        XCTAssertEqual(Set(result.missingKeywords), Set(["excel", "java", "react", "rust"]))
    }

    func testOneOptionOfAnOrListMeetsTheRequirement() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Built offline sync with Core Data",
            jobDescription: "Experience with Core Data or SwiftData. Also AWS, GCP, or Azure."
        )

        XCTAssertEqual(result.matchedKeywords, ["core data"])
        XCTAssertFalse(result.jdKeywords.contains("swiftdata"))
        // No cloud provider on the resume, so every option is still worth showing.
        XCTAssertEqual(Set(result.missingKeywords), Set(["aws", "gcp", "azure"]))
    }

    func testSkillsJoinedByAndAreAllRequired() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Built screens in SwiftUI",
            jobDescription: "Strong SwiftUI and UIKit experience."
        )

        XCTAssertEqual(result.missingKeywords, ["uikit"])
    }

    func testProductNamesDoNotCountAsTheirShorterSkill() {
        let keywords = ATSScoringService.extractKeywords(
            from: "CI/CD with Xcode Cloud or GitHub Actions. React Native experience."
        )

        XCTAssertTrue(keywords.contains("github actions"))
        XCTAssertTrue(keywords.contains("xcode cloud"))
        XCTAssertTrue(keywords.contains("react native"))
        XCTAssertFalse(keywords.contains("github"))
        XCTAssertFalse(keywords.contains("xcode"))
        XCTAssertFalse(keywords.contains("react"))
    }

    func testTestAndNotificationSpellingsMatch() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Wrote unit tests and shipped push notifications",
            jobDescription: "Writing unit testing suites. Experience with push notification services."
        )

        XCTAssertEqual(Set(result.matchedKeywords), Set(["unit testing", "push notifications"]))
    }

    func testPostgresAndPostgreSQLAreTheSameSkill() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Tuned PostgreSQL queries for reporting",
            jobDescription: "Experience running Postgres in production."
        )

        XCTAssertEqual(result.matchedKeywords, ["postgresql"])
    }

    func testResumeLengthIsReportedWithoutCostingFormattingPoints() {
        let result = ATSScoringService.analyzeResume(
            resumeText: "EXPERIENCE\nAcme\nEngineer\n- Built Python tooling for weekly reports",
            jobDescription: "Python role"
        )

        XCTAssertTrue(result.formattingWarnings.contains("Resume appears unusually short after extraction."))
        XCTAssertEqual(result.componentScores["formatting_risk"], 100)
    }

    func testGenericUIKeywordIsDroppedWhenJobNamesAFramework() {
        let keywords = ATSScoringService.extractKeywords(from: "Build screens in SwiftUI and UIKit, and write UI tests.")
        XCTAssertFalse(keywords.contains("ui"))
    }
}

final class LocalAIServiceTests: XCTestCase {
    func testImprovementDoesNotInsertMissingKeywordsOrInventMetrics() async throws {
        let original = "Jordan Lee\nEXPERIENCE\nAcme\nEngineer\n• Worked on customer onboarding flows"
        let improved = try await LocalAIService.shared.improveResume(
            original,
            weakBullets: ["Worked on customer onboarding flows"],
            focusKeywords: ["kubernetes", "terraform"]
        )

        XCTAssertTrue(improved.contains("Contributed to customer onboarding flows"))
        XCTAssertFalse(improved.lowercased().contains("kubernetes"))
        XCTAssertFalse(improved.lowercased().contains("terraform"))
        XCTAssertNil(improved.range(of: #"\d+%"#, options: .regularExpression))
    }

    func testResponsibleForIsNotOverstated() async throws {
        let original = "Responsible for customer support workflows"
        let variants = try await LocalAIService.shared.rewriteBullet(
            original,
            focusKeywords: ["python"]
        )

        XCTAssertEqual(variants, [original])
    }
}

final class ResumeExportTests: XCTestCase {
    private let resume = """
    Alex Doe
    alex@example.com | +1 415 555 0123 | San Francisco, CA

    SUMMARY
    Product-minded engineer focused on clear and accessible experiences.

    EXPERIENCE
    Acme Inc. | 2022 - Present
    Software Engineer | Remote
    • Built accessible onboarding workflows for customers

    EDUCATION
    State University | 2022
    B.S. Computer Science

    CERTIFICATIONS
    AWS Certified Cloud Practitioner
    """

    func testParserPreservesPhoneAndAdditionalSections() {
        let document = ResumeParser.parse(resume)

        XCTAssertEqual(document.phone, "+1 415 555 0123")
        XCTAssertEqual(document.additionalSections.first?.title, "CERTIFICATIONS")
        XCTAssertEqual(document.additionalSections.first?.lines, ["AWS Certified Cloud Practitioner"])
        XCTAssertTrue(document.unmappedContent.isEmpty)
    }

    func testParserKeepsMultiwordCityAndStateTogether() {
        let text = """
        Alex Doe
        alex@example.com

        EXPERIENCE
        Acme Inc. 2022 - Present
        iOS Engineer San Francisco, CA
        • Built accessible onboarding workflows

        EDUCATION
        State University 2022 - 2024
        B.S. Computer Science | San Francisco, CA
        """
        let document = ResumeParser.parse(text)

        XCTAssertEqual(document.experience.first?.title, "iOS Engineer")
        XCTAssertEqual(document.experience.first?.location, "San Francisco, CA")
        XCTAssertEqual(document.education.first?.degree, "B.S. Computer Science")
        XCTAssertEqual(document.education.first?.location, "San Francisco, CA")
    }

    func testPDFContainsPreservedContent() throws {
        let artifact = try PDFExportService.prepare(textContent: resume, variantId: UUID())
        let pdfText = try XCTUnwrap(PDFDocument(url: artifact.url)?.string)

        XCTAssertTrue(artifact.warnings.isEmpty)
        XCTAssertTrue(pdfText.contains("+1 415 555 0123"))
        XCTAssertTrue(pdfText.contains("CERTIFICATIONS"))
        XCTAssertTrue(pdfText.contains("AWS Certified Cloud Practitioner"))
    }

    func testExportWarnsWhenContentCannotBeMapped() throws {
        let text = """
        Alex Doe
        Principal Product Engineer
        alex@example.com

        EXPERIENCE
        Acme Inc.
        Engineer
        • Built accessible onboarding workflows for customers
        """
        let artifact = try PDFExportService.prepare(textContent: text, variantId: UUID())

        XCTAssertEqual(artifact.warnings.count, 1)
        XCTAssertTrue(artifact.warnings[0].contains("Principal Product Engineer"))
    }
}

final class FakeResumePipelineIntegrationTests: XCTestCase {
    private let jobDescription = """
    We are hiring a product-focused software engineer to build accessible mobile and web applications. The role works with REST APIs, Git, CI/CD, Agile delivery, Python, and SQL. Experience with React and TypeScript is required, and familiarity with AWS, Kubernetes, and Terraform is preferred for our production platform.
    """

    override func tearDown() {
        LocalStorageManager.shared.clearTransientVariants()
        super.tearDown()
    }

    func testFakePDFThroughAnalyzeImproveAndExportPipeline() async throws {
        let client = APIClient()
        let fixtureURL = fakeResumeFixtureURL()

        let upload = try await client.uploadResume(fileURL: fixtureURL, token: "test-token")
        XCTAssertTrue(upload.success)
        XCTAssertGreaterThan(upload.characterCount, 400)
        XCTAssertTrue(upload.extractedText.contains("Avery Morgan"))
        XCTAssertTrue(upload.extractedText.contains("+1 415 555 0142"))
        XCTAssertTrue(upload.extractedText.contains("CERTIFICATIONS"))

        let analysis = try await client.analyzeResume(
            resumeId: upload.resumeId,
            resumeText: upload.extractedText,
            jobDescription: jobDescription,
            token: "test-token",
            shouldSave: false
        )

        XCTAssertTrue(analysis.success)
        XCTAssertEqual(analysis.analysisStatus, "complete")
        XCTAssertGreaterThan(analysis.score, 0)
        XCTAssertTrue(Set(["agile", "ci/cd", "git", "python", "rest api", "sql"]).isSubset(of: Set(analysis.matchedKeywords)))
        XCTAssertTrue(Set(["aws", "kubernetes", "react", "terraform", "typescript", "web applications"]).isSubset(of: Set(analysis.missingKeywords)))
        XCTAssertGreaterThan(analysis.missingKeywords.count, 5, "Fixture should exercise the Free top-five keyword cap.")
        XCTAssertTrue(analysis.weakBullets.contains(where: { $0.hasPrefix("Worked on onboarding") }))

        let improved = try await client.improveResume(variantId: analysis.variantId, token: "test-token")
        let improvedLower = improved.optimizedResumeText.lowercased()

        XCTAssertTrue(improved.success)
        XCTAssertTrue(improved.optimizedResumeText.contains("Contributed to onboarding flows"))
        XCTAssertTrue(improved.optimizedResumeText.contains("12,000 users"))
        XCTAssertTrue(improved.optimizedResumeText.contains("18%"))
        XCTAssertTrue(improved.optimizedResumeText.contains("Apple App Development with Swift - 2021"))
        for unsupportedKeyword in ["aws", "kubernetes", "react", "terraform", "typescript", "web applications"] {
            XCTAssertFalse(improvedLower.contains(unsupportedKeyword), "Improvement inserted unsupported keyword: \(unsupportedKeyword)")
        }

        let improvedDocument = ResumeParser.parse(improved.optimizedResumeText)
        XCTAssertEqual(improvedDocument.experience.first?.location, "San Francisco, CA")
        XCTAssertEqual(improvedDocument.education.first?.location, "San Francisco, CA")

        let artifact = try await client.exportVariant(id: analysis.variantId, token: "test-token")
        let exportedText = try XCTUnwrap(PDFDocument(url: artifact.url)?.string)

        XCTAssertTrue(artifact.warnings.isEmpty)
        XCTAssertTrue(exportedText.contains("Avery Morgan"))
        XCTAssertTrue(exportedText.contains("+1 415 555 0142"))
        XCTAssertTrue(exportedText.contains("CERTIFICATIONS"))
        XCTAssertTrue(exportedText.contains("Apple App Development with Swift - 2021"))
        XCTAssertTrue(exportedText.contains("12,000 users"))

        let attachment = XCTAttachment(contentsOfFile: artifact.url)
        attachment.name = "Rezumate-Fake-Resume-Export.pdf"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func fakeResumeFixtureURL() -> URL {
        Bundle(for: Self.self).url(forResource: "fake-resume-v1.0.3", withExtension: "pdf")!
    }
}

final class ReviewPromptTrackerTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "RezumateNativeTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        suiteName = nil
        super.tearDown()
    }

    func testRequiresTwoAnalysesAndOneExportAndPromptsOncePerVersion() {
        XCTAssertFalse(ReviewPromptTracker.isEligible(marketingVersion: "1.0.3", defaults: defaults))

        ReviewPromptTracker.recordSuccessfulAnalysis(defaults: defaults)
        ReviewPromptTracker.recordSuccessfulExport(defaults: defaults)
        XCTAssertFalse(ReviewPromptTracker.isEligible(marketingVersion: "1.0.3", defaults: defaults))

        ReviewPromptTracker.recordSuccessfulAnalysis(defaults: defaults)
        XCTAssertTrue(ReviewPromptTracker.isEligible(marketingVersion: "1.0.3", defaults: defaults))

        ReviewPromptTracker.markPrompted(marketingVersion: "1.0.3", defaults: defaults)
        XCTAssertFalse(ReviewPromptTracker.isEligible(marketingVersion: "1.0.3", defaults: defaults))
        XCTAssertTrue(ReviewPromptTracker.isEligible(marketingVersion: "1.0.4", defaults: defaults))
    }
}

final class JobFitExtractorTests: XCTestCase {
    func testExtractsHiringTitleAndDoesNotAddItToKeywords() {
        let jd = "We are hiring a product-focused software engineer to build accessible mobile apps with React."
        let resume = "Alex Doe\nSUMMARY\nBackend engineer focused on APIs.\nEXPERIENCE\nAcme\nEngineer"
        let fit = JobFitExtractor.extract(jobDescription: jd, resumeText: resume)
        let analysis = ATSScoringService.analyzeResume(resumeText: resume, jobDescription: jd)

        XCTAssertEqual(fit.jobTitle, "product-focused software engineer")
        XCTAssertFalse(fit.jobTitleMatched)
        XCTAssertNil(fit.educationRequirement)
        XCTAssertFalse(analysis.jdKeywords.contains(where: { $0.lowercased().contains("software engineer") }))
    }

    func testMatchesTitleAndEducationWhenPresentOnResume() {
        let jd = """
        Title: iOS Engineer
        Bachelor's degree required. Build Swift apps with UIKit.
        """
        let resume = """
        Jordan Lee
        iOS Engineer

        EDUCATION
        State University
        B.S. Computer Science
        """
        let fit = JobFitExtractor.extract(jobDescription: jd, resumeText: resume)

        XCTAssertEqual(fit.jobTitle, "iOS Engineer")
        XCTAssertTrue(fit.jobTitleMatched)
        XCTAssertEqual(fit.educationRequirement, "Bachelor's degree")
        XCTAssertTrue(fit.educationMatched)
    }

    func testFlagsSeniorityGapWhenOnlyTheLevelDiffers() {
        let jd = "Title: Senior iOS Engineer\nBuild Swift apps with UIKit."
        let fit = JobFitExtractor.extract(jobDescription: jd, resumeText: "Jordan Lee\niOS Engineer\nEXPERIENCE\nAcme")
        let unrelated = JobFitExtractor.extract(jobDescription: jd, resumeText: "Jordan Lee\nData Analyst\nEXPERIENCE\nAcme")

        XCTAssertFalse(fit.jobTitleMatched)
        XCTAssertTrue(fit.jobTitleSeniorityGap)
        XCTAssertFalse(unrelated.jobTitleSeniorityGap)
    }
}

final class ResumeTailoringServiceTests: XCTestCase {
    func testSkillsAreWrittenWithTheirRealCapitalization() {
        let expected = ["uikit": "UIKit", "ios": "iOS", "github": "GitHub", "swiftui": "SwiftUI",
                        "xctest": "XCTest", "a/b testing": "A/B testing", "core data": "Core Data"]
        for (keyword, name) in expected {
            XCTAssertEqual(ResumeTailoringService.displayName(for: keyword), name)
        }
        for skill in ATSScoringService.knownSkills {
            let written = ResumeTailoringService.displayName(for: skill).lowercased()
            let accepted: Set<String> = [skill, ATSScoringService.canonicalKeywords[skill] ?? skill]
            XCTAssertTrue(accepted.contains(written), "\(skill) is written as \(written).")
        }
    }

    private let resumeWithSkills = """
    Alex Doe
    EXPERIENCE
    Acme
    Engineer
    • Built internal reporting workflows

    SKILLS
    Python, SQL
    """

    private let resumeWithoutSkills = """
    Alex Doe
    EXPERIENCE
    Acme
    Engineer
    • Built internal reporting workflows
    """

    func testPlacesKeywordInExistingSkillsSection() throws {
        let updated = try ResumeTailoringService.placeInSkills(keyword: "kubernetes", in: resumeWithSkills)
        let document = ResumeParser.parse(updated)
        let analysis = ATSScoringService.analyzeResume(
            resumeText: updated,
            jobDescription: "Seeking Python, Kubernetes, and Terraform experience for production infrastructure."
        )

        XCTAssertTrue(document.skillCategories.contains(where: { $0.items.lowercased().contains("kubernetes") }))
        XCTAssertTrue(analysis.matchedKeywords.contains("kubernetes"))
        XCTAssertFalse(analysis.missingKeywords.contains("kubernetes"))
        XCTAssertTrue(analysis.missingKeywords.contains("terraform"))
        XCTAssertGreaterThan(analysis.keywordCoverage, 0)
        XCTAssertFalse(updated.contains("%"))
    }

    func testCreatesSkillsSectionWhenMissing() throws {
        let updated = try ResumeTailoringService.placeInSkills(keyword: "terraform", in: resumeWithoutSkills)
        let document = ResumeParser.parse(updated)

        XCTAssertTrue(updated.contains("SKILLS"))
        XCTAssertTrue(document.skillCategories.contains(where: {
            $0.items.lowercased().contains("terraform") || $0.name.lowercased().contains("terraform")
        }))
        XCTAssertTrue(ATSScoringService.containsKeyword("terraform", in: updated))
    }

    func testPlacesKeywordInChosenBulletOnly() throws {
        let withSkills = try ResumeTailoringService.placeInSkills(keyword: "kubernetes", in: resumeWithSkills)
        let updated = try ResumeTailoringService.placeInBullet(
            keyword: "kubernetes",
            bullet: "Built internal reporting workflows",
            in: withSkills
        )

        XCTAssertTrue(updated.contains("Built internal reporting workflows using Kubernetes"))
        XCTAssertFalse(updated.contains("12,000"))
        XCTAssertEqual(
            try ResumeTailoringService.placeInBullet(
                keyword: "kubernetes",
                bullet: "Built internal reporting workflows using Kubernetes",
                in: updated
            ),
            updated
        )
    }

    func testRefusesAlreadyMatchedKeywordAndMissingBullet() {
        XCTAssertThrowsError(try ResumeTailoringService.placeInSkills(keyword: "python", in: resumeWithSkills)) { error in
            XCTAssertEqual(error as? ResumeTailoringError, .keywordAlreadyPresent)
        }
        XCTAssertThrowsError(
            try ResumeTailoringService.placeInBullet(
                keyword: "kubernetes",
                bullet: "This bullet does not exist",
                in: resumeWithSkills
            )
        ) { error in
            XCTAssertEqual(error as? ResumeTailoringError, .bulletNotFound)
        }
    }
}

final class VariantPersistenceTests: XCTestCase {
    func testOldHistoryWithoutJobDescriptionDecodes() throws {
        let result = ATSScoringService.analyzeResume(
            resumeText: "Alex Doe\nEXPERIENCE\nAcme\nEngineer\n• Built internal reporting workflows",
            jobDescription: "Seeking Python, Kubernetes, and Terraform experience for production infrastructure."
        )
        let variant = LocalVariant(
            id: UUID(),
            resumeId: UUID(),
            variantName: "Analysis",
            tailoredContent: "Alex Doe",
            atsScore: result.score,
            analysisFeedback: result,
            createdAt: Date(),
            updatedAt: Date(),
            jobDescription: "should-be-dropped"
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoder.encode(variant)) as? [String: Any])
        object.removeValue(forKey: "jobDescription")
        let stripped = try JSONSerialization.data(withJSONObject: object)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(LocalVariant.self, from: stripped)

        XCTAssertEqual(decoded.jobDescription, "")
        XCTAssertEqual(decoded.scoringJobDescription, result.jdKeywords.joined(separator: " "))
    }
}

final class TailoringAPITests: XCTestCase {
    override func tearDown() {
        LocalStorageManager.shared.clearTransientVariants()
        super.tearDown()
    }

    func testAnalyzeStoresJobDescriptionAndImproveKeepsTitleFit() async throws {
        let client = APIClient()
        let jd = "We are hiring a product-focused software engineer to build accessible web applications with React and TypeScript. You will work with product and design partners, review code, improve quality, and ship reliable customer experiences across the frontend platform."
        let resume = """
        Alex Doe
        SUMMARY
        Backend engineer focused on APIs.
        EXPERIENCE
        Acme
        Engineer
        • Worked on customer onboarding flows
        SKILLS
        Python, SQL
        """

        let analysis = try await client.analyzeResume(
            resumeId: UUID(),
            resumeText: resume,
            jobDescription: jd,
            token: "test-token",
            shouldSave: false
        )
        let stored = try XCTUnwrap(LocalStorageManager.shared.loadVariant(id: analysis.variantId))
        XCTAssertEqual(stored.jobDescription, jd)
        XCTAssertEqual(analysis.jobTitle, "product-focused software engineer")
        XCTAssertFalse(analysis.jobTitleMatched)

        let improved = try await client.improveResume(variantId: analysis.variantId, token: "test-token")
        XCTAssertEqual(improved.updatedAnalysis.jobTitle, analysis.jobTitle)
        XCTAssertFalse(improved.optimizedResumeText.lowercased().contains("react"))
        XCTAssertFalse(improved.optimizedResumeText.lowercased().contains("typescript"))
    }

    func testPlaceKeywordUpdatesCoverageAndExportStillWorks() async throws {
        let client = APIClient()
        let resume = """
        Alex Doe
        alex@example.com

        EXPERIENCE
        Acme Inc. | 2022 - Present
        Software Engineer | Remote
        • Built accessible onboarding workflows for customers

        SKILLS
        Python, SQL
        """
        let jd = "Seeking Python, Kubernetes, and Terraform experience for production infrastructure roles. You will operate cloud systems, improve reliability, and collaborate with engineers on scalable services used by customers every day."

        let analysis = try await client.analyzeResume(
            resumeId: UUID(),
            resumeText: resume,
            jobDescription: jd,
            token: "test-token",
            shouldSave: false
        )
        XCTAssertTrue(analysis.missingKeywords.contains("kubernetes"))
        let originalCoverage = analysis.keywordCoverage

        let tailored = try await client.placeKeyword(
            variantId: analysis.variantId,
            keyword: "kubernetes",
            alsoInBullet: "Built accessible onboarding workflows for customers",
            token: "test-token"
        )

        XCTAssertTrue(tailored.updatedAnalysis.matchedKeywords.contains("kubernetes"))
        XCTAssertFalse(tailored.updatedAnalysis.missingKeywords.contains("kubernetes"))
        XCTAssertGreaterThan(tailored.updatedAnalysis.keywordCoverage, originalCoverage)
        XCTAssertTrue(tailored.updatedResumeText.contains("Kubernetes"))
        XCTAssertTrue(tailored.updatedResumeText.contains("using Kubernetes"))

        let artifact = try await client.exportVariant(id: analysis.variantId, token: "test-token")
        XCTAssertNotNil(artifact.url)
        let exported = try XCTUnwrap(PDFDocument(url: artifact.url)?.string)
        XCTAssertTrue(exported.localizedCaseInsensitiveContains("Kubernetes"))
    }
}

@MainActor
final class AppStateStoreKitTests: XCTestCase {
    func testEntitlementRefreshTransitionsFromLoadingToFreeAndLifetime() async {
        let store = FakeStoreKitService()
        let state = AppState(storeKit: store, automaticallyRefresh: false)

        XCTAssertEqual(state.entitlementState, .loading)
        await state.refreshProductsAndEntitlements()
        XCTAssertEqual(state.entitlementState, .free)
        XCTAssertFalse(state.isPro)
        XCTAssertEqual(state.subscriptionPriceText, "$4.99/year or $4.99/month")

        store.owned.insert(AppState.lifetimeProductId)
        await state.refreshProductsAndEntitlements()
        XCTAssertEqual(state.entitlementState, .lifetime)
        XCTAssertTrue(state.isPro)
        XCTAssertFalse(state.hasSubscription)
    }

    func testSubscriptionUnlocksProFeatures() async {
        let store = FakeStoreKitService()
        store.owned.insert(AppState.monthlyProductId)
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        XCTAssertEqual(state.entitlementState, .subscription)
        XCTAssertTrue(state.isPro)
        XCTAssertEqual(state.remainingAnalyses, Int.max)
        XCTAssertTrue(state.canSaveNewVariant)
    }

    func testSubscriptionWinsOverLifetime() async {
        let store = FakeStoreKitService()
        store.owned = [AppState.lifetimeProductId, AppState.yearlyProductId]
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        XCTAssertEqual(state.entitlementState, .subscription)
    }

    func testSuccessfulSubscriptionPurchaseRefreshesEntitlement() async {
        let store = FakeStoreKitService()
        store.purchaseOutcome = .purchased
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        await state.purchaseSubscription(AppState.yearlyProductId)

        XCTAssertEqual(state.entitlementState, .subscription)
        XCTAssertEqual(state.purchaseMessage, "Rezumate Pro is active.")
        XCTAssertFalse(state.isPurchasing)
    }

    func testPendingPurchaseDoesNotUnlockPro() async {
        let store = FakeStoreKitService()
        store.purchaseOutcome = .pending
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        await state.purchaseSubscription(AppState.monthlyProductId)

        XCTAssertEqual(state.entitlementState, .free)
        XCTAssertEqual(state.purchaseMessage, "Purchase pending approval.")
    }
}

private final class FakeStoreKitService: StoreKitServing {
    var listing: StoreProductListing? = StoreProductListing(displayPrice: "$4.99")
    var owned: Set<String> = []
    var purchaseOutcome: StorePurchaseOutcome = .cancelled

    func productListing(for productID: String) async throws -> StoreProductListing? {
        listing
    }

    func hasActiveEntitlement(for productID: String) async -> Bool {
        owned.contains(productID)
    }

    func purchase(productID: String) async throws -> StorePurchaseOutcome {
        if purchaseOutcome == .purchased { owned.insert(productID) }
        return purchaseOutcome
    }

    func sync() async throws {}

    func transactionUpdates() -> AsyncStream<Void> {
        AsyncStream { _ in }
    }

    func currentTransactionIDs() async -> [String] {
        owned.isEmpty ? [] : ["1000"]
    }
}

final class ExtractionCleanupTests: XCTestCase {
    func testSplitsBulletsPDFKitJoinedIntoOneLine() {
        let text = PDFTextExtractor.normalizeResumeText(
            "- Worked on the checkout flow - Helped with moving the app to SwiftUI - Responsible for fixing crashes"
        )
        XCTAssertEqual(text.components(separatedBy: "\n"), [
            "- Worked on the checkout flow",
            "- Helped with moving the app to SwiftUI",
            "- Responsible for fixing crashes"
        ])
    }

    func testKeepsDashesInsideASingleBullet() {
        let line = "- Built a sync engine - offline first, using Core Data"
        XCTAssertEqual(PDFTextExtractor.normalizeResumeText(line), line)
        XCTAssertEqual(PDFTextExtractor.normalizeResumeText("Mar 2022 - Present"), "Mar 2022 - Present")
    }

    func testExtraRequirementsTreatPluralsAndCaseAsTheSameSkill() {
        XCTAssertEqual(AIRewriteService.termKey("REST APIs"), AIRewriteService.termKey("rest api"))
        XCTAssertEqual(AIRewriteService.termKey("CI/CD"), AIRewriteService.termKey("ci cd"))
        XCTAssertNotEqual(AIRewriteService.termKey("C#"), AIRewriteService.termKey("C++"))
    }
}
