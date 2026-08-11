package com.aftaab.rezumate.export

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.io.Closeable
import java.io.File

/** Thread-safe owner of the platform PDF resources used by the Compose preview. */
class PdfPageRenderer(file: File) : Closeable {
    private val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    private val renderer: PdfRenderer = try {
        PdfRenderer(descriptor)
    } catch (error: Throwable) {
        descriptor.close()
        throw error
    }
    private var closed = false

    val pageCount: Int
        get() = synchronized(this) {
            check(!closed) { "PDF renderer is closed" }
            renderer.pageCount
        }

    @Synchronized
    fun renderPage(index: Int, targetWidth: Int): Bitmap {
        check(!closed) { "PDF renderer is closed" }
        require(index in 0 until renderer.pageCount) { "Page index is out of bounds" }
        require(targetWidth > 0) { "Target width must be positive" }

        val page = renderer.openPage(index)
        val targetHeight = (targetWidth.toLong() * page.height / page.width)
            .coerceAtLeast(1L)
            .coerceAtMost(Int.MAX_VALUE.toLong())
            .toInt()
        val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(Color.WHITE)
        try {
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            return bitmap
        } catch (error: Throwable) {
            bitmap.recycle()
            throw error
        } finally {
            page.close()
        }
    }

    @Synchronized
    override fun close() {
        if (closed) return
        closed = true
        try {
            renderer.close()
        } finally {
            descriptor.close()
        }
    }
}
