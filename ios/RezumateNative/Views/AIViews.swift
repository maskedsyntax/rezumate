import StoreKit
import SwiftUI
import UIKit

// MARK: - Consent

/// Shown once, before anything is sent for AI processing (App Review guideline 5.1.2).
struct AIConsentSheet: View {
    let onAccept: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Before you use AI")
                        .font(.title2.weight(.black))
                        .foregroundStyle(RezTheme.ink)

                    VStack(alignment: .leading, spacing: 10) {
                        consentRow("paperplane", "To rewrite bullets or write a cover letter, the relevant resume text and job description are sent securely to OpenAI.")
                        consentRow("person.crop.circle.badge.xmark", "Your name, email, phone, links, and location are removed before anything is sent.")
                        consentRow("trash", "OpenAI is asked not to store the request, and Rezumate keeps no copy.")
                        consentRow("checkmark.shield", "Every suggestion is checked against your resume. Anything that adds skills, numbers, or employers you didn't write is thrown out.")
                        consentRow("iphone", "Scoring, keyword checks, history, and PDF export still run only on your iPhone.")
                    }

                    Button("Continue", action: onAccept)
                        .buttonStyle(RezPrimaryButtonStyle())

                    Button("Not now", action: onCancel)
                        .buttonStyle(RezSecondaryButtonStyle())
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func consentRow(_ icon: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .bold))
                .frame(width: 22)
                .foregroundStyle(RezTheme.ink)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(RezTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Paywall

/// The only purchase screen: one Rezumate Pro subscription that includes every Pro feature and AI.
struct ProPaywallSheet: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Rezumate Pro")
                        .font(.title.weight(.black))
                        .foregroundStyle(RezTheme.ink)

                    Text("Everything in Rezumate, including AI rewrites that never invent anything.")
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.muted)

                    if appState.entitlementState == .lifetime {
                        Text("You already have Pro Lifetime. Subscribe to add AI.")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        PaywallFeatureRow(text: "Unlimited analyses and improvements")
                        PaywallFeatureRow(text: "Unlimited saved variants")
                        PaywallFeatureRow(text: "Full ATS diagnosis and keyword insights")
                        PaywallFeatureRow(text: "AI rewrites for weak bullets")
                        PaywallFeatureRow(text: "One-tap Improve Resume you review line by line")
                        PaywallFeatureRow(text: "Cover letters written from your real experience")
                        PaywallFeatureRow(text: "Extra requirements found in each job description")
                    }

                    if let access = appState.aiAccess, !appState.hasSubscription, access.totalRemaining > 0 {
                        Text("You have \(access.totalRemaining) free AI action\(access.totalRemaining == 1 ? "" : "s") left.")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }

                    subscriptionButton(
                        productId: AppState.yearlyProductId,
                        title: "Yearly",
                        suffix: "/ year",
                        primary: true
                    )
                    subscriptionButton(
                        productId: AppState.monthlyProductId,
                        title: "Monthly",
                        suffix: "/ month",
                        primary: false
                    )

                    if let message = appState.purchaseMessage {
                        Text(message)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }

                    Button {
                        Task { await appState.restorePurchases() }
                    } label: {
                        Label(appState.isRestoring ? "Restoring..." : "Restore Purchases", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(RezSecondaryButtonStyle())
                    .disabled(appState.isPurchasing || appState.isRestoring)

                    Text("Subscriptions renew automatically until cancelled in Settings › Apple ID › Subscriptions. Fair use: up to 300 AI actions a month.")
                        .font(.caption2)
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 16) {
                        Link("Terms", destination: URL(string: "https://rezumate.app/terms")!)
                        Link("Privacy", destination: URL(string: "https://rezumate.app/privacy")!)
                    }
                    .font(.caption.weight(.semibold))
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .onChange(of: appState.hasSubscription) { _, active in
                if active { dismiss() }
            }
        }
    }

    @ViewBuilder
    private func subscriptionButton(productId: String, title: String, suffix: String, primary: Bool) -> some View {
        let price = appState.subscriptionListings[productId]?.displayPrice
        let label = Label(
            price.map { "\(title) · \($0) \(suffix)" } ?? "\(title) · unavailable",
            systemImage: primary ? "sparkles" : "calendar"
        )
        let action = { Task { await appState.purchaseSubscription(productId) } }
        if primary {
            Button(action: { _ = action() }) { label }
                .buttonStyle(RezPrimaryButtonStyle())
                .disabled(price == nil || appState.isPurchasing || appState.hasSubscription)
        } else {
            Button(action: { _ = action() }) { label }
                .buttonStyle(RezSecondaryButtonStyle())
                .disabled(price == nil || appState.isPurchasing || appState.hasSubscription)
        }
    }
}

private struct PaywallFeatureRow: View {
    let text: String

    var body: some View {
        Label(text, systemImage: "checkmark.circle.fill")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(RezTheme.ink)
    }
}

// MARK: - Bullet rewrite

struct BulletRewriteDraft: Identifiable, Equatable {
    let bullet: String
    var id: String { bullet }
}

struct BulletRewriteSheet: View {
    let draft: BulletRewriteDraft
    /// Questions to answer before rewriting; nil or empty skips straight to the options.
    let questions: [BulletQuestion]?
    let isLoadingQuestions: Bool
    let options: [String]
    let isLoading: Bool
    let errorMessage: String?
    let isFallback: Bool
    let onSubmitDetails: ([BulletDetail]) -> Void
    let onPick: (String) -> Void
    let onRetry: () -> Void
    let onCancel: () -> Void

    @State private var selected: String?
    @State private var answers: [Int: String] = [:]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Original")
                        .font(.caption.weight(.black))
                        .foregroundStyle(RezTheme.muted)
                    Text(draft.bullet)
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.ink)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RezTheme.appBackground, in: RoundedRectangle(cornerRadius: 6))

                    if isLoadingQuestions {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Reading your bullet...")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)
                        }
                        .padding(.vertical, 20)
                    } else if let questions, !questions.isEmpty {
                        detailsForm(questions)
                    } else if isLoading {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Writing options...")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)
                        }
                        .padding(.vertical, 20)
                    } else if let errorMessage {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundStyle(RezTheme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Button("Try again", action: onRetry)
                            .buttonStyle(RezSecondaryButtonStyle())
                    } else {
                        Text(isFallback ? "Basic suggestion (AI unavailable)" : "Pick a rewrite")
                            .font(.caption.weight(.black))
                            .foregroundStyle(RezTheme.muted)

                        ForEach(options, id: \.self) { option in
                            Button {
                                selected = option
                            } label: {
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: selected == option ? "largecircle.fill.circle" : "circle")
                                        .foregroundStyle(RezTheme.ink)
                                    Text(option)
                                        .font(.subheadline)
                                        .foregroundStyle(RezTheme.ink)
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                                .padding(10)
                                .background(selected == option ? RezTheme.blueWash : RezTheme.surface, in: RoundedRectangle(cornerRadius: 6))
                                .overlay { RoundedRectangle(cornerRadius: 6).stroke(RezTheme.ink, lineWidth: 1.5) }
                            }
                            .buttonStyle(.plain)
                        }

                        Label("Checked: only facts from your bullet and your answers were used.", systemImage: "checkmark.shield.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.ink)

                        Button("Use this rewrite") {
                            if let selected { onPick(selected) }
                        }
                        .buttonStyle(RezPrimaryButtonStyle())
                        .disabled(selected == nil)
                    }
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationTitle("Rewrite bullet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
            }
        }
    }

    @ViewBuilder
    private func detailsForm(_ questions: [BulletQuestion]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Add details for a stronger rewrite")
                .font(.caption.weight(.black))
                .foregroundStyle(RezTheme.muted)
            Text("Only add what's true. Leave any question blank.")
                .font(.caption)
                .foregroundStyle(RezTheme.muted)
        }

        ForEach(questions) { question in
            VStack(alignment: .leading, spacing: 6) {
                Text(question.question)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RezTheme.ink)
                TextField(question.placeholder, text: answerBinding(question.id), axis: .vertical)
                    .font(.subheadline)
                    .lineLimit(1...3)
                    .padding(10)
                    .background(RezTheme.surface, in: RoundedRectangle(cornerRadius: 6))
                    .overlay { RoundedRectangle(cornerRadius: 6).stroke(RezTheme.ink, lineWidth: 1.5) }
            }
        }

        let details = questions.compactMap { question -> BulletDetail? in
            let answer = (answers[question.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            return answer.isEmpty ? nil : BulletDetail(question: question.question, answer: answer)
        }

        Button("Rewrite with these details") { onSubmitDetails(details) }
            .buttonStyle(RezPrimaryButtonStyle())
            .disabled(details.isEmpty)

        Button("Skip and rewrite") { onSubmitDetails([]) }
            .buttonStyle(RezSecondaryButtonStyle())
    }

    private func answerBinding(_ id: Int) -> Binding<String> {
        Binding(
            get: { answers[id] ?? "" },
            set: { answers[id] = String($0.prefix(300)) }
        )
    }
}

// MARK: - Improve review

struct ImproveReviewDraft: Identifiable, Equatable {
    let id = UUID()
    let items: [BulletImprovement]
}

struct ImproveReviewSheet: View {
    let draft: ImproveReviewDraft
    let isApplying: Bool
    let onApply: ([BulletImprovement]) -> Void
    let onCancel: () -> Void

    @State private var accepted: Set<String>

    init(draft: ImproveReviewDraft, isApplying: Bool, onApply: @escaping ([BulletImprovement]) -> Void, onCancel: @escaping () -> Void) {
        self.draft = draft
        self.isApplying = isApplying
        self.onApply = onApply
        self.onCancel = onCancel
        _accepted = State(initialValue: Set(draft.items.map(\.id)))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Review each change. Only the ones you keep are applied.")
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)

                    ForEach(draft.items) { item in
                        let isOn = accepted.contains(item.id)
                        Button {
                            if isOn { accepted.remove(item.id) } else { accepted.insert(item.id) }
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: isOn ? "checkmark.square.fill" : "square")
                                        .foregroundStyle(RezTheme.ink)
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(item.original)
                                            .font(.caption)
                                            .strikethrough(isOn)
                                            .foregroundStyle(RezTheme.muted)
                                        Text(item.rewrite)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(RezTheme.ink)
                                    }
                                    .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                            }
                            .padding(10)
                            .background(isOn ? RezTheme.blueWash : RezTheme.surface, in: RoundedRectangle(cornerRadius: 6))
                            .overlay { RoundedRectangle(cornerRadius: 6).stroke(RezTheme.ink, lineWidth: 1.5) }
                        }
                        .buttonStyle(.plain)
                    }

                    Label("Checked: no new skills, numbers, or employers were added.", systemImage: "checkmark.shield.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.ink)

                    Button(isApplying ? "Applying..." : "Apply \(accepted.count) change\(accepted.count == 1 ? "" : "s")") {
                        onApply(draft.items.filter { accepted.contains($0.id) })
                    }
                    .buttonStyle(RezPrimaryButtonStyle())
                    .disabled(accepted.isEmpty || isApplying)
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationTitle("Review improvements")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .disabled(isApplying)
                }
            }
        }
    }
}

// MARK: - Cover letter

struct CoverLetterSheet: View {
    let generate: () async throws -> String
    @Environment(\.dismiss) private var dismiss

    @State private var letter = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var copied = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                if isLoading {
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Writing your cover letter...")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundStyle(RezTheme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Button("Try again") { Task { await load() } }
                            .buttonStyle(RezSecondaryButtonStyle())
                        Spacer()
                    }
                } else {
                    Text("Edit freely. Built only from what's on your resume.")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                    TextEditor(text: $letter)
                        .font(.body)
                        .scrollContentBackground(.hidden)
                        .padding(8)
                        .background(RezTheme.surface, in: RoundedRectangle(cornerRadius: 6))
                        .overlay { RoundedRectangle(cornerRadius: 6).stroke(RezTheme.ink, lineWidth: 1.5) }

                    HStack(spacing: 12) {
                        Button {
                            UIPasteboard.general.string = letter
                            copied = true
                        } label: {
                            Label(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc")
                        }
                        .buttonStyle(RezSecondaryButtonStyle())

                        ShareLink(item: letter) {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(RezPrimaryButtonStyle())
                    }
                }
            }
            .padding()
            .rezScreenBackground()
            .navigationTitle("Cover letter")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                if letter.isEmpty { await load() }
            }
            .onChange(of: letter) { _, _ in copied = false }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            letter = try await generate()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
