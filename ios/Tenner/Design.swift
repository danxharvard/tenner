import SwiftUI

// Tenner's house style, in one place: one 9px corner, one frost, the deep tinted buttons with white words, headings
// with the last word in the pink gradient, and the still neon chart numbers.

enum Tn {
    /// the one corner for every button, box, card, sheet and poster
    static let r: CGFloat = 9
    static let gutter: CGFloat = 20

    static let navy = Color(red: 11 / 255, green: 30 / 255, blue: 60 / 255)
    static let roundGrey = Color(red: 34 / 255, green: 34 / 255, blue: 38 / 255)
    static let pink = Color(red: 1, green: 55 / 255, blue: 95 / 255)
    static let purple = Color(red: 191 / 255, green: 90 / 255, blue: 242 / 255)
    static let blue = Color(red: 10 / 255, green: 132 / 255, blue: 1)
    static let green = Color(red: 48 / 255, green: 209 / 255, blue: 88 / 255)

    /// the headings' last word (the site's .grad)
    static let grad = LinearGradient(colors: [pink, purple, blue], startPoint: .leading, endPoint: .trailing)
    /// Tenner's rainbow, for selected states
    static let rainbow = LinearGradient(colors: [pink, Color(red: 1, green: 159 / 255, blue: 10 / 255), Color(red: 1, green: 214 / 255, blue: 10 / 255),
                                                 green, blue, purple], startPoint: .leading, endPoint: .trailing)

    static var shape: RoundedRectangle { RoundedRectangle(cornerRadius: r, style: .continuous) }

    /// a steady colour for a title with no artwork yet
    static func hue(_ s: String) -> Color {
        let h = s.unicodeScalars.reduce(0) { ($0 &* 31 &+ Int($1.value)) % 360 }
        return Color(hue: Double(h) / 360, saturation: 0.45, brightness: 0.38)
    }
}

// MARK: - Headings: heavy display type, the last word in the pink gradient

struct Heading: View {
    let text: String
    var style: Font.TextStyle = .title

    init(_ text: String, style: Font.TextStyle = .title) { self.text = text; self.style = style }

    var body: some View {
        let words = text.split(separator: " ").map(String.init)
        let last = words.last ?? ""
        let head = words.dropLast().joined(separator: " ")
        (Text(head.isEmpty ? "" : head + " ") + Text(last).foregroundStyle(Tn.grad))
            .font(.system(style, design: .default, weight: .heavy))
            .tracking(-0.4)
            .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - The one frost (boxes, bars, sheets): the page colour over a strong blur, with a fine rim

struct Frost: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var solid
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        content
            .background {
                if solid {
                    Tn.shape.fill(Color(.secondarySystemBackground))
                } else {
                    Tn.shape.fill(.ultraThinMaterial)
                        .overlay(Tn.shape.fill(Color(.systemBackground).opacity(scheme == .dark ? 0.5 : 0.55)))
                }
            }
            .overlay(Tn.shape.strokeBorder(Color.primary.opacity(solid ? 0.3 : 0.14), lineWidth: 0.5))
    }
}

extension View {
    func frost() -> some View { modifier(Frost()) }

    /// scroll boxes fade at their edges instead of being cut off
    func fadeEdges(_ axis: Axis = .horizontal, size: CGFloat = 0.04) -> some View {
        mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: size),
                                    .init(color: .black, location: 1 - size), .init(color: .clear, location: 1)],
                            startPoint: axis == .horizontal ? .leading : .top, endPoint: axis == .horizontal ? .trailing : .bottom))
    }
}

// MARK: - Buttons (the owner's design): solid deep fills, an icon beside the words, white words; never capsules

struct TnButton: ButtonStyle {
    enum Kind { case main, second, delete }
    var kind: Kind = .main
    var wide = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.body, weight: .medium))
            .foregroundStyle(kind == .main ? Color.white : kind == .delete ? Color.red : Color.primary)
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .frame(maxWidth: wide ? .infinity : nil)
            .background(Tn.shape.fill(kind == .main ? AnyShapeStyle(Tn.navy.opacity(0.9)) : AnyShapeStyle(Color(.tertiarySystemFill))))
            .contentShape(Tn.shape)
            .opacity(configuration.isPressed ? 0.78 : 1)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.3), value: configuration.isPressed)
    }
}

/// icon-only buttons are circles, dark grey, with a white icon
struct RoundButton: ButtonStyle {
    var size: CGFloat = 44
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size * 0.38, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(Tn.roundGrey.opacity(0.82)))
            .contentShape(Circle())
            .opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.3), value: configuration.isPressed)
    }
}

/// the quiet press for rows: a soft fill, rounded, never boxy
struct RowPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(Rectangle())
            .background(Tn.shape.fill(Color.primary.opacity(configuration.isPressed ? 0.07 : 0)).padding(.horizontal, -8))
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Artwork

struct Poster: View {
    let url: URL?
    let title: String
    var width: CGFloat

    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
            if case .success(let img) = phase {
                img.resizable().scaledToFill().transition(.opacity)
            } else {
                ZStack {
                    Tn.hue(title)
                    if url == nil {
                        Text(title).font(.system(size: max(9, width / 8), weight: .bold)).foregroundStyle(.white.opacity(0.85))
                            .multilineTextAlignment(.center).padding(6).minimumScaleFactor(0.6)
                    }
                }
            }
        }
        .frame(width: width, height: width * 1.5)
        .clipShape(Tn.shape)
        .overlay(Tn.shape.strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5))
        .accessibilityHidden(true)
    }
}

/// a service's logo, in an app icon's own corner
struct ServiceLogo: View {
    let service: Service?
    var size: CGFloat = 44

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.225, style: .continuous)
        Group {
            if let url = service?.logoURL {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase { img.resizable().scaledToFill() } else { Color(.tertiarySystemFill) }
                }
            } else if service?.key == "free" {
                ZStack {
                    LinearGradient(colors: [Tn.green, Color(red: 0, green: 0.6, blue: 0.5)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    Text("Free").font(.system(size: size * 0.3, weight: .heavy)).foregroundStyle(.white)
                }
            } else {
                // everything, across the UK
                ZStack {
                    LinearGradient(colors: [Color(white: 0.16), .black], startPoint: .top, endPoint: .bottom)
                    Text("UK").font(.system(size: size * 0.34, weight: .heavy)).foregroundStyle(Tn.grad)
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(shape)
        .overlay(shape.strokeBorder(Color.primary.opacity(0.12), lineWidth: 0.5))
        .accessibilityHidden(true)
    }
}

/// a chart's rank: the neon glow is drawn once and stays still (never a sweep or colour turn)
struct Rank: View {
    let n: Int
    var body: some View {
        Text("\(n)")
            .font(.system(size: 30, weight: .heavy, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(Tn.grad)
            .shadow(color: Tn.pink.opacity(0.45), radius: 6)
            .frame(width: 38)
            .accessibilityLabel("Number \(n)")
    }
}

/// Tenner's rainbow underline for a selected state (or a plain line in the text colour where the owner chose that)
struct Underline: View {
    var plain = false
    var body: some View {
        RoundedRectangle(cornerRadius: 1.5)
            .fill(plain ? AnyShapeStyle(Color.primary) : AnyShapeStyle(Tn.rainbow))
            .frame(height: 3)
    }
}

// MARK: - The one list design (the site's .cl): small poster, title, grey second line, hairline separators

struct ChartRow: View {
    let title: Title
    var rank: Int? = nil
    var second: String? = nil
    var separator = true

    var body: some View {
        HStack(spacing: 12) {
            if let rank { Rank(n: rank) }
            Poster(url: title.thumbURL, title: title.title, width: 46)
            VStack(alignment: .leading, spacing: 3) {
                Text(title.title).font(.system(.body, weight: .semibold)).lineLimit(2)
                Text(second ?? title.subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            if separator {
                Rectangle().fill(Color(.separator)).frame(height: 1 / 3).padding(.leading, rank == nil ? 58 : 108)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens the details")
    }
}

/// a placeholder while the rows load: never a blank or jumpy page
struct SkeletonRows: View {
    var count = 6
    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { i in
                HStack(spacing: 12) {
                    Tn.shape.fill(Color(.tertiarySystemFill)).frame(width: 46, height: 69)
                    VStack(alignment: .leading, spacing: 8) {
                        Tn.shape.fill(Color(.tertiarySystemFill)).frame(width: 160 - CGFloat(i % 3) * 30, height: 14)
                        Tn.shape.fill(Color(.quaternarySystemFill)).frame(width: 90, height: 12)
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }
        }
        .accessibilityLabel("Loading")
    }
}

/// the soft wash of colour behind every page
struct Ambient: View {
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let k = scheme == .dark ? 1.0 : 0.5
        ZStack {
            Color(.systemBackground)
            RadialGradient(colors: [Tn.blue.opacity(0.22 * k), .clear], center: .init(x: 0.1, y: 0), startRadius: 0, endRadius: 420)
            RadialGradient(colors: [Tn.pink.opacity(0.12 * k), .clear], center: .init(x: 0.95, y: 0.05), startRadius: 0, endRadius: 360)
            RadialGradient(colors: [Tn.purple.opacity(0.14 * k), .clear], center: .init(x: 0.5, y: 0.35), startRadius: 0, endRadius: 380)
        }
        .ignoresSafeArea()
    }
}
