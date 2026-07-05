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
