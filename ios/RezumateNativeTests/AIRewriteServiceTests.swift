import XCTest
@testable import RezumateNative

/// Serves canned Worker responses and records what the app sent.
final class StubWorkerProtocol: URLProtocol {
    static var handler: ((URLRequest, Data) -> (Int, Any))?
    static var sentBodies: [String: String] = [:]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let body = request.httpBody ?? request.httpBodyStream.map(Self.readAll) ?? Data()
        let path = request.url?.path ?? ""
        Self.sentBodies[path] = String(data: body, encoding: .utf8)

        let (status, json) = Self.handler?(request, body) ?? (404, [:])
        let data = (try? JSONSerialization.data(withJSONObject: json)) ?? Data()
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    private static func readAll(_ stream: InputStream) -> Data {
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            data.append(buffer, count: count)
        }
        return data
    }
}

final class AIRewriteServiceTests: XCTestCase {
    private let resume = """
    Jane Doe
    jane@example.com | (415) 555-0134
    EXPERIENCE
    Acme Corp  2021 - 2024
    - Helped with onboarding for 4 new engineers
    - Worked on the checkout service in Python, cutting latency by 30%
    """

    private let access: [String: Any] = [
        "subscriptionActive": false, "subscriptionExpiresAt": NSNull(), "monthlyRemaining": 0,
        "bonusRemaining": 0, "trialRemaining": 2, "totalRemaining": 2
    ]

    private var service: AIRewriteService!

    override func setUp() {
        super.setUp()
        StubWorkerProtocol.sentBodies = [:]
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubWorkerProtocol.self]
        let client = AIClient(baseURL: URL(string: "https://ai.test")!, session: URLSession(configuration: config))
        service = AIRewriteService(client: client)
    }

    override func tearDown() {
        StubWorkerProtocol.handler = nil
        super.tearDown()
    }

    private var context: AIRewriteService.Context {
        AIRewriteService.Context(
            resumeText: resume,
            jobDescription: "Globex needs an engineering manager who mentors engineers.",
            jobTitle: "Engineering Manager",
            confirmedKeywords: []
        )
    }

    /// Serves `results` in order for the task (the last one repeats), each with a retry token
    /// unless the request is itself a retry.
    private func respond(task: String, with results: [[String: Any]]) {
        var remaining = results
        StubWorkerProtocol.handler = { request, body in
            switch request.url?.path {
            case "/v1/session": return (200, ["token": "t", "access": self.access])
            case "/v1/ai/\(task)":
                let result = remaining.count > 1 ? remaining.removeFirst() : remaining[0]
                let isRetry = (try? JSONSerialization.jsonObject(with: body) as? [String: Any])?["retryOf"] != nil
                var reply: [String: Any] = ["result": result, "access": self.access]
                if !isRetry { reply["retryToken"] = "retry-1" }
                return (200, reply)
            default: return (404, [:])
            }
        }
    }

    private func respond(task: String, with result: [String: Any]) {
        respond(task: task, with: [result])
    }

    func testDropsUnsafeRewritesAndNeverSendsContactDetails() async throws {
        respond(task: "rewrite-bullet", with: ["rewrites": [
            "Onboarded 4 new engineers, cutting ramp-up time by 50%",
            "Led onboarding for 4 new engineers",
            "• Supported onboarding for 4 new engineers",
            "Contributed to onboarding 4 new engineers"
        ]])

        let (options, access) = try await service.rewriteOptions(
            for: "Helped with onboarding for 4 new engineers",
            context: context
        )

        XCTAssertEqual(options, ["Supported onboarding for 4 new engineers", "Contributed to onboarding 4 new engineers"])
        XCTAssertEqual(access.trialRemaining, 2)

        let sent = try XCTUnwrap(StubWorkerProtocol.sentBodies["/v1/ai/rewrite-bullet"])
        XCTAssertFalse(sent.contains("Jane Doe"))
        XCTAssertFalse(sent.contains("jane@example.com"))
        XCTAssertFalse(sent.contains("555-0134"))
        XCTAssertTrue(sent.contains("Helped with onboarding"))
        XCTAssertTrue(sent.contains("Globex needs"))
    }

    func testRetriesOnceForFreeWhenEveryRewriteIsUnsafe() async throws {
        respond(task: "rewrite-bullet", with: [
            ["rewrites": ["Onboarded 12 engineers at Stripe"]],
            ["rewrites": ["Contributed to onboarding 4 new engineers"]]
        ])
        let (options, _) = try await service.rewriteOptions(for: "Helped with onboarding for 4 new engineers", context: context)
        XCTAssertEqual(options, ["Contributed to onboarding 4 new engineers"])

        let retryBody = try XCTUnwrap(StubWorkerProtocol.sentBodies["/v1/ai/rewrite-bullet"])
        XCTAssertTrue(retryBody.contains("retry-1"))
    }

    func testThrowsWhenTheRetryIsUnsafeToo() async {
        respond(task: "rewrite-bullet", with: ["rewrites": ["Onboarded 12 engineers at Stripe"]])
        do {
            _ = try await service.rewriteOptions(for: "Helped with onboarding for 4 new engineers", context: context)
            XCTFail("Expected nothingSafe")
        } catch {
            XCTAssertTrue(error is AIRewriteError)
        }
    }

    func testQuestionsThenRewriteWithRedactedDetails() async throws {
        StubWorkerProtocol.handler = { request, _ in
            switch request.url?.path {
            case "/v1/session": return (200, ["token": "t", "access": self.access])
            case "/v1/ai/bullet-questions":
                return (200, ["result": ["questions": [
                    ["question": "What improved?", "placeholder": "e.g. faster pages"],
                    ["question": "  ", "placeholder": ""]
                ]], "access": self.access])
            case "/v1/ai/rewrite-bullet":
                return (200, ["result": ["rewrites": ["Contributed to onboarding 4 new engineers, cutting ramp-up from 6 weeks to 3"]], "access": self.access, "retryToken": "r"])
            default: return (404, [:])
            }
        }

        let questions = try await service.questions(for: "Helped with onboarding for 4 new engineers", context: context)
        XCTAssertEqual(questions, [BulletQuestion(id: 0, question: "What improved?", placeholder: "e.g. faster pages")])

        let (options, _) = try await service.rewriteOptions(
            for: "Helped with onboarding for 4 new engineers",
            details: [BulletDetail(question: "What improved?", answer: "ramp-up went from 6 weeks to 3, ask jane@example.com")],
            context: context
        )
        XCTAssertEqual(options, ["Contributed to onboarding 4 new engineers, cutting ramp-up from 6 weeks to 3"])
        let sent = try XCTUnwrap(StubWorkerProtocol.sentBodies["/v1/ai/rewrite-bullet"])
        XCTAssertTrue(sent.contains("6 weeks to 3"))
        XCTAssertFalse(sent.contains("jane@example.com"))
    }

    func testImprovementsMatchByNumberAndKeepOnlySafeChanges() async throws {
        let bullets = ["Helped with onboarding for 4 new engineers", "Worked on the checkout service in Python, cutting latency by 30%"]
        respond(task: "improve-bullets", with: ["items": [
            // Out of order, an unknown number, and one rewrite that swaps Python for Go.
            ["id": 2, "rewrite": "Rebuilt the checkout service in Go, cutting latency by 30%"],
            ["id": 7, "rewrite": "Contributed to everything"],
            ["id": 1, "rewrite": "Supported onboarding for 4 new engineers"]
        ]])

        let (items, _) = try await service.improvements(for: bullets, context: context)
        XCTAssertEqual(items, [BulletImprovement(original: bullets[0], rewrite: "Supported onboarding for 4 new engineers")])
    }

    func testCoverLetterRestoresNameAndRejectsClaimedSkills() async throws {
        respond(task: "cover-letter", with: ["letter": "Dear Hiring Manager,\n\nAt Acme I helped onboard 4 new engineers.\n\nSincerely,\n[NAME]"])
        let (letter, _) = try await service.coverLetter(context: context)
        XCTAssertTrue(letter.hasSuffix("Jane Doe"))

        respond(task: "cover-letter", with: ["letter": "At Acme I ran Kubernetes clusters.\n\nSincerely,\n[NAME]"])
        do {
            _ = try await service.coverLetter(context: context)
            XCTFail("Expected nothingSafe")
        } catch {
            XCTAssertTrue(error is AIRewriteError)
        }
    }

    func testOutOfActionsMapsToNoAccess() async {
        StubWorkerProtocol.handler = { request, _ in
            request.url?.path == "/v1/session"
                ? (200, ["token": "t", "access": self.access])
                : (402, ["error": ["code": "no_ai_access", "message": "No AI actions left."]])
        }
        do {
            _ = try await service.rewriteOptions(for: "Helped with onboarding for 4 new engineers", context: context)
            XCTFail("Expected noAccess")
        } catch {
            XCTAssertEqual(error as? AIClientError, .noAccess)
        }
    }

    func testPlaceholderBaseURLCountsAsNotConfigured() {
        XCTAssertNil(AIClient.baseURL(from: "https://rezumate-ai.YOUR-SUBDOMAIN.workers.dev"))
        XCTAssertNil(AIClient.baseURL(from: "http://rezumate-ai.maskedsyntax.workers.dev"))
        XCTAssertNil(AIClient.baseURL(from: nil))
        XCTAssertNotNil(AIClient.baseURL(from: "https://rezumate-ai.maskedsyntax.workers.dev"))
    }
}

final class RewriteFilteringTests: XCTestCase {
    func testNearCopiesAreNotMeaningful() {
        let service = AIRewriteService()
        let original = "Worked on the checkout service in Python and PostgreSQL"
        XCTAssertFalse(service.isMeaningfulChange(from: original, to: "Worked on the checkout service using Python and PostgreSQL"))
        XCTAssertFalse(service.isMeaningfulChange(from: original, to: "worked on the checkout service in Python and PostgreSQL."))
        XCTAssertTrue(service.isMeaningfulChange(from: original, to: "Contributed to the checkout service in Python and PostgreSQL"))
        XCTAssertTrue(service.isMeaningfulChange(from: original, to: "Worked on checkout features and payment flows in Python and PostgreSQL"))
    }
}
