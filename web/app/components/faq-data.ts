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
          "Rezumate is a native iOS resume optimization app. Upload a resume, paste a job description, and get instant ATS-style scoring, missing keyword detection, bullet improvements, and a professionally formatted PDF export, all running locally on your iPhone."
      },
      {
        question: "What problem does Rezumate solve?",
        answer:
          "Most applicants send one generic resume everywhere and never know why it underperforms. Rezumate shows an ATS-style score, missing keywords, weak bullets, and bullets that need measurable impact, then helps you improve them without uploading your data anywhere."
      },
      {
        question: "Who is Rezumate for?",
        answer:
          "Tech professionals, students, active job seekers, and developers who want to tailor resumes rapidly for different roles, with complete privacy. Because everything runs locally, it is instant, responsive, and works fully offline."
      },
      {
        question: "How does the core workflow work?",
        answer:
          "Upload resume (PDF or DOCX), paste a job description, get an ATS-style score with full breakdown, see missing keywords and weak bullets, tap Improve Resume, then view and download a formatted PDF in a professional template."
      },
      {
        question: "What makes Rezumate different from other resume tools?",
        answer:
          "Privacy and useful feedback. Standard resume tools upload your phone number, email, work history, and addresses to third-party cloud databases. Rezumate does not. It processes everything in-memory and in local sandboxed storage, identifies role-specific gaps, and improves supported wording without inventing qualifications."
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
          "A role-specific ATS match score broken down into keyword coverage (45%), impact quality (25%), structure and readability (20%), and formatting risk (10%). You also get a list of matched keywords, missing keywords, weak bullets, and formatting warnings, all calculated instantly by the native scoring engine."
      },
      {
        question: "How much does the score actually improve?",
        answer:
          "It depends on the resume and job description. Rezumate identifies missing keywords as recommendations and makes conservative wording changes only when the source resume supports them. It never inserts unsupported skills, outcomes, or numbers."
      },
      {
        question: "How do local writing suggestions work?",
        answer:
          "Rezumate uses local scoring rules and conservative writing patterns. It can strengthen weak phrasing while preserving the facts already in the resume. Missing job-description keywords remain recommendations instead of being inserted automatically."
      },
      {
        question: "Do I need to download a model or connect to a server?",
        answer:
          "No. Everything runs locally with no model download and no server connection required. Analysis, scoring, improvement, and PDF export all happen on-device."
      },
      {
        question: "Will Rezumate invent experience or metrics for me?",
        answer:
          "No. Rezumate improves supported phrasing but does not insert missing skills or fabricate employers, credentials, outcomes, achievements, or metrics. You remain responsible for reviewing every suggestion."
      },
      {
        question: "Can I export my resume?",
        answer:
          "Yes. You can export from Results before or after an improvement and re-export saved versions from History. Rezumate uses a clean ATS-friendly PDF template, preserves supported and additional resume sections, and generates the PDF entirely on-device."
      }
    ]
  },
  {
    title: "Plans & Pricing",
    items: [
      {
        question: "What is included on the Free plan?",
        answer:
          "Free includes 3 ATS analyses per day, 3 resume improvements per day, 2 saved resume variants, basic score feedback, keyword gaps, and PDF export. It is designed to be genuinely useful before you upgrade."
      },
      {
        question: "Is there a paid plan?",
        answer:
          "Yes. Rezumate Pro is a $14.99 one-time lifetime unlock for unlimited analyses, unlimited improvements, unlimited saved variants, full ATS diagnosis, and full keyword insights. Localized App Store pricing may vary."
      },
      {
        question: "How does the pricing compare to cloud-based resume builders?",
        answer:
          "Most cloud resume builders charge $15-30/month because they pay for server-side AI and storage. Rezumate runs locally on your iPhone, so Pro is sold as a one-time purchase instead of a subscription or confusing credit pack."
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
