package com.aftaab.rezumate.data.document

import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DocxTextExtractorTest {
    @Test
    fun `extracts text runs from document paragraphs`() {
        val xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:body>
                <w:p><w:r><w:t>Jane </w:t></w:r><w:r><w:t>Doe</w:t></w:r></w:p>
                <w:p><w:r><w:t>Software Engineer</w:t></w:r></w:p>
              </w:body>
            </w:document>
        """.trimIndent()

        val result = DocxTextExtractor.extractText(docx(xml))

        assertEquals("Jane Doe\n\nSoftware Engineer", result.text)
        assertEquals(ExtractionResult.STATUS_LOW_QUALITY, result.status)
        assertEquals(0, result.pageCount)
    }

    @Test
    fun `missing document XML returns readable DOCX failure`() {
        val result = DocxTextExtractor.extractText(docx("<root/>", "other.xml"))

        assertEquals(ExtractionResult.STATUS_FAILED, result.status)
        assertEquals(
            "Could not read this DOCX file. Please ensure it is a valid Word document.",
            result.warnings.single(),
        )
    }

    @Test
    fun `malformed document XML returns parse failure`() {
        val result = DocxTextExtractor.extractText(docx("<w:document>"))

        assertEquals(ExtractionResult.STATUS_FAILED, result.status)
        assertTrue(result.warnings.single().contains("XML structure"))
    }

    private fun docx(xml: String, path: String = "word/document.xml"): ByteArray {
        val output = ByteArrayOutputStream()
        ZipOutputStream(output).use { zip ->
            zip.putNextEntry(ZipEntry(path))
            zip.write(xml.toByteArray())
            zip.closeEntry()
        }
        return output.toByteArray()
    }
}
