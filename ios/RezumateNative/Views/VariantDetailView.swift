import StoreKit
import SwiftUI

struct VariantDetailView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.requestReview) private var requestReview
    let variant: VariantDetail

    @State private var exportArtifact: ExportArtifact?
    @State private var pendingExportArtifact: ExportArtifact?
    @State private var isShowingExportWarning = false
    @State private var isExporting = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(variant.variantName)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(RezTheme.ink)
                Text("Score \(variant.atsScore ?? 0)")
                    .font(.headline)
                    .foregroundStyle(RezTheme.muted)

                Button {
                    Task { await prepareExport() }
                } label: {
                    Label(isExporting ? "Preparing PDF..." : "Preview & Export PDF", systemImage: "doc.richtext")
                }
                .buttonStyle(RezPrimaryButtonStyle())
                .disabled(isExporting)

                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(RezTheme.ink)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RezTheme.error, in: RoundedRectangle(cornerRadius: 6))
                }

                Text(variant.tailoredContent.rawText ?? "No resume text saved for this variant.")
                    .font(.body.monospaced())
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .rezInputSurface()
            }
            .padding()
        }
        .rezScreenBackground()
        .navigationTitle("Variant")
        .sheet(item: $exportArtifact, onDismiss: requestReviewIfEligible) { artifact in
            ResumePDFPreview(url: artifact.url)
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

    private func prepareExport() async {
        guard let token = appState.token else { return }
        isExporting = true
        errorMessage = nil
        defer { isExporting = false }

        do {
            let artifact = try await appState.api.exportVariant(id: variant.id, token: token)
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
}
