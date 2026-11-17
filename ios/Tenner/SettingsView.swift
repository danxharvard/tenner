import SwiftUI

/// Settings: the look (Day, Night or Auto, changed with Waves), Animations, My services, the Watchlist and the account.
struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @Environment(Library.self) private var library
    @Environment(DataStore.self) private var data
    @Environment(Waves.self) private var waves
    @State private var confirmClear = false
    @State private var picked = 0

    private var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "\(v) (\(b))"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Heading("Settings", style: .largeTitle).padding(.top, 12)
                    look
                    services
                    watchlist
                    account
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tenner for iPhone \(version)")
                        Text("This app uses the TMDB API but is not endorsed or certified by TMDB.")
                    }
                    .font(.footnote).foregroundStyle(.tertiary)
                    .padding(.top, 8)
                }
                .padding(.horizontal, Tn.gutter)
                .padding(.bottom, 32)
            }
            .background(Ambient())
            .toolbar(.hidden, for: .navigationBar)
            .sensoryFeedback(.selection, trigger: picked)
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Heading(title, style: .title2)
            content()
        }
        .padding(.top, 8)
    }

    // MARK: the look

    private var look: some View {
        section("The look") {
            // a button group: joined, hairline joins, the corner on the outside only
            HStack(spacing: 0) {
                ForEach(Array(Appearance.allCases.enumerated()), id: \.element) { i, a in
                    if i > 0 { Rectangle().fill(Color(.separator)).frame(width: 1 / 3).padding(.vertical, 10) }
                    segment(a)
                }
            }
            .background(Tn.shape.fill(Color(.tertiarySystemFill)))
            .overlay(Tn.shape.strokeBorder(Color.primary.opacity(0.14), lineWidth: 0.5))

            card {
                Toggle(isOn: Binding(get: { settings.animations }, set: { settings.setAnimations($0) })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Animations")
                        Text("Waves when you change the look, and gentle motion. Reduce Motion always wins.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func segment(_ a: Appearance) -> some View {
        let on = settings.appearance == a
        return VStack(spacing: 6) {
            Image(systemName: a.icon).font(.system(size: 20, weight: .medium))
            Text(a.label).font(.system(.subheadline, weight: .medium))
            Underline().frame(width: 26).opacity(on ? 1 : 0)
        }
        .foregroundStyle(on ? Color.primary : Color.secondary)
        .frame(maxWidth: .infinity, minHeight: 76)
        .contentShape(Rectangle())
        .onTapGesture(coordinateSpace: .global) { at in choose(a, at: at) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(a.label)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
        .accessibilityAction {
            let b = UIApplication.shared.tnKeyWindow?.bounds ?? .zero
            choose(a, at: CGPoint(x: b.midX, y: b.midY))
        }
    }

    private func choose(_ a: Appearance, at point: CGPoint) {
        guard a != settings.appearance else { return }
        picked += 1
        waves.change(from: point, animated: settings.animations) { settings.setAppearance(a) }
    }

    // MARK: My services (the iOS Subscriptions card)

    private var services: some View {
        let all = data.trending?.services ?? []
        let keys = all.map(\.key)
        return section("My services") {
            card {
                Toggle(isOn: Binding(get: { settings.services.isEmpty }, set: { on in
                    if on { settings.setAll() } else if let first = keys.first { settings.setService(first, on: false, all: keys) }
                })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("All services")
                        Text("Top 10s and Browse show every service.").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
            if !all.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(all.enumerated()), id: \.element.id) { i, s in
                        Toggle(isOn: Binding(get: { settings.has(s.key) }, set: { settings.setService(s.key, on: $0, all: keys) })) {
                            HStack(spacing: 12) {
                                ServiceLogo(service: s, size: 34)
                                Text(s.label)
                            }
                        }
                        .padding(.vertical, 9)
                        .overlay(alignment: .bottom) {
                            if i < all.count - 1 { Rectangle().fill(Color(.separator)).frame(height: 1 / 3).padding(.leading, 46) }
                        }
                    }
                }
                .padding(.horizontal, 14)
                .frost()
            }
        }
    }

    // MARK: Watchlist and account

    private var watchlist: some View {
        section("Watchlist") {
            card {
                HStack {
                    Text(library.items.isEmpty ? "Nothing saved yet" : "\(library.items.count) saved on this iPhone")
                    Spacer()
                }
            }
            if !library.items.isEmpty {
                Button(role: .destructive) { confirmClear = true } label: { Label("Clear Watchlist", systemImage: "trash") }
                    .buttonStyle(TnButton(kind: .delete))
                    .confirmationDialog("Clear your Watchlist?", isPresented: $confirmClear, titleVisibility: .visible) {
                        Button("Clear Watchlist", role: .destructive) { withAnimation { library.clear() } }
                    } message: {
                        Text("Everything you've saved on this iPhone will be removed.")
                    }
            }
        }
    }

    private var account: some View {
        section("Your account") {
            card {
                VStack(alignment: .leading, spacing: 12) {
                    Text("For now your Watchlist and settings are kept on this iPhone. Signing in to share them with tenner.stream is coming next.")
                        .foregroundStyle(.secondary)
                    Link(destination: URL(string: "https://tenner.stream")!) {
                        Label("Open tenner.stream", systemImage: "safari")
                    }
                    .buttonStyle(TnButton())
                }
            }
        }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frost()
    }
}
