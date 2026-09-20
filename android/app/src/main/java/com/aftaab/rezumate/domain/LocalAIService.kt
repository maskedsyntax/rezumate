package com.aftaab.rezumate.domain

object LocalAIService {
    fun rewriteBullet(bullet: String, focusKeywords: List<String> = emptyList()): List<String> =
        generateBulletVariants(bullet)

    fun improveResume(
        resumeText: String,
        weakBullets: List<String>,
        focusKeywords: List<String> = emptyList(),
    ): String {
        var text = resumeText
        for (bullet in uniqued(weakBullets)) {
            if (bullet !in text) continue
            text = text.replace(bullet, strengthenBullet(bullet))
        }
        return text
    }

    private fun strengthenBullet(bullet: String): String {
        var value = bullet.trim()
        while (value.firstOrNull()?.let { it in "•·-*" } == true) {
            value = value.drop(1).trim()
        }
        val upgrades = listOf(
            "worked on" to "Contributed to",
            "helped with" to "Contributed to",
            "involved in" to "Contributed to",
            "assisted with" to "Contributed to",
            "handled" to "Managed",
            "participated in" to "Contributed to",
            "did" to "Executed",
            "made" to "Created",
        )
        val lower = value.lowercase()
        for ((weak, strong) in upgrades) {
            if (lower.startsWith(weak)) {
                return strong + value.drop(weak.length)
            }
        }
        return value
    }

    private fun generateBulletVariants(bullet: String): List<String> {
        var value = bullet.trim()
        while (value.startsWith("•") || value.startsWith("-") || value.startsWith("*")) {
            value = value.drop(1).trim()
        }
        return uniqued(listOf(strengthenBullet(value), value))
    }

    private fun uniqued(values: List<String>): List<String> {
        val seen = linkedSetOf<String>()
        return values.filter { seen.add(it) }
    }
}
