import Foundation
import PDFKit

struct ExtractionResult {
    let text: String
    let status: String
    let warnings: [String]
    let pageCount: Int
    let characterCount: Int
}

struct PDFTextExtractor {
    static func extractText(from data: Data) -> ExtractionResult {
        guard let provider = CGDataProvider(data: data as CFData),
              let pdfDoc = CGPDFDocument(provider) else {
            return ExtractionResult(
                text: "",
                status: "failed",
                warnings: ["Could not read this PDF. Try exporting it again or uploading a text-based PDF."],
                pageCount: 0,
                characterCount: 0
            )
        }
        
        let pageCount = pdfDoc.numberOfPages
        var textParts: [String] = []
        var warnings: [String] = []
        
        // Use PDFKit PDFDocument for higher-level text extraction
        if let document = PDFDocument(data: data) {
            for i in 0..<pageCount {
                if let page = document.page(at: i) {
                    let pageText = page.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    if !pageText.isEmpty {
                        textParts.append(pageText)
                    } else {
                        warnings.append("Page \(i + 1) did not contain extractable text.")
                    }
                }
            }
        }
        
        let extractedText = normalizeResumeText(textParts.joined(separator: "\n\n"))
        return evaluateExtractedText(extractedText, warnings: warnings, pageCount: pageCount)
    }
    
    /// PDFKit sometimes reads tightly spaced bullet lines as one paragraph:
    /// "- Built X - Fixed Y". Splits such a line back into one bullet per line when every
    /// piece starts with a capital letter and has at least three words.
    static func splitJoinedBullets(_ line: String) -> [String] {
        guard let marker = ["- ", "• ", "* "].first(where: { line.hasPrefix($0) }) else { return [line] }
        let pieces = line.dropFirst(marker.count).components(separatedBy: " \(marker)")
        guard pieces.count > 1 else { return [line] }
        let looksLikeBullets = pieces.allSatisfy { piece in
            guard let first = piece.first, first.isUppercase else { return false }
            return piece.split(separator: " ").count >= 3
        }
        return looksLikeBullets ? pieces.map { marker + $0 } : [line]
    }

    static func normalizeResumeText(_ text: String) -> String {
        let lines = text.replacingOccurrences(of: "\r\n", with: "\n")
                        .replacingOccurrences(of: "\r", with: "\n")
                        .components(separatedBy: "\n")
        var normalizedLines: [String] = []
        var previousBlank = false
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            let cleaned = trimmed.components(separatedBy: .whitespaces)
                                 .filter { !$0.isEmpty }
                                 .joined(separator: " ")
            
            let isBlank = cleaned.isEmpty
            if isBlank && previousBlank {
                continue
            }
            
            normalizedLines.append(contentsOf: splitJoinedBullets(cleaned))
            previousBlank = isBlank
        }
        
        let normalizedText = normalizedLines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        return deduplicateConsecutiveWords(normalizedText)
    }
    
    static func deduplicateConsecutiveWords(_ text: String) -> String {
        let lines = text.components(separatedBy: "\n")
        var cleanedLines: [String] = []
        
        for line in lines {
            let words = line.components(separatedBy: " ")
            if words.isEmpty {
                cleanedLines.append("")
                continue
            }
            
            var cleanedWords: [String] = []
            var i = 0
            while i < words.count {
                let currentWord = words[i]
                let cleanCurrent = currentWord.trimmingCharacters(in: CharacterSet.alphanumerics.inverted).lowercased()
                
                if cleanCurrent.isEmpty {
                    cleanedWords.append(currentWord)
                    i += 1
                    continue
                }
                
                // Count consecutive occurrences
                var runLength = 1
                while i + runLength < words.count {
                    let nextWord = words[i + runLength]
                    let cleanNext = nextWord.trimmingCharacters(in: CharacterSet.alphanumerics.inverted).lowercased()
                    if cleanNext == cleanCurrent {
                        runLength += 1
                    } else {
                        break
                    }
                }
                
                if runLength >= 3 {
                    // It's a buggy duplicate run (e.g. from layered bold text). Collapse it to a single word.
                    cleanedWords.append(currentWord)
                    i += runLength
                } else {
                    // Keep the words as is (allows normal repetitions like "had had")
                    for j in 0..<runLength {
                        cleanedWords.append(words[i + j])
                    }
                    i += runLength
                }
            }
            cleanedLines.append(cleanedWords.joined(separator: " "))
        }
        
        return cleanedLines.joined(separator: "\n")
    }
    
    static func evaluateExtractedText(_ text: String, warnings: [String], pageCount: Int) -> ExtractionResult {
        var mutableWarnings = warnings
        let characterCount = text.count
        let status: String
        
        if text.isEmpty {
            mutableWarnings.append("No extractable resume text was found.")
            status = "empty"
        } else if characterCount < 400 {
            mutableWarnings.append("Very little text was extracted, so the analysis may be incomplete.")
            status = "low_quality"
        } else {
            status = "ok"
        }
        
        if !text.isEmpty && text.components(separatedBy: "\n").count < 4 {
            mutableWarnings.append("The extracted text has very few line breaks, which can reduce section detection accuracy.")
        }
        
        return ExtractionResult(
            text: text,
            status: status,
            warnings: mutableWarnings,
            pageCount: pageCount,
            characterCount: characterCount
        )
    }
}
