import SwiftUI
import UIKit

struct ProfileView: View {
    @EnvironmentObject private var appState: AppState
    @State private var isShowingPaywall = false

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
                            Text("Resume parsing, scoring, keyword checks, history, and export run on this device. AI features send only the needed resume text and job description to OpenAI, with your contact details removed, and nothing is stored.")
                                .font(.caption)
                                .foregroundStyle(RezTheme.muted)
                        }
                    }

                    RezCard {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                SectionTitle("Rezumate Pro", subtitle: "Unlimited resumes, full diagnosis, and AI rewrites.")
                                Spacer()
                                RezStatusPill(text: proStatusText, color: appState.isPro ? RezTheme.success : RezTheme.warning)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                PlanFeatureRow(text: "Unlimited analyses")
                                PlanFeatureRow(text: "Unlimited resume improvements")
                                PlanFeatureRow(text: "Unlimited saved variants")
                                PlanFeatureRow(text: "Full ATS diagnosis and keyword insights")
                                if appState.isAIConfigured {
                                    PlanFeatureRow(text: "AI rewrites, Improve Resume, and cover letters")
                                }
                            }

                            Text(proPriceMessage)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)
                                .fixedSize(horizontal: false, vertical: true)

                            if appState.isAIConfigured, let access = appState.aiAccess {
                                Text(aiAccessDetail(access))
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(RezTheme.muted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }

                            if let purchaseMessage = appState.purchaseMessage {
                                Text(purchaseMessage)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(RezTheme.muted)
                            }

                            switch appState.entitlementState {
                            case .subscription:
                                Link(destination: URL(string: "https://apps.apple.com/account/subscriptions")!) {
                                    Label("Manage subscription", systemImage: "gearshape")
                                }
                                .buttonStyle(RezSecondaryButtonStyle())
                            case .free, .lifetime:
                                Button {
                                    isShowingPaywall = true
                                } label: {
                                    Label(appState.entitlementState == .lifetime ? "Add AI" : "See Pro plans", systemImage: "sparkles")
                                }
                                .buttonStyle(RezPrimaryButtonStyle())
                            case .loading:
                                EmptyView()
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
            .sheet(isPresented: $isShowingPaywall) {
                ProPaywallSheet()
            }
        }
    }

    private func aiAccessDetail(_ access: AIAccess) -> String {
        var parts: [String] = []
        if appState.hasSubscription {
            parts.append("\(access.monthlyRemaining) AI actions left this month")
        }
        if access.bonusRemaining > 0 {
            parts.append("\(access.bonusRemaining) bonus actions from Pro")
        }
        if access.trialRemaining > 0 {
            parts.append("\(access.trialRemaining) free trial actions")
        }
        if parts.isEmpty {
            return appState.hasSubscription ? "Your AI actions are updating." : "No AI actions left. Subscribe to keep using AI."
        }
        return parts.joined(separator: " · ")
    }

    private var proStatusText: String {
        switch appState.entitlementState {
        case .loading: "CHECKING"
        case .free: "FREE"
        case .lifetime: "LIFETIME"
        case .subscription: "ACTIVE"
        }
    }

    private var proPriceMessage: String {
        switch appState.entitlementState {
        case .loading:
            return "Checking your App Store purchase..."
        case .subscription:
            return "Rezumate Pro is active."
        case .lifetime:
            return "Pro Lifetime is active. AI is part of the Rezumate Pro subscription."
        case .free:
            if let price = appState.subscriptionPriceText {
                return "\(price). Cancel anytime."
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
