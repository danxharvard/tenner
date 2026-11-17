import SwiftUI

@main
struct TennerApp: App {
    @State private var data = DataStore()
    @State private var library = Library()
    @State private var settings = AppSettings()
    @State private var router = Router()
    @State private var waves = Waves()

    init() {
        // posters and logos stay on the phone, so they come back instantly
        URLCache.shared = URLCache(memoryCapacity: 64 * 1024 * 1024, diskCapacity: 512 * 1024 * 1024)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(data)
                .environment(library)
                .environment(settings)
                .environment(router)
                .environment(waves)
        }
    }
}

struct RootView: View {
    @Environment(DataStore.self) private var data
    @Environment(AppSettings.self) private var settings
    @Environment(Router.self) private var router
    @Environment(Library.self) private var library
    @Environment(Waves.self) private var waves
    @Environment(\.scenePhase) private var phase

    var body: some View {
        @Bindable var router = router
        ZStack(alignment: .topLeading) {
            TabView(selection: $router.tab) {
                HomeView().tabItem { Label("Home", systemImage: "house.fill") }.tag(Router.Tab.home)
                BrowseView().tabItem { Label("Browse", systemImage: "square.grid.2x2.fill") }.tag(Router.Tab.browse)
                WatchlistView().tabItem { Label("Watchlist", systemImage: "bookmark.fill") }.tag(Router.Tab.watchlist)
                SettingsView().tabItem { Label("Settings", systemImage: "gearshape.fill") }.tag(Router.Tab.settings)
            }
            .tint(.primary)
            .sheet(item: $router.sheet) { t in
                TitleSheet(title: t)
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(Tn.r)
                    .presentationBackground(Color(.systemBackground))
                    .environment(library)
            }
            WavesOverlay().ignoresSafeArea()
        }
        .task { await data.load() }
        .task { await screenshotSetup() }
        .onAppear { settings.applyTheme() }
        .onChange(of: phase) { _, now in
            if now == .active { settings.applyTheme(); Task { await data.refreshIfStale() } }
        }
    }

    /// For the screenshots GitHub takes on every change (.github/workflows/ios.yml): `-tennerShot browse` etc. opens
    /// that screen. Debug builds only; it does nothing in the App Store build.
    private func screenshotSetup() async {
        #if DEBUG
        guard let shot = UserDefaults.standard.string(forKey: "tennerShot") else { return }
        switch shot {
        case "browse": router.tab = .browse
        case "watchlist": router.tab = .watchlist
        case "settings", "waves": router.tab = .settings
        default: break
        }
        for _ in 0..<60 where data.trending == nil { try? await Task.sleep(for: .milliseconds(250)) }
        let shows = data.trending?.overall?.tv ?? []
        if shot == "sheet", let t = shows.first { router.sheet = t }
        if shot == "watchlist", library.items.isEmpty { for t in shows.prefix(5).reversed() { library.toggle(t) } }
        if shot == "waves" {
            try? await Task.sleep(for: .seconds(4))
            let b = UIApplication.shared.tnKeyWindow?.bounds ?? .zero
            waves.change(from: CGPoint(x: b.midX, y: b.height * 0.3), animated: true) { settings.setAppearance(.night) }
        }
        #endif
    }
}
