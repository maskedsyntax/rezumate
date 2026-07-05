import Combine
import Foundation

final class AppState: ObservableObject {
    @Published var session: AuthSession? {
        didSet {
            if let token = session?.token {
                KeychainSessionStore.save(token: token)
            } else {
                KeychainSessionStore.clear()
            }
        }
    }

    @Published var upload: UploadResponse?
    @Published var jobDescription = ""
    @Published var latestAnalysis: AnalyzeResponse?
    @Published var selectedVariant: VariantDetail?

    let api = APIClient()

    init() {
        let token = KeychainSessionStore.loadToken() ?? "local-session-token"
        session = AuthSession(token: token, user: nil)
    }

    var token: String? {
        session?.token
    }

    func importResumeFromExternalURL(_ url: URL) {
        guard let token else { return }

        Task { @MainActor in
            let didStartAccessing = url.startAccessingSecurityScopedResource()
            defer {
                if didStartAccessing { url.stopAccessingSecurityScopedResource() }
            }

            do {
                upload = try await api.uploadResume(fileURL: url, token: token)
                latestAnalysis = nil
                selectedVariant = nil
            } catch {
                print("Failed to import opened document: \(error.localizedDescription)")
            }
        }
    }

    func signOut() {
        upload = nil
        jobDescription = ""
        latestAnalysis = nil
        selectedVariant = nil
    }
}
