import SwiftUI

/// The Watchlist: no splash, it starts at its headline. Swipe a row to remove it.
struct WatchlistView: View {
    @Environment(Library.self) private var library
    @Environment(Router.self) private var router

    var body: some View {
        NavigationStack {
            Group {
                if library.items.isEmpty { empty } else { list }
            }
            .background(Ambient())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var list: some View {
        List {
            Heading("Watchlist", style: .largeTitle)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 12, leading: Tn.gutter, bottom: 4, trailing: Tn.gutter))
            ForEach(library.items) { saved in
                Button { router.sheet = saved.title } label: { ChartRow(title: saved.title, separator: false) }
                    .buttonStyle(RowPress())
                    .foregroundStyle(.primary)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 0, leading: Tn.gutter, bottom: 0, trailing: Tn.gutter))
                    .alignmentGuide(.listRowSeparatorLeading) { _ in 58 }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { withAnimation { library.remove(saved.id) } } label: { Label("Remove", systemImage: "trash") }
                    }
                    .contextMenu {
                        ShareLink(item: saved.title.shareURL) { Label("Share", systemImage: "square.and.arrow.up") }
                        Button(role: .destructive) { withAnimation { library.remove(saved.id) } } label: { Label("Remove from Watchlist", systemImage: "trash") }
                    }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    private var empty: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Heading("Watchlist", style: .largeTitle).padding(.top, 12)
                VStack(spacing: 12) {
                    Image(systemName: "bookmark").font(.system(size: 40, weight: .light)).foregroundStyle(.secondary)
                    Text("Nothing saved yet").font(.headline)
                    Text("Tap Add to Watchlist on any film or show and it'll wait for you here.")
                        .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button { router.tab = .browse } label: { Label("Browse", systemImage: "square.grid.2x2") }
                        .buttonStyle(TnButton())
                        .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .frost()
            }
            .padding(.horizontal, Tn.gutter)
        }
    }
}
