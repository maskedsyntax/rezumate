import { RevealHeading } from "./RevealHeading";

const testimonials = [
  {
    name: "Colin",
    role: "User",
    quote: "I went from sending out resumes with barely any responses to getting three interview calls in one week. Rezumate helped me spot the keywords I was missing without stuffing my resume with nonsense."
  },
  {
    name: "Ana",
    role: "Data Analyst",
    quote: "What I like most is that it doesn’t try to rewrite my entire resume into generic AI language. I can see what’s missing, add the skills I actually have, and immediately see the score improve."
  },
  {
    name: "Yosra",
    role: "Business Operations",
    quote: "I used to spend almost an hour tailoring my resume for every job. With Rezumate, I can usually get it done in 10–15 minutes."
  },
  {
    name: "Varun",
    role: "Data Scientist",
    quote: "My resume looked fine to me, but Rezumate showed that it barely matched the role I was applying for. After fixing the gaps, my ATS score went from 54 to 86."
  },
  {
    name: "Luke",
    role: "Partner Manager",
    quote: "I’ve tried a few resume tools, but most of them feel overwhelming. Rezumate is much more focused: paste the job description, find the gaps, fix them, apply."
  },
  {
    name: "Amin",
    role: "Head of Product",
    quote: "The best part is being able to add a missing skill to the exact section or bullet where it makes sense. It feels much more controlled than letting AI rewrite everything."
  },
  {
    name: "Akshay",
    role: "User",
    quote: "After updating my resume with Rezumate, I started getting noticeably more recruiter responses. Even beyond the score, it helped me understand how differently a recruiter or ATS reads my resume."
  }
];

export function TestimonialMarquee() {
  return (
    <section className="testimonial-section" aria-labelledby="testimonial-heading">
      <div className="shell testimonial-heading">
        <div>
          <p className="eyebrow">User feedback</p>
          <RevealHeading id="testimonial-heading">What Rezumate users say.</RevealHeading>
        </div>
      </div>
      <div className="testimonial-viewport">
        <div className="testimonial-track">
          {[0, 1].map((copy) => (
            <div className="testimonial-set" key={copy} aria-hidden={copy === 1}>
              {testimonials.map(({ name, role, quote }) => (
                <figure className="testimonial-card" key={`${copy}-${name}`}>
                  <span className="testimonial-mark" aria-hidden="true">“</span>
                  <blockquote>{quote}</blockquote>
                  <figcaption><strong>{name}</strong><span>{role}</span></figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
