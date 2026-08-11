package com.aftaab.rezumate.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class LocalAIServiceTest {
    @Test
    fun `improveResume injects display keywords before next uppercase section and strengthens bullets`() {
        val resume = """
            Jane Doe
            TECHNICAL SKILLS:
            Languages: Kotlin

            EXPERIENCE
            - worked on internal tools for support teams
        """.trimIndent()

        val improved = LocalAIService.improveResume(
            resumeText = resume,
            weakBullets = listOf(
                "worked on internal tools for support teams",
                "worked on internal tools for support teams",
            ),
            focusKeywords = listOf("aws", "rest api", "pytorch"),
        )

        assertEquals(
            """
                Jane Doe
                TECHNICAL SKILLS:
                Languages: Kotlin
                Additional Technologies: AWS, REST API, PyTorch

                EXPERIENCE
                - Engineered internal tools for support teams to improve AWS and REST API alignment, reliability, and delivery quality
            """.trimIndent(),
            improved,
        )
    }

    @Test
    fun `improveResume appends a skills section when none exists`() {
        assertEquals(
            "Jane Doe\n\nSKILLS\nAdditional Technologies: Product Management, GraphQL",
            LocalAIService.improveResume(
                resumeText = "Jane Doe",
                weakBullets = emptyList(),
                focusKeywords = listOf("product management", "graphql"),
            ),
        )
    }

    @Test
    fun `rewriteBullet removes a replaceable verb and returns exact three variants`() {
        val variants = LocalAIService.rewriteBullet(
            bullet = "• Built checkout API",
            focusKeywords = listOf("api", "next.js", "docker"),
        )

        assertEquals(
            listOf(
                "Engineered checkout API with relevant API and Next.js context, clarifying scope, implementation details, and user impact",
                "Built and shipped checkout API with relevant API and Next.js context, emphasizing ownership, delivery, and technical depth",
                "Delivered checkout API with relevant API and Next.js context, connecting the work to reliability, usability, or business outcomes",
            ),
            variants,
        )
    }

    @Test
    fun `existing qualitative impact prevents an added suffix`() {
        val improved = LocalAIService.improveResume(
            resumeText = "SKILLS\nKotlin\nEXPERIENCE\n- helped with tooling that improved reliability",
            weakBullets = listOf("helped with tooling that improved reliability"),
            focusKeywords = listOf("docker"),
        )

        assertEquals(
            "SKILLS\nKotlin\nAdditional Technologies: Docker\nEXPERIENCE\n- Contributed to tooling that improved reliability",
            improved,
        )
    }
}
