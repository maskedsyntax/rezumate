package com.aftaab.rezumate.domain

import com.aftaab.rezumate.model.SkillCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ResumeParserTest {
    @Test
    fun `parse ports contacts aliases entries wrapped bullets and locations`() {
        val resume = """

            Jane Doe
            jane@example.com | (415) 555-1212 | San Francisco
            linkedin.com/in/jane-doe • github.com/janedoe • jane.dev

            PROFESSIONAL SUMMARY
            Product-minded engineer
            building reliable systems.

            WORK EXPERIENCE
            Acme Corp Jan. 2022 -- Present
            Senior Engineer Remote
            • Built a deployment platform for product teams
            across multiple regions and environments
            Beta Inc 2019 - 2021
            Developer London

            PERSONAL PROJECTS
            Resume Tool 2023 - 2024
            - Parsed resumes into structured documents
            with deterministic local processing across several document formats
            Second Project
            * Shipped another useful tool

            ACADEMIC BACKGROUND
            Example University 2015 - 2019
            Computer Science Toronto
            • Graduated with honors

            TECHNICAL SKILLS
            Languages: Kotlin, Swift
            Docker, AWS
        """.trimIndent()

        val document = ResumeParser.parse(resume)

        assertEquals("Jane Doe", document.name)
        assertEquals("jane@example.com", document.email)
        assertEquals("(415) 555-1212", document.phone)
        assertEquals("San Francisco", document.location)
        assertEquals("jane-doe", document.linkedin)
        assertEquals("janedoe", document.github)
        assertEquals("jane.dev", document.website)
        assertEquals("Product-minded engineer building reliable systems.", document.summary)

        assertEquals(2, document.experience.size)
        assertEquals("Acme Corp", document.experience[0].company)
        assertEquals("Jan. 2022 -- Present", document.experience[0].dateRange)
        assertEquals("Senior Engineer", document.experience[0].title)
        assertEquals("Remote", document.experience[0].location)
        assertEquals(
            listOf("Built a deployment platform for product teams across multiple regions and environments"),
            document.experience[0].bullets,
        )
        assertEquals("Beta Inc", document.experience[1].company)
        assertEquals("Developer", document.experience[1].title)
        assertEquals("London", document.experience[1].location)

        assertEquals(2, document.projects.size)
        assertEquals("Resume Tool", document.projects[0].name)
        assertEquals(
            listOf("Parsed resumes into structured documents with deterministic local processing across several document formats"),
            document.projects[0].bullets,
        )
        assertEquals("Second Project", document.projects[1].name)

        assertEquals("Example University", document.education.single().institution)
        assertEquals("Computer Science", document.education.single().degree)
        assertEquals("Toronto", document.education.single().location)
        assertEquals(listOf("Graduated with honors"), document.education.single().details)
        assertEquals(
            listOf(
                SkillCategory("Languages", "Kotlin, Swift"),
                SkillCategory("", "Docker, AWS"),
            ),
            document.skillCategories,
        )
        assertTrue(document.hasContent)
    }

    @Test
    fun `parser preserves phone additional sections and unmapped header lines`() {
        val resume = """
            Alex Doe
            alex@example.com | +1 415 555 0123 | San Francisco, CA

            SUMMARY
            Product-minded engineer focused on clear and accessible experiences.

            EXPERIENCE
            Acme Inc. | 2022 - Present
            Software Engineer | Remote
            • Built accessible onboarding workflows for customers

            EDUCATION
            State University | 2022
            B.S. Computer Science

            CERTIFICATIONS
            AWS Certified Cloud Practitioner
        """.trimIndent()

        val document = ResumeParser.parse(resume)
        assertEquals("+1 415 555 0123", document.phone)
        assertEquals("CERTIFICATIONS", document.additionalSections.first().title)
        assertEquals(listOf("AWS Certified Cloud Practitioner"), document.additionalSections.first().lines)
        assertTrue(document.unmappedContent.isEmpty())
    }

    @Test
    fun `unmapped header content is collected`() {
        val text = """
            Alex Doe
            Principal Product Engineer
            alex@example.com

            EXPERIENCE
            Acme Inc.
            Engineer
            • Built accessible onboarding workflows for customers
        """.trimIndent()
        val document = ResumeParser.parse(text)
        assertTrue(document.unmappedContent.contains("Principal Product Engineer"))
    }

    @Test
    fun `unknown uppercase heading ends contact parsing and is kept as an extra section`() {
        val document = ResumeParser.parse(
            "Jane Doe\nCERTIFICATIONS\nAWS Certified\nSKILLS\nKotlin",
        )

        assertEquals("Jane Doe", document.name)
        assertEquals(listOf(SkillCategory("", "Kotlin")), document.skillCategories)
        assertEquals("CERTIFICATIONS", document.additionalSections.single().title)
        assertEquals(listOf("AWS Certified"), document.additionalSections.single().lines)
        assertEquals(null, document.location)
    }

    @Test
    fun `single title-cased contact word is treated as a location`() {
        val document = ResumeParser.parse("Jane Doe\nBerlin\nSUMMARY\nEngineer")

        assertEquals("Berlin", document.location)
        assertEquals("Engineer", document.summary)
    }
}
