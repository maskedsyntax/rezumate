// Prints the app's parsed ResumeDocument as JSON, for comparison with web/lib/core/resume-parser.ts.
import Foundation
let text = try! String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
let d = ResumeParser.parse(text)
func opt(_ v: String?) -> Any { v ?? NSNull() }
let out: [String: Any] = [
  "name": d.name, "email": opt(d.email), "phone": opt(d.phone), "website": opt(d.website),
  "linkedin": opt(d.linkedin), "github": opt(d.github), "location": opt(d.location), "summary": opt(d.summary),
  "experience": d.experience.map { ["company": $0.company, "dateRange": $0.dateRange, "title": $0.title, "location": $0.location, "bullets": $0.bullets] },
  "projects": d.projects.map { ["name": $0.name, "bullets": $0.bullets] },
  "skillCategories": d.skillCategories.map { ["name": $0.name, "items": $0.items] },
  "education": d.education.map { ["institution": $0.institution, "dateRange": $0.dateRange, "degree": $0.degree, "location": $0.location, "details": $0.details] },
  "additionalSections": d.additionalSections.map { ["title": $0.title, "lines": $0.lines] },
  "unmappedContent": d.unmappedContent
]
print(String(data: try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys]), encoding: .utf8)!)
