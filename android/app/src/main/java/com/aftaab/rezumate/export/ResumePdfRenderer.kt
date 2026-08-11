package com.aftaab.rezumate.export

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextPaint
import android.text.style.StyleSpan
import com.aftaab.rezumate.model.EducationEntry
import com.aftaab.rezumate.model.ExperienceEntry
import com.aftaab.rezumate.model.ProjectEntry
import com.aftaab.rezumate.model.ResumeDocument
import com.aftaab.rezumate.model.SkillCategory
import java.io.OutputStream
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Renders the same single-column resume hierarchy as the iOS LaTeX-style renderer. */
object ResumePdfRenderer {
    const val PAGE_WIDTH = 612
    const val PAGE_HEIGHT = 792
    const val MARGIN = 36f

    fun render(document: ResumeDocument, output: OutputStream) {
        val pdf = PdfDocument()
        try {
            Renderer(pdf).render(document)
            pdf.writeTo(output)
        } finally {
            pdf.close()
        }
    }

    private class Renderer(private val pdf: PdfDocument) {
        private val contentWidth = PAGE_WIDTH - MARGIN * 2
        private val bottom = PAGE_HEIGHT - MARGIN
        private var pageNumber = 0
        private var page: PdfDocument.Page? = null
        private lateinit var canvas: Canvas
        private var y = MARGIN

        private val textColor = Color.rgb(20, 20, 20)
        private val darkColor = Color.rgb(77, 77, 77)
        private val ruleColor = Color.rgb(212, 212, 212)

        private val namePaint = textPaint(18f, Typeface.BOLD, textColor)
        private val contactPaint = textPaint(8f, Typeface.NORMAL, textColor)
        private val sectionPaint = textPaint(11f, Typeface.BOLD, textColor)
        private val bodyPaint = textPaint(10f, Typeface.NORMAL, textColor)
        private val boldPaint = textPaint(10f, Typeface.BOLD, textColor)
        private val italicPaint = textPaint(10f, Typeface.ITALIC, textColor)
        private val smallPaint = textPaint(8.5f, Typeface.NORMAL, darkColor)

        fun render(document: ResumeDocument) {
            newPage()
            drawName(document.name)
            drawContactBar(document)

            document.summary?.takeIf(String::isNotBlank)?.let {
                startSection("SUMMARY")
                drawTextBlock(cleanText(it), bodyPaint, MARGIN, contentWidth)
                y += 8f
            }

            if (document.experience.isNotEmpty()) {
                startSection("EXPERIENCE")
                document.experience.forEach(::drawExperience)
                y += 2f
            }

            if (document.projects.isNotEmpty()) {
                startSection("PROJECTS")
                document.projects.forEach(::drawProject)
                y += 2f
            }

            if (document.skillCategories.isNotEmpty()) {
                startSection("SKILLS")
                drawSkills(document.skillCategories)
            }

            if (document.education.isNotEmpty()) {
                startSection("EDUCATION")
                document.education.forEach(::drawEducation)
            }

            finishPage()
        }

        private fun newPage() {
            finishPage()
            val info = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, ++pageNumber).create()
            page = pdf.startPage(info)
            canvas = requireNotNull(page).canvas
            canvas.drawColor(Color.WHITE)
            y = MARGIN
        }

        private fun finishPage() {
            page?.let(pdf::finishPage)
            page = null
        }

        private fun ensureSpace(needed: Float) {
            if (y + needed > bottom) newPage()
        }

        private fun drawName(name: String) {
            if (name.isBlank()) return
            val layout = layout(cleanText(name), namePaint, contentWidth, Layout.Alignment.ALIGN_CENTER)
            ensureSpace(layout.height.toFloat())
            drawWholeLayout(layout, MARGIN, y)
            y += layout.height + 4f
        }

        private fun drawContactBar(document: ResumeDocument) {
            val parts = listOfNotNull(
                document.email,
                document.website,
                document.github,
                document.linkedin,
                document.location,
            ).filter(String::isNotBlank).map(::cleanText)
            if (parts.isEmpty()) {
                y += 4f
                return
            }
            val layout = layout(parts.joinToString("  |  "), contactPaint, contentWidth, Layout.Alignment.ALIGN_CENTER)
            ensureSpace(layout.height.toFloat())
            drawWholeLayout(layout, MARGIN, y)
            y += layout.height + 10f
        }

        private fun startSection(title: String) {
            ensureSpace(36f)
            val layout = layout(title, sectionPaint, contentWidth)
            drawWholeLayout(layout, MARGIN, y)
            y += layout.height + 2f
            val rulePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = ruleColor
                strokeWidth = 2f
            }
            canvas.drawLine(MARGIN, y + 1f, PAGE_WIDTH - MARGIN, y + 1f, rulePaint)
            y += 7f
        }

        private fun drawExperience(entry: ExperienceEntry) {
            ensureSpace(28f)
            drawTwoColumnRow(entry.company, boldPaint, entry.dateRange, smallPaint)
            if (entry.title.isNotBlank()) {
                drawTwoColumnRow(entry.title, italicPaint, entry.location, smallPaint)
            }
            entry.bullets.forEach(::drawBullet)
            y += 4f
        }

        private fun drawProject(entry: ProjectEntry) {
            if (entry.name.isBlank() && entry.bullets.isEmpty()) return
            ensureSpace(20f)
            if (entry.name.isNotBlank()) {
                drawTextBlock(cleanText(entry.name), boldPaint, MARGIN, contentWidth, 2f)
            }
            entry.bullets.forEach(::drawBullet)
            y += 3f
        }

        private fun drawEducation(entry: EducationEntry) {
            ensureSpace(28f)
            drawTwoColumnRow(entry.institution, boldPaint, entry.dateRange, smallPaint)
            if (entry.degree.isNotBlank()) {
                drawTwoColumnRow(entry.degree, italicPaint, entry.location, smallPaint)
            }
            entry.details.forEach(::drawBullet)
            y += 4f
        }

        private fun drawSkills(categories: List<SkillCategory>) {
            categories.forEach { category ->
                val text = SpannableStringBuilder()
                if (category.name.isNotBlank()) {
                    val start = text.length
                    text.append(cleanText(category.name)).append(": ")
                    text.setSpan(
                        StyleSpan(Typeface.BOLD),
                        start,
                        text.length,
                        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
                    )
                }
                text.append(cleanText(category.items))
                if (text.isNotBlank()) {
                    drawTextBlock(text, bodyPaint, MARGIN, contentWidth, 2f)
                }
            }
        }

        private fun drawTwoColumnRow(
            leftText: String,
            leftPaint: TextPaint,
            rightText: String,
            rightPaint: TextPaint,
        ) {
            if (leftText.isBlank()) return
            val safeLeft = cleanText(leftText)
            val safeRight = cleanText(rightText)
            val measuredRight = if (safeRight.isBlank()) 0f else rightPaint.measureText(safeRight) + 2f
            val rightWidth = min(measuredRight, contentWidth * 0.42f)
            val gap = if (rightWidth > 0f) 6f else 0f
            val leftWidth = contentWidth - rightWidth - gap
            val leftLayout = layout(safeLeft, leftPaint, leftWidth)
            val rightLayout = if (safeRight.isBlank()) null else layout(safeRight, rightPaint, rightWidth)
            val rowHeight = max(leftLayout.height, rightLayout?.height ?: 0).toFloat()
            ensureSpace(rowHeight)
            drawWholeLayout(leftLayout, MARGIN, y)
            rightLayout?.let { drawWholeLayout(it, PAGE_WIDTH - MARGIN - rightWidth, y) }
            y += rowHeight + 1f
        }

        private fun drawBullet(text: String) {
            val indent = 12f
            val contentWidth = this.contentWidth - indent - 4f
            val layout = layout(cleanText(text), bodyPaint, contentWidth)
            var firstLine = 0
            var drawMarker = true
            while (firstLine < layout.lineCount) {
                val available = bottom - y
                val endLine = fittingEndLine(layout, firstLine, available)
                if (endLine == firstLine) {
                    newPage()
                    continue
                }
                val top = layout.getLineTop(firstLine)
                val lineBottom = layout.getLineBottom(endLine - 1)
                if (drawMarker) canvas.drawText("•", MARGIN + 3f, y - bodyPaint.fontMetrics.ascent, bodyPaint)
                drawLayoutLines(layout, MARGIN + indent, y, top, lineBottom)
                y += lineBottom - top
                firstLine = endLine
                drawMarker = false
            }
            y += 1.5f
        }

        private fun drawTextBlock(
            text: CharSequence,
            paint: TextPaint,
            x: Float,
            width: Float,
            spacingAfter: Float = 0f,
        ) {
            val layout = layout(text, paint, width)
            var firstLine = 0
            while (firstLine < layout.lineCount) {
                val available = bottom - y
                val endLine = fittingEndLine(layout, firstLine, available)
                if (endLine == firstLine) {
                    newPage()
                    continue
                }
                val top = layout.getLineTop(firstLine)
                val lineBottom = layout.getLineBottom(endLine - 1)
                drawLayoutLines(layout, x, y, top, lineBottom)
                y += lineBottom - top
                firstLine = endLine
            }
            y += spacingAfter
        }

        private fun fittingEndLine(layout: StaticLayout, firstLine: Int, available: Float): Int {
            var endLine = firstLine
            val top = layout.getLineTop(firstLine)
            while (
                endLine < layout.lineCount &&
                layout.getLineBottom(endLine) - top <= available
            ) {
                endLine++
            }
            return endLine
        }

        private fun drawWholeLayout(layout: StaticLayout, x: Float, top: Float) {
            canvas.save()
            canvas.translate(x, top)
            layout.draw(canvas)
            canvas.restore()
        }

        private fun drawLayoutLines(
            layout: StaticLayout,
            x: Float,
            destinationTop: Float,
            sourceTop: Int,
            sourceBottom: Int,
        ) {
            canvas.save()
            canvas.clipRect(x, destinationTop, x + layout.width, destinationTop + sourceBottom - sourceTop)
            canvas.translate(x, destinationTop - sourceTop)
            layout.draw(canvas)
            canvas.restore()
        }

        private fun layout(
            text: CharSequence,
            paint: TextPaint,
            width: Float,
            alignment: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL,
        ): StaticLayout = StaticLayout.Builder.obtain(
            text,
            0,
            text.length,
            paint,
            max(1, width.roundToInt()),
        )
            .setAlignment(alignment)
            .setIncludePad(false)
            .setLineSpacing(0f, 1f)
            .build()

        private fun textPaint(size: Float, style: Int, color: Int) = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            this.color = color
            typeface = Typeface.create(Typeface.SANS_SERIF, style)
        }
    }

    private fun cleanText(text: String): String = text
        .replace('—', '-')
        .replace('–', '-')
        .replace('−', '-')
        .replace(Regex("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]"), "")
}
