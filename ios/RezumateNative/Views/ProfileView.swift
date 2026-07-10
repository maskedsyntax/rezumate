import SwiftUI

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
                                RezStatusPill(text: appState.isPro ? "ACTIVE" : "ONE-TIME", color: appState.isPro ? RezTheme.success : RezTheme.warning)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                PlanFeatureRow(text: "Unlimited analyses")
                                PlanFeatureRow(text: "Unlimited resume improvements")
                                PlanFeatureRow(text: "Unlimited saved variants")
                                PlanFeatureRow(text: "Full ATS diagnosis and keyword insights")
                            }

                            Text(appState.isPro ? "Lifetime Pro is active on this device." : "Launch price: $7.99. Regular price: $14.99.")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)

                            if let purchaseMessage = appState.purchaseMessage {
                                Text(purchaseMessage)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(RezTheme.muted)
                            }

                            if !appState.isPro {
                                Button {
                                    Task { await appState.purchasePro() }
                                } label: {
                                    Label(appState.isPurchasing ? "Unlocking..." : "Unlock Pro", systemImage: "sparkles")
                                }
                                .buttonStyle(RezPrimaryButtonStyle())
                                .disabled(appState.isPurchasing)
                            }

                            Button {
                                Task { await appState.restorePurchases() }
                            } label: {
                                Label("Restore Purchase", systemImage: "arrow.clockwise")
                            }
                            .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.surface))
                            .disabled(appState.isPurchasing)
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
