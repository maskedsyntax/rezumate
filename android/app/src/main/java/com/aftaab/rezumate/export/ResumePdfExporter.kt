package com.aftaab.rezumate.export

import android.content.Context
import androidx.annotation.WorkerThread
import com.aftaab.rezumate.domain.ResumeParser
import com.aftaab.rezumate.model.ResumeDocument
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object ResumePdfExporter {
    @WorkerThread
    fun export(context: Context, resumeText: String, exportId: String): File =
        export(context, ResumeParser.parse(resumeText), exportId)

    @WorkerThread
    fun export(context: Context, document: ResumeDocument, exportId: String): File {
        val exportsDirectory = File(context.cacheDir, EXPORTS_DIRECTORY)
        if (!exportsDirectory.exists() && !exportsDirectory.mkdirs()) {
            throw IOException("Unable to create the PDF export cache")
        }

        val safeId = exportId
            .replace(Regex("[^A-Za-z0-9._-]"), "-")
            .trim('.', '-', '_')
            .take(80)
            .ifBlank { "resume" }
        val destination = File(exportsDirectory, "rezumate-$safeId.pdf")
        val temporary = File.createTempFile("rezumate-", ".tmp", exportsDirectory)

        try {
            FileOutputStream(temporary).use { output ->
                ResumePdfRenderer.render(document, output)
                output.fd.sync()
            }
            if (destination.exists() && !destination.delete()) {
                throw IOException("Unable to replace the existing PDF export")
            }
            if (!temporary.renameTo(destination)) {
                temporary.copyTo(destination, overwrite = true)
                if (!temporary.delete()) temporary.deleteOnExit()
            }
            return destination
        } catch (error: Throwable) {
            temporary.delete()
            throw error
        }
    }

    private const val EXPORTS_DIRECTORY = "exports"
}
