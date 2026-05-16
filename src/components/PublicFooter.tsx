import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", to: "/home" },
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Gallery", to: "/home#gallery" },
  { label: "Contact", to: "/home#contact" },
];

const PublicFooter = () => (
  <footer className="bg-background border-t border-card">
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
      {/* Col 1 — Brand */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] font-bold text-2xl text-foreground">
          GRAVE DETAIL
        </p>
        <p className="font-garamond italic text-2xl font-medium text-granite">
          Time Takes a Toll. We Take It Back.
        </p>
        <p className="font-garamond text-lg text-granite">
          Benton, Missouri
        </p>
      </div>

      {/* Col 2 — Nav */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] uppercase mb-4 text-foreground text-2xl font-bold">
          Navigation
        </p>
        {NAV_LINKS.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="block font-garamond transition-colors text-xl text-granite hover:text-bronze"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Col 3 — Contact */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] uppercase mb-4 font-bold text-2xl text-foreground">
          Contact
        </p>
        <a
          href="tel:+15735455759"
          className="block font-garamond transition-colors text-xl text-granite hover:text-bronze"
        >
          (573) 545-5759
        </a>
        <a
          href="mailto:info@gravedetail.net"
          className="block font-garamond transition-colors text-xl text-granite hover:text-bronze"
        >
          info@gravedetail.net
        </a>
        <a
          href="https://instagram.com/Grave_Detail"
          target="_blank"
          rel="noopener noreferrer"
          className="block font-garamond transition-colors text-xl text-granite hover:text-bronze"
        >
          Instagram @Grave_Detail
        </a>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-card px-6 py-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="font-garamond text-xs text-granite">
          © 2026 Grave Detail Cleaning &amp; Preservation
        </p>
        <p className="font-garamond text-xs text-granite">
          Fully Insured · CCUS Certified
        </p>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
