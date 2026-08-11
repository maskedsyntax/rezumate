package com.aftaab.rezumate.export

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileNotFoundException

object ResumePdfShare {
    fun createIntent(context: Context, pdfFile: File): Intent {
        validateExport(context, pdfFile)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.files",
            pdfFile,
        )
        return Intent(Intent.ACTION_SEND).apply {
            type = PDF_MIME_TYPE
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newUri(context.contentResolver, pdfFile.name, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }

    fun createChooserIntent(
        context: Context,
        pdfFile: File,
        title: String = "Share resume",
    ): Intent = Intent.createChooser(createIntent(context, pdfFile), title)

    fun share(context: Context, pdfFile: File, title: String = "Share resume") {
        val intent = createChooserIntent(context, pdfFile, title)
        if (context !is Activity) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    private fun validateExport(context: Context, pdfFile: File) {
        if (!pdfFile.isFile) throw FileNotFoundException(pdfFile.path)
        val exportsDirectory = File(context.cacheDir, "exports").canonicalFile
        val canonicalFile = pdfFile.canonicalFile
        if (canonicalFile.parentFile != exportsDirectory || canonicalFile.extension.lowercase() != "pdf") {
            throw IllegalArgumentException("Only cached Rezumate PDF exports can be shared")
        }
    }

    private const val PDF_MIME_TYPE = "application/pdf"
}
