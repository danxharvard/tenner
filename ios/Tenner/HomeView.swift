import SwiftUI

/// Home opens on the Top 10s, as the phone site does: the services' logos, Shows / Films, and a column per service
/// that you swipe between; then the season's row and what's trending.
struct HomeView: View {
    @Environment(DataStore.self) private var data
    @Environment(AppSettings.self) private var settings
    @Environment(Router.self) private var router
    @State private var kind: Kind = .shows
    @State private var pick = "all"

    private let rowHeight: CGFloat = 86

    /// "All of the UK" first, then your services
    private var columns: [Service] {
        guard let t = data.trending else { return [] }
        let uk = Service(key: "all", label: "All of the UK", logo: nil, tv: t.overall?.tv, movie: t.overall?.movie)
        return [uk] + t.services.filter { settings.has($0.key) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    top10s
                    if let cat = data.catalogue { seasonal(cat) }
                    if let t = data.trending {
                        Row(heading: "Trending shows", sub: "What the UK is watching", titles: Array((t.overall?.tv ?? []).prefix(20)))
                        Row(heading: "Trending films", sub: "What the UK is watching", titles: Array((t.overall?.movie ?? []).prefix(20)))
                    }
                    Text("Charts from TMDB, refreshed every hour.")
                        .font(.footnote).foregroundStyle(.tertiary)
                        .padding(.horizontal, Tn.gutter).padding(.top, 8)
                }
                .padding(.bottom, 24)
            }
            .background(Ambient())
            .refreshable { await data.refresh() }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    // MARK: the Top 10s

    @ViewBuilder private var top10s: some View {
        HStack(alignment: .firstTextBaseline) {
            Heading("Top 10s", style: .largeTitle)
            Spacer()
            Menu {
                Picker("Shows or films", selection: $kind) {
                    ForEach(Kind.allCases) { Text($0.label).tag($0) }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(kind.label)
                    Image(systemName: "chevron.up.chevron.down").font(.caption.weight(.semibold))
                }
                .font(.system(.body, weight: .medium))
                .foregroundStyle(.primary)
                .padding(.horizontal, 12).frame(minHeight: 36)
                .frost()
            }
            .accessibilityLabel("Showing \(kind.label)")
        }
        .padding(.horizontal, Tn.gutter)
        .padding(.top, 8)

        if columns.isEmpty {
            if data.failed {
                Unavailable { Task { await data.refresh() } }.padding(.horizontal, Tn.gutter)
            } else {
                SkeletonRows(count: 5).padding(.horizontal, Tn.gutter)
            }
        } else {
            logos
            TabView(selection: $pick) {
                ForEach(columns) { s in
                    VStack(spacing: 0) {
                        Text(s.label).font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 2)
                        let list = Array(s.titles(kind).prefix(10))
                        ForEach(Array(list.enumerated()), id: \.element.id) { i, t in
                            Button { router.sheet = t } label: {
                                ChartRow(title: t, rank: i + 1, separator: i < list.count - 1)
                            }
                            .buttonStyle(RowPress())
                            .foregroundStyle(.primary)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, Tn.gutter)
                    .tag(s.key)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: rowHeight * 10 + 24)
            .sensoryFeedback(.selection, trigger: pick)
            .animation(.smooth, value: kind)
        }
    }

    /// the services' logos; the chosen one gets a plain line in the text colour (the owner's choice here)
    private var logos: some View {
        ScrollViewReader { reader in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(columns) { s in
                        Button {
                            withAnimation(.smooth) { pick = s.key }
                        } label: {
                            VStack(spacing: 7) {
                                ServiceLogo(service: s.key == "all" ? nil : s, size: 46)
                                Underline(plain: true).frame(width: 22).opacity(pick == s.key ? 1 : 0)
                            }
                        }
                        .buttonStyle(.plain)
                        .id(s.key)
                        .accessibilityLabel(s.label)
                        .accessibilityAddTraits(pick == s.key ? .isSelected : [])
                    }
                }
                .padding(.vertical, 2)
            }
            .contentMargins(.horizontal, Tn.gutter, for: .scrollContent)
            .fadeEdges()
            .onChange(of: pick) { _, key in withAnimation(.smooth) { reader.scrollTo(key, anchor: .center) } }
        }
    }

    // MARK: the season's row (or the all-time favourites)

    @ViewBuilder private func seasonal(_ cat: Catalogue) -> some View {
        let picks = kind == .shows ? "tv" : "movie"
        if let key = cat.season, let s = Season.names[key] {
            let list = cat.items.filter { $0.xm == 1 && $0.t == picks }.sorted { ($0.p ?? 0) > ($1.p ?? 0) }.prefix(20).map(cat.title)
            if !list.isEmpty { Row(heading: "\(s.name) favourites", sub: s.sub, titles: Array(list)) }
        } else {
            let list = cat.items.filter { $0.t == picks && ($0.v ?? 0) >= 2000 }.sorted { ($0.r ?? 0) > ($1.r ?? 0) }.prefix(20).map(cat.title)
            if !list.isEmpty { Row(heading: "All-time favourites", sub: "The most loved, any genre", titles: Array(list)) }
        }
    }
}

/// a row of posters that scrolls sideways (no ranks)
struct Row: View {
    @Environment(Router.self) private var router
    let heading: String
    var sub: String? = nil
    let titles: [Title]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Heading(heading, style: .title2)
                if let sub { Text(sub).font(.subheadline).foregroundStyle(.secondary) }
            }
            .padding(.horizontal, Tn.gutter)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: 12) {
                    ForEach(titles) { t in
                        Button { router.sheet = t } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Poster(url: t.posterURL, title: t.title, width: 116)
                                Text(t.title).font(.footnote.weight(.semibold)).lineLimit(1)
                                Text(t.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            }
                            .frame(width: 116)
                        }
                        .buttonStyle(PosterPress())
                        .accessibilityElement(children: .combine)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, Tn.gutter, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .fadeEdges()
        }
        .padding(.top, 8)
    }
}

/// a poster's press: it gives a little, like a physical card
struct PosterPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.primary)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(duration: 0.3, bounce: 0.35), value: configuration.isPressed)
    }
}

/// when there's nothing on the phone yet and the charts can't be reached
struct Unavailable: View {
    var retry: () -> Void
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark").font(.largeTitle).foregroundStyle(.secondary)
            Text("Can't reach Tenner").font(.headline)
            Text("Check your connection and try again.").font(.subheadline).foregroundStyle(.secondary)
            Button(action: retry) { Label("Try again", systemImage: "arrow.clockwise") }.buttonStyle(TnButton())
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .frost()
    }
}
