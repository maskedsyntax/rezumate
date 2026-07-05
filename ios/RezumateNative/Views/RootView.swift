import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        MainTabsView()
    }
}

struct MainTabsView: View {
    var body: some View {
        TabView {
            AnalyzeView()
                .tabItem {
                    Label("Analyze", systemImage: "sparkles")
                }

            HistoryView()
                .tabItem {
                    Label("History", systemImage: "clock")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
        }
        .tint(RezTheme.primary)
    }
}
