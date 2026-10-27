import Foundation

/// A question the AI asks about a bullet before rewriting it.
struct BulletQuestion: Identifiable, Equatable {
    let id: Int
    let question: String
    let placeholder: String
}

/// The user's answer to a `BulletQuestion`. Answers count as the user's own facts.
struct BulletDetail: Encodable, Equatable {
    let question: String
    let answer: String
}

struct BulletImprovement: Identifiable, Equatable {
    let original: String
    let rewrite: String
    var id: String { original }
}

enum AIRewriteError: Error, LocalizedError {
    case nothingSafe

    var errorDescription: String? {
        switch self {
        case .nothingSafe:
            return "The AI couldn't improve this without adding details you didn't write. Try editing it yourself, or try again."
        }
    }
}

/// Every AI feature goes through here: personal details are removed before sending,
/// put back afterwards, and every result is checked against the user's own resume.
struct AIRewriteService {
    var client: AIClient = .shared

    /// The resume text plus the job context the AI is allowed to draw on.
    struct Context {
        let resumeText: String
        let jobDescription: String
        let jobTitle: String?
        /// Skills the user explicitly confirmed they have.
        let confirmedKeywords: [String]
    }

    // MARK: - Bullet rewrites

    /// Up to 3 questions about what the bullet leaves out. Free, but needs AI access.
    func questions(for bullet: String, context: Context) async throws -> [BulletQuestion] {
        let redactor = PIIRedactor(resumeText: context.resumeText)
        let input = BulletQuestionsInput(
            bullet: redactor.redact(bullet),
            jobTitle: context.jobTitle,
            jobDescription: jobExcerpt(context, redactor: redactor),
            allowedKeywords: []
        )
        let (output, _, _): (BulletQuestionsOutput, AIAccess, String?) = try await client.run("bullet-questions", input: input)
        return output.questions
            .map { (question: $0.question.trimmingCharacters(in: .whitespacesAndNewlines), placeholder: $0.placeholder) }
            .filter { !$0.question.isEmpty }
            .prefix(3)
            .enumerated()
            .map { BulletQuestion(id: $0.offset, question: $0.element.question, placeholder: $0.element.placeholder) }
    }

    func rewriteOptions(
        for bullet: String,
        details: [BulletDetail] = [],
        context: Context
    ) async throws -> (options: [String], access: AIAccess) {
        let redactor = PIIRedactor(resumeText: context.resumeText)
        let answered = details.filter { !$0.answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        let input = RewriteBulletInput(
            bullet: redactor.redact(bullet),
            jobTitle: context.jobTitle,
            jobDescription: jobExcerpt(context, redactor: redactor),
            allowedKeywords: Array(context.confirmedKeywords.prefix(40)),
            resumeExcerpt: String(redactor.redact(context.resumeText).prefix(6000)),
            details: answered.isEmpty ? nil : answered.map {
                BulletDetail(question: String($0.question.prefix(200)), answer: String(redactor.redact($0.answer).prefix(300)))
            }
        )
        let answers = answered.map(\.answer)
        return try await runChecked("rewrite-bullet", input: input) { (output: RewriteBulletOutput) in
            let safe = uniqued(output.rewrites.map { cleanBullet(redactor.restore($0), like: bullet) }).filter { rewrite in
                isMeaningfulChange(from: bullet, to: rewrite)
                    && RewriteValidator.validateBullet(
                        rewrite,
                        original: bullet,
                        details: answers,
                        allowedKeywords: context.confirmedKeywords
                    ) == nil
            }
            return safe.isEmpty ? nil : Array(safe.prefix(3))
        }
    }

    func improvements(for bullets: [String], context: Context) async throws -> (items: [BulletImprovement], access: AIAccess) {
        let redactor = PIIRedactor(resumeText: context.resumeText)
        let targets = Array(uniqued(bullets).prefix(20))
        let input = ImproveBulletsInput(
            bullets: targets.map(redactor.redact),
            jobTitle: context.jobTitle,
            jobDescription: jobExcerpt(context, redactor: redactor),
            allowedKeywords: Array(context.confirmedKeywords.prefix(40))
        )
        return try await runChecked("improve-bullets", input: input) { (output: ImproveBulletsOutput) in
            // Bullets are numbered from 1 in the prompt; anything with an unknown number is dropped.
            var items: [BulletImprovement] = []
            var seen = Set<Int>()
            for item in output.items where targets.indices.contains(item.id - 1) && seen.insert(item.id).inserted {
                let original = targets[item.id - 1]
                let rewrite = cleanBullet(redactor.restore(item.rewrite), like: original)
                guard isMeaningfulChange(from: original, to: rewrite),
                      RewriteValidator.validateBullet(rewrite, original: original, allowedKeywords: context.confirmedKeywords) == nil
                else { continue }
                items.append(BulletImprovement(original: original, rewrite: rewrite))
            }
            return items.isEmpty ? nil : items
        }
    }

    // MARK: - Cover letter

    func coverLetter(context: Context) async throws -> (letter: String, access: AIAccess) {
        let redactor = PIIRedactor(resumeText: context.resumeText)
        let input = CoverLetterInput(
            resume: String(redactor.redact(context.resumeText).prefix(14000)),
            jobDescription: String(redactor.redact(context.jobDescription).prefix(10000)),
            jobTitle: context.jobTitle,
            allowedKeywords: Array(context.confirmedKeywords.prefix(40))
        )
        return try await runChecked("cover-letter", input: input) { (output: CoverLetterOutput) in
            let letter = redactor.restore(output.letter).trimmingCharacters(in: .whitespacesAndNewlines)
            let rejection = RewriteValidator.validateLongForm(
                letter,
                resumeText: context.resumeText,
                jobDescription: context.jobDescription,
                allowedKeywords: context.confirmedKeywords
            )
            return rejection == nil ? letter : nil
        }
    }

    /// Runs a charged task and keeps only what passes `accept`. If nothing passes, asks once
    /// more using the free retry the Worker issued, then gives up.
    private func runChecked<Input: RetryableInput, Output: Decodable, Value>(
        _ task: String,
        input: Input,
        accept: (Output) -> Value?
    ) async throws -> (Value, AIAccess) {
        var input = input
        let (output, access, retryToken): (Output, AIAccess, String?) = try await client.run(task, input: input)
        if let value = accept(output) { return (value, access) }
        guard let retryToken else { throw AIRewriteError.nothingSafe }

        input.retryOf = retryToken
        let (retryOutput, retryAccess, _): (Output, AIAccess, String?) = try await client.run(task, input: input)
        guard let value = accept(retryOutput) else { throw AIRewriteError.nothingSafe }
        return (value, retryAccess)
    }

    // MARK: - Job insights

    /// Requirements the AI found in the job description that the fixed keyword list missed
    /// and that the resume doesn't mention yet. Shown as suggestions; never added to the score.
    func extraRequirements(context: Context, alreadyShown: [String]) async throws -> [String] {
        let input = JobInsightsInput(jobDescription: String(PIIRedactor(resumeText: context.resumeText).redact(context.jobDescription).prefix(10000)))
        let (output, _, _): (JobInsightsOutput, AIAccess, String?) = try await client.run("job-insights", input: input)

        let shown = Set(alreadyShown.map { $0.lowercased() })
        let resumeLower = context.resumeText.lowercased()
        let terms = output.requirements
            .sorted { ($0.importance == "required" ? 0 : 1) < ($1.importance == "required" ? 0 : 1) }
            .map { $0.term.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { term in
                let lower = term.lowercased()
                return !term.isEmpty && term.count <= 40
                    && !shown.contains(lower)
                    && !resumeLower.contains(lower)
            }
        return Array(uniqued(terms).prefix(12))
    }

    // MARK: - Helpers

    private func jobExcerpt(_ context: Context, redactor: PIIRedactor) -> String? {
        let text = redactor.redact(context.jobDescription).trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? nil : String(text.prefix(4000))
    }

    /// Strips bullet characters and matches the original's trailing period.
    private func cleanBullet(_ text: String, like original: String) -> String {
        var result = text.trimmingCharacters(in: .whitespacesAndNewlines)
        while let first = result.first, "•·-*".contains(first) {
            result = String(result.dropFirst()).trimmingCharacters(in: .whitespaces)
        }
        let originalEndsWithPeriod = original.trimmingCharacters(in: .whitespaces).hasSuffix(".")
        if !originalEndsWithPeriod {
            while result.hasSuffix(".") { result.removeLast() }
        } else if !result.hasSuffix(".") {
            result += "."
        }
        return result
    }

    /// A rewrite is worth showing if it changes the opening verb or at least two other words.
    /// "in Python" → "using Python" alone is not.
    func isMeaningfulChange(from original: String, to rewrite: String) -> Bool {
        let words = { (text: String) in
            text.lowercased().split { !$0.isLetter && !$0.isNumber }.map(String.init)
        }
        let before = words(original)
        let after = words(rewrite)
        guard before != after else { return false }
        if before.first != after.first { return true }
        let removed = Set(before).subtracting(after)
        let added = Set(after).subtracting(before)
        return max(removed.count, added.count) >= 2
    }

    private func uniqued(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { seen.insert($0.lowercased()).inserted }
    }
}

// MARK: - Wire types (match ai-worker/src/tasks.ts)

private protocol RetryableInput: Encodable {
    var retryOf: String? { get set }
}

private struct BulletQuestionsInput: Encodable {
    let bullet: String
    let jobTitle: String?
    let jobDescription: String?
    let allowedKeywords: [String]
}

private struct BulletQuestionsOutput: Decodable {
    struct Question: Decodable {
        let question: String
        let placeholder: String
    }
    let questions: [Question]
}

private struct RewriteBulletInput: RetryableInput {
    let bullet: String
    let jobTitle: String?
    let jobDescription: String?
    let allowedKeywords: [String]
    let resumeExcerpt: String
    let details: [BulletDetail]?
    var retryOf: String?
}

private struct RewriteBulletOutput: Decodable {
    let rewrites: [String]
}

private struct ImproveBulletsInput: RetryableInput {
    let bullets: [String]
    let jobTitle: String?
    let jobDescription: String?
    let allowedKeywords: [String]
    var retryOf: String?
}

private struct ImproveBulletsOutput: Decodable {
    struct Item: Decodable {
        let id: Int
        let rewrite: String
    }
    let items: [Item]
}

private struct CoverLetterInput: RetryableInput {
    let resume: String
    let jobDescription: String
    let jobTitle: String?
    let allowedKeywords: [String]
    var retryOf: String?
}

private struct CoverLetterOutput: Decodable {
    let letter: String
}

private struct JobInsightsInput: Encodable {
    let jobDescription: String
}

private struct JobInsightsOutput: Decodable {
    struct Requirement: Decodable {
        let term: String
        let importance: String
    }
    let requirements: [Requirement]
}
