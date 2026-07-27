import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";
import { blogPosts } from "./posts-data";

export const metadata: Metadata = {
  title: "Blog",
  description: "Technical notes on building Rezumate: on-device resume scoring, keyword matching, and resume file privacy.",
  alternates: {
    canonical: "/blog"
  }
};

export default function BlogIndexPage() {
  return (
    <SiteChrome>
      <main className="shell blog-index">
        <Link href="/" className="legal-back">← Back</Link>
        <p className="eyebrow">Blog</p>
        <h1>Notes on building Rezumate</h1>
        <p className="lead faq-lead">
          Technical write-ups on how the app works under the hood, and how resume tooling handles (or mishandles)
          your data.
        </p>
        <div className="blog-index-list">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
              <span className="blog-card-meta">{post.readTime}</span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </SiteChrome>
  );
}
