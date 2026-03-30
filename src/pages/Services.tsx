import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const standardPrices = [
  ["Flat/Flush Marker", "$75"],
  ["Single Upright", "$100"],
  ["Double Upright", "$150"],
  ["Monument with Base", "$175"],
  ["Bronze Plaque", "$90"],
  ["Obelisk/Pillar", "$200"],
  ["Mausoleum Panel", "$175"],
];

const premiumPrices = [
  ["Flat/Flush Marker", "$125"],
  ["Single Upright", "$150"],
  ["Double Upright", "$200"],
  ["Monument with Base", "$225"],
  ["Bronze Plaque", "$140"],
  ["Obelisk/Pillar", "$250"],
  ["Mausoleum Panel", "$225"],
];

const travelZones = [
  ["Zone 1", "0–25 mi", "Free"],
  ["Zone 2", "26–50 mi", "$40"],
  ["Zone 3", "51–75 mi", "$70"],
  ["Zone 4", "76–100 mi", "$100"],
  ["Zone 5", "101–150 mi", "$150"],
  ["Zone 6", "150+ mi", "Custom Quote"],
];

const PriceList = ({ items }: { items: string[][] }) => (
  <div className="space-y-2 mt-4">
    {items.map(([name, price]) => (
      <div key={name} className="flex justify-between font-garamond text-sm" style={{ color: "#E8E4DF" }}>
        <span>{name}</span>
        <span style={{ color: "#C9976B" }}>{price}</span>
      </div>
    ))}
  </div>
);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto text-center mb-12">
    <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#E8E4DF" }}>{title}</h2>
    <p className="font-garamond text-lg" style={{ color: "#6B6B6B" }}>{subtitle}</p>
  </motion.div>
);

const Services = () => (
  <div className="min-h-screen" style={{ backgroundColor: "#141414" }}>
    <PublicNavbar />

    {/* Hero */}
    <section className="px-6 py-24 sm:py-32 text-center" style={{ backgroundColor: "#141414" }}>
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
        <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6" style={{ color: "#E8E4DF" }}>Our Services</h1>
        <p className="font-garamond text-xl italic" style={{ color: "#6B6B6B" }}>
          Professional monument cleaning, annual care plans, and flower placement.
        </p>
      </motion.div>
    </section>

    {/* One-Time Cleanings */}
    <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
      <SectionHeading title="One-Time Cleaning" subtitle="Choose Standard or Premium based on what your monument needs." />
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
          className="rounded-lg p-8" style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
          <h3 className="font-cinzel text-lg tracking-[0.1em] uppercase mb-2" style={{ color: "#E8E4DF" }}>Standard Clean</h3>
          <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>
            Thorough cleaning with Orvus WA Paste. Includes 4 photos and scheduling within 1 week.
          </p>
          <PriceList items={standardPrices} />
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-lg p-8 relative" style={{ backgroundColor: "#141414", border: "2px solid #C9976B" }}>
          <h3 className="font-cinzel text-lg tracking-[0.1em] uppercase mb-2" style={{ color: "#C9976B" }}>Premium Clean</h3>
          <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>
            Everything in Standard plus D/2 biological growth inhibitor, detailed condition report, and plot edging.
          </p>
          <PriceList items={premiumPrices} />
        </motion.div>
      </div>
    </section>

    {/* Annual Care Plans */}
    <section className="px-6 py-20" style={{ backgroundColor: "#141414" }}>
      <SectionHeading title="Annual Care Plans" subtitle="Set it and forget it. We return on schedule so you never have to worry." />
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: "The Keeper", price: "$475/year", desc: "One Premium cleaning per year with photos, condition report, and plot maintenance.", badge: null, border: "#3a3a3a" },
          { name: "The Sentinel", price: "$575/year", desc: "Two visits per year. Spring and fall cleanings with full documentation each visit.", badge: "Most Popular", border: "#C9976B" },
          { name: "The Legacy", price: "$1,200/year", desc: "Four quarterly visits. Full cleaning, seasonal flower placement, and priority scheduling.", badge: null, border: "#3a3a3a" },
        ].map((plan, i) => (
          <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.15 }}
            className="rounded-lg p-8 relative" style={{ backgroundColor: "#2C2C2C", border: `${plan.badge ? "2px" : "1px"} solid ${plan.border}` }}>
            {plan.badge && (
              <span className="absolute top-4 right-4 font-cinzel text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-full" style={{ backgroundColor: "#C9976B", color: "#141414" }}>
                {plan.badge}
              </span>
            )}
            <h3 className="font-cinzel text-lg tracking-[0.1em] uppercase mb-1" style={{ color: "#E8E4DF" }}>{plan.name}</h3>
            <p className="font-cinzel text-sm font-bold mb-3" style={{ color: "#C9976B" }}>{plan.price}</p>
            <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>{plan.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Flower Placement */}
    <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
      <SectionHeading title="Flower Placement" subtitle="Artificial arrangements delivered and placed with care." />
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: "Single Placement", price: "$100 + travel fee", desc: "One artificial arrangement placed at the monument on your chosen date." },
          { name: "Remembrance Trio", price: "$450", desc: "3 placements on your chosen dates (birthday, anniversary, holiday). Coordination included." },
          { name: "Memorial Year Plan", price: "$650/year", desc: "5 placements per year on your scheduled dates. Year-round remembrance." },
        ].map((item, i) => (
          <motion.div key={item.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.15 }}
            className="rounded-lg p-8" style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
            <h3 className="font-cinzel text-base tracking-[0.1em] uppercase mb-1" style={{ color: "#E8E4DF" }}>{item.name}</h3>
            <p className="font-cinzel text-sm font-bold mb-3" style={{ color: "#C9976B" }}>{item.price}</p>
            <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Travel Zones */}
    <section className="px-6 py-20" style={{ backgroundColor: "#141414" }}>
      <SectionHeading title="Travel Zones" subtitle="Based on distance from Benton, Missouri." />
      <div className="max-w-2xl mx-auto rounded-lg overflow-hidden" style={{ border: "1px solid #3a3a3a" }}>
        {travelZones.map(([zone, dist, fee], i) => (
          <div key={zone} className="flex justify-between px-6 py-4 font-garamond text-sm"
            style={{ backgroundColor: i % 2 === 0 ? "#2C2C2C" : "#1e1e1e", color: "#E8E4DF" }}>
            <span className="font-cinzel text-xs tracking-[0.1em] uppercase" style={{ color: "#E8E4DF" }}>{zone}</span>
            <span style={{ color: "#6B6B6B" }}>{dist}</span>
            <span style={{ color: "#C9976B" }}>{fee}</span>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-cinzel text-2xl sm:text-3xl font-bold" style={{ color: "#E8E4DF" }}>Know what you need?</h2>
        <Link to="/auth" className="inline-block font-cinzel text-sm tracking-[0.15em] uppercase px-8 py-4 rounded transition-colors"
          style={{ backgroundColor: "#C9976B", color: "#141414" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}>
          Book Now
        </Link>
      </motion.div>
    </section>

    <PublicFooter />
  </div>
);

export default Services;
