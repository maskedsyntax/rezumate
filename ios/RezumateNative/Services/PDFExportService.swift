import Foundation

struct ExportArtifact: Identifiable, Equatable {
    let url: URL
    let warnings: [String]

    var id: URL { url }
}

enum PDFExportError: Error, LocalizedError, Equatable {
    case noMeaningfulContent

    var errorDescription: String? {
        "Rezumate could not safely format this resume. Review the imported text and try again."
    }
}

struct PDFExportService {
    static func prepare(textContent: String, variantId: UUID) throws -> ExportArtifact {
        let document = ResumeParser.parse(textContent)
        guard document.hasContent else { throw PDFExportError.noMeaningfulContent }

        var warnings: [String] = []
        if !document.unmappedContent.isEmpty {
            let preview = document.unmappedContent.prefix(3).joined(separator: "; ")
            warnings.append("Some header content could not be mapped safely: \(preview)")
        }

        let pdfData = LaTeXStylePDFRenderer.render(document)
        let filename = sanitizedFilename(document.name, fallback: variantId.uuidString)
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("Rezumate-\(filename).pdf")
        try pdfData.write(to: outputURL, options: .atomic)
        return ExportArtifact(url: outputURL, warnings: warnings)
    }

    private static func sanitizedFilename(_ value: String, fallback: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        let words = value
            .components(separatedBy: allowed.inverted)
            .filter { !$0.isEmpty }
        let result = words.prefix(5).joined(separator: "-")
        return result.isEmpty ? fallback : result
    }
}
