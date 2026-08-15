import SwiftUI

@main
struct RezumateNativeApp: App {
    @StateObject private var appState = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .preferredColorScheme(.light)
                .onOpenURL { url in
                    appState.importResumeFromExternalURL(url)
                }
                .onChange(of: scenePhase) { _, newPhase in
                    guard newPhase == .active else { return }
                    Task { await appState.refreshForActiveScene() }
                }
        }
    }
}
