// Runs the app's own analysis code on a resume and a job description, without the UI.
// Built by ./run.sh from the app's source files, so whatever you tune here is already
// what the app does.

import Foundation

struct Options {
    var resumePath = ""
    var jobPath = ""
    var useAI = false
    var factsPath: String?
    var coverLetter = false
    var showText = false
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("error: \(message)\n".utf8))
    exit(1)
}

func usage() -> Never {
    print("""
    Usage: run.sh [<resume.pdf|.docx|.txt> <job.txt>] [options]
    With no files, uses samples/resume.pdf and samples/job.txt.

      --ai              Also run the AI steps (job insights, Improve Resume) against the worker
      --facts <file>    JSON object: {"part of a bullet": "what you did. what came of it"}
      --cover-letter    Also write a cover letter (needs --ai)
      --text            Print the full extracted text and how it was parsed
    The worker URL comes from REZUMATE_AI_URL (default http://localhost:8787).
    """)
    exit(2)
}

func parseOptions() -> Options {
    var options = Options()
    var positional: [String] = []
    var args = CommandLine.arguments.dropFirst()
    while let arg = args.popFirst() {
        switch arg {
        case "--ai": options.useAI = true
        case "--cover-letter": options.coverLetter = true
        case "--text": options.showText = true
        case "--facts":
            guard let path = args.popFirst() else { usage() }
            options.factsPath = path
        case "-h", "--help": usage()
        default: positional.append(arg)
        }
    }
    // No files given: use the bundled samples.
    if positional.isEmpty {
        let samples = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
            .deletingLastPathComponent().appendingPathComponent("samples").path
        positional = ["\(samples)/resume.pdf", "\(samples)/job.txt"]
    }
    guard positional.count == 2 else { usage() }
    options.resumePath = positional[0]
    options.jobPath = positional[1]
    return options
}

func heading(_ title: String) { print("\n== \(title) " + String(repeating: "=", count: max(0, 60 - title.count))) }
func list(_ items: [String], prefix: String = "  - ") { items.isEmpty ? print("  (none)") : items.forEach { print(prefix + $0) } }

func extractResume(_ path: String) -> String {
    let url = URL(fileURLWithPath: path)
    guard let data = try? Data(contentsOf: url) else { fail("can't read resume file \(path)") }
    let result: ExtractionResult
    switch url.pathExtension.lowercased() {
    case "pdf": result = PDFTextExtractor.extractText(from: data)
    case "docx": result = DocxTextExtractor.extractText(from: data)
    default:
        let text = PDFTextExtractor.normalizeResumeText(String(decoding: data, as: UTF8.self))
        result = ExtractionResult(text: text, status: "ok", warnings: [], pageCount: 1, characterCount: text.count)
    }
    heading("Extraction")
    print("  status: \(result.status), pages: \(result.pageCount), characters: \(result.characterCount)")
    list(result.warnings, prefix: "  ! ")
    return result.text
}

func printParse(_ text: String) {
    heading("Extracted text")
    print(text)
    let doc = ResumeParser.parse(text)
    heading("Parsed resume")
    print("  name: \(doc.name)  email: \(doc.email ?? "-")  phone: \(doc.phone ?? "-")  location: \(doc.location ?? "-")")
    print("  summary: \(doc.summary ?? "-")")
    for job in doc.experience {
        print("  [\(job.title) | \(job.company) | \(job.location) | \(job.dateRange)]")
        list(job.bullets, prefix: "      • ")
    }
    for project in doc.projects {
        print("  [project: \(project.name)]")
        list(project.bullets, prefix: "      • ")
    }
    print("  skills: " + doc.skillCategories.map { "\($0.name): \($0.items)" }.joined(separator: " / "))
    print("  education: \(doc.education.count) entries")
    if !doc.unmappedContent.isEmpty {
        print("  unmapped:")
        list(doc.unmappedContent, prefix: "      ? ")
    }
}

func printAnalysis(_ result: ATSAnalysisResult, fit: JobFit, title: String = "Analysis") {
    heading(title)
    print("  SCORE \(result.score)/100   (\(result.scoreVersion))")
    for (key, value) in result.componentScores.sorted(by: { $0.key < $1.key }) {
        print("  \(key.padding(toLength: 22, withPad: " ", startingAt: 0)) \(value)")
    }
    print("  bullets: \(result.bulletCount), weak wording: \(result.weakBulletCount), no impact: \(result.bulletsWithoutMeasurableImpactCount), words: \(result.estimatedResumeLengthWords)")
    print("  sections: " + result.sections.sorted(by: { $0.key < $1.key }).map { "\($0.key)=\($0.value ? "yes" : "no")" }.joined(separator: " "))
    print("  job title: \(fit.jobTitle ?? "-") (\(fit.jobTitleMatched ? "matched" : fit.jobTitleSeniorityGap ? "partial: seniority gap" : "missing"))")
    print("  education: \(fit.educationRequirement ?? "-")\(fit.educationRequirement == nil ? "" : fit.educationMatched ? " (matched)" : " (missing)")")
    print("\n  job keywords (\(result.jdKeywords.count)): " + result.jdKeywords.joined(separator: ", "))
    print("  matched: " + result.matchedKeywords.map(ResumeTailoringService.displayName).joined(separator: ", "))
    print("  missing: " + result.missingKeywords.map(ResumeTailoringService.displayName).joined(separator: ", "))
    print("  partial: " + result.partialMatches.map(ResumeTailoringService.displayName).joined(separator: ", "))
    print("\n  weak wording:")
    list(result.weakBullets)
    print("  no measurable impact:")
    list(result.bulletsWithoutMeasurableImpact)
    print("  warnings:")
    list(result.formattingWarnings, prefix: "  ! ")
}

func loadFacts(_ path: String?, targets: [String]) -> [String: String] {
    guard let path else { return [:] }
    guard let data = FileManager.default.contents(atPath: path),
          let raw = try? JSONSerialization.jsonObject(with: data) as? [String: String]
    else { fail("--facts must be a JSON object of strings: \(path)") }
    var facts: [String: String] = [:]
    for (fragment, answer) in raw {
        guard let bullet = targets.first(where: { $0.localizedCaseInsensitiveContains(fragment) }) else {
            print("  ! no weak bullet contains \"\(fragment)\"; fact ignored")
            continue
        }
        facts[bullet] = answer
    }
    return facts
}

func runAI(options: Options, text: String, job: String, result: ATSAnalysisResult, fit: JobFit) async {
    let url = URL(string: ProcessInfo.processInfo.environment["REZUMATE_AI_URL"] ?? "http://localhost:8787")!
    let ai = AIRewriteService(client: AIClient(baseURL: url))
    let context = AIRewriteService.Context(resumeText: text, jobDescription: job, jobTitle: fit.jobTitle, confirmedKeywords: [])

    heading("AI: also mentioned in this job")
    do {
        let shown = result.missingKeywords + result.partialMatches + result.matchedKeywords
        list(try await ai.extraRequirements(context: context, alreadyShown: shown))
    } catch { print("  ! \(error.localizedDescription)") }

    // Same targets as the app's Improve Resume: weak wording first, then bullets without impact.
    var targets: [String] = []
    for bullet in result.weakBullets + result.bulletsWithoutMeasurableImpact where !targets.contains(bullet) {
        targets.append(bullet)
    }
    let facts = loadFacts(options.factsPath, targets: targets)
    let plan = AIRewriteService.improvementPlan(
        targets: targets,
        weakWording: Set(result.weakBullets),
        withoutImpact: Set(result.bulletsWithoutMeasurableImpact),
        facts: facts
    )

    heading("AI: Improve Resume (\(plan.send.count) sent, \(facts.count) with facts, \(plan.needsDetails.count) need details)")
    if !plan.needsDetails.isEmpty {
        print("  needs your details (not sent):")
        list(plan.needsDetails, prefix: "  ? ")
        print("")
    }
    if plan.send.isEmpty {
        print("  nothing to send: add a fact for at least one bullet")
    } else { do {
        let (items, access) = try await ai.improvements(for: plan.send, facts: facts, context: context)
        for item in items {
            print("  - \(item.original)")
            print("  + \(item.rewrite)\(facts[item.original].map { "   [fact: \($0)]" } ?? "")\n")
        }
        let skipped = plan.send.filter { target in !items.contains { $0.original == target } }
        if !skipped.isEmpty {
            print("  not rewritten (no safe change):")
            list(skipped)
        }
        print("  access: \(access)")

        var improved = text
        for item in items { improved = improved.replacingOccurrences(of: item.original, with: item.rewrite) }
        let rescored = ATSScoringService.analyzeResume(resumeText: improved, jobDescription: job)
        heading("After accepting every rewrite")
        print("  SCORE \(result.score) -> \(rescored.score)")
        for (key, value) in rescored.componentScores.sorted(by: { $0.key < $1.key }) {
            let before = result.componentScores[key] ?? 0
            print("  \(key.padding(toLength: 22, withPad: " ", startingAt: 0)) \(before) -> \(value)")
        }
    } catch { print("  ! \(error.localizedDescription)") } }

    if options.coverLetter {
        heading("AI: cover letter")
        do { print(try await ai.coverLetter(context: context).letter) } catch { print("  ! \(error.localizedDescription)") }
    }
}

let options = parseOptions()
let text = extractResume(options.resumePath)
guard let jobData = FileManager.default.contents(atPath: options.jobPath) else { fail("can't read job description file \(options.jobPath)") }
let job = String(decoding: jobData, as: UTF8.self)
if options.showText { printParse(text) }

let result = ATSScoringService.analyzeResume(resumeText: text, jobDescription: job)
let fit = JobFitExtractor.extract(jobDescription: job, resumeText: text)
printAnalysis(result, fit: fit)
if options.useAI { await runAI(options: options, text: text, job: job, result: result, fit: fit) }
