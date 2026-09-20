package com.aftaab.rezumate.domain

data class JobFit(
    val jobTitle: String? = null,
    val jobTitleMatched: Boolean = false,
    val educationRequirement: String? = null,
    val educationMatched: Boolean = false,
)

object JobFitExtractor {
    fun extract(jobDescription: String, resumeText: String): JobFit {
        val title = extractJobTitle(jobDescription)
        val education = extractEducationRequirement(jobDescription)
        val resumeLower = resumeText.lowercase()
        return JobFit(
            jobTitle = title,
            jobTitleMatched = title?.let { resumeContainsTitle(it, resumeLower) } ?: false,
            educationRequirement = education,
            educationMatched = education?.let { resumeContainsEducation(it, resumeLower) } ?: false,
        )
    }

    fun extractJobTitle(jobDescription: String): String? {
        labeledTitle(jobDescription)?.let { return it }
        return cleanupTitle(
            firstCapture(
                jobDescription,
                Regex(
                    """(?i)(?:we are )?(?:hiring|seeking|looking for)\s+(?:an?\s+)?([^.\n]{4,80})""",
                ),
            ),
        )
    }

    fun extractEducationRequirement(jobDescription: String): String? {
        val lower = jobDescription.lowercase()
        val checks = listOf(
            "PhD" to Regex("""\bph\.?d\b|\bdoctorate\b"""),
            "MBA" to Regex("""\bmba\b"""),
            "Master's degree" to Regex("""\bmaster'?s\b|\bm\.?s\.?\b|\bm\.?a\.?\b"""),
            "Bachelor's degree" to Regex("""\bbachelor'?s\b|\bb\.?s\.?\b|\bb\.?a\.?\b|\bbachelor\b"""),
            "Associate degree" to Regex("""\bassociate(?:'s)?\s+degree\b"""),
        )
        return checks.firstOrNull { it.second.containsMatchIn(lower) }?.first
    }

    private fun labeledTitle(jobDescription: String): String? = cleanupTitle(
        firstCapture(
            jobDescription,
            Regex("""(?i)(?:job\s+title|title|role|position)\s*[:\-]\s*([^\n]{4,80})"""),
        ),
    )

    private fun resumeContainsTitle(title: String, resumeLower: String): Boolean {
        val lower = title.lowercase()
        if (lower in resumeLower) return true
        val tokens = lower
            .split(Regex("[^a-z0-9]+"))
            .filter { it.length >= 4 && it !in TITLE_NOISE }
        if (tokens.size < 2) return tokens.any { it in resumeLower }
        val hits = tokens.count { it in resumeLower }
        return hits >= maxOf(2, tokens.size - 1)
    }

    private fun resumeContainsEducation(requirement: String, resumeLower: String): Boolean = when (requirement) {
        "PhD" -> Regex("""\bph\.?d\b|\bdoctorate\b""").containsMatchIn(resumeLower)
        "MBA" -> Regex("""\bmba\b""").containsMatchIn(resumeLower)
        "Master's degree" -> Regex("""\bmaster'?s\b|\bm\.?s\.?\b|\bm\.?sc\b""").containsMatchIn(resumeLower)
        "Bachelor's degree" ->
            Regex("""\bbachelor'?s\b|\bb\.?s\.?\b|\bb\.?a\.?\b|\bb\.s\b|\bbachelor\b""").containsMatchIn(resumeLower)
        "Associate degree" -> Regex("""\bassociate(?:'s)?\b""").containsMatchIn(resumeLower)
        else -> requirement.lowercase() in resumeLower
    }

    private fun cleanupTitle(raw: String?): String? {
        var title = raw?.trim().orEmpty()
        if (title.isEmpty()) return null

        val lowered = title.lowercase()
        val cutTokens = listOf(" to ", " who ", " that ", " with ", " for ", " in ", ",")
        val earliest = cutTokens
            .mapNotNull { token -> lowered.indexOf(token).takeIf { it >= 0 } }
            .minOrNull()
        if (earliest != null) title = title.substring(0, earliest)

        title = title.trim().trim { it.isWhitespace() || it in PUNCTUATION }
        val words = title.split(Regex("\\s+")).filter(String::isNotEmpty)
        if (words.size !in 2..8) return null
        if (title.lowercase() in TITLE_NOISE) return null
        return title
    }

    private fun firstCapture(text: String, regex: Regex): String? =
        regex.find(text)?.groupValues?.getOrNull(1)

    private val TITLE_NOISE = setOf(
        "team", "someone", "candidate", "candidates", "person", "people", "individual", "role",
    )

    private val PUNCTUATION = setOf(
        ',', '.', '!', '?', ';', ':', '"', '\'', ')', '(', '[', ']', '{', '}', '-', '—', '–',
    )
}
