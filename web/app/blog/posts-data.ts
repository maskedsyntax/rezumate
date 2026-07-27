export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "on-device-resume-scoring",
    title: "Why I built resume scoring to run entirely on-device, with no backend",
    description:
      "Notes from building an ATS-style scoring engine, keyword matcher, and bullet rewriter that never make a network call.",
    date: "2026-07-27",
    readTime: "8 min read"
  },
  {
    slug: "what-your-resume-file-reveals",
    title: "What's actually inside your resume file (and where it goes when you \"upload for a free ATS check\")",
    description:
      "A look at the metadata hiding inside a normal PDF or DOCX, and what happens on the other end of a free online resume checker.",
    date: "2026-07-27",
    readTime: "7 min read"
  }
];
