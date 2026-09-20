package com.aftaab.rezumate.domain

import com.aftaab.rezumate.model.AdditionalResumeSection
import com.aftaab.rezumate.model.EducationEntry
import com.aftaab.rezumate.model.ExperienceEntry
import com.aftaab.rezumate.model.ProjectEntry
import com.aftaab.rezumate.model.ResumeDocument
import com.aftaab.rezumate.model.SkillCategory

object ResumeParser {
    private val sectionAliases = mapOf(
        "summary" to "summary",
        "objective" to "summary",
        "professional summary" to "summary",
        "career summary" to "summary",
        "profile" to "summary",
        "about" to "summary",
        "experience" to "experience",
        "work experience" to "experience",
        "professional experience" to "experience",
        "employment" to "experience",
        "employment history" to "experience",
        "work history" to "experience",
        "projects" to "projects",
        "personal projects" to "projects",
        "project experience" to "projects",
        "side projects" to "projects",
        "open source" to "projects",
        "education" to "education",
        "academic background" to "education",
        "academic history" to "education",
        "skills" to "skills",
        "technical skills" to "skills",
        "technologies" to "skills",
        "core competencies" to "skills",
        "technical competencies" to "skills",
        "certifications" to "certifications",
        "awards" to "awards",
        "publications" to "publications",
        "volunteer" to "volunteer",
        "volunteering" to "volunteer",
    )

    private val knownLocations = setOf(
        "remote", "india", "usa", "us", "uk", "united kingdom", "united states",
        "new york", "san francisco", "los angeles", "london", "berlin", "toronto",
        "singapore", "australia", "canada", "germany", "france", "europe", "asia",
        "worldwide", "globally", "anywhere", "hybrid",
    )

    private val dateRegex = Regex(
        "(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+)?" +
            "\\d{4}\\s*[-–—]+\\s*(?:Present|Current|\\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+\\d{4})",
        RegexOption.IGNORE_CASE,
    )

    fun parse(text: String): ResumeDocument {
        val document = ResumeDocument()
        val lines = splitPreservingEmpty(text.replace("\r\n", "\n").replace("\r", "\n"))
            .map { it.trimHorizontalWhitespace() }
        var index = 0
        while (index < lines.size && lines[index].isEmpty()) index++
        if (index >= lines.size) return document

        document.name = lines[index++]
        while (index < lines.size) {
            val line = lines[index]
            if (line.isEmpty()) {
                index++
                continue
            }
            if (sectionName(line) != null) break
            if (!parseContactLine(line, document)) {
                document.unmappedContent += line
            }
            index++
        }

        var currentSection: String? = null
        var sectionContent = mutableListOf<String>()
        while (index < lines.size) {
            val line = lines[index++]
            val section = sectionName(line)
            if (section != null) {
                currentSection?.let { processSection(it, sectionContent, document) }
                currentSection = section
                sectionContent = mutableListOf()
            } else {
                sectionContent += line
            }
        }
        currentSection?.let { processSection(it, sectionContent, document) }
        return document
    }

    private fun sectionName(line: String): String? {
        val trimmed = line.trimHorizontalWhitespace()
        if (trimmed.isEmpty() || trimmed.length !in 3..50) return null
        val lower = trimmed.lowercase()
        sectionAliases[lower]?.let { return it }
        val letters = trimmed.filter(Char::isLetter)
        if (letters.isEmpty()) return null
        return if (letters.all(Char::isUpperCase)) sectionAliases[lower] ?: lower else null
    }

    private fun parseContactLine(line: String, document: ResumeDocument): Boolean {
        val splitParts = line.split(Regex("[|•·${'$'}]"))
            .map { it.trimHorizontalWhitespace() }
            .filter(String::isNotEmpty)
        var parsedAny = false
        for (part in if (splitParts.size > 1) splitParts else listOf(line)) {
            val lower = part.lowercase()
            val email = extractEmail(part)
            val phone = extractPhone(part)
            when {
                document.email == null && email != null -> {
                    document.email = email
                    parsedAny = true
                }
                "linkedin.com/in/" in lower -> {
                    if (document.linkedin == null) document.linkedin = extractLinkedIn(part) ?: part
                    parsedAny = true
                }
                "github.com/" in lower -> {
                    if (document.github == null) document.github = extractGitHub(part) ?: part
                    parsedAny = true
                }
                lower.startsWith("http") || lower.startsWith("www.") ||
                    ".dev" in lower || ".io" in lower ||
                    (".com" in lower && "@" !in lower) ||
                    (".app" in lower && "@" !in lower) -> {
                    if (document.website == null) document.website = part
                    parsedAny = true
                }
                document.phone == null && phone != null -> {
                    document.phone = phone
                    parsedAny = true
                }
                isLikelyLocation(part) -> {
                    if (document.location == null) document.location = part
                    parsedAny = true
                }
            }
        }
        return parsedAny
    }

    private fun extractEmail(text: String): String? =
        Regex("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}").find(text)?.value

    private fun extractPhone(text: String): String? {
        val matches = Regex("""(?<![A-Za-z0-9])\+?[0-9(][0-9\s().-]{8,}[0-9](?![A-Za-z0-9])""").findAll(text)
        for (match in matches) {
            val candidate = match.value.trim()
            val digits = candidate.count { it.isDigit() }
            if (digits in 10..15) return candidate
        }
        return null
    }

    private fun extractLinkedIn(text: String): String? =
        Regex("linkedin\\.com/in/([a-zA-Z0-9\\-]+)", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.get(1)

    private fun extractGitHub(text: String): String? =
        Regex("github\\.com/([a-zA-Z0-9\\-]+)", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.get(1)

    private fun isLikelyLocation(text: String): Boolean {
        val lower = text.lowercase().trimHorizontalWhitespace()
        if (lower in knownLocations) return true
        if (Regex("^[a-z\\s]+,\\s*[a-z]{2}${'$'}").containsMatchIn(lower)) return true
        val words = text.split(Regex("\\s")).filter(String::isNotEmpty)
        if (words.size <= 3 && "@" !in text && "." !in text && "/" !in text) {
            val allCapped = words.all { it.firstOrNull()?.isUpperCase() == true }
            if (allCapped && words.size == 1 && text.length >= 3) return true
        }
        return false
    }

    private fun processSection(section: String, lines: List<String>, document: ResumeDocument) {
        when (section) {
            "summary" -> document.summary = lines.filter(String::isNotEmpty).joinToString(" ")
            "experience" -> document.experience = parseExperienceEntries(lines).toMutableList()
            "projects" -> document.projects = parseProjectEntries(lines).toMutableList()
            "education" -> document.education = parseEducationEntries(lines).toMutableList()
            "skills" -> document.skillCategories = parseSkillsSection(lines).toMutableList()
            else -> {
                val meaningful = lines.filter { it.isNotBlank() }
                if (meaningful.isNotEmpty()) {
                    document.additionalSections += AdditionalResumeSection(
                        title = section.uppercase(),
                        lines = meaningful.toMutableList(),
                    )
                }
            }
        }
    }

    private fun parseExperienceEntries(lines: List<String>): List<ExperienceEntry> {
        val entries = mutableListOf<ExperienceEntry>()
        var current: ExperienceEntry? = null
        var expectTitle = false
        for (line in lines) {
            if (line.isEmpty()) continue
            val bullet = asBullet(line)
            if (bullet != null) {
                current?.bullets?.add(bullet)
                expectTitle = false
                continue
            }
            when {
                current == null -> {
                    val (name, date) = splitNameAndDate(line)
                    current = ExperienceEntry(company = name, dateRange = date)
                    expectTitle = true
                }
                expectTitle -> {
                    val (title, location) = splitTitleAndLocation(line)
                    current.title = title
                    current.location = location
                    expectTitle = false
                }
                shouldContinuePreviousBullet(line, current) -> appendToLastBullet(line, current)
                else -> {
                    entries += current
                    val (name, date) = splitNameAndDate(line)
                    current = ExperienceEntry(company = name, dateRange = date)
                    expectTitle = true
                }
            }
        }
        current?.let(entries::add)
        return entries
    }

    private fun parseProjectEntries(lines: List<String>): List<ProjectEntry> {
        val entries = mutableListOf<ProjectEntry>()
        var current: ProjectEntry? = null
        for (line in lines) {
            if (line.isEmpty()) continue
            val bullet = asBullet(line)
            if (bullet != null) {
                if (current == null) current = ProjectEntry()
                current.bullets += bullet
                continue
            }
            if (shouldContinuePreviousProjectBullet(line, current)) {
                appendToLastProjectBullet(line, current!!)
                continue
            }
            current?.let(entries::add)
            val (name) = splitNameAndDate(line)
            current = ProjectEntry(name = name.ifEmpty { line })
        }
        current?.let(entries::add)
        return entries
    }

    private fun parseEducationEntries(lines: List<String>): List<EducationEntry> {
        val entries = mutableListOf<EducationEntry>()
        var current: EducationEntry? = null
        var expectDegree = false
        for (line in lines) {
            if (line.isEmpty()) continue
            val bullet = asBullet(line)
            if (bullet != null) {
                current?.details?.add(bullet)
                expectDegree = false
                continue
            }
            when {
                current == null -> {
                    val (institution, date) = splitNameAndDate(line)
                    current = EducationEntry(institution = institution, dateRange = date)
                    expectDegree = true
                }
                expectDegree -> {
                    val (degree, location) = splitTitleAndLocation(line)
                    current.degree = degree
                    current.location = location
                    expectDegree = false
                }
                else -> {
                    entries += current
                    val (institution, date) = splitNameAndDate(line)
                    current = EducationEntry(institution = institution, dateRange = date)
                    expectDegree = true
                }
            }
        }
        current?.let(entries::add)
        return entries
    }

    private fun parseSkillsSection(lines: List<String>): List<SkillCategory> {
        val categories = mutableListOf<SkillCategory>()
        for (line in lines) {
            if (line.isEmpty()) continue
            val colonIndex = line.indexOf(':')
            if (colonIndex >= 0) {
                val name = line.substring(0, colonIndex).trimHorizontalWhitespace()
                val items = line.substring(colonIndex + 1).trimHorizontalWhitespace()
                if (name.isNotEmpty() && items.isNotEmpty() && name.length < 40) {
                    categories += SkillCategory(name, items)
                    continue
                }
            }
            categories += SkillCategory(items = line)
        }
        return categories
    }

    private fun asBullet(line: String): String? {
        val trimmed = line.trimHorizontalWhitespace()
        val bulletChars = setOf('•', '·', '▪', '▸', '◦', '‣', '–', '—')
        if (trimmed.firstOrNull() in bulletChars) return trimmed.drop(1).trimHorizontalWhitespace()
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return trimmed.drop(2).trimHorizontalWhitespace()
        }
        return null
    }

    private fun shouldContinuePreviousBullet(line: String, current: ExperienceEntry): Boolean =
        current.bullets.isNotEmpty() && splitNameAndDate(line).second.isEmpty()

    private fun appendToLastBullet(line: String, entry: ExperienceEntry) {
        if (entry.bullets.isEmpty()) return
        val continuation = line.trimHorizontalWhitespace()
        if (continuation.isNotEmpty()) {
            entry.bullets[entry.bullets.lastIndex] += " $continuation"
        }
    }

    private fun shouldContinuePreviousProjectBullet(line: String, current: ProjectEntry?): Boolean {
        if (current == null || current.bullets.isEmpty()) return false
        val trimmed = line.trimHorizontalWhitespace()
        if (trimmed.isEmpty() || splitNameAndDate(trimmed).second.isNotEmpty()) return false
        if (trimmed.length > 38) return true
        val first = trimmed.first()
        return first.isLowerCase() || first in "(),;:/"
    }

    private fun appendToLastProjectBullet(line: String, entry: ProjectEntry) {
        if (entry.bullets.isEmpty()) return
        val continuation = line.trimHorizontalWhitespace()
        if (continuation.isNotEmpty()) {
            entry.bullets[entry.bullets.lastIndex] += " $continuation"
        }
    }

    private fun splitNameAndDate(line: String): Pair<String, String> {
        val match = dateRegex.findAll(line).lastOrNull() ?: return line to ""
        val date = match.value.trimHorizontalWhitespace()
        val name = line.substring(0, match.range.first).trimHorizontalWhitespace()
        return if (name.isEmpty()) line to "" else name to date
    }

    private fun splitTitleAndLocation(line: String): Pair<String, String> {
        val words = line.split(Regex("\\s")).filter(String::isNotEmpty)
        if (words.size <= 1) return line to ""
        val last = words.last()
        if (last.lowercase() in knownLocations) {
            val title = words.dropLast(1).joinToString(" ")
            return (title.ifEmpty { line }) to last
        }
        if (words.size >= 3) {
            val lastTwo = words.takeLast(2).joinToString(" ")
            if (lastTwo.lowercase() in knownLocations) {
                val title = words.dropLast(2).joinToString(" ")
                return (title.ifEmpty { line }) to lastTwo
            }
        }
        val stateMatch = Regex(",\\s*[A-Z]{2}${'$'}").find(line)
        if (stateMatch != null) {
            val location = stateMatch.value.trim(',', ' ')
            val title = line.substring(0, stateMatch.range.first).trimHorizontalWhitespace()
            if (title.isNotEmpty()) return title to location
        }
        return line to ""
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

    private fun String.trimHorizontalWhitespace(): String = trim { it.isHorizontalWhitespace() }

    private fun Char.isHorizontalWhitespace(): Boolean =
        isWhitespace() && this !in "\n\r\u000B\u000C\u0085\u2028\u2029"
}
