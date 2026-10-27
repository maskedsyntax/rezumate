import Foundation

/// Replaces contact details with placeholders before text is sent for AI processing,
/// and puts them back into the response.
struct PIIRedactor {
    private(set) var replacements: [(placeholder: String, value: String)] = []

    private static let emailRegex = try! NSRegularExpression(
        pattern: #"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"#,
        options: [.caseInsensitive]
    )

    private static let phoneRegex = try! NSRegularExpression(
        pattern: #"(?<!\d)(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)"#
    )

    private static let urlRegex = try! NSRegularExpression(
        pattern: #"(https?://)?(www\.)?(linkedin\.com|github\.com)/[^\s,|]+"#,
        options: [.caseInsensitive]
    )

    init(resumeText: String) {
        let doc = ResumeParser.parse(resumeText)
        let fields: [(String, String?)] = [
            ("[NAME]", doc.name),
            ("[EMAIL]", doc.email),
            ("[PHONE]", doc.phone),
            ("[LINKEDIN]", doc.linkedin),
            ("[GITHUB]", doc.github),
            ("[WEBSITE]", doc.website),
            ("[LOCATION]", doc.location)
        ]
        for (placeholder, value) in fields {
            guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), value.count >= 3 else { continue }
            replacements.append((placeholder, value))
        }
        // Longest values first so "Jane Doe" is replaced before a shorter overlapping value.
        replacements.sort { $0.value.count > $1.value.count }
    }

    func redact(_ text: String) -> String {
        var result = text
        for (placeholder, value) in replacements {
            result = result.replacingOccurrences(of: value, with: placeholder, options: .caseInsensitive)
        }
        result = Self.replace(Self.emailRegex, in: result, with: "[EMAIL]")
        result = Self.replace(Self.urlRegex, in: result, with: "[LINK]")
        result = Self.replace(Self.phoneRegex, in: result, with: "[PHONE]")
        return result
    }

    func restore(_ text: String) -> String {
        var result = text
        for (placeholder, value) in replacements {
            result = result.replacingOccurrences(of: placeholder, with: value)
        }
        return result
    }

    private static func replace(_ regex: NSRegularExpression, in text: String, with template: String) -> String {
        regex.stringByReplacingMatches(
            in: text,
            range: NSRange(text.startIndex..., in: text),
            withTemplate: NSRegularExpression.escapedTemplate(for: template)
        )
    }
}
