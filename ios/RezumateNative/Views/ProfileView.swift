import SwiftUI
import UIKit

struct ProfileView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    RezCard(padding: 18) {
                        HStack(spacing: 14) {
                            Image(systemName: "person.crop.circle.badge.checkmark")
                                .font(.system(size: 44, weight: .bold))
                                .foregroundStyle(RezTheme.ink)
                                .frame(width: 54, height: 54)
                                .background(RezTheme.blueWash, in: RoundedRectangle(cornerRadius: 6))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(RezTheme.ink, lineWidth: 2)
                                }

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Local workspace")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(RezTheme.ink)
                                
                                Text("PRIVATE ON-DEVICE")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundStyle(RezTheme.ink)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    .background(RezTheme.warning, in: RoundedRectangle(cornerRadius: 4))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 4)
                                            .stroke(RezTheme.ink, lineWidth: 2)
                                    }
                            }

                            Spacer()
                        }
                    }
                    
                    RezCard {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionTitle("Privacy")
                            Text("Resume parsing, scoring, suggestions, history, and export run locally on this device.")
                                .font(.caption)
                                .foregroundStyle(RezTheme.muted)
                        }
                    }

                    RezCard {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                SectionTitle("Rezumate Pro", subtitle: "Pay once. Optimize unlimited resumes privately on your iPhone.")
                                Spacer()
                                RezStatusPill(text: proStatusText, color: appState.isPro ? RezTheme.success : RezTheme.warning)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                PlanFeatureRow(text: "Unlimited analyses")
                                PlanFeatureRow(text: "Unlimited resume improvements")
                                PlanFeatureRow(text: "Unlimited saved variants")
                                PlanFeatureRow(text: "Full ATS diagnosis and keyword insights")
                            }

                            Text(proPriceMessage)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)

                            if let purchaseMessage = appState.purchaseMessage {
                                Text(purchaseMessage)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(RezTheme.muted)
                            }

                            if appState.entitlementState == .free {
                                Button {
                                    Task { await appState.purchasePro() }
                                } label: {
                                    Label(appState.isPurchasing ? "Unlocking..." : "Unlock Pro", systemImage: "sparkles")
                                }
                                .buttonStyle(RezPrimaryButtonStyle())
                                .disabled(!appState.canPurchasePro)
                            }

                            Button {
                                Task { await appState.restorePurchases() }
                            } label: {
                                Label(appState.isRestoring ? "Restoring..." : "Restore Purchase", systemImage: "arrow.clockwise")
                            }
                            .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.surface))
                            .disabled(appState.isPurchasing || appState.isRestoring)
                        }
                    }

                    RezCard {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionTitle("Help & Feedback", subtitle: "Contact us without attaching any resume or job-description data.")
                            profileLink("Email Feedback", icon: "envelope", url: emailURL(subject: "Rezumate Feedback"))
                            profileLink("Report a Problem", icon: "exclamationmark.bubble", url: emailURL(subject: "Rezumate Problem Report"))
                            profileLink("Request a Feature", icon: "lightbulb", url: emailURL(subject: "Rezumate Feature Request"))
                            Divider()
                            profileLink("Support", icon: "questionmark.circle", url: URL(string: "https://rezumate.app/support")!)
                            profileLink("Privacy Policy", icon: "hand.raised", url: URL(string: "https://rezumate.app/privacy")!)
                            profileLink("Terms", icon: "doc.text", url: URL(string: "https://rezumate.app/terms")!)
                        }
                    }
                    
                    RezCard {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionTitle("Local Data")
                            Button(role: .destructive) {
                                appState.signOut()
                            } label: {
                                Label("Clear Current Analysis", systemImage: "trash")
                            }
                            .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.error))
                        }
                    }
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationTitle("Profile")
        }
    }

    private var proStatusText: String {
        switch appState.entitlementState {
        case .loading: "CHECKING"
        case .free: "ONE-TIME"
        case .pro: "ACTIVE"
        }
    }

    private var proPriceMessage: String {
        switch appState.entitlementState {
        case .loading:
            return "Checking your App Store purchase..."
        case .pro:
            return "Lifetime Pro is active on this device."
        case .free:
            if let price = appState.proPriceText {
                return "One-time purchase: \(price)."
            }
            return "Price unavailable. Restore Purchase remains available."
        }
    }

    private func profileLink(_ title: String, icon: String, url: URL) -> some View {
        Link(destination: url) {
            HStack {
                Label(title, systemImage: icon)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RezTheme.ink)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(RezTheme.muted)
            }
            .padding(.vertical, 4)
        }
    }

    private func emailURL(subject: String) -> URL {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Unknown"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "Unknown"
        let body = "\n\nApp: Rezumate \(version) (\(build))\niOS: \(UIDevice.current.systemVersion)"
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = "aftaab@aftaab.dev"
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body),
        ]
        return components.url!
    }
}

private struct PlanFeatureRow: View {
    let text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(RezTheme.success)
            Text(text)
                .font(.caption.weight(.semibold))
                .foregroundStyle(RezTheme.ink)
            Spacer(minLength: 0)
        }
    }
}
