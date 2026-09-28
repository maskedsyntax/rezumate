const facts = [
  "$14.99 one-time",
  "No invented claims",
  "Pay once",
  "No cloud resume upload",
  "No account",
  "PDF + DOCX import",
  "ATS-safe PDF export"
];

function Tape({ className }: { className: string }) {
  return (
    <div className={`tape ${className}`} aria-hidden="true">
      <div className="tape-track">
        {[0, 1].map((copy) => (
          <div className="tape-set" key={copy}>
            {facts.map((fact) => (
              <span key={`${copy}-${fact}`}>{fact}<b>✦</b></span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TapeMarquee() {
  return (
    <section className="tape-band" aria-label="Product details">
      <ul className="sr-only">
        {facts.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>
      <Tape className="tape-a" />
      <Tape className="tape-b" />
    </section>
  );
}
