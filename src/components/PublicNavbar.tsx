import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/#about" },
  { label: "Services", to: "/#services" },
  { label: "Gallery", to: "/#gallery" },
  { label: "Contact", to: "/#contact" },
];

const PublicNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full" style={{ backgroundColor: "#141414", borderBottom: "1px solid #2C2C2C" }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="font-cinzel text-xl tracking-[0.2em] font-bold" style={{ color: "#E8E4DF" }}>
          GRAVE DETAIL
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="font-cinzel text-xs tracking-[0.15em] uppercase transition-colors"
              style={{ color: "#6B6B6B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/auth"
            className="font-cinzel text-xs tracking-[0.15em] uppercase px-5 py-2 rounded transition-colors"
            style={{ backgroundColor: "#C9976B", color: "#141414" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}
          >
            Book Now
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ color: "#E8E4DF" }}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 pb-6 space-y-4" style={{ backgroundColor: "#141414" }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block font-cinzel text-sm tracking-[0.15em] uppercase"
              style={{ color: "#6B6B6B" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            className="block text-center font-cinzel text-sm tracking-[0.15em] uppercase px-5 py-2 rounded"
            style={{ backgroundColor: "#C9976B", color: "#141414" }}
          >
            Book Now
          </Link>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
