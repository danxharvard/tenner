import SwiftUI
import UIKit

// Where the app gets its data, and what it keeps on the phone.

enum API {
    /// the site's own data files; read from the workers.dev address (tenner.stream itself turns away apps with its bot check)
    static let site = URL(string: "https://tenner-site.danseacroft.workers.dev")!
    /// the search service the website uses
    static let api = URL(string: "https://tenner-api.danseacroft.workers.dev")!

    static func data(_ url: URL, asSite: Bool = false) async throws -> Data {
        var req = URLRequest(url: url, timeoutInterval: 20)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        // the search service only answers Tenner's own pages
        if asSite { req.setValue("https://tenner.stream", forHTTPHeaderField: "Origin") }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard let http = res as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        return data
    }

    static func search(_ q: String) async throws -> [Title] {
        var c = URLComponents(url: api.appending(path: "search"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "q", value: q)]
        let d = try await data(c.url!, asSite: true)
        return try JSONDecoder().decode(SearchPage.self, from: d).titles
    }

    static func details(_ t: Title) async throws -> Details {
        let d = try await data(api.appending(path: "title/\(t.key)"), asSite: true)
        return try JSONDecoder().decode(Details.self, from: d)
    }
}

/// The charts and catalogue: shown straight away from the last copy on the phone, then refreshed.
@Observable @MainActor
final class DataStore {
    var trending: Trending?
    var catalogue: Catalogue?
    var failed = false
    var loading = false
    private var fetchedAt: Date?

    private static let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]

    func load() async {
        if trending == nil, let d = try? Data(contentsOf: Self.dir.appending(path: "trending.json")) { trending = try? JSONDecoder().decode(Trending.self, from: d) }
        if catalogue == nil, let d = try? Data(contentsOf: Self.dir.appending(path: "browse.json")) { catalogue = try? JSONDecoder().decode(Catalogue.self, from: d) }
        await refresh()
    }

    /// quietly, at most every quarter of an hour (the site checks on the same beat)
    func refreshIfStale() async {
        if let at = fetchedAt, Date().timeIntervalSince(at) < 15 * 60 { return }
        await refresh()
    }

    private nonisolated static func file(_ name: String) async -> Data? {
        try? await API.data(API.site.appending(path: "data/\(name)"))
    }

    func refresh() async {
        loading = true
        defer { loading = false }
        async let t = Self.file("trending.json")
        async let b = Self.file("browse.json")
        let (td, bd) = await (t, b)
        if let td, let v = try? JSONDecoder().decode(Trending.self, from: td) {
            trending = v
            try? td.write(to: Self.dir.appending(path: "trending.json"))
        }
        if let bd, let v = try? JSONDecoder().decode(Catalogue.self, from: bd) {
            catalogue = v
            try? bd.write(to: Self.dir.appending(path: "browse.json"))
        }
        failed = trending == nil
        if td != nil { fetchedAt = Date() }
    }
}

/// Which tab is showing, and the title sheet.
@Observable @MainActor
final class Router {
    var tab: Tab = .home
    var sheet: Title?
    enum Tab: Hashable { case home, browse, watchlist, settings }
}

/// The Watchlist, kept on this iPhone.
@Observable @MainActor
final class Library {
    struct Saved: Codable, Identifiable, Hashable {
        var title: Title
        var added: Date
        var id: String { title.key }
    }

    private(set) var items: [Saved] = []
    private let store = "tenner-watchlist"

    init() {
        if let d = UserDefaults.standard.data(forKey: store), let v = try? JSONDecoder().decode([Saved].self, from: d) { items = v }
    }

    func has(_ t: Title) -> Bool { items.contains { $0.id == t.key } }

    func toggle(_ t: Title) {
        if has(t) { remove(t.key) } else { items.insert(Saved(title: t, added: Date()), at: 0); save() }
    }

    func remove(_ key: String) {
        items.removeAll { $0.id == key }
        save()
    }

    func clear() { items = []; save() }

    private func save() {
        if let d = try? JSONEncoder().encode(items) { UserDefaults.standard.set(d, forKey: store) }
    }
}

enum Appearance: String, CaseIterable, Identifiable {
    case auto, day, night
    var id: String { rawValue }
    var label: String { self == .auto ? "Auto" : self == .day ? "Day" : "Night" }
    var icon: String { self == .auto ? "circle.lefthalf.filled" : self == .day ? "sun.max.fill" : "moon.fill" }
    var style: UIUserInterfaceStyle { self == .auto ? .unspecified : self == .day ? .light : .dark }
}

/// The app's settings, kept on this iPhone.
@Observable @MainActor
final class AppSettings {
    private(set) var appearance: Appearance
    private(set) var animations: Bool
    /// the services you have; empty means all of them
    private(set) var services: Set<String>

    private let d = UserDefaults.standard

    init() {
        let d = UserDefaults.standard
        appearance = Appearance(rawValue: d.string(forKey: "tenner-theme") ?? "") ?? .auto
        animations = d.object(forKey: "tenner-animations") as? Bool ?? true
        services = Set(d.stringArray(forKey: "tenner-services") ?? [])
    }

    func setAppearance(_ a: Appearance) {
        appearance = a
        d.set(a.rawValue, forKey: "tenner-theme")
        applyTheme()
    }

    func setAnimations(_ on: Bool) {
        animations = on
        d.set(on, forKey: "tenner-animations")
    }

    func has(_ key: String) -> Bool { services.isEmpty || services.contains(key) }

    func setService(_ key: String, on: Bool, all: [String]) {
        var s = services.isEmpty ? Set(all) : services
        if on { s.insert(key) } else { s.remove(key) }
        services = s.count == all.count ? [] : s
        d.set(Array(services), forKey: "tenner-services")
    }

    func setAll() {
        services = []
        d.set([String](), forKey: "tenner-services")
    }

    /// Day, Night or Auto for the whole app (sheets and alerts too), as the device's own setting does it
    func applyTheme() {
        for w in UIApplication.shared.tnWindows { w.overrideUserInterfaceStyle = appearance.style }
    }
}

extension UIApplication {
    var tnWindows: [UIWindow] { connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows) }
    var tnKeyWindow: UIWindow? { tnWindows.first { $0.isKeyWindow } ?? tnWindows.first }
}
