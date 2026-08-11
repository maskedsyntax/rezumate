package com.aftaab.rezumate.domain

object LocalAIService {
    fun rewriteBullet(bullet: String, focusKeywords: List<String>): List<String> =
        generateBulletVariants(bullet, focusKeywords)

    fun improveResume(
        resumeText: String,
        weakBullets: List<String>,
        focusKeywords: List<String>,
    ): String {
        var text = injectKeywordsIntoSkillsSection(resumeText, focusKeywords)
        for (bullet in weakBullets.distinct()) {
            if (!text.contains(bullet)) continue
            text = text.replace(bullet, strengthenBullet(bullet, focusKeywords))
        }
        return text
    }

    private fun injectKeywordsIntoSkillsSection(text: String, keywords: List<String>): String {
        if (keywords.isEmpty()) return text
        val lines = splitPreservingEmpty(text).toMutableList()
        val skillsHeaders = setOf(
            "skills", "technical skills", "technologies",
            "core competencies", "technical competencies",
        )
        var inSkills = false
        var lastContentLineIndex: Int? = null

        for ((index, line) in lines.withIndex()) {
            val trimmed = line.trimHorizontalWhitespace()
            val lower = trimmed.lowercase()
            if (!inSkills) {
                if (lower in skillsHeaders || skillsHeaders.any {
                        lower.startsWith(it) && lower.length <= it.length + 3
                    }
                ) {
                    inSkills = true
                }
            } else {
                if (trimmed.isEmpty()) continue
                val letters = trimmed.filter(Char::isLetter)
                val allCaps = letters.isNotEmpty() && letters.all(Char::isUpperCase)
                if (allCaps && trimmed.length in 3..35) break
                lastContentLineIndex = index
            }
        }

        val injected = "Additional Technologies: " + keywords.joinToString(", ", transform = ::displayKeyword)
        when {
            lastContentLineIndex != null -> lines.add(lastContentLineIndex + 1, injected)
            inSkills -> lines += injected
            else -> lines += listOf("", "SKILLS", injected)
        }
        return lines.joinToString("\n")
    }

    private fun strengthenBullet(bullet: String, keywords: List<String>): String {
        var value = bullet.trimHorizontalWhitespace()
        while (value.firstOrNull()?.let { it in "•·-*" } == true) {
            value = value.drop(1).trimHorizontalWhitespace()
        }
        val upgrades = listOf(
            "worked on" to "Engineered",
            "helped with" to "Contributed to",
            "responsible for" to "Led",
            "involved in" to "Built",
            "assisted with" to "Enhanced",
            "handled" to "Managed",
            "participated in" to "Delivered",
            "did" to "Executed",
            "made" to "Produced",
        )
        val lower = value.lowercase()
        for ((weak, strong) in upgrades) {
            if (lower.startsWith(weak)) {
                value = strong + value.drop(weak.length)
                break
            }
        }
        return addImpactSignalIfNeeded(value, keywords)
    }

    private fun addImpactSignalIfNeeded(bullet: String, keywords: List<String>): String {
        val lowered = bullet.lowercase()
        val impactSignals = listOf(
            "improved", "improving", "reduced", "increased", "optimized",
            "streamlined", "accelerated", "enabled", "delivered", "supporting",
            "resulting", "reliability", "performance", "usability", "quality",
        )
        if (impactSignals.any(lowered::contains)) return bullet
        val keywordContext = keywords.take(2).joinToString(" and ", transform = ::displayKeyword)
        return if (keywordContext.isEmpty()) {
            "$bullet to improve reliability, usability, and delivery quality"
        } else {
            "$bullet to improve $keywordContext alignment, reliability, and delivery quality"
        }
    }

    private fun generateBulletVariants(bullet: String, focusKeywords: List<String>): List<String> {
        var value = bullet.trim()
        while (value.startsWith("•") || value.startsWith("-") || value.startsWith("*")) {
            value = value.drop(1).trim()
        }
        val words = componentsSeparatedByWhitespace(value)
        val firstWord = words.firstOrNull().orEmpty()
        val rest = words.drop(1).joinToString(" ")
        val replaceable = setOf(
            "shipped", "built", "created", "developed", "designed",
            "implemented", "optimized", "integrated", "launched",
            "led", "maintained", "managed", "worked",
        )
        val base = if (firstWord.lowercase() in replaceable && rest.isNotEmpty()) rest else value
        val keywordContext = focusKeywords.take(2).joinToString(" and ", transform = ::displayKeyword)
        val keywordPhrase = if (keywordContext.isEmpty()) "" else " with relevant $keywordContext context"
        return listOf(
            "Engineered $base$keywordPhrase, clarifying scope, implementation details, and user impact",
            "Built and shipped $base$keywordPhrase, emphasizing ownership, delivery, and technical depth",
            "Delivered $base$keywordPhrase, connecting the work to reliability, usability, or business outcomes",
        )
    }

    private fun displayKeyword(keyword: String): String {
        val normalized = keyword.trim().lowercase()
        val displayNames = mapOf(
            "api" to "API",
            "rest api" to "REST API",
            "ci/cd" to "CI/CD",
            "css" to "CSS",
            "html" to "HTML",
            "json" to "JSON",
            "ui" to "UI",
            "ml" to "ML",
            "ai" to "AI",
            "llm" to "LLM",
            "nlp" to "NLP",
            "aws" to "AWS",
            "gcp" to "GCP",
            "sql" to "SQL",
            "nosql" to "NoSQL",
            "graphql" to "GraphQL",
            "next.js" to "Next.js",
            "node.js" to "Node.js",
            "tailwind css" to "Tailwind CSS",
            "pytorch" to "PyTorch",
            "tensorflow" to "TensorFlow",
            "scikit-learn" to "scikit-learn",
        )
        return displayNames[normalized] ?: normalized
            .split(' ')
            .filter(String::isNotEmpty)
            .joinToString(" ") { part -> part.take(1).uppercase() + part.drop(1) }
    }

    private fun splitPreservingEmpty(value: String): List<String> {
        val result = mutableListOf<String>()
        var start = 0
        for (index in value.indices) {
            if (value[index] == '\n') {
                result += value.substring(start, index)
                start = index + 1
            }
        }
        result += value.substring(start)
        return result
    }

    private fun componentsSeparatedByWhitespace(value: String): List<String> {
        val result = mutableListOf<String>()
        var start = 0
        value.forEachIndexed { index, char ->
            if (char.isHorizontalWhitespace()) {
                result += value.substring(start, index)
                start = index + 1
            }
        }
        result += value.substring(start)
        return result
    }

    private fun String.trimHorizontalWhitespace(): String = trim { it.isHorizontalWhitespace() }

    private fun Char.isHorizontalWhitespace(): Boolean =
        isWhitespace() && this !in "\n\r\u000B\u000C\u0085\u2028\u2029"
}
