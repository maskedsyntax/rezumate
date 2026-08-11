package com.aftaab.rezumate.data.document

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.util.zip.ZipInputStream
import javax.xml.XMLConstants
import javax.xml.parsers.SAXParserFactory
import org.xml.sax.Attributes
import org.xml.sax.helpers.DefaultHandler

object DocxTextExtractor {
    fun extractText(data: ByteArray): ExtractionResult = extractText(ByteArrayInputStream(data))

    fun extractText(input: InputStream): ExtractionResult {
        val documentXml = try {
            findDocumentXml(input)
        } catch (_: Exception) {
            null
        } ?: return failedToRead()

        val paragraphs = try {
            parseParagraphs(documentXml)
        } catch (_: Exception) {
            return ExtractionResult(
                text = "",
                status = ExtractionResult.STATUS_FAILED,
                warnings = listOf("Could not parse the DOCX XML structure."),
                pageCount = 0,
                characterCount = 0,
            )
        }

        val text = PDFTextExtractor.normalizeResumeText(paragraphs.joinToString("\n\n"))
        return PDFTextExtractor.evaluateExtractedText(text, emptyList(), pageCount = 0)
    }

    internal fun parseParagraphs(xml: ByteArray): List<String> {
        val factory = SAXParserFactory.newInstance().apply {
            isNamespaceAware = true
            runCatching { isXIncludeAware = false }
            runCatching { setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true) }
            runCatching { setFeature("http://apache.org/xml/features/disallow-doctype-decl", true) }
            runCatching { setFeature("http://xml.org/sax/features/external-general-entities", false) }
            runCatching { setFeature("http://xml.org/sax/features/external-parameter-entities", false) }
        }
        val handler = DocumentXmlHandler()
        factory.newSAXParser().parse(ByteArrayInputStream(xml), handler)
        return handler.paragraphs
    }

    private fun findDocumentXml(input: InputStream): ByteArray? =
        ZipInputStream(input.buffered()).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: return@use null
                if (!entry.isDirectory && entry.name == DOCUMENT_XML_PATH) {
                    return@use zip.readBytes()
                }
                zip.closeEntry()
            }
            @Suppress("UNREACHABLE_CODE")
            null
        }

    private fun failedToRead() = ExtractionResult(
        text = "",
        status = ExtractionResult.STATUS_FAILED,
        warnings = listOf("Could not read this DOCX file. Please ensure it is a valid Word document."),
        pageCount = 0,
        characterCount = 0,
    )

    private class DocumentXmlHandler : DefaultHandler() {
        val paragraphs = mutableListOf<String>()
        private val currentParagraph = StringBuilder()
        private val textBuffer = StringBuilder()
        private var isInsideText = false

        override fun startElement(
            uri: String?,
            localName: String?,
            qName: String?,
            attributes: Attributes?,
        ) {
            when (elementName(localName, qName)) {
                "t" -> {
                    isInsideText = true
                    textBuffer.clear()
                }
                "p" -> currentParagraph.clear()
            }
        }

        override fun characters(ch: CharArray, start: Int, length: Int) {
            if (isInsideText) textBuffer.append(ch, start, length)
        }

        override fun endElement(uri: String?, localName: String?, qName: String?) {
            when (elementName(localName, qName)) {
                "t" -> {
                    isInsideText = false
                    currentParagraph.append(textBuffer)
                }
                "p" -> currentParagraph.toString().trim().takeIf { it.isNotEmpty() }?.let(paragraphs::add)
            }
        }

        private fun elementName(localName: String?, qName: String?): String =
            localName?.takeIf { it.isNotEmpty() } ?: qName.orEmpty().substringAfter(':')
    }

    private const val DOCUMENT_XML_PATH = "word/document.xml"
}
