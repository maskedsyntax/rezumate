import DeviceCheck
import Foundation

struct AIAccess: Codable, Equatable {
    let subscriptionActive: Bool
    let subscriptionExpiresAt: Double?
    let monthlyRemaining: Int
    let bonusRemaining: Int
    let trialRemaining: Int
    let totalRemaining: Int

    var hasActions: Bool { totalRemaining > 0 }
}

enum AIClientError: Error, LocalizedError, Equatable {
    case notConfigured
    case noAccess
    case rateLimited
    case unavailable
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "AI features aren't set up in this build."
        case .noAccess:
            return "You're out of AI actions. Subscribe to Rezumate AI to keep going."
        case .rateLimited:
            return "You've reached today's AI limit. Try again tomorrow."
        case .unavailable:
            return "The AI service is unavailable right now. Check your connection and try again."
        case .server(let message):
            return message
        }
    }
}

/// Talks to the Rezumate AI Worker. The OpenAI key lives on the Worker, never in the app.
actor AIClient {
    static let shared = AIClient()

    private let baseURL: URL?
    private let session: URLSession
    private var sessionToken: String?

    init(baseURL: URL? = AIClient.configuredBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.sessionToken = AIKeychain.load(.sessionToken)
    }

    nonisolated var isConfigured: Bool { baseURL != nil }

    // MARK: - Account

    func access() async throws -> AIAccess {
        let response: AccessEnvelope = try await authorized { token in
            try await self.send("GET", "/v1/access", token: token)
        }
        return response.access
    }

    /// Sends App Store transaction ids to the Worker, which verifies them with Apple.
    func syncEntitlements(transactionIDs: [String]) async throws -> AIAccess {
        let body = ["transactionIds": Array(transactionIDs.prefix(10))]
        let response: AccessEnvelope = try await authorized { token in
            try await self.send("POST", "/v1/entitlements/sync", body: body, token: token)
        }
        return response.access
    }

    // MARK: - Tasks

    /// Runs an AI task. Charged tasks also return a token for one free retry of the same task.
    func run<Input: Encodable, Output: Decodable>(_ task: String, input: Input) async throws -> (Output, AIAccess, retryToken: String?) {
        let response: TaskEnvelope<Output> = try await authorized { token in
            try await self.send("POST", "/v1/ai/\(task)", body: input, token: token)
        }
        return (response.result, response.access, response.retryToken)
    }

    // MARK: - Session

    private func authorized<T>(_ request: (String) async throws -> T) async throws -> T {
        let token = try await currentToken()
        do {
            return try await request(token)
        } catch AIClientHTTPError.unauthorized {
            sessionToken = nil
            AIKeychain.delete(.sessionToken)
            return try await request(try await currentToken())
        }
    }

    private func currentToken() async throws -> String {
        if let sessionToken { return sessionToken }

        var body = ["installId": AIKeychain.installID()]
        if DCDevice.current.isSupported, let token = try? await DCDevice.current.generateToken() {
            body["deviceToken"] = token.base64EncodedString()
        }
        let response: SessionEnvelope
        do {
            response = try await send("POST", "/v1/session", body: body, token: nil)
        } catch AIClientHTTPError.unauthorized {
            // The Worker answers 401 here only when Apple could not verify this device.
            throw AIClientError.server("This iPhone couldn't be verified for AI features. Try again later.")
        }
        sessionToken = response.token
        AIKeychain.save(response.token, for: .sessionToken)
        return response.token
    }

    // MARK: - HTTP

    private func send<T: Decodable>(_ method: String, _ path: String, token: String?) async throws -> T {
        try await send(method, path, body: Optional<String>.none, token: token)
    }

    private func send<Body: Encodable, T: Decodable>(_ method: String, _ path: String, body: Body?, token: String?) async throws -> T {
        guard let baseURL else { throw AIClientError.notConfigured }
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.timeoutInterval = 75
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONEncoder().encode(body) }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw AIClientError.unavailable
        }
        guard let http = response as? HTTPURLResponse else { throw AIClientError.unavailable }

        switch http.statusCode {
        case 200..<300:
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw AIClientError.server("The AI service returned an unexpected response.")
            }
        case 401:
            throw AIClientHTTPError.unauthorized
        case 402:
            throw AIClientError.noAccess
        case 429:
            throw AIClientError.rateLimited
        case 500..<600:
            throw AIClientError.unavailable
        default:
            let message = (try? JSONDecoder().decode(ErrorEnvelope.self, from: data))?.error.message
            throw AIClientError.server(message ?? "The AI request failed.")
        }
    }

    /// Read from Info.plist (`RezumateAIBaseURL`), which is set by the `REZUMATE_AI_BASE_URL` build setting.
    static var configuredBaseURL: URL? {
        baseURL(from: Bundle.main.object(forInfoDictionaryKey: "RezumateAIBaseURL") as? String)
    }

    static func baseURL(from value: String?) -> URL? {
        guard let value, !value.isEmpty, !value.contains("YOUR-SUBDOMAIN"),
              let url = URL(string: value), url.scheme == "https" else {
            return nil
        }
        return url
    }
}

private enum AIClientHTTPError: Error {
    case unauthorized
}

private struct SessionEnvelope: Decodable {
    let token: String
    let access: AIAccess
}

private struct AccessEnvelope: Decodable {
    let access: AIAccess
}

private struct TaskEnvelope<Result: Decodable>: Decodable {
    let result: Result
    let access: AIAccess
    let retryToken: String?
}

private struct ErrorEnvelope: Decodable {
    struct Detail: Decodable { let message: String }
    let error: Detail
}

/// Keychain items survive app reinstalls, so the install id (and its free trial) does too.
enum AIKeychain {
    enum Item: String {
        case installID = "install-id"
        case sessionToken = "ai-session-token"
    }

    private static let service = "com.rezumate.native.ai"

    static func installID() -> String {
        if let existing = load(.installID) { return existing }
        let id = UUID().uuidString.lowercased()
        save(id, for: .installID)
        return id
    }

    static func save(_ value: String, for item: Item) {
        delete(item)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: item.rawValue,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: Data(value.utf8)
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(_ item: Item) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: item.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ item: Item) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: item.rawValue
        ]
        SecItemDelete(query as CFDictionary)
    }
}
