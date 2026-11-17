import SwiftUI

/// A title's sheet: its artwork melting into the page, the main facts, Add to Watchlist, Share and Trailer, and where
/// to watch it in the UK.
struct TitleSheet: View {
    let title: Title
    @Environment(Library.self) private var library
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var details: Details?
    @State private var saved = 0

    private var extra: Details.Extra? { details?.items?[title.key] }
    private var overview: String { details?.info?.overview?.nilIfEmpty ?? title.overview ?? "" }
    private var backdrop: URL? {
        if let b = details?.info?.backdrop { return URL(string: b.replacingOccurrences(of: "/w1280/", with: "/w780/")) }
        return title.backdropURL
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                art
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(title.title)
                            .font(.system(.largeTitle, weight: .heavy)).tracking(-0.4)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                        Text(meta).font(.subheadline).foregroundStyle(.secondary)
                        if let g = extra?.g, !g.isEmpty { Text(g.joined(separator: ", ")).font(.subheadline).foregroundStyle(.secondary) }
                    }
                    actions
                    if let tl = extra?.tl { Text(tl).font(.system(.body, weight: .semibold)) }
                    if !overview.isEmpty { Text(overview).font(.body).foregroundStyle(.primary.opacity(0.88)) }
                    whereToWatch
                    Text("Details from TMDB. Where to watch is for the UK.")
                        .font(.footnote).foregroundStyle(.tertiary).padding(.top, 8)
                }
                .padding(.horizontal, Tn.gutter)
            }
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .ignoresSafeArea(edges: .top)
        .background(Color(.systemBackground))
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: { Image(systemName: "xmark") }
                .buttonStyle(RoundButton(size: 36))
                .accessibilityLabel("Close")
                .padding(16)
        }
        .task {
            guard title.hasTMDB else { return }
            details = try? await API.details(title)
        }
        .sensoryFeedback(.success, trigger: saved)
    }

    /// the artwork runs edge to edge and fades into the page; no hard edge where it stops
    private var art: some View {
        ZStack {
            AsyncImage(url: backdrop ?? title.posterURL, transaction: Transaction(animation: .easeOut(duration: 0.3))) { phase in
                if case .success(let img) = phase {
                    img.resizable().scaledToFill().blur(radius: backdrop == nil ? 30 : 0)
                } else {
                    Tn.hue(title.title)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 300)
        .clipped()
        .mask(LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.55), .init(color: .clear, location: 1)],
                             startPoint: .top, endPoint: .bottom))
        .accessibilityHidden(true)
    }

    private var meta: String {
        var bits = [title.kind]
        if let y = title.year { bits.append(String(y)) }
        if let se = extra?.se, !title.isFilm { bits.append("\(se) season\(se == 1 ? "" : "s")") }
        if let rt = extra?.rt, title.isFilm { bits.append(rt >= 60 ? "\(rt / 60)h \(rt % 60)m" : "\(rt)m") }
        if let c = extra?.c { bits.append(c) }
        if let r = details?.info?.rating ?? title.rating { bits.append("★ " + String(format: "%.1f", r)) }
        return bits.joined(separator: " · ")
    }

    /// the main action across the width, the quieter ones side by side beneath it
    private var actions: some View {
        let on = library.has(title)
        return VStack(spacing: 10) {
            Button {
                withAnimation(.spring(duration: 0.35, bounce: 0.3)) { library.toggle(title) }
                saved += 1
            } label: {
                Label(on ? "On your Watchlist" : "Add to Watchlist", systemImage: on ? "checkmark" : "plus")
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(TnButton(kind: .main, wide: true))

            HStack(spacing: 10) {
                ShareLink(item: title.shareURL, subject: Text(title.title), message: Text("\(title.title) on Tenner")) {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
                .buttonStyle(TnButton(kind: .second, wide: true))

                if let tr = extra?.tr, let url = URL(string: "https://www.youtube.com/watch?v=\(tr)") {
                    Button { openURL(url) } label: { Label("Trailer", systemImage: "play.fill") }
                        .buttonStyle(TnButton(kind: .second, wide: true))
                }
            }
        }
        .labelStyle(.titleAndIcon)
    }

    @ViewBuilder private var whereToWatch: some View {
        if let d = details {
            let groups: [(String, [Details.Provider])] = [("Stream", d.providers(extra?.f)), ("Free", d.providers(extra?.fr)),
                                                          ("Rent", d.providers(extra?.re)), ("Buy", d.providers(extra?.bu))].filter { !$0.1.isEmpty }
            VStack(alignment: .leading, spacing: 12) {
                Heading("Where to watch", style: .title2)
                if groups.isEmpty {
                    Text("Not on any UK service right now.").foregroundStyle(.secondary)
                } else {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(groups, id: \.0) { group in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(group.0).font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(group.1) { p in
                                            HStack(spacing: 8) {
                                                AsyncImage(url: p.logo) { phase in
                                                    if case .success(let img) = phase { img.resizable() } else { Color(.tertiarySystemFill) }
                                                }
                                                .frame(width: 30, height: 30)
                                                .clipShape(RoundedRectangle(cornerRadius: 30 * 0.225, style: .continuous))
                                                Text(p.name).font(.subheadline).lineLimit(1)
                                            }
                                            .accessibilityElement(children: .combine)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frost()
                }
            }
            .padding(.top, 8)
        } else if title.hasTMDB {
            VStack(alignment: .leading, spacing: 10) {
                Tn.shape.fill(Color(.tertiarySystemFill)).frame(width: 180, height: 22)
                Tn.shape.fill(Color(.quaternarySystemFill)).frame(height: 70)
            }
            .padding(.top, 8)
            .accessibilityLabel("Loading where to watch")
        }
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
