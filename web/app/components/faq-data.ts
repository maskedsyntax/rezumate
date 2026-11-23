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
          "Rezumate is a native iOS resume optimization app. Upload a resume, paste a job description, and get instant ATS-style scoring, missing keyword detection, bullet improvements, and a professionally formatted PDF export. Scoring and export run on your iPhone; Rezumate Pro adds AI rewrites and cover letters."
      },
      {
        question: "What problem does Rezumate solve?",
        answer:
          "Most applicants send one generic resume everywhere and never know why it underperforms. Rezumate shows an ATS-style score, missing keywords, weak bullets, and bullets that need measurable impact, then helps you improve them, with AI if you want it, without inventing anything."
      },
      {
        question: "Who is Rezumate for?",
        answer:
          "Tech professionals, students, active job seekers, and developers who want to tailor resumes rapidly for different roles, privately. Scoring runs on the iPhone, so it is instant and works offline; only the optional AI features need a connection."
      },
      {
        question: "How does the core workflow work?",
        answer:
          "Upload resume (PDF or DOCX), paste a job description, get an ATS-style score with full breakdown, see missing keywords and weak bullets, tap Improve Resume, then view and download a formatted PDF in a professional template."
      },
      {
        question: "What makes Rezumate different from other resume tools?",
        answer:
          "Privacy and honest feedback. Many resume tools store your phone number, email, and work history in cloud databases. Rezumate keeps your resumes on your iPhone, scores them on-device, and only sends text to AI when you tap an AI feature, with your contact details removed first. The AI never invents skills, numbers, or experience."
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
          "It depends on the resume and job description. Improve Resume only strengthens wording already on the page. If you confirm a missing skill you actually have, you can add it to Skills (and optionally one existing bullet) and the match score updates immediately. Rezumate never invents skills, outcomes, or numbers."
      },
      {
        question: "How do the writing suggestions work?",
        answer:
          "Free users get on-device suggestions that strengthen weak phrasing without changing the facts. Rezumate Pro adds AI rewrites: if a bullet is vague, the app asks what you did and what came of it, and the AI uses only that and your resume. Every change is checked and shown to you before it is applied. Missing job keywords stay recommendations until you confirm you have that skill."
      },
      {
        question: "Do I need an internet connection?",
        answer:
          "Not for the core workflow. Analysis, scoring, keyword checks, and PDF export all run on your iPhone. The AI features (rewrites, AI Improve Resume, cover letters) need a connection and only run when you tap them."
      },
      {
        question: "Will Rezumate invent experience or metrics for me?",
        answer:
          "No. Improve Resume never inserts missing skills or fabricates employers, credentials, outcomes, achievements, or metrics. You can choose to add a missing keyword yourself after confirming you have it. You remain responsible for reviewing every change."
      },
      {
        question: "Can I add a missing keyword to my resume?",
        answer:
          "Yes. On Results, tap a missing hard skill you actually have. Rezumate adds it to the Skills section and can mention it in one existing bullet you pick. It will not add keywords on its own, and it will not invent experience around them.",
      },
      {
        question: "Can I export my resume?",
        answer:
          "Yes. You can export from Results before or after an improvement and re-export saved versions from History. Rezumate uses a clean ATS-friendly PDF template, preserves supported and additional resume sections, and generates the PDF on your iPhone."
      }
    ]
  },
  {
    title: "Plans & Pricing",
    items: [
      {
        question: "What is included on the Free plan?",
        answer:
          "Free includes 3 ATS analyses per day, 3 resume improvements per day, 2 saved resume variants, basic score feedback, keyword gaps, PDF export, and 3 AI actions to try. It is designed to be genuinely useful before you upgrade."
      },
      {
        question: "Is there a paid plan?",
        answer:
          "Yes. Rezumate Pro is $29.99 a year or $4.99 a month. It includes unlimited analyses, improvements, and saved variants, the full ATS diagnosis and keyword insights, and AI features: bullet rewrites, AI Improve Resume, cover letters, and extra job requirements (up to 150 AI actions a month). Cancel anytime in Settings. Localized App Store pricing may vary."
      },
      {
        question: "How does the pricing compare to cloud-based resume builders?",
        answer:
          "Most cloud resume builders charge $15-30 a month. Rezumate scores and stores everything on your iPhone, so we only pay for the AI writing. That keeps a full year of Pro at $29.99."
      },
      {
        question: "I bought Lifetime Pro. What happens now?",
        answer:
          "You keep everything Lifetime Pro included: unlimited analyses, improvements, saved variants, and the full diagnosis. You also get 25 AI actions to try the new features. Ongoing AI use needs a Pro subscription."
      }
    ]
  },
  {
    title: "Privacy & Security",
    items: [
      {
        question: "How is my resume data handled?",
        answer:
          "Your resumes, job descriptions, scores, and saved variants are stored only on your iPhone. When you tap an AI feature, the needed text is sent to OpenAI through our server with your name, contact details, and location removed. Neither our server nor OpenAI keeps it. Rezumate has no resume database and no analytics trackers."
      },
      {
        question: "Do I need an account to use the app?",
        answer:
          "No. You can use Rezumate immediately without creating an account. There is no sign-in step."
      },
      {
        question: "Does Rezumate sell my data?",
        answer:
          "Never. We do not store your resumes, scores, or personal information, so there is nothing to sell."
      }
    ]
  }
];

export const featuredFaqQuestions = new Set([
  "What is Rezumate?",
  "How does the core workflow work?",
  "How much does the score actually improve?",
  "What makes Rezumate different from other resume tools?",
  "How do the writing suggestions work?",
  "How is my resume data handled?",
  "Do I need an account to use the app?"
]);

export const featuredFaqItems: FaqItem[] = faqSections
  .flatMap((section) => section.items)
  .filter((item) => featuredFaqQuestions.has(item.question));
