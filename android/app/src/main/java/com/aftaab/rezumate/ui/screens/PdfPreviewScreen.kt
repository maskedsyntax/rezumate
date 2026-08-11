package com.aftaab.rezumate.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aftaab.rezumate.export.PdfPageRenderer
import com.aftaab.rezumate.export.ResumePdfRenderer
import com.aftaab.rezumate.ui.theme.RezColors
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext

@Composable
fun PdfPreviewScreen(
    pdfFile: File,
    onDone: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rendererResult = remember(pdfFile.absolutePath, pdfFile.lastModified()) {
        runCatching { PdfPageRenderer(pdfFile) }
    }
    val renderer = rendererResult.getOrNull()

    DisposableEffect(renderer) {
        onDispose { renderer?.close() }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(RezColors.Background)
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        PreviewToolbar(onDone = onDone, onShare = onShare)

        when {
            renderer == null -> PreviewError(
                rendererResult.exceptionOrNull()?.localizedMessage ?: "Unable to open this PDF.",
            )
            renderer.pageCount == 0 -> PreviewError("This PDF has no pages.")
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items((0 until renderer.pageCount).toList(), key = { it }) { pageIndex ->
                    PdfPage(pageRenderer = renderer, pageIndex = pageIndex)
                }
            }
        }
    }
}

@Composable
private fun PreviewToolbar(onDone: () -> Unit, onShare: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RezColors.Surface)
            .border(width = 1.dp, color = RezColors.Ink)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onDone) {
            Text("Done", color = RezColors.Ink, fontWeight = FontWeight.Bold)
        }
        Text(
            text = "Resume Preview",
            modifier = Modifier.weight(1f),
            color = RezColors.Ink,
            fontSize = 17.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
        )
        TextButton(onClick = onShare) {
            Icon(
                imageVector = Icons.Default.Share,
                contentDescription = null,
                tint = RezColors.Ink,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = "Share",
                modifier = Modifier.padding(start = 5.dp),
                color = RezColors.Ink,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun PdfPage(pageRenderer: PdfPageRenderer, pageIndex: Int) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(ResumePdfRenderer.PAGE_WIDTH.toFloat() / ResumePdfRenderer.PAGE_HEIGHT)
            .background(Color.White)
            .border(1.dp, RezColors.Ink),
        contentAlignment = Alignment.Center,
    ) {
        val density = LocalDensity.current
        val targetWidth = with(density) { maxWidth.roundToPx() }.coerceAtLeast(1)
        var bitmap by remember(pageRenderer, pageIndex, targetWidth) { mutableStateOf<Bitmap?>(null) }
        var error by remember(pageRenderer, pageIndex, targetWidth) { mutableStateOf<String?>(null) }

        LaunchedEffect(pageRenderer, pageIndex, targetWidth) {
            var rendered: Bitmap? = null
            try {
                rendered = withContext(Dispatchers.IO) {
                    pageRenderer.renderPage(pageIndex, targetWidth)
                }
                currentCoroutineContext().ensureActive()
                bitmap = rendered
                rendered = null
            } catch (throwable: Throwable) {
                currentCoroutineContext().ensureActive()
                error = throwable.localizedMessage ?: "Unable to render page ${pageIndex + 1}."
            } finally {
                rendered?.recycle()
            }
        }

        DisposableEffect(bitmap) {
            val displayedBitmap = bitmap
            onDispose { displayedBitmap?.recycle() }
        }

        when {
            bitmap != null -> Image(
                bitmap = requireNotNull(bitmap).asImageBitmap(),
                contentDescription = "Resume page ${pageIndex + 1}",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.FillBounds,
            )
            error != null -> Text(
                text = requireNotNull(error),
                modifier = Modifier.padding(24.dp),
                color = RezColors.Muted,
                textAlign = TextAlign.Center,
            )
            else -> CircularProgressIndicator(
                modifier = Modifier.size(28.dp),
                color = RezColors.Ink,
                strokeWidth = 2.dp,
            )
        }
    }
}

@Composable
private fun PreviewError(message: String) {
    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(
            text = message,
            color = RezColors.Muted,
            textAlign = TextAlign.Center,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
