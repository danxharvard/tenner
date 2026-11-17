import Foundation

// The shapes of Tenner's own data files (the same ones tenner.stream reads), kept forgiving: a missing or oddly typed
// field never stops the rest from loading.

/// A film or series, as the charts, Browse, search and the Watchlist all show it.
struct Title: Identifiable, Hashable, Codable {
    var tmdb: String          // TMDB's id (or the site's own stand-in when TMDB didn't know it)
    var type: String          // "tv" or "movie"
    var title: String
    var year: Int?
    var overview: String?
    var rating: Double?
    var poster: String?       // full address, TMDB's w342
    var backdrop: String?     // full address, TMDB's w1280 or w780
    var on: [String]?         // the services it was charting on

    var id: String { key }
    var key: String { (isFilm ? "m" : "t") + tmdb }
    var isFilm: Bool { type == "movie" }
    var kind: String { isFilm ? "Film" : "Series" }
    var hasTMDB: Bool { Int(tmdb) != nil }
    var subtitle: String { [kind, year.map(String.init)].compactMap { $0 }.joined(separator: " · ") }

    var posterURL: URL? { poster.flatMap(URL.init(string:)) }
    /// a smaller poster for lists, as the site does
    var thumbURL: URL? { poster.map { $0.replacingOccurrences(of: "/w342/", with: "/w154/") }.flatMap(URL.init(string:)) }
    var backdropURL: URL? { backdrop.map { $0.replacingOccurrences(of: "/w1280/", with: "/w780/") }.flatMap(URL.init(string:)) }
    var shareURL: URL { URL(string: "https://tenner.stream/t/\(key)/")! }
}

extension Title {
    enum CodingKeys: String, CodingKey { case id, type, title, year, overview, rating, poster, backdrop, on }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let n = try? c.decode(Int.self, forKey: .id) { tmdb = String(n) }
        else { tmdb = (try? c.decode(String.self, forKey: .id)) ?? UUID().uuidString }
        type = (try? c.decode(String.self, forKey: .type)) ?? "tv"
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        if let y = try? c.decode(Int.self, forKey: .year) { year = y }
        else if let y = try? c.decode(String.self, forKey: .year) { year = Int(y.prefix(4)) }
        else { year = nil }
        overview = try? c.decode(String.self, forKey: .overview)
        rating = try? c.decode(Double.self, forKey: .rating)
        poster = try? c.decode(String.self, forKey: .poster)
        backdrop = try? c.decode(String.self, forKey: .backdrop)
        on = try? c.decode([String].self, forKey: .on)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(tmdb, forKey: .id)
        try c.encode(type, forKey: .type)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(year, forKey: .year)
        try c.encodeIfPresent(overview, forKey: .overview)
        try c.encodeIfPresent(rating, forKey: .rating)
        try c.encodeIfPresent(poster, forKey: .poster)
        try c.encodeIfPresent(backdrop, forKey: .backdrop)
        try c.encodeIfPresent(on, forKey: .on)
    }
}

// MARK: - data/trending.json (the Top 10s, rebuilt hourly)

struct Trending: Decodable {
    var generatedAt: String?
    var services: [Service]
    var overall: Shelf?
}

struct Shelf: Decodable, Hashable {
    var tv: [Title]?
    var movie: [Title]?
}

struct Service: Decodable, Identifiable, Hashable {
    var key: String
    var label: String
    var logo: String?
    var tv: [Title]?
    var movie: [Title]?

    var id: String { key }
    /// TMDB's logo for the service; the free tile is drawn by the app instead
    var logoURL: URL? {
        guard let logo, logo.hasPrefix("http") else { return nil }
        return URL(string: logo)
    }
    func titles(_ kind: Kind) -> [Title] { (kind == .shows ? tv : movie) ?? [] }
}

enum Kind: String, CaseIterable, Identifiable {
    case shows, films
    var id: String { rawValue }
    var label: String { self == .shows ? "Shows" : "Films" }
}

/// Shows, Films or Both, for Browse's dropdown
enum KindFilter: String, CaseIterable, Identifiable {
    case both, shows, films
    var id: String { rawValue }
    var label: String { self == .both ? "Both" : self == .shows ? "Shows" : "Films" }
    func allows(_ t: Title) -> Bool { self == .both || (self == .films) == t.isFilm }
}

// MARK: - data/browse.json (the catalogue, rebuilt every 6 hours)

struct Catalogue: Decodable {
    var img: String?
    var genres: [String: String]?
    var season: String?
    var items: [Item]

    struct Item: Decodable {
        var i: Int
        var t: String
        var n: String
        var d: String?
        var r: Double?
        var v: Double?
        var p: Double?
        var img: String?
        var g: [Int]?
        var s: [String]?
        var xm: Int?
    }

    func title(_ x: Item) -> Title {
        Title(tmdb: String(x.i), type: x.t, title: x.n, year: x.d.flatMap { Int($0.prefix(4)) }, overview: nil,
              rating: (x.r ?? 0) > 0 ? x.r : nil, poster: x.img.map { (img ?? "") + $0 }.flatMap { $0.hasPrefix("http") ? $0 : nil },
              backdrop: nil, on: x.s)
    }
}

// MARK: - the search service (tenner-api): /search and /title

struct SearchPage: Decodable {
    var img: String?
    var bd: String?
    var page: Int?
    var pages: Int?
    var results: [Hit]

    struct Hit: Decodable {
        var k: String
        var type: String
        var title: String
        var year: String?
        var rating: Double?
        var poster: String?
        var backdrop: String?
        var overview: String?
    }

    var titles: [Title] {
        results.map { h in
            Title(tmdb: String(h.k.dropFirst()), type: h.type, title: h.title, year: h.year.flatMap { Int($0) },
                  overview: h.overview, rating: h.rating, poster: h.poster.map { (img ?? "") + $0 },
                  backdrop: h.backdrop.map { (bd ?? "") + $0 }, on: nil)
        }
    }
}

/// One title's details and where to watch it in the UK (the same shape as data/titles.json)
struct Details: Decodable {
    var logo: String?
    var providers: [String: [String]]?
    var items: [String: Extra]?
    var info: Info?

    struct Info: Decodable {
        var title: String?
        var year: String?
        var rating: Double?
        var overview: String?
        var poster: String?
        var backdrop: String?
    }

    struct Extra: Decodable {
        var rt: Int?       // running time (minutes)
        var se: Int?       // seasons
        var c: String?     // UK certificate
        var g: [String]?   // genres
        var tl: String?    // tagline
        var f: [Int]?      // streaming
        var fr: [Int]?     // free
        var re: [Int]?     // rent
        var bu: [Int]?     // buy
        var tr: String?    // YouTube trailer
    }

    struct Provider: Identifiable, Hashable {
        var id: Int
        var name: String
        var logo: URL?
    }

    func providers(_ ids: [Int]?) -> [Provider] {
        (ids ?? []).compactMap { id in
            guard let p = providers?[String(id)], let name = p.first else { return nil }
            let path = p.count > 1 ? p[1] : ""
            return Provider(id: id, name: name, logo: path.isEmpty ? nil : URL(string: (logo ?? "https://image.tmdb.org/t/p/w154") + path))
        }
    }
}

// MARK: - the seasons (the same dates as tn.season in site/shell.js)

enum Season {
    static let names: [String: (name: String, sub: String)] = [
        "newyear": ("New Year", "Ring in the new year, most popular first"),
        "valentines": ("Valentine’s", "Romantic favourites, most popular first"),
        "easter": ("Easter", "Easter favourites, most popular first"),
        "summer": ("Summer holiday", "Sunny favourites for the holidays, most popular first"),
        "halloween": ("Halloween", "Spooky favourites, most popular first"),
        "christmas": ("Christmas", "Festive favourites, most popular first"),
    ]
}
