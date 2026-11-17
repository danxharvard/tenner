import SwiftUI

/// Browse: the whole catalogue, narrowed by service, Shows / Films / Both and genre; or search every film and show.
struct BrowseView: View {
    @Environment(DataStore.self) private var data
    @Environment(AppSettings.self) private var settings
    @Environment(Router.self) private var router
    @State private var query = ""
    @State private var results: [Title] = []
    @State private var searching = false
    @State private var searchFailed = false
    @State private var service = "all"
    @State private var kind: KindFilter = .both
    @State private var genre = 0
    @State private var shown = 60

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Heading("Browse", style: .largeTitle).padding(.horizontal, Tn.gutter).padding(.top, 4)
                    if query.trimmingCharacters(in: .whitespaces).count >= 2 { searchResults } else { catalogue }
                }
                .padding(.bottom, 24)
            }
            .background(Ambient())
            .scrollDismissesKeyboard(.immediately)
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Films and shows")
            .task(id: query) { await search() }
        }
    }

    // MARK: search (the same service as the website: forgiving of spelling slips)

    private func search() async {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard q.count >= 2 else { results = []; searching = false; return }
        searching = true
        try? await Task.sleep(for: .milliseconds(280))
        guard !Task.isCancelled else { return }
        do {
            let found = try await API.search(q)
            guard !Task.isCancelled else { return }
            results = found; searchFailed = false
        } catch {
            if !Task.isCancelled { searchFailed = true; results = [] }
        }
        searching = false
    }

    @ViewBuilder private var searchResults: some View {
        Group {
            if searching && results.isEmpty {
                SkeletonRows(count: 6)
            } else if searchFailed {
                Text("Search isn't answering just now. Try again in a moment.").foregroundStyle(.secondary)
            } else if results.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("No results").font(.headline)
                    Text("Try another spelling, or fewer words.").foregroundStyle(.secondary)
                }
            } else {
                list(results)
            }
        }
        .padding(.horizontal, Tn.gutter)
    }

    // MARK: the catalogue

    private var services: [Service] { (data.trending?.services ?? []).filter { settings.has($0.key) } }

    private var genres: [(Int, String)] {
        (data.catalogue?.genres ?? [:]).compactMap { k, v in Int(k).map { ($0, v) } }.sorted { $0.1 < $1.1 }
    }

    private var filtered: [Title] {
        guard let cat = data.catalogue else { return [] }
        let mine = Set(services.map(\.key))
        return cat.items
            .filter { x in
                let s = x.s ?? []
                let onService = service == "all" ? (settings.services.isEmpty || s.contains { mine.contains($0) }) : s.contains(service)
                return onService && (genre == 0 || (x.g ?? []).contains(genre))
            }
            .sorted { ($0.p ?? 0) > ($1.p ?? 0) }
            .map(cat.title)
            .filter(kind.allows)
    }

    @ViewBuilder private var catalogue: some View {
        if data.catalogue == nil {
            SkeletonRows(count: 8).padding(.horizontal, Tn.gutter)
        } else {
            // the services, as a rail of logos; the chosen one gets a plain line (the owner's choice for Browse)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    chip("all", label: "All services", logo: nil)
                    ForEach(services) { s in chip(s.key, label: s.label, logo: s) }
                }
                .padding(.vertical, 2)
            }
            .contentMargins(.horizontal, Tn.gutter, for: .scrollContent)
            .fadeEdges()
            .sensoryFeedback(.selection, trigger: service)

            HStack(spacing: 10) {
                dropdown(kind.label, label: "Shows, films or both") {
                    Picker("Shows, films or both", selection: $kind) { ForEach(KindFilter.allCases) { Text($0.label).tag($0) } }
                }
                dropdown(genre == 0 ? "All genres" : (genres.first { $0.0 == genre }?.1 ?? "Genre"), label: "Genre") {
                    Picker("Genre", selection: $genre) {
                        Text("All genres").tag(0)
                        ForEach(genres, id: \.0) { g in Text(g.1).tag(g.0) }
                    }
                }
                Spacer()
            }
            .padding(.horizontal, Tn.gutter)

            let all = filtered
            if all.isEmpty {
                Text("Nothing matches those choices.").foregroundStyle(.secondary).padding(.horizontal, Tn.gutter)
            } else {
                VStack(spacing: 0) {
                    list(Array(all.prefix(shown)))
                    if all.count > shown {
                        Button { shown += 60 } label: { Label("Show more", systemImage: "chevron.down") }
                            .buttonStyle(TnButton(kind: .main, wide: true))
                            .padding(.top, 12)
                    }
                }
                .padding(.horizontal, Tn.gutter)
                .onChange(of: service) { shown = 60 }
                .onChange(of: kind) { shown = 60 }
                .onChange(of: genre) { shown = 60 }
            }
        }
    }

    private func chip(_ key: String, label: String, logo: Service?) -> some View {
        Button { withAnimation(.smooth) { service = key } } label: {
            VStack(spacing: 7) {
                ServiceLogo(service: logo, size: 46)
                Underline(plain: true).frame(width: 22).opacity(service == key ? 1 : 0)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(service == key ? .isSelected : [])
    }

    /// a native dropdown (the site's .dd), in the shared frost
    private func dropdown<C: View>(_ value: String, label: String, @ViewBuilder content: () -> C) -> some View {
        Menu(content: content) {
            HStack(spacing: 4) {
                Text(value).lineLimit(1)
                Image(systemName: "chevron.up.chevron.down").font(.caption.weight(.semibold))
            }
            .font(.system(.subheadline, weight: .medium))
            .foregroundStyle(.primary)
            .padding(.horizontal, 12).frame(minHeight: 36)
            .frost()
        }
        .accessibilityLabel("\(label): \(value)")
    }

    private func list(_ titles: [Title]) -> some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(titles.enumerated()), id: \.element.id) { i, t in
                Button { router.sheet = t } label: { ChartRow(title: t, separator: i < titles.count - 1) }
                    .buttonStyle(RowPress())
                    .foregroundStyle(.primary)
            }
        }
    }
}
