package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalAIServiceTest {
    @Test
    fun `improvement does not insert missing keywords or invent metrics`() {
        val original = "Jordan Lee\nEXPERIENCE\nAcme\nEngineer\n• Worked on customer onboarding flows"
        val improved = LocalAIService.improveResume(
            resumeText = original,
            weakBullets = listOf("Worked on customer onboarding flows"),
            focusKeywords = listOf("kubernetes", "terraform"),
        )

        assertTrue(improved.contains("Contributed to customer onboarding flows"))
        assertFalse(improved.lowercase().contains("kubernetes"))
        assertFalse(improved.lowercase().contains("terraform"))
        assertFalse(Regex("""\d+%""").containsMatchIn(improved))
    }

    @Test
    fun `responsible for is not overstated`() {
        val variants = LocalAIService.rewriteBullet(
            bullet = "Responsible for customer support workflows",
            focusKeywords = listOf("python"),
        )

        assertEquals(listOf("Responsible for customer support workflows"), variants)
    }
}
