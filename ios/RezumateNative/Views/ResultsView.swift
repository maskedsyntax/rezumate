import StoreKit
import SwiftUI

struct ResultsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.requestReview) private var requestReview
    let result: AnalyzeResponse

    @State private var currentResult: AnalyzeResponse
    @State private var exportArtifact: ExportArtifact?
    @State private var pendingExportArtifact: ExportArtifact?
    @State private var isShowingExportWarning = false
    @State private var isExporting = false
    @State private var isWorking = false
    @State private var isRefreshingAnalysis = false
    @State private var errorMessage: String?
    @State private var expandedScores: Set<String> = []
    @State private var optimizedResumeText: String?
    @State private var originalScore: Int?
    @State private var originalComponentScores: [String: Int]?
    @State private var changedBulletCount: Int?
    @State private var improvementComponentDeltas: [String: Int] = [:]
    @State private var remainingImpactIssues: Int?
    @State private var keywordDraft: KeywordPlacementDraft?
    @State private var placementUndoStack: [String] = []
    @State private var isPlacingKeyword = false
    @State private var lastPlacedKeyword: String?
    @State private var rewriteDraft: BulletRewriteDraft?
    @State private var rewriteOptions: [String] = []
    @State private var rewriteError: String?
    @State private var isRewriting = false
    @State private var rewriteIsFallback = false
    @State private var rewriteQuestions: [BulletQuestion]?
    @State private var isLoadingQuestions = false
    @State private var rewriteDetails: [BulletDetail] = []
    @State private var improveDraft: ImproveReviewDraft?
    @State private var isShowingAIConsent = false
    @State private var isShowingPaywall = false
    @State private var isShowingCoverLetter = false
    @State private var pendingAIAction: (() -> Void)?
    @State private var extraRequirements: [String] = []

    init(result: AnalyzeResponse) {
        self.result = result
        _currentResult = State(initialValue: result)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                refinementNotice
                scoreHeader
                componentScores
                roleFitSection
                tappableKeywordSection(
                    title: "Missing hard skills",
                    subtitle: "Tap a skill you actually have to add it.",
                    items: currentResult.missingKeywords,
                    color: RezTheme.warning,
                    limitForFree: 5,
                    showsPlacementNotice: true
                )
                tappableKeywordSection(
                    title: "Partial matches",
                    subtitle: "Close — add the exact term if you have it.",
                    items: currentResult.partialMatches,
                    color: RezTheme.blueWash,
                    limitForFree: 5,
                    showsPlacementNotice: false
                )
                if !extraRequirements.isEmpty {
                    tappableKeywordSection(
                        title: "Also mentioned in this job",
                        subtitle: "Found by AI. Tap one you actually have to add it. Not counted in the score.",
                        items: extraRequirements,
                        color: RezTheme.violet,
                        limitForFree: 3,
                        showsPlacementNotice: false
                    )
                }
                keywordSection(title: "Matched keywords", items: currentResult.matchedKeywords, color: RezTheme.success, limitForFree: 6)
                resumeIssuesSection
                if appState.entitlementState == .free {
                    proInsightsCard
                }
                improveResumeSection
                coverLetterSection
                exportSection

                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.callout)
                            .foregroundStyle(RezTheme.ink)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RezTheme.error, in: RoundedRectangle(cornerRadius: 6))
                            .overlay {
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(RezTheme.ink, lineWidth: 2)
                            }
                }
            }
            .padding()
            .padding(.bottom, 100)
        }
        .rezScreenBackground()
        .navigationTitle("Results")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(RezTheme.appBackground, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    if !placementUndoStack.isEmpty {
                        Button {
                            Task { await undoLastPlacement() }
                        } label: {
                            Image(systemName: "arrow.uturn.backward")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(RezTheme.ink)
                        }
                        .disabled(isPlacingKeyword || isWorking)
                        .accessibilityLabel("Undo last change")
                    }
                    Button {
                        Task { await reAnalyze() }
                    } label: {
                        if isRefreshingAnalysis {
                            ProgressView()
                                .tint(RezTheme.ink)
                        } else {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(RezTheme.ink)
                        }
                    }
                    .disabled(isRefreshingAnalysis)
                    .accessibilityLabel("Re-analyze")
                }
            }
        }
        .task {
            await pollForRefinedAnalysis()
        }
        .task {
            await loadExtraRequirements()
        }
        .sheet(item: $rewriteDraft) { draft in
            BulletRewriteSheet(
                draft: draft,
                questions: rewriteQuestions,
                isLoadingQuestions: isLoadingQuestions,
                options: rewriteOptions,
                isLoading: isRewriting,
                errorMessage: rewriteError,
                isFallback: rewriteIsFallback,
                onSubmitDetails: { details in
                    rewriteQuestions = nil
                    rewriteDetails = details
                    Task { await loadRewriteOptions(for: draft.bullet) }
                },
                onPick: { rewrite in
                    Task { await applyRewrites([BulletImprovement(original: draft.bullet, rewrite: rewrite)], countsAsImprovement: false) }
                },
                onRetry: { Task { await loadRewriteOptions(for: draft.bullet) } },
                onCancel: { rewriteDraft = nil }
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $improveDraft) { draft in
            ImproveReviewSheet(
                draft: draft,
                isApplying: isWorking,
                onApply: { accepted in
                    Task { await applyRewrites(accepted, countsAsImprovement: true) }
                },
                onCancel: { improveDraft = nil }
            )
        }
        .sheet(isPresented: $isShowingAIConsent) {
            AIConsentSheet(
                onAccept: {
                    appState.aiConsentGiven = true
                    isShowingAIConsent = false
                    let action = pendingAIAction
                    pendingAIAction = nil
                    Task {
                        await loadExtraRequirements()
                        action?()
                    }
                },
                onCancel: {
                    pendingAIAction = nil
                    isShowingAIConsent = false
                }
            )
        }
        .sheet(isPresented: $isShowingPaywall) {
            ProPaywallSheet()
        }
        .sheet(isPresented: $isShowingCoverLetter) {
            CoverLetterSheet {
                guard let context = aiContext() else { throw APIClientError.server("Resume not found.") }
                do {
                    let (letter, access) = try await appState.ai.coverLetter(context: context)
                    appState.updateAIAccess(access)
                    return letter
                } catch AIClientError.noAccess {
                    isShowingCoverLetter = false
                    isShowingPaywall = true
                    throw AIClientError.noAccess
                }
            }
        }
        .sheet(item: $exportArtifact, onDismiss: requestReviewIfEligible) { artifact in
            ResumePDFPreview(url: artifact.url)
        }
        .sheet(item: $keywordDraft) { draft in
            KeywordPlacementSheet(
                draft: draft,
                isWorking: isPlacingKeyword,
                onCancel: { keywordDraft = nil },
                onConfirm: { bullet in
                    Task { await confirmPlacement(keyword: draft.keyword, alsoInBullet: bullet) }
                }
            )
            .presentationDetents([.medium, .large])
        }
        .alert("Review before export", isPresented: $isShowingExportWarning) {
            Button("Cancel", role: .cancel) { pendingExportArtifact = nil }
            Button("Preview Anyway") {
                guard let artifact = pendingExportArtifact else { return }
                pendingExportArtifact = nil
                presentExport(artifact)
            }
        } message: {
            Text(pendingExportArtifact?.warnings.joined(separator: "\n") ?? "Some content may need review.")
        }
    }

    private var refinementNotice: some View {
        Group {
            if currentResult.analysisStatus == "pending" {
                RezCard(padding: 14) {
                    HStack(spacing: 12) {
                        ProgressView()
                            .tint(RezTheme.ink)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Refinement running")
                                .font(.subheadline.weight(.black))
                                .foregroundStyle(RezTheme.ink)
                            Text("Showing a fast baseline while local suggestions update the report.")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)
                        }
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private var scoreHeader: some View {
        RezCard(padding: 18) {
            HStack(alignment: .center, spacing: 18) {
                VStack(spacing: 2) {
                    Text("\(currentResult.score)")
                        .font(.system(size: 42, weight: .black))
                        .foregroundStyle(RezTheme.ink)
                    Text("/100")
                        .font(.caption.weight(.black))
                        .foregroundStyle(RezTheme.ink)
                }
                .frame(width: 104, height: 104)
                .background(scoreColor, in: RoundedRectangle(cornerRadius: 8))
                .overlay {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(RezTheme.ink, lineWidth: 2)
                }
                .rezBrutalShadow(x: 3, y: 3)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Text("ATS SCORE")
                            .font(.caption.weight(.black))
                            .foregroundStyle(RezTheme.ink)
                        if optimizedResumeText != nil {
                            Text("OPTIMIZED")
                                .font(.system(size: 7, weight: .black))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(RezTheme.success, in: RoundedRectangle(cornerRadius: 3))
                                .foregroundStyle(RezTheme.ink)
                        }
                    }
                    if let orig = originalScore {
                        let delta = currentResult.score - orig
                        HStack(spacing: 4) {
                            Text("\(orig)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RezTheme.muted)
                                .strikethrough()
                            Image(systemName: "arrow.right")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(RezTheme.muted)
                            Text("\(currentResult.score)")
                                .font(.caption.weight(.black))
                                .foregroundStyle(RezTheme.ink)
                            if delta > 0 {
                                Text("+\(delta)")
                                    .font(.system(size: 9, weight: .black))
                                    .foregroundStyle(RezTheme.success)
                            } else if delta == 0 {
                                Text("unchanged")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(RezTheme.muted)
                            }
                        }
                    } else {
                        Text(scoreMessage)
                            .font(.subheadline)
                            .foregroundStyle(RezTheme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Spacer(minLength: 0)
            }
        }
    }

    private var componentScores: some View {
        return RezCard {
            VStack(alignment: .leading, spacing: 16) {
                SectionTitle(
                    "Score breakdown",
                    subtitle: appState.isPro ? "Tap a score for details & diagnosis" : "Free includes the score breakdown. Pro unlocks full diagnosis."
                )
                ForEach(currentResult.componentScores.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                    let isExpanded = expandedScores.contains(key)
                    VStack(alignment: .leading, spacing: 6) {
                        Button {
                            if appState.isPro {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    if isExpanded {
                                        expandedScores.remove(key)
                                    } else {
                                        expandedScores.insert(key)
                                    }
                                }
                            } else {
                                errorMessage = "Detailed diagnosis is included with Rezumate Pro."
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(key.replacingOccurrences(of: "_", with: " ").capitalized)
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(RezTheme.ink)
                                    Spacer()
                                    HStack(spacing: 4) {
                                        Text("\(value)")
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(RezTheme.ink)
                                        if let delta = componentDelta(for: key), delta != 0 {
                                            Text(delta > 0 ? "+\(delta)" : "\(delta)")
                                                .font(.system(size: 9, weight: .black))
                                                .foregroundStyle(delta > 0 ? RezTheme.success : RezTheme.error)
                                        }
                                        Image(systemName: appState.isPro ? (isExpanded ? "chevron.up" : "chevron.down") : "lock.fill")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundStyle(RezTheme.muted)
                                    }
                                }
                                ProgressView(value: Double(value), total: 100)
                                    .tint(componentColor(value))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 2)
                                            .stroke(RezTheme.ink.opacity(0.4), lineWidth: 1)
                                    }
                            }
                        }
                        .buttonStyle(.plain)
                        
                        if appState.isPro && isExpanded {
                            VStack(alignment: .leading, spacing: 10) {
                                let (importance, explanation) = scoreDetails(for: key)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("WHY IT MATTERS")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundStyle(RezTheme.muted)
                                    Text(importance)
                                        .font(.caption)
                                        .foregroundStyle(RezTheme.ink)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                
                                Divider()
                                    .background(RezTheme.ink)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("DIAGNOSIS & FEEDBACK")
                                        .font(.system(size: 8, weight: .black))
                                        .foregroundStyle(RezTheme.muted)
                                    Text(explanation)
                                        .font(.caption)
                                        .foregroundStyle(RezTheme.ink)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .padding(10)
                            .background(RezTheme.appBackground, in: RoundedRectangle(cornerRadius: 6))
                            .overlay {
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(RezTheme.ink, lineWidth: 1.5)
                            }
                            .padding(.top, 4)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    if key != currentResult.componentScores.sorted(by: { $0.key < $1.key }).last?.key {
                        Divider()
                            .background(RezTheme.ink.opacity(0.2))
                            .padding(.vertical, 4)
                    }
                }
            }
        }
    }

    private var proInsightsCard: some View {
        RezCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "lock.open.fill")
                        .font(.system(size: 18, weight: .black))
                        .foregroundStyle(RezTheme.ink)
                        .frame(width: 38, height: 38)
                        .background(RezTheme.violet, in: RoundedRectangle(cornerRadius: 6))
                        .overlay {
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(RezTheme.ink, lineWidth: 2)
                        }

                    SectionTitle("Unlock full diagnosis", subtitle: proSubtitle)
                }

                Button {
                    isShowingPaywall = true
                } label: {
                    Label("See Pro plans", systemImage: "sparkles")
                }
                .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.warning))
                .disabled(!appState.entitlementsLoaded)

                if let purchaseMessage = appState.purchaseMessage {
                    Text(purchaseMessage)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func scoreDetails(for key: String) -> (String, String) {
        switch key {
        case "formatting_risk":
            let importance = "Most hiring pipelines run resumes through digital parser APIs. If a file has complex layouts, multi-column tables, or unreadable characters, it won't load into recruiter databases correctly."
            let explanation: String
            if currentResult.formattingWarnings.isEmpty {
                explanation = "Excellent! Your resume layout passed all formatting parser rules and is fully optimized for digital importing."
            } else {
                explanation = "Your resume has \(currentResult.formattingWarnings.count) formatting risk(s) that might disrupt digital parsers: \(currentResult.formattingWarnings.joined(separator: ", "))."
            }
            return (importance, explanation)
            
        case "impact_quality":
            let importance = "Strong resume bullets connect work to outcomes. Numbers are best when they are real, but clear outcome, reliability, quality, performance, or delivery signals are also stronger than task-only bullets."
            let bulletsWithImpact = currentResult.bulletCount - currentResult.bulletsWithoutMeasurableImpactCount
            let explanation = "\(bulletsWithImpact) out of \(currentResult.bulletCount) bullets contain impact signals. Rezumate only makes conservative wording changes and never invents outcomes or numbers."
            return (importance, explanation)
            
        case "keyword_coverage":
            let importance = "ATS systems rank applications based on keyword density. If your resume lacks the specific skills, languages, and tools requested in the job description, you won't surface in recruiter searches."
            let totalKeywords = currentResult.matchedKeywords.count + currentResult.missingKeywords.count
            let explanation = "Matched \(currentResult.matchedKeywords.count) out of \(totalKeywords) keywords requested by the employer (\(currentResult.keywordCoverage)% coverage). Incorporate the missing skills shown below to rank higher."
            return (importance, explanation)
            
        case "structure_readability":
            let importance = "Clear document sections ensure automatic parsers can index your experiences correctly, and help humans scan your career timeline. Missing sections like Education or Skills hurt readability."
            let missing = currentResult.sections.filter { !$0.value }.map { $0.key.capitalized }
            let explanation: String
            if missing.isEmpty {
                explanation = "Excellent. All standard resume sections (Summary, Experience, Projects, Skills, and Education) are clearly present and parseable."
            } else {
                explanation = "Missing or unparseable section(s): \(missing.joined(separator: ", ")). Check your headers so automatic parsers map your work history correctly."
            }
            return (importance, explanation)
            
        default:
            return ("", "")
        }
    }

    private var scoreColor: Color {
        componentColor(currentResult.score)
    }

    private var scoreMessage: String {
        switch currentResult.score {
        case 80...100: "Strong fit. Polish missing details and export."
        case 60..<80: "Good base. Close keyword and impact gaps."
        default: "Needs tailoring before sending."
        }
    }

    private func componentColor(_ value: Int) -> Color {
        switch value {
        case 80...100: RezTheme.success
        case 60..<80: RezTheme.warning
        default: RezTheme.error
        }
    }

    private func componentDelta(for key: String) -> Int? {
        guard let originalComponentScores else { return nil }
        return currentResult.componentScores[key].map { $0 - (originalComponentScores[key] ?? 0) }
    }

    private var roleFitSection: some View {
        let rows = roleFitRows
        return Group {
            if !rows.isEmpty {
                RezCard {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle("Role fit", subtitle: "Checked against this job description. Not added to your resume automatically.")
                        ForEach(rows, id: \.label) { row in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: row.matched ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(row.matched ? RezTheme.success : RezTheme.muted)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(row.label)
                                        .font(.caption.weight(.black))
                                        .foregroundStyle(RezTheme.ink)
                                    Text(row.value)
                                        .font(.caption)
                                        .foregroundStyle(RezTheme.muted)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer(minLength: 0)
                                Text(row.matched ? "MATCHED" : "MISSING")
                                    .font(.system(size: 8, weight: .black))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(row.matched ? RezTheme.success : RezTheme.warning, in: RoundedRectangle(cornerRadius: 3))
                                    .foregroundStyle(RezTheme.ink)
                            }
                        }
                    }
                }
            }
        }
    }

    private var roleFitRows: [(label: String, value: String, matched: Bool)] {
        var rows: [(label: String, value: String, matched: Bool)] = []
        if let title = currentResult.jobTitle {
            rows.append(("Job title", title, currentResult.jobTitleMatched))
        }
        if let education = currentResult.educationRequirement {
            rows.append(("Education", education, currentResult.educationMatched))
        }
        return rows
    }

    private func keywordSection(title: String, items: [String], color: Color, limitForFree: Int? = nil) -> some View {
        let visibleItems = appState.isPro || limitForFree == nil ? items : Array(items.prefix(limitForFree ?? items.count))
        let hiddenCount = max(0, items.count - visibleItems.count)

        return RezCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title)
                if visibleItems.isEmpty {
                    Text("Nothing to show yet.")
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.muted)
                } else {
                    FlowLayout(items: visibleItems) { item in
                        keywordChip(item, color: color)
                    }
                    if hiddenCount > 0 {
                        Text("+\(hiddenCount) more included with Pro")
                            .font(.caption.weight(.black))
                            .foregroundStyle(RezTheme.muted)
                    }
                }
            }
        }
    }

    private func tappableKeywordSection(
        title: String,
        subtitle: String,
        items: [String],
        color: Color,
        limitForFree: Int,
        showsPlacementNotice: Bool
    ) -> some View {
        let visibleItems = appState.isPro ? items : Array(items.prefix(limitForFree))
        let hiddenCount = max(0, items.count - visibleItems.count)

        return RezCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title, subtitle: subtitle)
                if showsPlacementNotice, let lastPlacedKeyword {
                    Text("Added \(ResumeTailoringService.displayName(for: lastPlacedKeyword)). Score updated.")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                }
                if visibleItems.isEmpty {
                    Text("Nothing to show yet.")
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.muted)
                } else {
                    FlowLayout(items: visibleItems) { item in
                        Button {
                            Task { await presentPlacement(for: item) }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "plus")
                                    .font(.system(size: 9, weight: .black))
                                Text(item)
                                    .font(.caption.weight(.black))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                                    .minimumScaleFactor(0.82)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .frame(maxWidth: .infinity, minHeight: 34)
                            .background(color, in: RoundedRectangle(cornerRadius: 4))
                            .foregroundStyle(RezTheme.ink)
                            .overlay {
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(RezTheme.ink, lineWidth: 2)
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(isPlacingKeyword || isWorking)
                        .accessibilityLabel("Add \(item)")
                    }
                    if hiddenCount > 0 {
                        Text("+\(hiddenCount) more included with Pro")
                            .font(.caption.weight(.black))
                            .foregroundStyle(RezTheme.muted)
                    }
                }
            }
        }
    }

    private func keywordChip(_ item: String, color: Color) -> some View {
        Text(item)
            .font(.caption.weight(.black))
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.82)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(color, in: RoundedRectangle(cornerRadius: 4))
            .foregroundStyle(RezTheme.ink)
            .overlay {
                RoundedRectangle(cornerRadius: 4)
                    .stroke(RezTheme.ink, lineWidth: 2)
            }
    }

    private var resumeIssuesSection: some View {
        let issues = bulletIssues
        let visibleIssues = appState.isPro ? issues : Array(issues.prefix(2))
        let hiddenCount = max(0, issues.count - visibleIssues.count)
        let missingSections = currentResult.sections
            .filter { !$0.value }
            .map { $0.key.replacingOccurrences(of: "_", with: " ").capitalized }
            .sorted()

        return RezCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionTitle("Resume issues", subtitle: "Specific items to review before sending this resume.")

                if visibleIssues.isEmpty && currentResult.formattingWarnings.isEmpty && missingSections.isEmpty {
                    Label("No major resume issues detected.", systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(RezTheme.ink)
                }

                ForEach(visibleIssues) { issue in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(issue.text)
                            .font(.caption)
                            .foregroundStyle(RezTheme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: 6) {
                            ForEach(issue.labels, id: \.self) { label in
                                Text(label.uppercased())
                                    .font(.system(size: 8, weight: .black))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(RezTheme.warning, in: RoundedRectangle(cornerRadius: 3))
                                    .foregroundStyle(RezTheme.ink)
                            }
                            Spacer(minLength: 0)
                            Button {
                                startRewrite(of: issue.text)
                            } label: {
                                Label("Rewrite", systemImage: "wand.and.stars")
                                    .font(.caption.weight(.black))
                                    .foregroundStyle(RezTheme.ink)
                            }
                            .buttonStyle(.plain)
                            .disabled(isWorking || isPlacingKeyword)
                            .accessibilityLabel("Rewrite this bullet")
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RezTheme.appBackground, in: RoundedRectangle(cornerRadius: 6))
                }

                if hiddenCount > 0 {
                    Text("+\(hiddenCount) more bullet issues included with Pro")
                        .font(.caption.weight(.black))
                        .foregroundStyle(RezTheme.muted)
                }

                ForEach(currentResult.formattingWarnings, id: \.self) { warning in
                    Label(warning, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(RezTheme.ink)
                }

                if !missingSections.isEmpty {
                    Label("Missing or unrecognized sections: \(missingSections.joined(separator: ", "))", systemImage: "doc.badge.ellipsis")
                        .font(.caption)
                        .foregroundStyle(RezTheme.ink)
                }
            }
        }
    }

    private var exportSection: some View {
        RezCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle("Export PDF", subtitle: "Preview a clean ATS-friendly PDF before sharing it.")
                Button {
                    Task { await prepareExport() }
                } label: {
                    Label(isExporting ? "Preparing PDF..." : "Preview & Export PDF", systemImage: "doc.richtext")
                }
                .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.blueWash))
                .disabled(isExporting || isWorking)
            }
        }
    }

    private var improveResumeSection: some View {
        RezCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionTitle("Improve Resume", subtitle: "Optimize content and format in the standard resume template.")

                if optimizedResumeText == nil {
                    if appState.isAIConfigured {
                        Text("AI rewrites each weak bullet. You review every change before it's applied.")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    } else if appState.entitlementState == .free {
                        Text("\(appState.remainingImprovements) free improvements left today.")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }

                    Button {
                        Task { await improveResume() }
                    } label: {
                        Label(isWorking ? "Improving..." : "Improve Resume", systemImage: "wand.and.stars")
                    }
                    .buttonStyle(RezPrimaryButtonStyle())
                    .disabled(isWorking || (!appState.isAIConfigured && !appState.canImprove))

                    if !appState.isAIConfigured && appState.entitlementState == .free && !appState.canImprove {
                        Button {
                            isShowingPaywall = true
                        } label: {
                            Label("Unlock unlimited improvements", systemImage: "lock.open")
                        }
                        .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.warning))
                    } else if appState.entitlementState == .loading {
                        Text("Checking your purchase status...")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                    }

                    if let purchaseMessage = appState.purchaseMessage {
                        Text(purchaseMessage)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(RezTheme.success)
                                .font(.system(size: 14, weight: .bold))
                            Text("Resume improved and formatted")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(RezTheme.ink)
                        }

                        if let orig = originalScore {
                            let delta = currentResult.score - orig
                            HStack(spacing: 6) {
                                Text("Score")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(RezTheme.muted)
                                Text("\(orig) to \(currentResult.score)")
                                    .font(.caption.weight(.black))
                                    .foregroundStyle(RezTheme.ink)
                                if delta > 0 {
                                    Text("(+\(delta) pts)")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(RezTheme.success)
                                } else if delta == 0 {
                                    Text("(wording improved; review before sending)")
                                        .font(.caption)
                                        .foregroundStyle(RezTheme.muted)
                                }
                            }
                        }

                        if let changedBulletCount {
                            Text("\(changedBulletCount) bullet\(changedBulletCount == 1 ? "" : "s") safely changed")
                                .font(.caption.weight(.black))
                                .foregroundStyle(RezTheme.ink)
                        }

                        if !improvementComponentDeltas.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(improvementComponentDeltas.sorted(by: { $0.key < $1.key }), id: \.key) { key, delta in
                                    Text("\(key.replacingOccurrences(of: "_", with: " ").capitalized): \(delta >= 0 ? "+" : "")\(delta)")
                                        .font(.caption)
                                        .foregroundStyle(delta > 0 ? RezTheme.success : RezTheme.muted)
                                }
                            }
                        }

                        Text((remainingImpactIssues ?? currentResult.bulletsWithoutMeasurableImpactCount) == 0 ? "No remaining impact warnings were detected." : "\(remainingImpactIssues ?? currentResult.bulletsWithoutMeasurableImpactCount) bullet(s) may still need factual impact details.")
                            .font(.caption)
                            .foregroundStyle(RezTheme.muted)

                        Label("No skills, metrics, experience, or achievements were added.", systemImage: "checkmark.shield.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(RezTheme.ink)
                    }
                }
            }
        }
    }

    private func improveResume() async {
        if appState.isAIConfigured {
            runWithAI { Task { await improveResumeWithAI() } }
        } else {
            await improveResumeWithRules()
        }
    }

    private func improveResumeWithRules() async {
        guard let token = appState.token else { return }
        guard appState.canImprove else {
            errorMessage = appState.entitlementsLoaded
                ? "Free improvements are used for today. Rezumate Pro includes unlimited improvements."
                : "Rezumate is still checking your App Store purchase. Try again in a moment."
            return
        }

        isWorking = true
        errorMessage = nil
        exportArtifact = nil

        do {
            let response = try await appState.api.improveResume(
                variantId: currentResult.variantId,
                token: token
            )
            appState.recordSuccessfulImprovement()
            if originalScore == nil {
                originalScore = response.originalScore
            }
            if originalComponentScores == nil {
                originalComponentScores = currentResult.componentScores
            }
            optimizedResumeText = response.optimizedResumeText
            currentResult = response.updatedAnalysis
            appState.latestAnalysis = response.updatedAnalysis
            changedBulletCount = response.changedBullets.count
            improvementComponentDeltas = response.componentDeltas
            remainingImpactIssues = response.remainingBulletsWithoutMeasurableImpact
        } catch {
            errorMessage = error.localizedDescription
        }

        isWorking = false
    }

    private func presentPlacement(for keyword: String) async {
        guard let token = appState.token else { return }
        errorMessage = nil
        do {
            let detail = try await appState.api.variant(id: currentResult.variantId, token: token)
            let text = detail.tailoredContent.rawText ?? ""
            keywordDraft = KeywordPlacementDraft(
                keyword: keyword,
                bullets: ResumeTailoringService.proofBullets(from: text)
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func confirmPlacement(keyword: String, alsoInBullet: String?) async {
        guard let token = appState.token else { return }
        isPlacingKeyword = true
        errorMessage = nil
        defer { isPlacingKeyword = false }

        do {
            let detail = try await appState.api.variant(id: currentResult.variantId, token: token)
            let previousText = detail.tailoredContent.rawText ?? ""
            let response = try await appState.api.placeKeyword(
                variantId: currentResult.variantId,
                keyword: keyword,
                alsoInBullet: alsoInBullet,
                token: token
            )
            placementUndoStack.append(previousText)
            if originalScore == nil {
                originalScore = response.originalScore
            }
            if originalComponentScores == nil {
                originalComponentScores = currentResult.componentScores
            }
            currentResult = response.updatedAnalysis
            appState.latestAnalysis = response.updatedAnalysis
            lastPlacedKeyword = response.placedKeyword
            keywordDraft = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func undoLastPlacement() async {
        guard let token = appState.token, let previous = placementUndoStack.popLast() else { return }
        isPlacingKeyword = true
        errorMessage = nil
        defer { isPlacingKeyword = false }

        do {
            let updated = try await appState.api.replaceTailoredContent(
                variantId: currentResult.variantId,
                resumeText: previous,
                token: token
            )
            currentResult = updated
            appState.latestAnalysis = updated
            lastPlacedKeyword = nil
        } catch {
            placementUndoStack.append(previous)
            errorMessage = error.localizedDescription
        }
    }

    private func prepareExport() async {
        guard let token = appState.token else { return }
        isExporting = true
        errorMessage = nil
        defer { isExporting = false }

        do {
            let artifact = try await appState.api.exportVariant(id: currentResult.variantId, token: token)
            if artifact.warnings.isEmpty {
                presentExport(artifact)
            } else {
                pendingExportArtifact = artifact
                isShowingExportWarning = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func presentExport(_ artifact: ExportArtifact) {
        appState.recordSuccessfulExport()
        exportArtifact = artifact
    }

    private func requestReviewIfEligible() {
        guard errorMessage == nil, appState.shouldRequestReview() else { return }
        appState.markReviewRequested()
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            requestReview()
        }
    }

    private var proSubtitle: String {
        let features = "Get every keyword, detailed score reasoning, unlimited improvements, and AI rewrites."
        if let price = appState.subscriptionPriceText {
            return "Rezumate Pro, \(price). \(features)"
        }
        return features
    }

    private var coverLetterSection: some View {
        RezCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle("Cover letter", subtitle: "A short letter for this job, written only from your resume.")
                Button {
                    runWithAI { isShowingCoverLetter = true }
                } label: {
                    Label("Write cover letter", systemImage: "envelope")
                }
                .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.violet))
                .disabled(!appState.isAIConfigured || isWorking)
                if !appState.isAIConfigured {
                    Text("Needs Rezumate AI, which isn't available in this build.")
                        .font(.caption)
                        .foregroundStyle(RezTheme.muted)
                }
            }
        }
    }

    // MARK: - AI

    /// Asks for consent once, shows the paywall when no AI actions are left, then runs the action.
    private func runWithAI(_ action: @escaping () -> Void) {
        guard appState.isAIConfigured else { return }
        guard appState.aiConsentGiven else {
            pendingAIAction = action
            isShowingAIConsent = true
            return
        }
        if let access = appState.aiAccess, !access.hasActions {
            isShowingPaywall = true
            return
        }
        action()
    }

    private func aiContext() -> AIRewriteService.Context? {
        guard let variant = LocalStorageManager.shared.loadVariant(id: currentResult.variantId) else { return nil }
        return AIRewriteService.Context(
            resumeText: variant.tailoredContent,
            jobDescription: variant.scoringJobDescription,
            jobTitle: currentResult.jobTitle,
            confirmedKeywords: lastPlacedKeyword.map { [$0] } ?? []
        )
    }

    private func startRewrite(of bullet: String) {
        guard appState.isAIConfigured else {
            showRuleBasedRewrite(of: bullet)
            return
        }
        runWithAI {
            rewriteQuestions = nil
            rewriteDetails = []
            rewriteOptions = []
            rewriteError = nil
            rewriteDraft = BulletRewriteDraft(bullet: bullet)
            Task { await loadQuestions(for: bullet) }
        }
    }

    /// Asks what the bullet leaves out. With no questions (or no AI), goes straight to rewriting.
    private func loadQuestions(for bullet: String) async {
        guard let context = aiContext() else { return }
        isLoadingQuestions = true
        let questions: [BulletQuestion]
        do {
            questions = try await appState.ai.questions(for: bullet, context: context)
        } catch AIClientError.noAccess {
            isLoadingQuestions = false
            rewriteDraft = nil
            isShowingPaywall = true
            return
        } catch {
            questions = []
        }
        isLoadingQuestions = false
        if questions.isEmpty {
            await loadRewriteOptions(for: bullet)
        } else {
            rewriteQuestions = questions
        }
    }

    private func loadRewriteOptions(for bullet: String) async {
        guard let context = aiContext() else { return }
        isRewriting = true
        rewriteError = nil
        rewriteOptions = []
        rewriteIsFallback = false
        defer { isRewriting = false }

        do {
            let (options, access) = try await appState.ai.rewriteOptions(for: bullet, details: rewriteDetails, context: context)
            appState.updateAIAccess(access)
            rewriteOptions = options
        } catch AIClientError.noAccess {
            rewriteDraft = nil
            isShowingPaywall = true
        } catch AIClientError.unavailable {
            // Offline or service down: fall back to the local suggestion engine.
            rewriteOptions = (try? await LocalAIService.shared.rewriteBullet(bullet, focusKeywords: []))?
                .filter { $0 != bullet } ?? []
            rewriteIsFallback = true
            if rewriteOptions.isEmpty { rewriteError = AIClientError.unavailable.localizedDescription }
        } catch {
            rewriteError = error.localizedDescription
        }
    }

    private func showRuleBasedRewrite(of bullet: String) {
        rewriteQuestions = nil
        rewriteDetails = []
        rewriteDraft = BulletRewriteDraft(bullet: bullet)
        Task {
            rewriteOptions = (try? await LocalAIService.shared.rewriteBullet(bullet, focusKeywords: []))?
                .filter { $0 != bullet } ?? []
            rewriteIsFallback = true
            rewriteError = rewriteOptions.isEmpty ? "No basic suggestion for this bullet." : nil
        }
    }

    private func improveResumeWithAI() async {
        guard let context = aiContext() else { return }
        let targets = bulletIssues.map(\.text)
        guard !targets.isEmpty else {
            errorMessage = "No weak bullets to improve."
            return
        }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            let (items, access) = try await appState.ai.improvements(for: targets, context: context)
            appState.updateAIAccess(access)
            improveDraft = ImproveReviewDraft(items: items)
        } catch AIClientError.noAccess {
            isShowingPaywall = true
        } catch AIClientError.unavailable {
            errorMessage = "AI is unavailable right now, so basic improvements were used instead."
            isWorking = false
            await improveResumeWithRules()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Replaces accepted bullets in the resume, then rescores it on-device.
    private func applyRewrites(_ items: [BulletImprovement], countsAsImprovement: Bool) async {
        guard let token = appState.token,
              let variant = LocalStorageManager.shared.loadVariant(id: currentResult.variantId),
              !items.isEmpty else { return }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        let previousText = variant.tailoredContent
        var updatedText = previousText
        var applied = 0
        for item in items where updatedText.contains(item.original) {
            updatedText = updatedText.replacingOccurrences(of: item.original, with: item.rewrite)
            applied += 1
        }
        guard applied > 0 else {
            errorMessage = "Those bullets have changed since the suggestions were made. Try again."
            return
        }

        do {
            let previousScores = currentResult.componentScores
            let previousScore = currentResult.score
            let updated = try await appState.api.replaceTailoredContent(
                variantId: currentResult.variantId,
                resumeText: updatedText,
                token: token
            )
            placementUndoStack.append(previousText)
            if originalScore == nil { originalScore = previousScore }
            if originalComponentScores == nil { originalComponentScores = previousScores }
            currentResult = updated
            appState.latestAnalysis = updated
            if countsAsImprovement {
                optimizedResumeText = updatedText
                changedBulletCount = applied
                improvementComponentDeltas = updated.componentScores.reduce(into: [:]) { deltas, entry in
                    let delta = entry.value - (previousScores[entry.key] ?? entry.value)
                    if delta != 0 { deltas[entry.key] = delta }
                }
                remainingImpactIssues = updated.bulletsWithoutMeasurableImpactCount
            }
            rewriteDraft = nil
            improveDraft = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Fetched once per analysis; reopening the results reuses the cached list.
    private func loadExtraRequirements() async {
        guard appState.isAIConfigured, appState.aiConsentGiven, extraRequirements.isEmpty else { return }
        let variantId = currentResult.variantId
        if let cached = appState.aiRequirementsCache[variantId] {
            extraRequirements = cached
            return
        }
        guard let context = aiContext() else { return }
        let shown = currentResult.missingKeywords + currentResult.partialMatches + currentResult.matchedKeywords
        guard let terms = try? await appState.ai.extraRequirements(context: context, alreadyShown: shown) else { return }
        appState.aiRequirementsCache[variantId] = terms
        extraRequirements = terms
    }

    private var bulletIssues: [BulletIssue] {
        var order: [String] = []
        var labels: [String: Set<String>] = [:]
        for text in currentResult.weakBullets {
            if labels[text] == nil { order.append(text) }
            labels[text, default: []].insert("Weak wording")
        }
        for text in currentResult.bulletsWithoutMeasurableImpact {
            if labels[text] == nil { order.append(text) }
            labels[text, default: []].insert("Missing impact")
        }
        return order.map { BulletIssue(text: $0, labels: Array(labels[$0] ?? []).sorted()) }
    }

    private func reAnalyze() async {
        guard let token = appState.token,
              let upload = appState.upload,
              !isRefreshingAnalysis else { return }
        guard appState.canAnalyze else {
            errorMessage = appState.entitlementsLoaded
                ? "Free analyses are used for today. Rezumate Pro includes unlimited analyses."
                : "Rezumate is still checking your App Store purchase. Try again in a moment."
            return
        }
        
        isRefreshingAnalysis = true
        errorMessage = nil
        
        do {
            let variantDetail = try await appState.api.variant(id: currentResult.variantId, token: token)
            let currentResumeText = variantDetail.tailoredContent.rawText ?? ""
            let shouldSave = appState.canSaveNewVariant
            
            let result = try await appState.api.analyzeResume(
                resumeId: upload.resumeId,
                resumeText: currentResumeText,
                jobDescription: appState.jobDescription,
                token: token,
                shouldSave: shouldSave
            )
            appState.recordSuccessfulAnalysis()
            currentResult = result
            appState.latestAnalysis = result
            placementUndoStack = []
            lastPlacedKeyword = nil
            if !shouldSave {
                errorMessage = "History is full on Free. This refreshed result is usable now, but it was not saved."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isRefreshingAnalysis = false
    }

    private func pollForRefinedAnalysis() async {
        guard currentResult.analysisStatus == "pending",
              let token = appState.token,
              !isRefreshingAnalysis else {
            return
        }

        isRefreshingAnalysis = true
        defer { isRefreshingAnalysis = false }

        for _ in 0..<20 {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            if Task.isCancelled { return }

            do {
                let refreshed = try await appState.api.analysisResult(id: currentResult.variantId, token: token)
                currentResult = refreshed
                appState.latestAnalysis = refreshed
                if refreshed.analysisStatus != "pending" {
                    return
                }
            } catch {
                errorMessage = error.localizedDescription
                return
            }
        }
    }
}

private struct BulletIssue: Identifiable {
    let text: String
    let labels: [String]
    var id: String { text }
}

private struct KeywordPlacementDraft: Identifiable, Equatable {
    let keyword: String
    let bullets: [String]
    var id: String { keyword }
}

private struct KeywordPlacementSheet: View {
    let draft: KeywordPlacementDraft
    let isWorking: Bool
    let onCancel: () -> Void
    let onConfirm: (String?) -> Void

    @State private var selectedBullet: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(ResumeTailoringService.displayName(for: draft.keyword))
                        .font(.title2.weight(.black))
                        .foregroundStyle(RezTheme.ink)

                    Text("Only add this if you actually have it. Rezumate will put it in Skills and will not invent experience, metrics, or employers.")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)

                    if !draft.bullets.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Optional proof bullet")
                                .font(.caption.weight(.black))
                                .foregroundStyle(RezTheme.ink)
                            Text("Pick an existing bullet to mention this skill. Skip this to add it only to Skills.")
                                .font(.caption)
                                .foregroundStyle(RezTheme.muted)

                            ForEach(draft.bullets, id: \.self) { bullet in
                                Button {
                                    selectedBullet = selectedBullet == bullet ? nil : bullet
                                } label: {
                                    HStack(alignment: .top, spacing: 8) {
                                        Image(systemName: selectedBullet == bullet ? "checkmark.square.fill" : "square")
                                            .foregroundStyle(RezTheme.ink)
                                        Text(bullet)
                                            .font(.caption)
                                            .foregroundStyle(RezTheme.ink)
                                            .multilineTextAlignment(.leading)
                                        Spacer(minLength: 0)
                                    }
                                    .padding(10)
                                    .background(
                                        selectedBullet == bullet ? RezTheme.blueWash : RezTheme.appBackground,
                                        in: RoundedRectangle(cornerRadius: 6)
                                    )
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(RezTheme.ink, lineWidth: 1.5)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    Button {
                        onConfirm(selectedBullet)
                    } label: {
                        Label(
                            isWorking ? "Adding..." : "Add to Skills",
                            systemImage: "plus"
                        )
                    }
                    .buttonStyle(RezPrimaryButtonStyle())
                    .disabled(isWorking)
                }
                .padding()
            }
            .rezScreenBackground()
            .navigationTitle("Add keyword")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .disabled(isWorking)
                }
            }
        }
    }
}

struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Hashable {
    let items: Data
    let content: (Data.Element) -> Content

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(Array(items), id: \.self) { item in
                content(item)
                    .frame(minHeight: 34)
                    .frame(maxWidth: .infinity)
            }
        }
    }
}
