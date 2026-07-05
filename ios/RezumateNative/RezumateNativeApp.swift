import SwiftUI

@main
struct RezumateNativeApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .preferredColorScheme(.light)
                .onOpenURL { url in
                    appState.importResumeFromExternalURL(url)
                }
        }
    }
}
