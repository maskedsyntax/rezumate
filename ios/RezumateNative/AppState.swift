import Combine
import Foundation
import StoreKit

@MainActor
final class AppState: ObservableObject {
    static let proProductId = "rezumate_pro_lifetime"

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
    @Published var usageSnapshot = UsageLimiter.loadSnapshot()
    @Published var isPro = false
    @Published var proProduct: Product?
    @Published var purchaseMessage: String?
    @Published var isPurchasing = false

    let api = APIClient()

    init() {
        let token = KeychainSessionStore.loadToken() ?? "local-session-token"
        session = AuthSession(token: token, user: nil)
        Task {
            await refreshProductsAndEntitlements()
        }
    }

    var token: String? {
        session?.token
    }

    var planName: String {
        isPro ? "Pro Lifetime" : "Free"
    }

    var proPriceText: String {
        proProduct?.displayPrice ?? "$7.99"
    }

    var remainingAnalyses: Int {
        isPro ? Int.max : UsageLimiter.remainingAnalyses(in: usageSnapshot)
    }

    var remainingImprovements: Int {
        isPro ? Int.max : UsageLimiter.remainingImprovements(in: usageSnapshot)
    }

    var canAnalyze: Bool {
        isPro || remainingAnalyses > 0
    }

    var canImprove: Bool {
        isPro || remainingImprovements > 0
    }

    var canSaveNewVariant: Bool {
        isPro || LocalStorageManager.shared.loadHistory().count < UsageLimiter.freeSavedVariants
    }

    var savedVariantCount: Int {
        LocalStorageManager.shared.loadHistory().count
    }

    func recordSuccessfulAnalysis() {
        guard !isPro else { return }
        usageSnapshot = UsageLimiter.recordAnalysis()
    }

    func recordSuccessfulImprovement() {
        guard !isPro else { return }
        usageSnapshot = UsageLimiter.recordImprovement()
    }

    func refreshProductsAndEntitlements() async {
        do {
            proProduct = try await Product.products(for: [Self.proProductId]).first
        } catch {
            purchaseMessage = "Unable to load Pro purchase options right now."
        }
        await refreshEntitlements()
    }

    func purchasePro() async {
        isPurchasing = true
        purchaseMessage = nil
        defer { isPurchasing = false }

        do {
            if proProduct == nil {
                proProduct = try await Product.products(for: [Self.proProductId]).first
            }

            guard let proProduct else {
                purchaseMessage = "Pro purchase is not available in this build. Check the App Store Connect product or use a StoreKit test configuration in Simulator."
                return
            }

            let result = try await proProduct.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                isPro = true
                await transaction.finish()
                purchaseMessage = "Rezumate Pro unlocked."
            case .userCancelled:
                break
            case .pending:
                purchaseMessage = "Purchase pending approval."
            @unknown default:
                purchaseMessage = "Purchase could not be completed."
            }
        } catch {
            purchaseMessage = error.localizedDescription
        }
    }

    func restorePurchases() async {
        purchaseMessage = nil
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            purchaseMessage = isPro ? "Rezumate Pro restored." : "No Pro purchase found for this Apple ID."
        } catch {
            purchaseMessage = error.localizedDescription
        }
    }

    private func refreshEntitlements() async {
        var hasPro = false
        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(entitlement) else { continue }
            if transaction.productID == Self.proProductId {
                hasPro = true
            }
        }
        isPro = hasPro
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe):
            return safe
        case .unverified:
            throw APIClientError.server("Purchase could not be verified.")
        }
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
        LocalStorageManager.shared.clearTransientVariants()
    }
}
