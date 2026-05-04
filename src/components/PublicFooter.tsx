import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", to: "/home" },
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Gallery", to: "/home#gallery" },
  { label: "Contact", to: "/home#contact" },
];

const PublicFooter = () => (
  <footer style={{ backgroundColor: "#141414", borderTop: "1px solid #2C2C2C" }}>
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
      {/* Col 1 — Brand */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] font-bold text-2xl text-primary" style={{ color: "#E8E4DF" }}>
          GRAVE DETAIL
        </p>
        <p className="font-garamond italic text-xl text-secondary-foreground font-semibold" style={{ color: "#6B6B6B" }}>
          Time Takes a Toll. We Take It Back.
        </p>
        <p className="font-garamond text-lg text-secondary-foreground" style={{ color: "#6B6B6B" }}>
          Benton, Missouri
        </p>
      </div>

      {/* Col 2 — Nav */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] uppercase mb-4 text-secondary-foreground text-2xl font-bold" style={{ color: "#E8E4DF" }}>
          Navigation
        </p>
        {NAV_LINKS.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="block font-garamond transition-colors text-secondary-foreground text-xl"
            style={{ color: "#6B6B6B" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Col 3 — Contact */}
      <div className="space-y-3">
        <p className="font-cinzel tracking-[0.2em] uppercase mb-4 font-bold text-2xl" style={{ color: "#E8E4DF" }}>
          Contact
        </p>
        <a
          href="tel:+15735455759"
          className="block font-garamond transition-colors text-xl"
          style={{ color: "#6B6B6B" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
        >
          (573) 545-5759
        </a>
        <a
          href="mailto:info@gravedetail.net"
          className="block font-garamond transition-colors text-xl"
          style={{ color: "#6B6B6B" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
        >
          info@gravedetail.net
        </a>
        <a
          href="https://instagram.com/Grave_Detail"
          target="_blank"
          rel="noopener noreferrer"
          className="block font-garamond transition-colors text-xl"
          style={{ color: "#6B6B6B" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
        >
          Instagram @Grave_Detail
        </a>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t px-6 py-6" style={{ borderColor: "#2C2C2C" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="font-garamond text-xs" style={{ color: "#6B6B6B" }}>
          © 2026 Grave Detail Cleaning &amp; Preservation
        </p>
        <p className="font-garamond text-xs" style={{ color: "#6B6B6B" }}>
          Fully Insured · CCUS Certified
        </p>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
