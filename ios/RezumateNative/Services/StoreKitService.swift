import Foundation
import StoreKit

struct StoreProductListing: Equatable {
    let displayPrice: String
}

enum StorePurchaseOutcome: Equatable {
    case purchased
    case pending
    case cancelled
}

protocol StoreKitServing {
    func productListing(for productID: String) async throws -> StoreProductListing?
    func hasActiveEntitlement(for productID: String) async -> Bool
    func purchase(productID: String) async throws -> StorePurchaseOutcome
    func sync() async throws
    func transactionUpdates(for productID: String) -> AsyncStream<Bool>
}

actor AppStoreKitService: StoreKitServing {
    private var products: [String: Product] = [:]

    func productListing(for productID: String) async throws -> StoreProductListing? {
        guard let product = try await product(for: productID) else { return nil }
        return StoreProductListing(displayPrice: product.displayPrice)
    }

    func hasActiveEntitlement(for productID: String) async -> Bool {
        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? Self.checkVerified(entitlement) else { continue }
            if transaction.productID == productID, transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }

    func purchase(productID: String) async throws -> StorePurchaseOutcome {
        guard let product = try await product(for: productID) else {
            throw StoreKitServiceError.productUnavailable
        }

        switch try await product.purchase() {
        case .success(let verification):
            let transaction = try Self.checkVerified(verification)
            await transaction.finish()
            return .purchased
        case .pending:
            return .pending
        case .userCancelled:
            return .cancelled
        @unknown default:
            throw StoreKitServiceError.unknownPurchaseResult
        }
    }

    func sync() async throws {
        try await AppStore.sync()
    }

    nonisolated func transactionUpdates(for productID: String) -> AsyncStream<Bool> {
        AsyncStream { continuation in
            let task = Task {
                for await update in Transaction.updates {
                    guard !Task.isCancelled,
                          let transaction = try? Self.checkVerified(update),
                          transaction.productID == productID else {
                        continue
                    }
                    await transaction.finish()
                    continuation.yield(transaction.revocationDate == nil)
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func product(for productID: String) async throws -> Product? {
        if let cached = products[productID] { return cached }
        guard let product = try await Product.products(for: [productID]).first else { return nil }
        products[productID] = product
        return product
    }

    private nonisolated static func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe): return safe
        case .unverified: throw StoreKitServiceError.unverifiedTransaction
        }
    }
}

enum StoreKitServiceError: Error, LocalizedError {
    case productUnavailable
    case unverifiedTransaction
    case unknownPurchaseResult

    var errorDescription: String? {
        switch self {
        case .productUnavailable:
            return "Pro pricing is unavailable right now. Please try again later."
        case .unverifiedTransaction:
            return "Purchase could not be verified."
        case .unknownPurchaseResult:
            return "Purchase could not be completed."
        }
    }
}
