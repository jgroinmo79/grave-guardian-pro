import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { ChevronDown, ChevronUp } from "lucide-react";

const COLORS = {
  bg: "#141414",
  card: "#2C2C2C",
  text: "#E8E4DF",
  muted: "#6B6B6B",
  bronze: "#C9976B",
  bronzeAged: "#7A5C3E",
};

type MonumentCard = {
  slug: string;
  name: string;
  description: string;
  spotIt: string[];
  size: string;
  confused: string;
  illustration: JSX.Element;
};

const Illustration = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <svg viewBox="0 0 200 120" role="img" aria-label={label} className="w-full h-32">
    <rect width="200" height="120" fill={COLORS.bg} />
    <rect x="0" y="100" width="200" height="20" fill="#1f1f1f" />
    {children}
  </svg>
);

const MONUMENTS: MonumentCard[] = [
  {
    slug: "single-marker",
    name: "Single Marker",
    description: "A flat granite or bronze stone set level with the ground, marking one person.",
    spotIt: [
      "Lies flush with the grass; lawnmowers pass right over it",
      "Single name and dates only",
      "Roughly the size of a placemat",
    ],
    size: '24" × 12" × 4"',
    confused: 'Bevel markers (which sit 1–2" raised at the back)',
    illustration: (
      <Illustration label="Single flat marker">
        <rect x="60" y="96" width="80" height="8" fill={COLORS.bronze} rx="1" />
      </Illustration>
    ),
  },
  {
    slug: "double-marker",
    name: "Double Marker",
    description: "A flat companion stone marking two people side by side, set level with the ground.",
    spotIt: [
      "Flush with ground like a single marker, but noticeably wider",
      "Two names, typically a married couple",
      "Spans wide enough that two people can stand at it shoulder-to-shoulder",
    ],
    size: '44" × 14" × 4" (or 36" × 18" × 4")',
    confused: "Two adjacent single markers — a true double is one continuous stone",
    illustration: (
      <Illustration label="Double flat marker">
        <rect x="30" y="94" width="140" height="10" fill={COLORS.bronze} rx="1" />
      </Illustration>
    ),
  },
  {
    slug: "single-slant",
    name: "Single Slant",
    description: "An angled-face marker that tilts backward, designed to be read from standing height.",
    spotIt: [
      "Front face slopes back at roughly a 45° angle",
      "Sits on a small rectangular base",
      "You don't have to bend down to read it",
    ],
    size: '20" × 10" × 16" on a 24" × 14" base',
    confused: "Bevel markers (much shallower angle, sit lower)",
    illustration: (
      <Illustration label="Single slant marker">
        <rect x="60" y="92" width="80" height="10" fill={COLORS.bronzeAged} />
        <polygon points="70,92 130,92 120,55 80,55" fill={COLORS.bronze} />
      </Illustration>
    ),
  },
  {
    slug: "double-slant",
    name: "Double Slant",
    description: "A wider angled-face monument honoring two people, with the same backward tilt as a single slant.",
    spotIt: [
      "Same wedge profile as a single slant, but visibly wider",
      "Two names on the angled face",
      "Sits on a longer base",
    ],
    size: '36–48" wide × 10–12" deep × 16–18" tall',
    confused: "Wide single slants — count the names",
    illustration: (
      <Illustration label="Double slant marker">
        <rect x="30" y="92" width="140" height="10" fill={COLORS.bronzeAged} />
        <polygon points="40,92 160,92 150,55 50,55" fill={COLORS.bronze} />
      </Illustration>
    ),
  },
  {
    slug: "single-upright",
    name: "Single Upright",
    description: "A traditional vertical headstone standing on a separate granite base, marking one person.",
    spotIt: [
      "Stands fully upright; readable while walking past",
      "Two-piece construction: stone on top, base underneath",
      "Often arched, rounded, or peaked at the top",
    ],
    size: '24–36" wide × 24–36" tall × 4–6" thick',
    confused: "Tall slants — uprights stand fully vertical, slants tilt back",
    illustration: (
      <Illustration label="Single upright headstone">
        <rect x="55" y="92" width="90" height="10" fill={COLORS.bronzeAged} />
        <path d="M70 92 L70 40 Q100 18 130 40 L130 92 Z" fill={COLORS.bronze} />
      </Illustration>
    ),
  },
  {
    slug: "double-upright",
    name: "Double Upright",
    description: "A wider vertical headstone honoring two people, with both names on a single standing stone.",
    spotIt: [
      "Same upright profile as a single, but noticeably wider",
      "Two names side-by-side on the face",
      "Often the centerpiece of a family plot",
    ],
    size: '36–60" wide × 24–42" tall',
    confused: "Family monuments — doubles have two names; family monuments often have three or more",
    illustration: (
      <Illustration label="Double upright headstone">
        <rect x="25" y="92" width="150" height="10" fill={COLORS.bronzeAged} />
        <path d="M40 92 L40 40 Q100 14 160 40 L160 92 Z" fill={COLORS.bronze} />
      </Illustration>
    ),
  },
  {
    slug: "grave-ledger",
    name: "Grave Ledger",
    description: "A large horizontal stone that covers the entire grave footprint, often the most demanding to clean.",
    spotIt: [
      "Covers the full length of the grave plot — you walk around it, not over it",
      "Lies flat or slightly raised on a perimeter foundation",
      "Holds the most surface area of any monument type",
    ],
    size: '36" × 84" or larger',
    confused: "Companion flat markers — ledgers are dramatically larger and span the full burial space",
    illustration: (
      <Illustration label="Grave ledger">
        <rect x="15" y="88" width="170" height="14" fill={COLORS.bronze} rx="1" />
        <rect x="15" y="86" width="170" height="3" fill={COLORS.bronzeAged} />
      </Illustration>
    ),
  },
];

const FAQS = [
  {
    q: "What is the most common type of headstone?",
    a: "Single uprights are the traditional default; flat single markers have become more common in modern memorial parks due to maintenance regulations.",
  },
  {
    q: "How do I know if my monument is granite or bronze?",
    a: "Granite is solid stone throughout, usually grey, black, or rose-colored. Bronze markers are dark brown plaques mounted on a granite base; tap the surface — bronze rings dull, granite is silent.",
  },
  {
    q: "Why does monument type matter for cleaning?",
    a: "Each type has different surface area, angles, and water-pooling characteristics. Pricing and product application are calibrated by type to give you accurate quotes and proper care.",
  },
  {
    q: "What if my cemetery has unusual rules about monument cleaning?",
    a: "Grave Detail follows CCUS-certified methods accepted by virtually all cemetery offices. If your cemetery requires written approval, we provide our methodology documentation on request.",
  },
];

const MonumentCardEl = ({ m, defaultOpen }: { m: MonumentCard; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      id={m.slug}
      className="rounded-lg border scroll-mt-24"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.muted + "40" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-5 flex flex-col gap-3"
        aria-expanded={open}
      >
        <div className="rounded" style={{ backgroundColor: COLORS.bg }}>{m.illustration}</div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-cinzel text-2xl" style={{ color: COLORS.text }}>{m.name}</h3>
            <p className="font-garamond text-lg mt-1" style={{ color: COLORS.muted }}>{m.description}</p>
          </div>
          <span style={{ color: COLORS.bronze }} aria-hidden>
            {open ? <ChevronUp /> : <ChevronDown />}
          </span>
        </div>
        {!open && (
          <span className="font-cinzel text-xs tracking-widest md:hidden" style={{ color: COLORS.bronze }}>
            TAP TO LEARN MORE
          </span>
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 font-garamond" style={{ color: COLORS.text }}>
          <div>
            <p className="font-cinzel text-sm tracking-widest mb-2" style={{ color: COLORS.bronze }}>HOW TO SPOT IT</p>
            <ul className="list-disc pl-5 space-y-1 text-lg">
              {m.spotIt.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-lg">
            <div>
              <p className="font-cinzel text-sm tracking-widest mb-1" style={{ color: COLORS.bronze }}>TYPICAL SIZE</p>
              <p>{m.size}</p>
            </div>
            <div>
              <p className="font-cinzel text-sm tracking-widest mb-1" style={{ color: COLORS.bronze }}>OFTEN CONFUSED WITH</p>
              <p style={{ color: COLORS.muted }}>{m.confused}</p>
            </div>
          </div>
          <Link
            to={`/book?type=${m.slug}`}
            className="inline-block w-full sm:w-auto text-center font-cinzel tracking-widest px-6 py-3 rounded-md transition-colors"
            style={{ backgroundColor: COLORS.bronze, color: COLORS.bg }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.bronzeAged)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.bronze)}
          >
            BOOK THE FULL DETAIL FOR {m.name.toUpperCase()}
          </Link>
        </div>
      )}
    </div>
  );
};

const MonumentTypes = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "How to Identify Your Monument Type | Grave Detail";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(
      "description",
      "Identify your headstone or grave marker in under a minute. Visual guide to all 7 standard monument types — single markers, slants, uprights, ledgers, and more."
    );

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/monument-types`);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/home` },
          { "@type": "ListItem", position: 2, name: "Monument Types", item: `${window.location.origin}/monument-types` },
        ],
      },
    ]);
    document.head.appendChild(ld);
    return () => {
      document.title = prevTitle;
      ld.remove();
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: "100vh" }}>
      <PublicNavbar />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 max-w-4xl mx-auto text-center">
        <h1 className="font-cinzel font-bold text-4xl sm:text-6xl mb-6" style={{ color: COLORS.text }}>
          How to Identify Your Monument Type
        </h1>
        <p className="font-garamond text-xl sm:text-2xl mb-4" style={{ color: COLORS.muted }}>
          Seven monument types cover nearly every grave in American cemeteries. Use this guide to identify yours in under a minute — then book the right service with confidence.
        </p>
        <p className="font-garamond italic text-2xl mb-6" style={{ color: COLORS.bronze }}>
          Time Takes a Toll. We Take It Back.
        </p>
        <p className="font-cinzel text-xs tracking-widest" style={{ color: COLORS.muted }}>
          CCUS CERTIFIED METHODS · $1,000,000 LIABILITY INSURED · OWNER-OPERATED
        </p>
      </section>

      {/* Quick Decision Helper */}
      <section className="px-6 max-w-3xl mx-auto mb-16">
        <div
          className="rounded-lg p-6 border-2"
          style={{ backgroundColor: COLORS.card, borderColor: COLORS.bronze }}
        >
          <h2 className="font-cinzel text-2xl text-center mb-6" style={{ color: COLORS.text }}>
            Three Quick Questions
          </h2>
          <div className="space-y-3">
            {[
              { q: "Is the stone flat with the ground?", target: "single-marker" },
              { q: "Does it tilt back at an angle?", target: "single-slant" },
              { q: "Does it stand upright like a small wall?", target: "single-upright" },
            ].map((item) => (
              <button
                key={item.target}
                onClick={() => scrollTo(item.target)}
                className="w-full text-left font-garamond text-lg px-4 py-4 rounded-md border transition-colors min-h-[44px]"
                style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderColor: COLORS.muted + "60" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.bronze)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.muted + "60")}
              >
                {item.q} <span style={{ color: COLORS.bronze }}>→ Yes</span>
              </button>
            ))}
          </div>
          <p className="font-garamond text-center mt-5 text-lg" style={{ color: COLORS.muted }}>
            None of these? You may have a{" "}
            <button onClick={() => scrollTo("grave-ledger")} className="underline" style={{ color: COLORS.bronze }}>
              Grave Ledger
            </button>{" "}
            — see below.
          </p>
        </div>
      </section>

      {/* Monument cards */}
      <section className="px-6 max-w-3xl mx-auto space-y-5 pb-20">
        {MONUMENTS.map((m) => (
          <MonumentCardEl key={m.slug} m={m} defaultOpen={isDesktop} />
        ))}
      </section>

      {/* Still Not Sure */}
      <section className="px-6 pb-20">
        <div
          className="max-w-3xl mx-auto rounded-lg p-8 text-center"
          style={{ backgroundColor: COLORS.bronzeAged }}
        >
          <h2 className="font-cinzel text-3xl mb-4" style={{ color: COLORS.text }}>
            Still Not Sure What You Have?
          </h2>
          <p className="font-garamond text-xl mb-6" style={{ color: COLORS.text }}>
            Send us three photos — one straight-on, one from the side, and one with a tape measure across the front — and we'll identify the type and quote your service within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="sms:+15735455759"
              className="font-cinzel tracking-widest px-6 py-3 rounded-md min-h-[44px] inline-flex items-center justify-center"
              style={{ backgroundColor: COLORS.bronze, color: COLORS.bg }}
            >
              TEXT PHOTOS TO 573-545-5759
            </a>
            <a
              href="mailto:info@gravedetail.net"
              className="font-cinzel tracking-widest px-6 py-3 rounded-md border-2 min-h-[44px] inline-flex items-center justify-center"
              style={{ borderColor: COLORS.text, color: COLORS.text }}
            >
              EMAIL INFO@GRAVEDETAIL.NET
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="font-cinzel text-3xl text-center mb-8" style={{ color: COLORS.text }}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-lg border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.muted + "40" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-5 flex justify-between items-center min-h-[44px]"
                aria-expanded={openFaq === i}
              >
                <span className="font-cinzel text-lg" style={{ color: COLORS.text }}>{f.q}</span>
                <span style={{ color: COLORS.bronze }}>{openFaq === i ? <ChevronUp /> : <ChevronDown />}</span>
              </button>
              {openFaq === i && (
                <p className="px-5 pb-5 font-garamond text-lg" style={{ color: COLORS.muted }}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 pb-32 md:pb-20" style={{ backgroundColor: COLORS.bg }}>
        <div className="max-w-3xl mx-auto text-center py-12">
          <h2 className="font-cinzel text-4xl mb-4" style={{ color: COLORS.text }}>
            Ready to Restore Yours?
          </h2>
          <p className="font-garamond text-xl mb-6" style={{ color: COLORS.muted }}>
            One-time cleanings start at $135. Annual care plans start at $229. Owner-operated, photo-documented, fully insured.
          </p>
          <Link
            to="/book"
            className="inline-block font-cinzel tracking-widest px-8 py-4 rounded-md"
            style={{ backgroundColor: COLORS.bronze, color: COLORS.bg }}
          >
            BOOK YOUR SERVICE
          </Link>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 p-3 border-t z-40"
        style={{ backgroundColor: COLORS.bg, borderColor: COLORS.muted + "40" }}
      >
        <Link
          to="/book"
          className="block w-full text-center font-cinzel tracking-widest py-3 rounded-md"
          style={{ backgroundColor: COLORS.bronze, color: COLORS.bg }}
        >
          BOOK YOUR SERVICE
        </Link>
      </div>

      <PublicFooter />
    </div>
  );
};

export default MonumentTypes;
