package com.aftaab.rezumate.data.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class DocumentValidatorTest {
    @Test
    fun `accepts supported names case-insensitively with matching MIME`() {
        assertEquals(
            ValidatedDocument("Resume.PDF", ResumeDocumentType.PDF),
            DocumentValidator.validate("/provider/path/Resume.PDF", "application/pdf"),
        )
        assertEquals(
            ResumeDocumentType.DOCX,
            DocumentValidator.validate("resume.docx", "application/octet-stream").type,
        )
    }

    @Test
    fun `adds an extension when MIME identifies an extensionless document`() {
        assertEquals(
            ValidatedDocument("Resume.docx", ResumeDocumentType.DOCX),
            DocumentValidator.validate(
                "Resume",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
        )
    }

    @Test
    fun `rejects MIME and filename mismatches and unsupported documents`() {
        assertThrows(DocumentValidationException::class.java) {
            DocumentValidator.validate("resume.pdf", ResumeDocumentType.DOCX.mimeType)
        }
        assertThrows(DocumentValidationException::class.java) {
            DocumentValidator.validate("resume.txt", "text/plain")
        }
    }
}
