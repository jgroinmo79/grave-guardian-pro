import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { MONUMENT_PRICES, MAINTENANCE_PLANS, MAINTENANCE_PLAN_PRICES, FLOWER_PLANS, FLOWER_PLAN_PRICES, FLOWER_ONLY_PLANS, SERVICE_FEATURES } from "@/lib/pricing";
import { useTravelZones } from "@/hooks/useTravelZones";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto text-center mb-12">
    <h2 className="font-cinzel text-3xl font-bold mb-4 sm:text-7xl text-foreground">{title}</h2>
    <p className="font-garamond text-2xl text-granite">{subtitle}</p>
  </motion.div>
);

const Services = () => {
  const { data: zoneConfig } = useTravelZones();
  const travelZones = (zoneConfig?.zones ?? []).map((z) => {
    const distMatch = z.label.match(/\((.+)\)/);
    const zoneName = z.label.split(" (")[0] || `Zone ${z.zone_number}`;
    return [zoneName, distMatch?.[1] ?? "", z.fee_label];
  });
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
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="px-6 py-24 sm:py-32 text-center bg-background">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6 text-foreground">Our Services</h1>
          <p className="font-garamond text-xl italic text-granite">
            Professional monument cleaning, annual care plans, and flower placement.
          </p>
        </motion.div>
      </section>

      {/* One-Time Cleaning */}
      <section className="px-6 py-20 bg-card">
        <SectionHeading title="One-Time Monument Cleaning" subtitle="A single thorough cleaning for any monument type." />
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Price list */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
            className="rounded-lg p-8 bg-background border border-border">
            <h3 className="font-cinzel tracking-[0.1em] uppercase mb-4 text-xl font-semibold text-foreground">Pricing by Monument</h3>
            <div className="space-y-2">
              {monumentList.map(([name, price]) => (
                <div key={name} className="flex justify-between font-garamond text-lg text-foreground">
                  <span>{name}</span>
                  <span className="text-bronze">{price}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* What's included */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-lg p-8 bg-background border border-border">
            <h3 className="font-cinzel tracking-[0.1em] uppercase mb-4 text-xl font-semibold text-foreground">What's Included</h3>
            <ul className="space-y-3">
              {SERVICE_FEATURES.map((feat) => (
                <li key={feat} className="font-garamond text-lg text-foreground flex items-start gap-2">
                  <span className="mt-1 shrink-0 text-bronze">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Annual Maintenance Plans */}
      <section className="px-6 py-20 bg-background">
        <SectionHeading title="Annual Maintenance Plans" subtitle="Recurring cleanings so your monument stays pristine year-round." />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {maintenancePlans.map((plan, i) => (
            <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.15 }}>
              <Link to="/auth" aria-label={`Book ${plan.name}`}
                className={`block rounded-lg p-8 relative h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer bg-card ${i === 1 ? "border-2 border-bronze" : "border border-border"}`}>
                {i === 1 && (
                  <span className="absolute top-4 right-4 font-cinzel text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-full bg-bronze text-background">
                    Most Popular
                  </span>
                )}
                <h3 className="font-cinzel tracking-[0.1em] uppercase mb-1 text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="font-cinzel text-xl font-semibold mb-1 text-bronze">{plan.price}</p>
                <p className="font-garamond leading-relaxed text-2xl text-granite">{plan.visits}</p>
                <p className="font-garamond italic mb-3 text-lg text-granite">
                  Price shown for Single Upright. Prices vary by monument type.
                </p>
                <p className="font-cinzel tracking-[0.15em] uppercase font-normal text-2xl text-bronze">Select Plan →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-10 rounded-lg p-6 bg-card border border-border">
            <p className="font-garamond leading-relaxed text-2xl italic text-center text-granite">
            All plans include damage documentation, condition reports, and priority scheduling. Visits are spaced evenly throughout the year for year-round preservation.
          </p>
        </motion.div>
      </section>

      {/* Cleaning + Flower Plans */}
      <section className="px-6 py-20 bg-card">
        <SectionHeading title="Cleaning + Flower Plans" subtitle="Combined monument care and artificial flower placements." />
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {flowerPlans.map((plan, i) => (
            <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.12 }}>
              <Link to="/auth" aria-label={`Book ${plan.name}`}
                className="block rounded-lg p-8 h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer bg-background border border-border">
                <h3 className="font-cinzel tracking-[0.1em] uppercase text-2xl mb-1 text-foreground">{plan.name}</h3>
                <p className="font-cinzel text-xl font-semibold mb-2 text-bronze">{plan.price}</p>
                <p className="font-garamond leading-relaxed text-2xl mb-3 text-granite">{plan.desc}</p>
                <p className="font-garamond italic mb-3 text-lg text-granite">
                  Price shown for Single Upright. Prices vary by monument type.
                </p>
                <p className="font-cinzel tracking-[0.15em] uppercase font-normal text-2xl text-bronze">Select Plan →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-10 rounded-lg p-6 bg-background border border-border">
          <p className="font-garamond leading-relaxed text-2xl italic text-center text-granite">
            Choose placement dates from: Easter, Memorial Day, Mother's Day, Father's Day, Christmas, Deceased's Birthday, or Deceased's Anniversary. Cleaning visits are paired with flower placements when possible.
          </p>
        </motion.div>
      </section>

      {/* Flower-Only Plans */}
      <section className="px-6 py-20 bg-background">
        <SectionHeading title="Flower-Only Plans" subtitle="Standalone artificial flower placements — no cleaning included." />
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FLOWER_ONLY_PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <Link to="/auth" aria-label={`Book ${plan.label}`}
                className="block rounded-lg p-6 text-center h-full transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer bg-card border border-border">
                <h3 className="font-cinzel tracking-[0.1em] uppercase text-2xl mb-1 text-foreground">{plan.label}</h3>
                <p className="font-cinzel text-lg font-bold text-bronze">${plan.price}</p>
                <p className="font-garamond text-xs mt-2 mb-3 text-granite">{plan.placements} placement{plan.placements > 1 ? "s" : ""}/year</p>
                <p className="font-cinzel tracking-[0.15em] uppercase font-normal text-2xl text-bronze">Select →</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="font-garamond text-lg italic text-center mt-6 text-granite">Travel fee applies to all flower-only plans.</p>
      </section>

      {/* Travel Zones */}
      <section className="px-6 py-20 bg-card">
        <SectionHeading title="Travel Zones" subtitle="Based on distance from Benton, Missouri." />
        <div className="max-w-2xl mx-auto rounded-lg overflow-hidden border border-border">
          {travelZones.map(([zone, dist, fee], i) => (
            <div key={zone} className={`flex justify-between px-6 py-4 font-garamond text-lg text-foreground ${i % 2 === 0 ? "bg-background" : "bg-[hsl(0_0%_12%)]"}`}>
              <span className="font-cinzel tracking-[0.1em] uppercase text-lg font-normal text-foreground">{zone}</span>
              <span className="text-granite">{dist}</span>
              <span className="text-bronze">{fee}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-background">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-foreground">Know what you need?</h2>
          <Link to="/auth" className="inline-block font-cinzel text-sm tracking-[0.15em] uppercase px-8 py-4 rounded transition-colors bg-bronze text-background hover:bg-patina">
            Book Now
          </Link>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Services;
