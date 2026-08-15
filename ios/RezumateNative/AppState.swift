import Combine
import Foundation

enum EntitlementState: Equatable {
    case loading
    case free
    case pro
}

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
    @Published private(set) var entitlementState: EntitlementState = .loading
    @Published private(set) var proProductListing: StoreProductListing?
    @Published var purchaseMessage: String?
    @Published var isPurchasing = false
    @Published var isRestoring = false

    let api = APIClient()
    private let storeKit: any StoreKitServing
    private var transactionUpdatesTask: Task<Void, Never>?

    init(storeKit: any StoreKitServing = AppStoreKitService(), automaticallyRefresh: Bool = true) {
        self.storeKit = storeKit
        let token = KeychainSessionStore.loadToken() ?? "local-session-token"
        session = AuthSession(token: token, user: nil)
        transactionUpdatesTask = observeTransactionUpdates()
        if automaticallyRefresh {
            Task {
                await refreshProductsAndEntitlements()
            }
        }
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    var token: String? { session?.token }
    var isPro: Bool { entitlementState == .pro }
    var entitlementsLoaded: Bool { entitlementState != .loading }

    var planName: String {
        switch entitlementState {
        case .loading: "Checking purchase..."
        case .free: "Free"
        case .pro: "Pro Lifetime"
        }
    }

    var proPriceText: String? { proProductListing?.displayPrice }
    var canPurchasePro: Bool {
        entitlementState == .free
            && proProductListing != nil
            && !isPurchasing
            && !isRestoring
    }

    var remainingAnalyses: Int {
        isPro ? Int.max : UsageLimiter.remainingAnalyses(in: usageSnapshot)
    }

    var remainingImprovements: Int {
        isPro ? Int.max : UsageLimiter.remainingImprovements(in: usageSnapshot)
    }

    var canAnalyze: Bool { entitlementsLoaded && (isPro || remainingAnalyses > 0) }
    var canImprove: Bool { entitlementsLoaded && (isPro || remainingImprovements > 0) }

    var canSaveNewVariant: Bool {
        entitlementsLoaded
            && (isPro || LocalStorageManager.shared.loadHistory().count < UsageLimiter.freeSavedVariants)
    }

    var savedVariantCount: Int { LocalStorageManager.shared.loadHistory().count }

    func recordSuccessfulAnalysis() {
        ReviewPromptTracker.recordSuccessfulAnalysis()
        guard !isPro else { return }
        usageSnapshot = UsageLimiter.recordAnalysis()
    }

    func recordSuccessfulImprovement() {
        guard !isPro else { return }
        usageSnapshot = UsageLimiter.recordImprovement()
    }

    func recordSuccessfulExport() {
        ReviewPromptTracker.recordSuccessfulExport()
    }

    func shouldRequestReview() -> Bool {
        ReviewPromptTracker.isEligible(marketingVersion: Self.marketingVersion)
            && !isPurchasing
            && !isRestoring
            && purchaseMessage == nil
    }

    func markReviewRequested() {
        ReviewPromptTracker.markPrompted(marketingVersion: Self.marketingVersion)
    }

    func refreshProductsAndEntitlements() async {
        do {
            proProductListing = try await storeKit.productListing(for: Self.proProductId)
            if proProductListing == nil {
                purchaseMessage = "Pro pricing is temporarily unavailable."
            }
        } catch {
            proProductListing = nil
            purchaseMessage = "Unable to load Pro purchase options right now."
        }
        await refreshEntitlements()
        if isPro, proProductListing == nil {
            purchaseMessage = nil
        }
    }

    func refreshForActiveScene() async {
        usageSnapshot = UsageLimiter.loadSnapshot()
        await refreshProductsAndEntitlements()
    }

    func purchasePro() async {
        isPurchasing = true
        purchaseMessage = nil
        defer { isPurchasing = false }

        do {
            if proProductListing == nil {
                proProductListing = try await storeKit.productListing(for: Self.proProductId)
            }

            guard proProductListing != nil else {
                purchaseMessage = "Pro pricing is unavailable right now. Please try again later."
                return
            }

            switch try await storeKit.purchase(productID: Self.proProductId) {
            case .purchased:
                await refreshEntitlements()
                purchaseMessage = "Rezumate Pro unlocked."
            case .cancelled:
                break
            case .pending:
                purchaseMessage = "Purchase pending approval."
            }
        } catch {
            purchaseMessage = error.localizedDescription
        }
    }

    func restorePurchases() async {
        isRestoring = true
        purchaseMessage = nil
        defer { isRestoring = false }
        do {
            try await storeKit.sync()
            await refreshEntitlements()
            purchaseMessage = isPro ? "Rezumate Pro restored." : "No Pro purchase found for this Apple ID."
        } catch {
            purchaseMessage = error.localizedDescription
        }
    }

    private func observeTransactionUpdates() -> Task<Void, Never> {
        let updates = storeKit.transactionUpdates(for: Self.proProductId)
        return Task { [weak self] in
            for await hasPro in updates {
                guard !Task.isCancelled, let self else { return }
                self.entitlementState = hasPro ? .pro : .free
            }
        }
    }

    private func refreshEntitlements() async {
        let hasPro = await storeKit.hasActiveEntitlement(for: Self.proProductId)
        entitlementState = hasPro ? .pro : .free
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

    private static var marketingVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
    }
}
