import XCTest
@testable import RezumateNative

final class RewriteValidatorTests: XCTestCase {
    private let resume = """
    Jane Doe
    jane@example.com | (415) 555-0134 | linkedin.com/in/janedoe
    EXPERIENCE
    Acme Corp  2021 - 2024
    - Worked on the checkout service in Python, cutting latency by 30%
    - Helped with onboarding for 4 new engineers
    """

    func testAcceptsRewordingThatKeepsFacts() {
        let original = "Worked on the checkout service in Python, cutting latency by 30%"
        let rewrite = "Rebuilt the Python checkout service, cutting latency by 30%"
        XCTAssertNil(RewriteValidator.validateBullet(rewrite, original: original))
    }

    func testRejectsFactsMovedInFromAnotherBullet() {
        let original = "Helped with onboarding for 4 new engineers"
        XCTAssertEqual(
            RewriteValidator.validateBullet("Contributed to onboarding 4 new Python engineers", original: original),
            .inventedSkill("python")
        )
        XCTAssertEqual(
            RewriteValidator.validateBullet("Contributed to onboarding 4 engineers, cutting ramp-up by 30%", original: original),
            .inventedNumber("30%")
        )
        XCTAssertEqual(
            RewriteValidator.validateBullet("Contributed to onboarding 4 new engineers at Acme", original: original),
            .inventedName("Acme")
        )
    }

    func testRejectsOverstatedRole() {
        let original = "Helped with onboarding for 4 new engineers"
        XCTAssertEqual(
            RewriteValidator.validateBullet("Led onboarding for 4 new engineers", original: original),
            .overstatedRole("Led")
        )
        XCTAssertNil(RewriteValidator.validateBullet("Contributed to onboarding 4 new engineers", original: original))
        // Ownership the user already claimed is fine.
        XCTAssertNil(RewriteValidator.validateBullet(
            "Led sprint planning and supported 4 new engineers",
            original: "Led sprint planning and helped 4 new engineers"
        ))
    }

    func testRejectsInventedMetric() {
        let original = "Helped with onboarding for 4 new engineers"
        let rewrite = "Onboarded 4 new engineers, reducing ramp-up time by 50%"
        XCTAssertEqual(
            RewriteValidator.validateBullet(rewrite, original: original),
            .inventedNumber("50%")
        )
    }

    func testRejectsInventedSkill() {
        let original = "Worked on the checkout service in Python, cutting latency by 30%"
        let rewrite = "Rebuilt the checkout service in Python and Kubernetes, cutting latency by 30%"
        XCTAssertEqual(
            RewriteValidator.validateBullet(rewrite, original: original),
            .inventedSkill("kubernetes")
        )
    }

    func testAllowsSkillTheUserConfirmed() {
        let original = "Worked on the checkout service in Python, cutting latency by 30%"
        let rewrite = "Rebuilt the checkout service in Python and Kubernetes, cutting latency by 30%"
        XCTAssertNil(RewriteValidator.validateBullet(
            rewrite, original: original, allowedKeywords: ["Kubernetes"]
        ))
    }

    func testRejectsInventedEmployerName() {
        let original = "Helped with onboarding for 4 new engineers"
        let rewrite = "Onboarded 4 new engineers in partnership with Stripe"
        XCTAssertEqual(
            RewriteValidator.validateBullet(rewrite, original: original),
            .inventedName("Stripe")
        )
    }

    func testRejectsFirstPersonBullet() {
        let original = "Helped with onboarding for 4 new engineers"
        XCTAssertEqual(
            RewriteValidator.validateBullet("I onboarded 4 new engineers", original: original),
            .firstPerson
        )
    }

    func testRejectsEmptyRewrite() {
        XCTAssertEqual(RewriteValidator.validateBullet("  ", original: "x"), .empty)
    }

    func testLongFormAllowsCompanyFromJobDescription() {
        let job = "Globex is hiring a backend engineer with Python experience."
        let letter = "I am excited to apply to Globex. At Acme I rebuilt a Python checkout service and cut latency by 30%."
        XCTAssertNil(RewriteValidator.validateLongForm(letter, resumeText: resume, jobDescription: job))
    }

    func testLongFormRejectsNumbersTakenFromJobDescription() {
        let job = "Globex needs 5+ years of Python experience."
        let letter = "I bring 5+ years of Python experience to Globex."
        XCTAssertEqual(
            RewriteValidator.validateLongForm(letter, resumeText: resume, jobDescription: job),
            .inventedNumber("5+")
        )
    }

    func testNumberNormalization() {
        XCTAssertEqual(RewriteValidator.numbers(in: "Saved $1,200 and 35 % of time."), ["1200", "35%"])
    }
}

final class PIIRedactorTests: XCTestCase {
    private let resume = """
    Jane Doe
    jane@example.com | (415) 555-0134 | linkedin.com/in/janedoe
    EXPERIENCE
    Acme Corp  2021 - 2024
    - Worked on the checkout service in Python
    """

    func testRedactsContactDetails() {
        let redactor = PIIRedactor(resumeText: resume)
        let redacted = redactor.redact(resume)
        XCTAssertFalse(redacted.contains("Jane Doe"))
        XCTAssertFalse(redacted.contains("jane@example.com"))
        XCTAssertFalse(redacted.contains("555-0134"))
        XCTAssertFalse(redacted.contains("linkedin.com/in/janedoe"))
        XCTAssertTrue(redacted.contains("Acme Corp"))
        XCTAssertTrue(redacted.contains("checkout service in Python"))
    }

    func testRestoresNameInGeneratedText() {
        let redactor = PIIRedactor(resumeText: resume)
        XCTAssertEqual(redactor.restore("Sincerely,\n[NAME]"), "Sincerely,\nJane Doe")
    }
}

final class BulletDetailValidationTests: XCTestCase {
    private let original = "Worked on the checkout service in Python and PostgreSQL"

    func testAllowsFactsFromTheUsersAnswers() {
        let rewrite = "Moved checkout to async payment calls in Python and PostgreSQL, cutting p95 latency from 800ms to 300ms"
        XCTAssertNil(RewriteValidator.validateBullet(
            rewrite, original: original, details: ["moved it to async payment calls", "p95 latency 800ms → 300ms"]
        ))
        // Without the answers, the same numbers count as invented.
        guard case .inventedNumber = RewriteValidator.validateBullet(rewrite, original: original) else {
            return XCTFail("Expected an invented number")
        }
    }

    func testAnswersCanJustifyOwnership() {
        let helped = "Helped with moving payments to a new provider"
        XCTAssertEqual(
            RewriteValidator.validateBullet("Led the move to a new payment provider", original: helped),
            .overstatedRole("Led")
        )
        XCTAssertNil(RewriteValidator.validateBullet(
            "Led the move to a new payment provider", original: helped, details: ["I led the migration plan"]
        ))
    }
}
