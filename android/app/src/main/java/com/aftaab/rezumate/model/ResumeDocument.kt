package com.aftaab.rezumate.model

import kotlinx.serialization.Serializable

@Serializable
data class ResumeDocument(
    var name: String = "",
    var email: String? = null,
    var phone: String? = null,
    var website: String? = null,
    var linkedin: String? = null,
    var github: String? = null,
    var location: String? = null,
    var summary: String? = null,
    var experience: MutableList<ExperienceEntry> = mutableListOf(),
    var projects: MutableList<ProjectEntry> = mutableListOf(),
    var skillCategories: MutableList<SkillCategory> = mutableListOf(),
    var education: MutableList<EducationEntry> = mutableListOf(),
) {
    val hasContent: Boolean
        get() = name.isNotEmpty() || experience.isNotEmpty() || skillCategories.isNotEmpty()
}

@Serializable
data class ExperienceEntry(
    var company: String = "",
    var dateRange: String = "",
    var title: String = "",
    var location: String = "",
    var bullets: MutableList<String> = mutableListOf(),
)

@Serializable
data class ProjectEntry(
    var name: String = "",
    var bullets: MutableList<String> = mutableListOf(),
)

@Serializable
data class SkillCategory(
    var name: String = "",
    var items: String = "",
)

@Serializable
data class EducationEntry(
    var institution: String = "",
    var dateRange: String = "",
    var degree: String = "",
    var location: String = "",
    var details: MutableList<String> = mutableListOf(),
)
