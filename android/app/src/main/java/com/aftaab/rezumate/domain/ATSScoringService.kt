package com.aftaab.rezumate.domain

import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min

@Serializable
data class ATSAnalysisResult(
    val scoreVersion: String,
    val score: Int,
    val jdKeywords: List<String>,
    val matchedKeywords: List<String>,
    val missingKeywords: List<String>,
    val partialMatches: List<String>,
    val keywordCoverage: Int,
    val bulletCount: Int,
    val weakBulletCount: Int,
    val bulletsWithoutMeasurableImpactCount: Int,
    val weakBullets: List<String>,
    val bulletsWithoutMeasurableImpact: List<String>,
    val sections: Map<String, Boolean>,
    val formattingWarnings: List<String>,
    val estimatedResumeLengthWords: Int,
    val componentScores: Map<String, Int>,
)

object ATSScoringService {
    const val scoreVersion = "ats-v2"

    val sectionAliases: Map<String, List<String>> = linkedMapOf(
        "summary" to listOf("summary", "profile", "objective"),
        "experience" to listOf("experience", "work experience", "employment", "professional experience"),
        "projects" to listOf("projects", "project experience"),
        "skills" to listOf("skills", "technical skills", "technologies"),
        "education" to listOf("education", "academic background"),
    )

    val knownSkills: Set<String> = setOf(
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "linux",
        "python", "java", "javascript", "typescript", "go", "golang", "rust",
        "c++", "c#", "react", "next.js", "node.js", "fastapi", "django",
        "flask", "spring", "postgresql", "postgres", "mysql", "mongodb",
        "redis", "graphql", "rest", "api", "microservices", "ci/cd", "git",
        "github", "sql", "nosql", "spark", "kafka", "airflow", "pandas",
        "machine learning", "ml", "ai", "llm", "nlp", "tensorflow",
        "pytorch", "scikit-learn", "data analysis", "analytics", "excel",
        "power bi", "tableau", "figma", "product management", "agile", "scrum",
        "html", "css", "json", "rest api", "rest apis", "responsive design",
        "accessibility", "web applications", "ui", "frontend", "nextjs",
        "tailwind", "tailwind css", "node", "apis",
    )

    val canonicalKeywords: Map<String, String> = mapOf(
        "apis" to "api",
        "api" to "api",
        "nextjs" to "next.js",
        "next.js" to "next.js",
        "node" to "node.js",
        "node.js" to "node.js",
        "rest" to "rest api",
        "rest api" to "rest api",
        "rest apis" to "rest api",
        "tailwind" to "tailwind css",
        "tailwind css" to "tailwind css",
    )

    val redundantKeywords: Map<String, Set<String>> = mapOf(
        "api" to setOf("rest api", "graphql", "fastapi"),
    )

    val keywordNoise: Set<String> = setOf(
        "ability", "basic", "collaborating", "communication", "developer",
        "development", "engineer", "engineering", "experience", "familiarity",
        "good", "intern", "internship", "knowledge", "learn", "learning",
        "nice", "requirements", "responsibilities", "responsibility", "role",
        "strong", "understanding", "web", "willingness", "work", "working",
    )

    val weakBulletStarters: List<String> = listOf(
        "worked on", "helped with", "responsible for", "involved in",
        "participated in", "assisted with", "handled", "did", "made",
    )

    val actionLineStarters: List<String> = listOf(
        "built", "created", "developed", "designed", "implemented", "improved",
        "integrated", "launched", "led", "maintained", "managed", "optimized",
        "shipped", "worked on", "helped with", "responsible for", "assisted with",
    )

    private val measurableImpactRegex = Regex(
        """(\d+[%+]?|\${'$'}[\d,.]+|[<>]\s*\d+|\b\d+\s*(x|k|m|million|billion|users|customers|requests|seconds|minutes|hours|days)\b)""",
        RegexOption.IGNORE_CASE,
    )

    val qualitativeImpactSignals: List<String> = listOf(
        "improved", "improving", "reduced", "increased", "optimized",
        "streamlined", "accelerated", "enabled", "delivered", "supporting",
        "resulting", "reliability", "performance", "usability", "quality",
        "efficiency", "accuracy", "scalability", "maintainability",
    )

    fun analyzeResume(resumeText: String, jobDescription: String): ATSAnalysisResult {
        val jdKeywords = extractKeywords(jobDescription)
        val resumeLower = resumeText.lowercase()
        val matchedKeywords = mutableListOf<String>()
        val missingKeywords = mutableListOf<String>()
        val partialMatches = mutableListOf<String>()

        for (keyword in jdKeywords) {
            val keywordLower = keyword.lowercase()
            when {
                keywordInText(keywordLower, resumeLower) -> matchedKeywords += keyword
                partialKeywordMatch(keywordLower, resumeLower) -> partialMatches += keyword
                else -> missingKeywords += keyword
            }
        }

        val bullets = extractBullets(resumeText)
        val weakBullets = bullets.filter(::isWeakBullet)
        val bulletsWithoutImpact = bullets.filterNot(::hasImpactSignal)
        val sections = detectSections(resumeText)
        val formattingWarnings = detectFormattingWarnings(resumeText)

        val keywordCoverage = calculatePercentage(
            matchedKeywords.size.toDouble() + (0.5 * partialMatches.size),
            jdKeywords.size,
        )
        val impactQuality = calculatePercentage(
            (bullets.size - bulletsWithoutImpact.size).toDouble(),
            bullets.size,
        )
        val structureQuality = calculatePercentage(
            sections.values.count { it }.toDouble(),
            sections.size,
        )
        val formattingQuality = max(0.0, 100.0 - (formattingWarnings.size * 20.0))
        val score = swiftRound(
            (keywordCoverage * 0.45) +
                (impactQuality * 0.25) +
                (structureQuality * 0.20) +
                (formattingQuality * 0.10),
        )
        val words = splitOnWhitespaceAndNewlines(resumeText)

        return ATSAnalysisResult(
            scoreVersion = scoreVersion,
            score = score,
            jdKeywords = jdKeywords,
            matchedKeywords = matchedKeywords,
            missingKeywords = missingKeywords,
            partialMatches = partialMatches,
            keywordCoverage = swiftRound(keywordCoverage),
            bulletCount = bullets.size,
            weakBulletCount = weakBullets.size,
            bulletsWithoutMeasurableImpactCount = bulletsWithoutImpact.size,
            weakBullets = weakBullets.take(8),
            bulletsWithoutMeasurableImpact = bulletsWithoutImpact.take(8),
            sections = sections,
            formattingWarnings = formattingWarnings,
            estimatedResumeLengthWords = words.size,
            componentScores = linkedMapOf(
                "keyword_coverage" to swiftRound(keywordCoverage),
                "impact_quality" to swiftRound(impactQuality),
                "structure_readability" to swiftRound(structureQuality),
                "formatting_risk" to swiftRound(formattingQuality),
            ),
        )
    }

    fun extractKeywords(text: String): List<String> {
        val textLower = text.lowercase()
        val found = mutableSetOf<String>()
        for (skill in knownSkills) {
            if (skill !in keywordNoise && keywordInText(skill, textLower)) {
                found += canonicalKeywords[skill] ?: skill
            }
        }
        return removeRedundantKeywords(found).sorted()
    }

    fun containsKeyword(keyword: String, resumeText: String): Boolean =
        keywordInText(keyword, resumeText.lowercase())

    fun hasImpactSignal(bullet: String): Boolean {
        if (measurableImpactRegex.containsMatchIn(bullet)) return true
        val lowered = bullet.lowercase()
        return qualitativeImpactSignals.any(lowered::contains)
    }

    fun extractBullets(text: String): List<String> {
        val bullets = mutableListOf<String>()
        val bulletPrefixRegex = Regex("^([-*•]|\\d+[.)])\\s+")
        for (line in splitOnNewlines(text)) {
            val stripped = line.trim()
            val match = bulletPrefixRegex.find(stripped)
            if (match != null) {
                val bulletText = stripped.replaceRange(match.range, "").trim()
                if (isValidBulletText(bulletText)) bullets += bulletText
            } else if (looksLikeResumeActionLine(stripped) && isValidBulletText(stripped)) {
                bullets += stripped
            }
        }
        return bullets
    }

    fun isWeakBullet(bullet: String): Boolean {
        val normalized = bullet.trim().lowercase()
        if (normalized.isEmpty() || !isValidBulletText(bullet)) return false
        val startsWithWeakStarter = weakBulletStarters.any(normalized::startsWith)
        val isTooShort = normalized.split(Regex("\\s")).filter(String::isNotEmpty).size < 7
        return startsWithWeakStarter || isTooShort
    }

    fun isValidBulletText(value: String): Boolean {
        val normalized = value.replace(Regex("\\s+"), " ").trim()
        if (normalized.length !in 12..320 || hasRepetitiveNoise(normalized)) return false
        val words = Regex("[A-Za-z][A-Za-z+#./-]*").findAll(normalized).map { it.value }.toList()
        if (words.size < 3) return false
        return words.sumOf(String::length).toDouble() / words.size <= 18.0
    }

    private fun keywordInText(keyword: String, textLower: String): Boolean {
        val escaped = Regex.escape(keyword.lowercase())
        if (Regex("(?<![a-z0-9])$escaped(?![a-z0-9])").containsMatchIn(textLower)) return true
        return when (keyword) {
            "api" -> Regex("(?<![a-z0-9])apis?(?![a-z0-9])").containsMatchIn(textLower)
            "rest api" -> Regex("(?<![a-z0-9])rest\\s+apis?(?![a-z0-9])").containsMatchIn(textLower)
            "next.js" -> Regex("(?<![a-z0-9])next[.\\s-]?js(?![a-z0-9])").containsMatchIn(textLower)
            "node.js" -> Regex("(?<![a-z0-9])node[.\\s-]?js(?![a-z0-9])").containsMatchIn(textLower)
            else -> false
        }
    }

    private fun partialKeywordMatch(keyword: String, resumeLower: String): Boolean {
        val parts = keyword.split(Regex("[ /+\\-]")).filter { it.length > 2 }
        return parts.isNotEmpty() && parts.any(resumeLower::contains)
    }

    private fun removeRedundantKeywords(keywords: Set<String>): Set<String> {
        val cleaned = keywords.toMutableSet()
        for ((keyword, strongerMatches) in redundantKeywords) {
            if (keyword in cleaned && cleaned.any { it in strongerMatches }) cleaned -= keyword
        }
        return cleaned
    }

    private fun hasRepetitiveNoise(value: String): Boolean {
        val lowered = value.lowercase()
        if (Regex("([a-z])\\1{7,}").containsMatchIn(lowered)) return true
        val compact = lowered.replace(Regex("[^a-z]"), "")
        return compact.length >= 40 && compact.toSet().size <= 5
    }

    private fun looksLikeResumeActionLine(value: String): Boolean {
        val normalized = value.trim().lowercase()
        if (normalized.isEmpty() || normalized.split(Regex("\\s")).filter(String::isNotEmpty).size < 5) {
            return false
        }
        if (normalized.endsWith(":")) return false
        return actionLineStarters.any(normalized::startsWith)
    }

    private fun detectSections(text: String): Map<String, Boolean> {
        val loweredLines = splitOnNewlines(text).mapTo(mutableSetOf()) {
            it.trim().lowercase().trim(':')
        }
        return sectionAliases.mapValuesTo(linkedMapOf()) { (_, aliases) ->
            aliases.any(loweredLines::contains)
        }
    }

    private fun detectFormattingWarnings(text: String): List<String> {
        val warnings = mutableListOf<String>()
        val wordCount = splitOnWhitespaceAndNewlines(text).size
        if (wordCount < 250) warnings += "Resume appears unusually short after extraction."
        if (wordCount > 1200) {
            warnings += "Resume appears long; consider tightening for ATS and recruiter scanning."
        }
        if ('\t' in text) warnings += "Tabs were detected and may indicate table-like formatting."
        if (splitOnNewlines(text).count { it.length > 140 } >= 5) {
            warnings += "Several very long lines were detected, which may indicate layout extraction issues."
        }
        return warnings
    }

    private fun calculatePercentage(numerator: Double, denominator: Int): Double {
        if (denominator <= 0) return 100.0
        return max(0.0, min(100.0, (numerator / denominator) * 100.0))
    }

    private fun swiftRound(value: Double): Int = Math.round(value).toInt()

    private fun splitOnWhitespaceAndNewlines(value: String): List<String> =
        value.split(Regex("[\\s\\u0085\\u2028\\u2029]")).filter(String::isNotEmpty)

    private fun splitOnNewlines(value: String): List<String> =
        value.split(Regex("\\r\\n|[\\n\\r\\u000B\\u000C\\u0085\\u2028\\u2029]"))
}
