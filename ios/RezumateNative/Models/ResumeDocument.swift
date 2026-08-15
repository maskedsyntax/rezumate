import Foundation

struct ResumeDocument: Equatable {
    var name: String = ""
    var email: String?
    var phone: String?
    var website: String?
    var linkedin: String?
    var github: String?
    var location: String?
    var summary: String?
    var experience: [ExperienceEntry] = []
    var projects: [ProjectEntry] = []
    var skillCategories: [SkillCategory] = []
    var education: [EducationEntry] = []
    var additionalSections: [AdditionalResumeSection] = []
    var unmappedContent: [String] = []

    var hasContent: Bool {
        !name.isEmpty || !experience.isEmpty || !skillCategories.isEmpty
    }
}

struct AdditionalResumeSection: Equatable {
    var title: String
    var lines: [String]
}

struct ExperienceEntry: Equatable {
    var company: String = ""
    var dateRange: String = ""
    var title: String = ""
    var location: String = ""
    var bullets: [String] = []
}

struct ProjectEntry: Equatable {
    var name: String = ""
    var bullets: [String] = []
}

struct SkillCategory: Equatable {
    var name: String = ""
    var items: String = ""
}

struct EducationEntry: Equatable {
    var institution: String = ""
    var dateRange: String = ""
    var degree: String = ""
    var location: String = ""
    var details: [String] = []
}
