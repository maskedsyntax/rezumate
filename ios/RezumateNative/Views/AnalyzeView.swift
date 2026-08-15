import SwiftUI

struct AnalyzeView: View {
    @EnvironmentObject private var appState: AppState
    @State private var isShowingPicker = false
    @State private var isUploading = false
    @State private var isAnalyzing = false
    @State private var errorMessage: String?
    @State private var resultForSheet: AnalyzeResponse?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    introHeader
                    planUsageCard
                    uploadStep
                    jobDescriptionStep
                    analyzeButton
                    scorePreview

                    if let errorMessage {
                        AnalyzeNoticeView(message: errorMessage)
                    }
                }
                .padding()
            }
            .rezScreenBackground()
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $isShowingPicker) {
                DocumentPicker { url in
                    isShowingPicker = false
                    Task { await upload(url: url) }
                }
            }
            .navigationDestination(item: $resultForSheet) { result in
                ResultsView(result: result)
            }
        }
    }

    private var introHeader: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Ready to tailor your resume")
                    .font(.system(size: 24, weight: .black))
                    .foregroundStyle(RezTheme.ink)
                Text("Let's improve your resume today.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RezTheme.muted)
            }

            RezCard(padding: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("RESUME SCORE")
                        .font(.caption.weight(.black))
                        .foregroundStyle(RezTheme.ink)
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(appState.latestAnalysis.map { "\($0.score)" } ?? "--")
                            .font(.system(size: 42, weight: .black))
                            .foregroundStyle(RezTheme.ink)
                        Text("/100")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(RezTheme.ink)
                    }
                    Text(appState.latestAnalysis == nil ? "Upload a resume to generate an ATS score." : "Great. Your resume has a fresh analysis.")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(RezTheme.appBackground)
                            Rectangle()
                                .fill(RezTheme.ink)
                                .frame(width: proxy.size.width * CGFloat(appState.latestAnalysis?.score ?? 0) / 100)
                        }
                    }
                    .frame(height: 10)
                    .overlay {
                        Rectangle()
                            .stroke(RezTheme.ink, lineWidth: 1.5)
                    }
                }
            }
        }
        .padding(.top, 10)
    }

    private var uploadStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            stepTitle("Upload Resume")
            uploadDropZone

            if let upload = appState.upload {
                uploadedFileRow(upload)
            }

            if isUploading {
                ProgressView("Parsing resume...")
                    .font(.caption)
                    .foregroundStyle(RezTheme.muted)
            }

            ForEach(appState.upload?.warnings ?? [], id: \.self) { warning in
                Label(warning, systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(RezTheme.warning)
            }
        }
    }

    private var planUsageCard: some View {
        RezCard(padding: 14) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    SectionTitle(appState.planName, subtitle: planSubtitle)
                    Spacer()
                    RezStatusPill(text: planStatus, color: appState.isPro ? RezTheme.success : RezTheme.warning)
                }

                if appState.entitlementState == .free {
                    HStack(spacing: 8) {
                        UsageChip(label: "\(appState.remainingAnalyses)", detail: "analyses left")
                        UsageChip(label: "\(appState.remainingImprovements)", detail: "rewrites left")
                        UsageChip(label: "\(appState.savedVariantCount)/\(UsageLimiter.freeSavedVariants)", detail: "saved")
                    }
                }
            }
        }
    }

    private var uploadDropZone: some View {
        Button {
            isShowingPicker = true
        } label: {
            VStack(spacing: 14) {
                Image(systemName: appState.upload == nil ? "doc.badge.arrow.up" : "checkmark.circle.fill")
                    .font(.system(size: 38, weight: .black))
                    .foregroundStyle(RezTheme.ink)
                    .frame(width: 76, height: 76)
                    .background(appState.upload == nil ? RezTheme.blueWash : RezTheme.success, in: RoundedRectangle(cornerRadius: 6))
                    .overlay {
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(RezTheme.ink, lineWidth: 2)
                    }

                VStack(spacing: 6) {
                    Text(appState.upload == nil ? "Tap to upload your resume" : "Resume attached")
                        .font(.headline.weight(.black))
                        .foregroundStyle(RezTheme.ink)
                    Text(appState.upload == nil ? "PDF or DOCX" : "Tap to replace the file")
                        .font(.subheadline)
                        .foregroundStyle(RezTheme.muted)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 174)
        }
        .buttonStyle(.plain)
        .disabled(isUploading)
        .background(RezTheme.surface, in: RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(RezTheme.border, style: StrokeStyle(lineWidth: 2, dash: [6, 6]))
        }
        .rezBrutalShadow()
    }

    private func uploadedFileRow(_ upload: UploadResponse) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(RezTheme.ink)
                Text(upload.filename.split(separator: ".").last.map(String.init)?.uppercased() ?? "DOC")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(RezTheme.elevatedSurface)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .padding(.horizontal, 3)
            }
            .frame(width: 42, height: 52)

            VStack(alignment: .leading, spacing: 4) {
                Text(upload.filename)
                    .font(.body.weight(.medium))
                    .foregroundStyle(RezTheme.ink)
                    .lineLimit(1)
                Text("\(upload.characterCount.formatted()) characters extracted")
                    .font(.subheadline)
                    .foregroundStyle(RezTheme.muted)
            }

            Spacer()

            Button {
                appState.upload = nil
            } label: {
                Image(systemName: "xmark")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(RezTheme.muted)
                    .frame(width: 34, height: 34)
                    .background(RezTheme.appBackground, in: Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(RezTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 6))
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(RezTheme.border, lineWidth: 2)
        }
    }

    private var jobDescriptionStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            stepTitle("Job Description")

            TextEditor(text: $appState.jobDescription)
                .frame(minHeight: 178)
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .padding(.bottom, 34)
                .scrollContentBackground(.hidden)
                .background(RezTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 6))
                .overlay {
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(RezTheme.border, lineWidth: 2)
                }
                .rezBrutalShadow()
                .overlay(alignment: .topLeading) {
                    if appState.jobDescription.isEmpty {
                        Text("Paste the job description here...")
                            .font(.body)
                            .foregroundStyle(RezTheme.muted.opacity(0.72))
                            .padding(.horizontal, 17)
                            .padding(.vertical, 20)
                            .allowsHitTesting(false)
                    }
                }
                .overlay(alignment: .bottomTrailing) {
                    Text("\(appState.jobDescription.count)/5000")
                        .font(.caption)
                        .foregroundStyle(appState.jobDescription.count > 5000 ? RezTheme.error : RezTheme.muted)
                        .padding(.trailing, 14)
                        .padding(.bottom, 12)
                }
                .onChange(of: appState.jobDescription) { _, value in
                    guard value.count > AnalysisInputValidator.maximumJobDescriptionCharacters else { return }
                    appState.jobDescription = String(value.prefix(AnalysisInputValidator.maximumJobDescriptionCharacters))
                }
        }
    }

    private var scorePreview: some View {
        RezCard(padding: 18) {
            HStack(alignment: .center, spacing: 18) {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Your ATS Score")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(RezTheme.ink)

                    VStack(alignment: .leading, spacing: 5) {
                        if let score = appState.latestAnalysis?.score {
                            Text("\(score)")
                                .font(.system(size: 38, weight: .bold, design: .serif))
                                .foregroundStyle(scoreColor(score))
                            Text("/100")
                                .font(.subheadline)
                                .foregroundStyle(RezTheme.muted)
                        } else {
                            Text("--")
                                .font(.system(size: 38, weight: .bold, design: .serif))
                                .foregroundStyle(RezTheme.ink)
                            Text("/100")
                                .font(.subheadline)
                                .foregroundStyle(RezTheme.muted)
                        }
                    }

                    Text(appState.latestAnalysis == nil ? "Upload your resume and job description to see your ATS score." : "Open the latest report for the full score breakdown.")
                        .font(.caption)
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                Image(systemName: "chart.bar.xaxis")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(RezTheme.primary)
                    .frame(width: 64, height: 64)
                    .background(RezTheme.appBackground, in: Circle())
            }
        }
    }

    private func stepTitle(_ title: String) -> some View {
        Text(title)
            .font(.title3.weight(.black))
            .foregroundStyle(RezTheme.ink)
    }

    private func scoreColor(_ score: Int) -> Color {
        switch score {
        case 80...100: RezTheme.success
        case 60..<80: RezTheme.warning
        default: RezTheme.error
        }
    }

    private var analyzeButton: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                Task { await analyze() }
            } label: {
                Label(isAnalyzing ? "Analyzing..." : "Analyze Resume", systemImage: "sparkles")
            }
            .buttonStyle(RezPrimaryButtonStyle())
            .disabled(appState.upload == nil || appState.jobDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isAnalyzing || !appState.canAnalyze)

            if !appState.canAnalyze {
                Text(appState.entitlementsLoaded ? "Free analyses are used for today." : "Checking your purchase status...")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RezTheme.muted)

                if appState.entitlementState == .free {
                    Button {
                        Task { await appState.purchasePro() }
                    } label: {
                        Label("Unlock unlimited analyses", systemImage: "lock.open")
                    }
                    .buttonStyle(RezSecondaryButtonStyle(fill: RezTheme.warning))
                    .disabled(!appState.canPurchasePro)
                }

                if let purchaseMessage = appState.purchaseMessage {
                    Text(purchaseMessage)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RezTheme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func upload(url: URL) async {
        guard let token = appState.token else { return }
        isUploading = true
        errorMessage = nil
        let didStartAccessing = url.startAccessingSecurityScopedResource()
        defer {
            if didStartAccessing { url.stopAccessingSecurityScopedResource() }
        }

        do {
            appState.upload = try await appState.api.uploadResume(fileURL: url, token: token)
        } catch {
            errorMessage = error.localizedDescription
        }
        isUploading = false
    }

    private func analyze() async {
        guard let token = appState.token, let upload = appState.upload else { return }
        guard appState.canAnalyze else {
            errorMessage = appState.entitlementsLoaded
                ? "Free analyses are used for today. Unlock Pro once for unlimited analyses."
                : "Rezumate is still checking your App Store purchase. Try again in a moment."
            return
        }

        isAnalyzing = true
        errorMessage = nil
        do {
            let shouldSave = appState.canSaveNewVariant
            let result = try await appState.api.analyzeResume(
                resumeId: upload.resumeId,
                resumeText: upload.extractedText,
                jobDescription: appState.jobDescription,
                token: token,
                shouldSave: shouldSave
            )
            appState.recordSuccessfulAnalysis()
            appState.latestAnalysis = result
            if !shouldSave {
                errorMessage = "History is full on Free. This result is usable now and exportable, but it was not saved."
            }
            resultForSheet = result
        } catch {
            errorMessage = error.localizedDescription
        }
        isAnalyzing = false
    }

    private var planSubtitle: String {
        switch appState.entitlementState {
        case .loading: "Verifying your App Store entitlement."
        case .free: "3 analyses/day, 3 improvements/day, 2 saved variants."
        case .pro: "Unlimited analyses, improvements, and saved variants."
        }
    }

    private var planStatus: String {
        switch appState.entitlementState {
        case .loading: "CHECKING"
        case .free: "FREE"
        case .pro: "PRO"
        }
    }
}

private struct UsageChip: View {
    let label: String
    let detail: String

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.headline.weight(.black))
                .foregroundStyle(RezTheme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(detail)
                .font(.system(size: 9, weight: .black))
                .foregroundStyle(RezTheme.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .background(RezTheme.appBackground, in: RoundedRectangle(cornerRadius: 6))
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(RezTheme.ink, lineWidth: 1.5)
        }
    }
}

extension AnalyzeResponse: Identifiable {
    var id: UUID { variantId }
}

private struct AnalyzeNoticeView: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 18, weight: .black))
                .foregroundStyle(RezTheme.ink)
                .frame(width: 34, height: 34)
                .background(RezTheme.warning, in: RoundedRectangle(cornerRadius: 6))
                .overlay {
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(RezTheme.ink, lineWidth: 2)
                }

            VStack(alignment: .leading, spacing: 4) {
                Text("Heads up")
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(RezTheme.ink)
                Text(message)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RezTheme.muted)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RezTheme.surface, in: RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(RezTheme.ink, lineWidth: 2)
        }
    }
}
