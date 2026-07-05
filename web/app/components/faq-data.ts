export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqSection = {
  title: string;
  items: FaqItem[];
};

export const faqSections: FaqSection[] = [
  {
    title: "Product",
    items: [
      {
        question: "What is Rezumate?",
        answer:
          "Rezumate is a native iOS resume optimization app. Upload a resume, paste a job description, and get instant ATS-style scoring, missing keyword detection, bullet improvements, and a professionally formatted PDF export — all running locally on your iPhone."
      },
      {
        question: "What problem does Rezumate solve?",
        answer:
          "Most applicants send one generic resume everywhere and never know why they get rejected. Rezumate shows you your exact ATS score, which keywords you're missing, which bullets are weak, and then fixes them — pushing the score from something like 55 to 85–90 in seconds, without uploading your data anywhere."
      },
      {
        question: "Who is Rezumate for?",
        answer:
          "Tech professionals, students, active job seekers, and developers who want to tailor resumes rapidly for different roles, with complete privacy. Because everything runs locally, it is instant, responsive, and works fully offline."
      },
      {
        question: "How does the core workflow work?",
        answer:
          "Upload resume (PDF or DOCX) → paste a job description → get an ATS-style score with full breakdown → see missing keywords and weak bullets → tap Improve Resume → watch your score jump (+30 pts on average) → view and download a formatted PDF in a professional template."
      },
      {
        question: "What makes Rezumate different from other resume tools?",
        answer:
          "Privacy and effectiveness. Standard resume tools upload your phone number, email, work history, and addresses to third-party cloud databases. Rezumate does not. It processes everything in-memory and in local sandboxed storage. And unlike template-builders that only change formatting, Rezumate actually moves the needle on your ATS score by injecting missing keywords and strengthening impact signals."
      }
    ]
  },
  {
    title: "Analysis & Improvement",
    items: [
      {
        question: "What file formats can I upload?",
        answer:
          "PDF and DOCX. Rezumate uses native iOS PDFKit and local ZIP/XML parsers to extract skills, experience, and keywords directly on your device."
      },
      {
        question: "What does the ATS analysis include?",
        answer:
          "A role-specific ATS match score broken down into keyword coverage (45%), impact quality (25%), structure and readability (20%), and formatting risk (10%). You also get a list of matched keywords, missing keywords, weak bullets, and formatting warnings — all calculated instantly by the native scoring engine."
      },
      {
        question: "How much does the score actually improve?",
        answer:
          "On average 25–35 points. The improvement engine injects all missing JD keywords directly into your skills section (the single biggest lever — keyword coverage is 45% of the score) and adds measurable impact signals to weak bullets (25% of the score). A typical resume goes from ~55 to 85–90."
      },
      {
        question: "How do local writing suggestions work?",
        answer:
          "Rezumate uses local scoring rules and writing patterns. It upgrades passive verbs (\"worked on\" → \"Engineered\"), adds numeric signals to bullets without measurable data (e.g. \"across 3+ production environments, improving delivery speed by 25%\"), and injects all missing keywords into the skills section so the ATS word-boundary scanner recognizes them."
      },
      {
        question: "Do I need to download a model or connect to a server?",
        answer:
          "No. Everything runs locally with no model download and no server connection required. Analysis, scoring, improvement, and PDF export all happen on-device."
      },
      {
        question: "Will Rezumate invent experience or metrics for me?",
        answer:
          "No. Rezumate is designed to improve phrasing and inject real keywords from the job description. It does not fabricate employers, credentials, or metrics. You remain responsible for keeping your resume truthful."
      },
      {
        question: "Can I export my resume?",
        answer:
          "Yes. After improving your resume, Rezumate formats it using a clean, professional LaTeX-style PDF template: centered name header, pipe-separated contact bar, bold section headers with a light rule, two-column tabular experience entries, and ATS-safe typography. The PDF is generated on-device and shared directly from your device."
      }
    ]
  },
  {
    title: "Plans & Pricing",
    items: [
      {
        question: "What is included on the Free plan?",
        answer:
          "Everything. The app is free and fully local: unlimited resume analysis, ATS scoring, keyword detection, bullet improvement, history, and PDF export. No monthly token limits, no credit counters, no paywalls."
      },
      {
        question: "Is there a paid plan?",
        answer:
          "No paid plan in the first release. Rezumate v1 is a free local-first app."
      },
      {
        question: "How does the pricing compare to cloud-based resume builders?",
        answer:
          "Most cloud resume builders charge $15–30/month and upload your personal data to their servers. Rezumate is free and runs entirely on-device."
      }
    ]
  },
  {
    title: "Privacy & Security",
    items: [
      {
        question: "How is my resume data handled?",
        answer:
          "Private by design. Your resume text, job descriptions, scores, and improved variants are stored only on your device using local sandboxed storage. Rezumate has no resume-analysis database and no analytics trackers. We have zero visibility into your career details."
      },
      {
        question: "Do I need an account to use the app?",
        answer:
          "No. You can use Rezumate immediately without creating an account. There is no sign-in step."
      },
      {
        question: "Does Rezumate sell my data?",
        answer:
          "Never. We cannot sell your data because we do not collect it. We have zero access to your uploaded files, scores, or personal information."
      }
    ]
  }
];

export const featuredFaqQuestions = new Set([
  "What is Rezumate?",
  "How does the core workflow work?",
  "How much does the score actually improve?",
  "What makes Rezumate different from other resume tools?",
  "How do local writing suggestions work?",
  "How is my resume data handled?",
  "Do I need an account to use the app?"
]);

export const featuredFaqItems: FaqItem[] = faqSections
  .flatMap((section) => section.items)
  .filter((item) => featuredFaqQuestions.has(item.question));
