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

        XCTAssertEqual(result.scoreVersion, "ats-v2")
        XCTAssertEqual(result.keywordCoverage, 0)
        XCTAssertTrue(result.matchedKeywords.isEmpty)
        XCTAssertEqual(Set(result.missingKeywords), Set(["kubernetes", "python", "terraform"]))
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
}

final class ResumeTailoringServiceTests: XCTestCase {
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
    func testEntitlementRefreshTransitionsFromLoadingToFreeAndPro() async {
        let store = FakeStoreKitService()
        let state = AppState(storeKit: store, automaticallyRefresh: false)

        XCTAssertEqual(state.entitlementState, .loading)
        await state.refreshProductsAndEntitlements()
        XCTAssertEqual(state.entitlementState, .free)
        XCTAssertEqual(state.proPriceText, "$14.99")

        store.hasPro = true
        await state.refreshProductsAndEntitlements()
        XCTAssertEqual(state.entitlementState, .pro)
    }

    func testSuccessfulPurchaseRefreshesEntitlement() async {
        let store = FakeStoreKitService()
        store.purchaseOutcome = .purchased
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        await state.purchasePro()

        XCTAssertEqual(state.entitlementState, .pro)
        XCTAssertEqual(state.purchaseMessage, "Rezumate Pro unlocked.")
        XCTAssertFalse(state.isPurchasing)
    }

    func testPendingPurchaseDoesNotUnlockPro() async {
        let store = FakeStoreKitService()
        store.purchaseOutcome = .pending
        let state = AppState(storeKit: store, automaticallyRefresh: false)
        await state.refreshProductsAndEntitlements()

        await state.purchasePro()

        XCTAssertEqual(state.entitlementState, .free)
        XCTAssertEqual(state.purchaseMessage, "Purchase pending approval.")
    }
}

private final class FakeStoreKitService: StoreKitServing {
    var listing: StoreProductListing? = StoreProductListing(displayPrice: "$14.99")
    var hasPro = false
    var purchaseOutcome: StorePurchaseOutcome = .cancelled

    func productListing(for productID: String) async throws -> StoreProductListing? {
        listing
    }

    func hasActiveEntitlement(for productID: String) async -> Bool {
        hasPro
    }

    func purchase(productID: String) async throws -> StorePurchaseOutcome {
        if purchaseOutcome == .purchased { hasPro = true }
        return purchaseOutcome
    }

    func sync() async throws {}

    func transactionUpdates(for productID: String) -> AsyncStream<Bool> {
        AsyncStream { _ in }
    }
}
