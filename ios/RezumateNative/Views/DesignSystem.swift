import SwiftUI

enum RezTheme {
    static let appBackground = Color(red: 0.957, green: 0.945, blue: 0.914)
    static let surface = Color.white
    static let elevatedSurface = Color.white
    static let ink = Color(red: 0.035, green: 0.035, blue: 0.035)
    static let muted = Color(red: 0.294, green: 0.294, blue: 0.263)
    static let border = ink
    static let primary = ink
    static let link = Color(red: 0.078, green: 0.431, blue: 0.961)
    static let success = Color(red: 0.537, green: 0.863, blue: 0.373)
    static let warning = Color(red: 1.000, green: 0.847, blue: 0.302)
    static let error = Color(red: 1.000, green: 0.420, blue: 0.373)
    static let violet = Color(red: 0.780, green: 0.639, blue: 1.000)
    static let blueWash = Color(red: 0.910, green: 0.945, blue: 1.000)
    static let line = ink

    static var displayFont: Font {
        .system(.largeTitle, design: .default).weight(.black)
    }
}

extension View {
    func rezScreenBackground() -> some View {
        background(RezTheme.appBackground.ignoresSafeArea())
    }

    func rezInputSurface(cornerRadius: CGFloat = 8) -> some View {
        background(RezTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(RezTheme.border, lineWidth: 2)
            }
    }

    func rezBrutalShadow(x: CGFloat = 4, y: CGFloat = 4) -> some View {
        self
    }
}

struct RezCard<Content: View>: View {
    let padding: CGFloat
    @ViewBuilder let content: Content

    init(padding: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(RezTheme.ink)
                .offset(x: 4, y: 4)

            RoundedRectangle(cornerRadius: 8)
                .fill(RezTheme.surface)

            content
                .padding(padding)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(RezTheme.border, lineWidth: 2)
        }
    }
}

struct RezPanel<Content: View>: View {
    let fill: Color
    let cornerRadius: CGFloat
    let shadowOffset: CGFloat
    @ViewBuilder let content: Content

    init(fill: Color = RezTheme.surface, cornerRadius: CGFloat = 8, shadowOffset: CGFloat = 4, @ViewBuilder content: () -> Content) {
        self.fill = fill
        self.cornerRadius = cornerRadius
        self.shadowOffset = shadowOffset
        self.content = content()
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(RezTheme.ink)
                .offset(x: shadowOffset, y: shadowOffset)

            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(fill)

            content
        }
        .overlay {
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(RezTheme.ink, lineWidth: 2)
        }
    }
}

struct RezDashedPanel<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(RezTheme.surface)

            content
        }
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(RezTheme.ink, style: StrokeStyle(lineWidth: 2, dash: [6, 6]))
        }
    }
}

struct RezInputBox<Content: View>: View {
    let minHeight: CGFloat
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(RezTheme.ink)
                .offset(x: 4, y: 4)

            RoundedRectangle(cornerRadius: 6)
                .fill(RezTheme.elevatedSurface)

            content
        }
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(RezTheme.ink, lineWidth: 2)
        }
        .frame(minHeight: minHeight)
    }
}

struct SectionTitle: View {
    let title: String
    let subtitle: String?

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.headline.weight(.black))
                .foregroundStyle(RezTheme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(RezTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct RezStatusPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.black))
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .foregroundStyle(RezTheme.ink)
            .background(color, in: RoundedRectangle(cornerRadius: 4))
            .overlay {
                RoundedRectangle(cornerRadius: 4)
                    .stroke(RezTheme.ink, lineWidth: 2)
            }
    }
}

struct RezPrimaryButtonStyle: ButtonStyle {
    var fill: Color = RezTheme.ink
    var foreground: Color = .white

    func makeBody(configuration: Configuration) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(RezTheme.ink)
                .offset(x: configuration.isPressed ? 0 : 4, y: configuration.isPressed ? 0 : 4)

            RoundedRectangle(cornerRadius: 6)
                .fill(fill)

            configuration.label
                .font(.headline.weight(.black))
                .textCase(.uppercase)
                .foregroundStyle(foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, minHeight: 52, maxHeight: 52)
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(RezTheme.ink, lineWidth: 2)
        }
        .offset(x: configuration.isPressed ? 3 : 0, y: configuration.isPressed ? 3 : 0)
    }
}

struct RezSecondaryButtonStyle: ButtonStyle {
    var fill: Color = RezTheme.surface

    func makeBody(configuration: Configuration) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(RezTheme.ink)
                .offset(x: configuration.isPressed ? 0 : 4, y: configuration.isPressed ? 0 : 4)

            RoundedRectangle(cornerRadius: 6)
                .fill(fill)

            configuration.label
                .font(.headline.weight(.black))
                .textCase(.uppercase)
                .foregroundStyle(RezTheme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, minHeight: 50, maxHeight: 50)
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(RezTheme.ink, lineWidth: 2)
        }
        .offset(x: configuration.isPressed ? 3 : 0, y: configuration.isPressed ? 3 : 0)
    }
}
