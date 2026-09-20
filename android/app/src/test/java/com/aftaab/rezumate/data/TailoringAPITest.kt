package com.aftaab.rezumate.data

import com.aftaab.rezumate.data.local.LocalStorageManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.util.UUID

class TailoringAPITest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun `analyze stores job description and improve keeps title fit`() = runBlocking {
        val client = testClient()
        val jd =
            "We are hiring a product-focused software engineer to build accessible web applications with React and TypeScript. You will work with product and design partners, review code, improve quality, and ship reliable customer experiences across the frontend platform."
        val resume = """
            Alex Doe
            SUMMARY
            Backend engineer focused on APIs.
            EXPERIENCE
            Acme
            Engineer
            • Worked on customer onboarding flows
            SKILLS
            Python, SQL
        """.trimIndent()

        val analysis = client.analyzeResume(
            resumeId = UUID.randomUUID().toString(),
            resumeText = resume,
            jobDescription = jd,
            token = "test-token",
            shouldSave = false,
        )
        val stored = client.variant(analysis.variantId, "test-token")
        assertEquals("product-focused software engineer", analysis.jobTitle)
        assertFalse(analysis.jobTitleMatched)
        assertEquals(resume.trim(), stored.tailoredContent.rawText)

        val improved = client.improveResume(analysis.variantId, "test-token")
        assertEquals(analysis.jobTitle, improved.updatedAnalysis.jobTitle)
        assertFalse(improved.optimizedResumeText.lowercase().contains("react"))
        assertFalse(improved.optimizedResumeText.lowercase().contains("typescript"))
    }

    @Test
    fun `place keyword updates coverage`() = runBlocking {
        val client = testClient()
        val resume = """
            Alex Doe
            alex@example.com

            EXPERIENCE
            Acme Inc. | 2022 - Present
            Software Engineer | Remote
            • Built accessible onboarding workflows for customers

            SKILLS
            Python, SQL
        """.trimIndent()
        val jd =
            "Seeking Python, Kubernetes, and Terraform experience for production infrastructure roles. You will operate cloud systems, improve reliability, and collaborate with engineers on scalable services used by customers every day."

        val analysis = client.analyzeResume(
            resumeId = UUID.randomUUID().toString(),
            resumeText = resume,
            jobDescription = jd,
            token = "test-token",
            shouldSave = false,
        )
        assertTrue(analysis.missingKeywords.contains("kubernetes"))
        val originalCoverage = analysis.keywordCoverage

        val tailored = client.placeKeyword(
            variantId = analysis.variantId,
            keyword = "kubernetes",
            alsoInBullet = "Built accessible onboarding workflows for customers",
            token = "test-token",
        )

        assertTrue(tailored.updatedAnalysis.matchedKeywords.contains("kubernetes"))
        assertFalse(tailored.updatedAnalysis.missingKeywords.contains("kubernetes"))
        assertTrue(tailored.updatedAnalysis.keywordCoverage > originalCoverage)
        assertTrue(tailored.updatedResumeText.contains("Kubernetes"))
        assertTrue(tailored.updatedResumeText.contains("using Kubernetes"))

        val plan = client.exportVariant(analysis.variantId, "test-token")
        assertTrue(plan.resumeText.contains("Kubernetes"))
        assertTrue(plan.warnings.isEmpty())
    }

    private fun testClient(): APIClient {
        val file = File(temporaryFolder.root, LocalStorageManager.HISTORY_FILENAME)
        return APIClient(
            importer = ResumeDocumentImporter { error("upload is unused in this test") },
            storage = LocalStorageManager(file),
        )
    }
}
