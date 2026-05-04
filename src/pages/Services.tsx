import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { MONUMENT_PRICES, TRAVEL_ZONES, MAINTENANCE_PLANS, MAINTENANCE_PLAN_PRICES, FLOWER_PLANS, FLOWER_PLAN_PRICES, FLOWER_ONLY_PLANS, SERVICE_FEATURES } from "@/lib/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const travelZones = TRAVEL_ZONES.map(z => [z.label.split(" ")[0] + " " + z.label.split(" ")[1], z.label.match(/\((.+)\)/)?.[1] ?? "", z.feeLabel]);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto text-center mb-12">
    <h2 className="font-cinzel text-3xl font-bold mb-4 sm:text-7xl" style={{ color: "#E8E4DF" }}>{title}</h2>
    <p className="font-garamond text-2xl" style={{ color: "#6B6B6B" }}>{subtitle}</p>
  </motion.div>
);

const Services = () => {
  const monumentList = Object.entries(MONUMENT_PRICES).map(([, v]) => [v.label, `$${v.price}`]);

  const maintenancePlans = Object.entries(MAINTENANCE_PLANS).map(([key, plan]) => ({
    name: `${plan.visits} Cleanings / Year`,
    visits: plan.description,
    price: `$${MAINTENANCE_PLAN_PRICES.single_upright[key]}/year`,
  }));

  const flowerPlans = Object.entries(FLOWER_PLANS).map(([key, plan]) => ({
    name: `${plan.cleanings} Cleaning${plan.cleanings > 1 ? 's' : ''} + ${plan.flowers} Flower${plan.flowers > 1 ? 's' : ''} / Year`,
    desc: plan.description,
    price: `$${FLOWER_PLAN_PRICES.single_upright[key]}/year`,
  }));

  return (
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

      {/* One-Time Cleaning */}
      <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
        <SectionHeading title="One-Time Monument Cleaning" subtitle="A single thorough cleaning for any monument type." />
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Price list */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
            className="rounded-lg p-8" style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
            <h3 className="font-cinzel tracking-[0.1em] uppercase mb-4 text-xl font-semibold" style={{ color: "#E8E4DF" }}>Pricing by Monument</h3>
            <div className="space-y-2">
              {monumentList.map(([name, price]) => (
                <div key={name} className="flex justify-between font-garamond text-lg text-secondary-foreground" style={{ color: "#E8E4DF" }}>
                  <span>{name}</span>
                  <span style={{ color: "#C9976B" }}>{price}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* What's included */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-lg p-8" style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
            <h3 className="font-cinzel tracking-[0.1em] uppercase mb-4 text-xl font-semibold" style={{ color: "#E8E4DF" }}>What's Included</h3>
            <ul className="space-y-3">
              {SERVICE_FEATURES.map((feat) => (
                <li key={feat} className="font-garamond text-lg text-secondary-foreground flex items-start gap-2" style={{ color: "#E8E4DF" }}>
                  <span className="mt-1 shrink-0" style={{ color: "#C9976B" }}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Annual Maintenance Plans */}
      <section className="px-6 py-20" style={{ backgroundColor: "#141414" }}>
        <SectionHeading title="Annual Maintenance Plans" subtitle="Recurring cleanings so your monument stays pristine year-round." />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {maintenancePlans.map((plan, i) => (
            <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.15 }}>
              <Link to="/auth" aria-label={`Book ${plan.name}`}
                className="block rounded-lg p-8 relative h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                style={{ backgroundColor: "#2C2C2C", border: `${i === 1 ? "2px" : "1px"} solid ${i === 1 ? "#C9976B" : "#3a3a3a"}` }}>
                {i === 1 && (
                  <span className="absolute top-4 right-4 font-cinzel text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-full" style={{ backgroundColor: "#C9976B", color: "#141414" }}>
                    Most Popular
                  </span>
                )}
                <h3 className="font-cinzel tracking-[0.1em] uppercase mb-1 text-xl font-semibold" style={{ color: "#E8E4DF" }}>{plan.name}</h3>
                <p className="font-cinzel text-xl font-semibold text-primary mb-1" style={{ color: "#C9976B" }}>{plan.price}</p>
                <p className="font-garamond leading-relaxed text-lg" style={{ color: "#6B6B6B" }}>{plan.visits}</p>
                <p className="font-garamond text-xs italic mb-3" style={{ color: "#6B6B6B" }}>
                  Price shown for Single Upright. Prices vary by monument type.
                </p>
                <p className="font-cinzel tracking-[0.15em] uppercase text-lg font-normal" style={{ color: "#C9976B" }}>Select Plan →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-10 rounded-lg p-6" style={{ backgroundColor: "#2C2C2C", border: "1px solid #3a3a3a" }}>
            <p className="font-garamond leading-relaxed text-lg italic text-center" style={{ color: "#6B6B6B" }}>
            All plans include damage documentation, condition reports, and priority scheduling. Visits are spaced evenly throughout the year for year-round preservation.
          </p>
        </motion.div>
      </section>

      {/* Cleaning + Flower Plans */}
      <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
        <SectionHeading title="Cleaning + Flower Plans" subtitle="Combined monument care and artificial flower placements." />
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {flowerPlans.map((plan, i) => (
            <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.12 }}>
              <Link to="/auth" aria-label={`Book ${plan.name}`}
                className="block rounded-lg p-8 h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
                <h3 className="font-cinzel tracking-[0.1em] uppercase text-2xl mb-1" style={{ color: "#E8E4DF" }}>{plan.name}</h3>
                <p className="font-cinzel text-xl font-semibold text-primary mb-2" style={{ color: "#C9976B" }}>{plan.price}</p>
                <p className="font-garamond leading-relaxed text-lg mb-3" style={{ color: "#6B6B6B" }}>{plan.desc}</p>
                <p className="font-garamond text-xs italic mb-3" style={{ color: "#6B6B6B" }}>
                  Price shown for Single Upright. Prices vary by monument type.
                </p>
                <p className="font-cinzel tracking-[0.15em] uppercase text-lg font-normal" style={{ color: "#C9976B" }}>Select Plan →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-10 rounded-lg p-6" style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}>
          <p className="font-garamond leading-relaxed text-lg italic text-center" style={{ color: "#6B6B6B" }}>
            Choose placement dates from: Easter, Memorial Day, Mother's Day, Father's Day, Christmas, Deceased's Birthday, or Deceased's Anniversary. Cleaning visits are paired with flower placements when possible.
          </p>
        </motion.div>
      </section>

      {/* Flower-Only Plans */}
      <section className="px-6 py-20" style={{ backgroundColor: "#141414" }}>
        <SectionHeading title="Flower-Only Plans" subtitle="Standalone artificial flower placements — no cleaning included." />
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FLOWER_ONLY_PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <Link to="/auth" aria-label={`Book ${plan.label}`}
                className="block rounded-lg p-6 text-center h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                style={{ backgroundColor: "#2C2C2C", border: "1px solid #3a3a3a" }}>
                <h3 className="font-cinzel tracking-[0.1em] uppercase text-2xl mb-1" style={{ color: "#E8E4DF" }}>{plan.label}</h3>
                <p className="font-cinzel text-lg font-bold" style={{ color: "#C9976B" }}>${plan.price}</p>
                <p className="font-garamond text-xs mt-2 mb-3" style={{ color: "#6B6B6B" }}>{plan.placements} placement{plan.placements > 1 ? "s" : ""}/year</p>
                <p className="font-cinzel tracking-[0.15em] uppercase text-lg font-normal" style={{ color: "#C9976B" }}>Select →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="font-garamond text-lg text-secondary-foreground italic text-center mt-6" style={{ color: "#6B6B6B" }}>Travel fee applies to all flower-only plans.</p>
      </section>

      {/* Travel Zones */}
      <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
        <SectionHeading title="Travel Zones" subtitle="Based on distance from Benton, Missouri." />
        <div className="max-w-2xl mx-auto rounded-lg overflow-hidden" style={{ border: "1px solid #3a3a3a" }}>
          {travelZones.map(([zone, dist, fee], i) => (
            <div key={zone} className="flex justify-between px-6 py-4 font-garamond text-lg text-secondary-foreground"
              style={{ backgroundColor: i % 2 === 0 ? "#141414" : "#1e1e1e", color: "#E8E4DF" }}>
              <span className="font-cinzel tracking-[0.1em] uppercase text-lg font-normal" style={{ color: "#E8E4DF" }}>{zone}</span>
              <span style={{ color: "#6B6B6B" }}>{dist}</span>
              <span style={{ color: "#C9976B" }}>{fee}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20" style={{ backgroundColor: "#141414" }}>
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
};

export default Services;