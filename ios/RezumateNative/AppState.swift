import Combine
import Foundation

enum EntitlementState: Equatable {
    case loading
    case free
    /// Bought the old one-time unlock. No longer sold; kept for existing buyers.
    case lifetime
    /// Active Rezumate Pro subscription: everything lifetime unlocks, plus AI.
    case subscription
}

@MainActor
final class AppState: ObservableObject {
    static let lifetimeProductId = "rezumate_pro_lifetime"
    static let monthlyProductId = "rezumate_ai_monthly"
    static let yearlyProductId = "rezumate_ai_yearly"
    static let subscriptionProductIds = [monthlyProductId, yearlyProductId]
    private static let aiConsentKey = "rezumate.ai.consent"

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
    @Published var purchaseMessage: String?
    @Published var isPurchasing = false
    @Published var isRestoring = false
    @Published private(set) var aiAccess: AIAccess?
    @Published private(set) var subscriptionListings: [String: StoreProductListing] = [:]
    /// "Also mentioned in this job" terms by variant id, so each analysis asks the AI once.
    var aiRequirementsCache: [UUID: [String]] = [:]
    @Published var aiConsentGiven: Bool {
        didSet { UserDefaults.standard.set(aiConsentGiven, forKey: Self.aiConsentKey) }
    }

    let api = APIClient()
    let ai: AIRewriteService
    private let aiClient: AIClient
    private let storeKit: any StoreKitServing
    private var transactionUpdatesTask: Task<Void, Never>?

    init(
        storeKit: any StoreKitServing = AppStoreKitService(),
        aiClient: AIClient = .shared,
        automaticallyRefresh: Bool = true
    ) {
        self.storeKit = storeKit
        self.aiClient = aiClient
        self.ai = AIRewriteService(client: aiClient)
        self.aiConsentGiven = UserDefaults.standard.bool(forKey: Self.aiConsentKey)
        let token = KeychainSessionStore.loadToken() ?? "local-session-token"
        session = AuthSession(token: token, user: nil)
        transactionUpdatesTask = observeTransactionUpdates()
        if automaticallyRefresh {
            Task {
                await refreshProductsAndEntitlements()
                await refreshAI()
            }
        }
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    var token: String? { session?.token }
    var isPro: Bool { entitlementState == .lifetime || entitlementState == .subscription }
    var hasSubscription: Bool { entitlementState == .subscription }
    var entitlementsLoaded: Bool { entitlementState != .loading }

    var planName: String {
        switch entitlementState {
        case .loading: "Checking purchase..."
        case .free: "Free"
        case .lifetime: "Pro Lifetime"
        case .subscription: "Rezumate Pro"
        }
    }

    var monthlyPriceText: String? { subscriptionListings[Self.monthlyProductId]?.displayPrice }
    var yearlyPriceText: String? { subscriptionListings[Self.yearlyProductId]?.displayPrice }

    /// Short price line for upsell copy, e.g. "$29.99/year or $4.99/month".
    var subscriptionPriceText: String? {
        switch (yearlyPriceText, monthlyPriceText) {
        case let (yearly?, monthly?): "\(yearly)/year or \(monthly)/month"
        case let (yearly?, nil): "\(yearly)/year"
        case let (nil, monthly?): "\(monthly)/month"
        case (nil, nil): nil
        }
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
        var failed = false
        for productId in Self.subscriptionProductIds where subscriptionListings[productId] == nil {
            do {
                if let listing = try await storeKit.productListing(for: productId) {
                    subscriptionListings[productId] = listing
                }
            } catch {
                failed = true
            }
        }
        await refreshEntitlements()
        if subscriptionListings.isEmpty, !hasSubscription {
            purchaseMessage = failed
                ? "Unable to load Pro purchase options right now."
                : "Pro pricing is temporarily unavailable."
        }
    }

    func refreshForActiveScene() async {
        usageSnapshot = UsageLimiter.loadSnapshot()
        await refreshProductsAndEntitlements()
        await refreshAI()
    }

    // MARK: - AI

    var isAIConfigured: Bool { aiClient.isConfigured }
    var hasAIActions: Bool { aiAccess?.hasActions ?? false }

    /// Re-checks AI access with the Worker.
    func refreshAI() async {
        guard isAIConfigured else { return }
        await syncAIEntitlements()
    }

    /// Sends current App Store transactions to the Worker, which verifies them with Apple.
    func syncAIEntitlements() async {
        guard isAIConfigured else { return }
        let ids = await storeKit.currentTransactionIDs()
        do {
            aiAccess = try await aiClient.syncEntitlements(transactionIDs: ids)
        } catch {
            if aiAccess == nil { aiAccess = try? await aiClient.access() }
        }
    }

    func updateAIAccess(_ access: AIAccess) {
        aiAccess = access
    }

    func purchaseSubscription(_ productId: String) async {
        isPurchasing = true
        purchaseMessage = nil
        defer { isPurchasing = false }
        do {
            switch try await storeKit.purchase(productID: productId) {
            case .purchased:
                await refreshEntitlements()
                await syncAIEntitlements()
                purchaseMessage = "Rezumate Pro is active."
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
            await syncAIEntitlements()
            purchaseMessage = isPro ? "Rezumate Pro restored." : "No Rezumate Pro purchase found for this Apple ID."
        } catch {
            purchaseMessage = error.localizedDescription
        }
    }

    private func observeTransactionUpdates() -> Task<Void, Never> {
        let updates = storeKit.transactionUpdates()
        return Task { [weak self] in
            for await _ in updates {
                guard !Task.isCancelled, let self else { return }
                await self.refreshEntitlements()
                await self.syncAIEntitlements()
            }
        }
    }

    /// Reads entitlements straight from StoreKit, so Pro features work even when the AI Worker is unreachable.
    private func refreshEntitlements() async {
        var hasSubscription = false
        for productId in Self.subscriptionProductIds where await storeKit.hasActiveEntitlement(for: productId) {
            hasSubscription = true
        }
        if hasSubscription {
            entitlementState = .subscription
        } else if await storeKit.hasActiveEntitlement(for: Self.lifetimeProductId) {
            entitlementState = .lifetime
        } else {
            entitlementState = .free
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

    private static var marketingVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
    }
}
