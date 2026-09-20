package com.aftaab.rezumate.domain

enum class ResumeTailoringError(val message: String) {
    KeywordAlreadyPresent("This keyword is already on the resume."),
    BulletNotFound("That bullet could not be found in the resume."),
    EmptyKeyword("Choose a keyword to add."),
}

class ResumeTailoringException(val error: ResumeTailoringError) : IllegalArgumentException(error.message)

object ResumeTailoringService {
    private val skillsHeadings = setOf(
        "skills",
        "technical skills",
        "technologies",
        "core competencies",
        "technical competencies",
    )

    fun canPlace(keyword: String, resumeText: String): Boolean {
        val trimmed = keyword.trim()
        if (trimmed.isEmpty()) return false
        return !ATSScoringService.containsKeyword(trimmed, resumeText)
    }

    fun placeInSkills(keyword: String, resumeText: String): String {
        val trimmed = keyword.trim()
        if (trimmed.isEmpty()) throw ResumeTailoringException(ResumeTailoringError.EmptyKeyword)
        if (!canPlace(trimmed, resumeText)) {
            throw ResumeTailoringException(ResumeTailoringError.KeywordAlreadyPresent)
        }

        val display = displayName(trimmed)
        val lines = resumeText.split('\n').toMutableList()
        val headingIndex = lines.indexOfFirst { normalizedHeading(it) in skillsHeadings }
        if (headingIndex >= 0) {
            var lastContentIndex = headingIndex
            var index = headingIndex + 1
            while (index < lines.size) {
                val line = lines[index]
                if (isLikelySectionHeading(line, allowingSkills = false)) break
                if (line.trim().isNotEmpty()) lastContentIndex = index
                index++
            }
            if (lastContentIndex == headingIndex) {
                lines.add(headingIndex + 1, display)
            } else {
                lines[lastContentIndex] = appendSkill(display, lines[lastContentIndex])
            }
            return lines.joinToString("\n")
        }

        val suffix = buildString {
            if (!resumeText.endsWith("\n")) append('\n')
            append("\nSKILLS\n")
            append(display)
        }
        return resumeText + suffix
    }

    fun placeInBullet(keyword: String, bullet: String, resumeText: String): String {
        val trimmedKeyword = keyword.trim()
        val trimmedBullet = bullet.trim()
        if (trimmedKeyword.isEmpty()) throw ResumeTailoringException(ResumeTailoringError.EmptyKeyword)
        if (trimmedBullet.isEmpty() || trimmedBullet !in resumeText) {
            throw ResumeTailoringException(ResumeTailoringError.BulletNotFound)
        }
        if (ATSScoringService.containsKeyword(trimmedKeyword, trimmedBullet)) return resumeText
        val updatedBullet = appendKeyword(displayName(trimmedKeyword), trimmedBullet)
        return resumeText.replace(trimmedBullet, updatedBullet)
    }

    fun displayName(keyword: String): String = when (keyword.lowercase()) {
        "ci/cd" -> "CI/CD"
        "rest api" -> "REST API"
        "next.js" -> "Next.js"
        "node.js" -> "Node.js"
        "c++" -> "C++"
        "c#" -> "C#"
        "aws" -> "AWS"
        "gcp" -> "GCP"
        "sql" -> "SQL"
        "html" -> "HTML"
        "css" -> "CSS"
        "ui" -> "UI"
        "api" -> "API"
        "llm" -> "LLM"
        "nlp" -> "NLP"
        "ml" -> "ML"
        "ai" -> "AI"
        else -> keyword.split(' ').filter(String::isNotEmpty).joinToString(" ") { part ->
            val lower = part.lowercase()
            lower.replaceFirstChar { it.titlecase() }
        }
    }

    fun proofBullets(resumeText: String): List<String> {
        val document = ResumeParser.parse(resumeText)
        return document.experience.flatMap { it.bullets } + document.projects.flatMap { it.bullets }
    }

    private fun appendSkill(skill: String, line: String): String {
        val trimmed = line.trim()
        if (trimmed.isEmpty()) return skill
        return if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
            "$trimmed $skill"
        } else {
            "$trimmed, $skill"
        }
    }

    private fun appendKeyword(keyword: String, bullet: String): String =
        if (bullet.endsWith('.')) {
            bullet.dropLast(1) + " using $keyword."
        } else {
            "$bullet using $keyword"
        }

    private fun normalizedHeading(line: String): String =
        line.trim().trimEnd(':').lowercase()

    private fun isLikelySectionHeading(line: String, allowingSkills: Boolean): Boolean {
        val normalized = normalizedHeading(line)
        if (normalized.length !in 3..50) return false
        if (normalized in skillsHeadings) return allowingSkills
        val known = setOf(
            "summary", "profile", "objective",
            "experience", "work experience", "employment", "professional experience",
            "projects", "project experience",
            "education", "academic background",
            "certifications", "awards", "publications",
        )
        if (normalized in known) return true
        val letters = line.filter { it.isLetter() }
        return letters.isNotEmpty() && letters.all { it.isUpperCase() }
    }
}
