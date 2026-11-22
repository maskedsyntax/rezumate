// Prints the app's analysis as JSON, for comparison with the website checker.
import Foundation
let a = CommandLine.arguments
let resume = try! String(contentsOfFile: a[1], encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
let job = try! String(contentsOfFile: a[2], encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
let r = ATSScoringService.analyzeResume(resumeText: resume, jobDescription: job)
let out: [String: Any] = ["score": r.score, "keywordCoverage": r.componentScores["keyword_coverage"]!, "impactQuality": r.componentScores["impact_quality"]!,
  "structureQuality": r.componentScores["structure_readability"]!, "formattingQuality": r.componentScores["formatting_risk"]!,
  "jdKeywords": r.jdKeywords, "matchedKeywords": r.matchedKeywords, "partialMatches": r.partialMatches, "missingKeywords": r.missingKeywords,
  "weakBullets": r.weakBullets, "bulletsWithoutImpact": r.bulletsWithoutMeasurableImpact, "formattingWarnings": r.formattingWarnings, "sections": r.sections, "wordCount": r.estimatedResumeLengthWords]
print(String(data: try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys]), encoding: .utf8)!)
