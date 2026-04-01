import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import aboutOwner from "@/assets/about-owner.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const About = () => (
  <div className="min-h-screen" style={{ backgroundColor: "#141414" }}>
    <PublicNavbar />

    {/* Hero */}
    <section className="px-6 py-24 sm:py-32 text-center" style={{ backgroundColor: "#141414" }}>
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
        <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6" style={{ color: "#E8E4DF" }}>
          About Grave Detail
        </h1>
        <p className="font-garamond text-xl sm:text-2xl italic" style={{ color: "#6B6B6B" }}>
          One man. One mission. Every stone treated like family.
        </p>
      </motion.div>
    </section>

    {/* Our Story */}
    <section className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#2C2C2C" }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
        <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-8" style={{ color: "#E8E4DF" }}>
          Why This Exists.
        </h2>
        <p className="font-garamond text-lg leading-relaxed" style={{ color: "#E8E4DF" }}>
          Grave Detail was founded on a simple belief — the people we've lost deserve better than fading into neglect. Weathering, biological growth, and time take their toll on every monument. Most families don't know there's a safe, professional way to reverse it. That's where we come in.
          <br /><br />
          Every cleaning is performed personally by the business owner using CCUS-certified preservation methods. No contractors. No rushed jobs. No shortcuts. Just careful, methodical work that honors the stone and the story it carries.
        </p>
      </motion.div>
    </section>

    {/* Owner Photo */}
    <section className="px-6 py-16 sm:py-20" style={{ backgroundColor: "#141414" }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
        <img
          src={aboutOwner}
          alt="Owner of Grave Detail at a family cemetery"
          className="w-full rounded-lg shadow-xl"
          style={{ border: "1px solid #3a3a3a" }}
        />
      </motion.div>
    </section>

    {/* Values */}
    <section className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#141414" }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "Do No Harm", desc: "We follow cemetery preservation standards that protect the monument. No pressure washing. No harsh chemicals. Only proven, safe methods." },
          { title: "Transparency", desc: "You'll see exactly what was done — photos, documentation, and honest communication at every step." },
          { title: "Accountability", desc: "Owner-operated means one person is responsible for the quality of your experience. That's how it should be." },
        ].map((card) => (
          <motion.div
            key={card.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="rounded-lg p-8 text-center space-y-4"
            style={{ backgroundColor: "#2C2C2C", border: "1px solid #3a3a3a" }}
          >
            <h3 className="font-cinzel text-base tracking-[0.1em] uppercase" style={{ color: "#E8E4DF" }}>
              {card.title}
            </h3>
            <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Credentials strip */}
    <div className="px-6 py-6" style={{ borderTop: "1px solid #6B6B6B", backgroundColor: "#141414" }}>
      <p className="max-w-5xl mx-auto text-center font-cinzel text-xs tracking-[0.15em] uppercase" style={{ color: "#6B6B6B" }}>
        CCUS-Certified Methods · D/2 Biological Solution · $1,000,000 Liability Coverage · Serving Five States
      </p>
    </div>

    {/* CTA Banner */}
    <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-cinzel text-2xl sm:text-3xl font-bold" style={{ color: "#E8E4DF" }}>
          See what we can do.
        </h2>
        <Link
          to="/#gallery"
          className="inline-block font-cinzel text-sm tracking-[0.15em] uppercase px-8 py-4 rounded transition-colors"
          style={{ backgroundColor: "#C9976B", color: "#141414" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}
        >
          View Services
        </Link>
      </motion.div>
    </section>

    <PublicFooter />
  </div>
);

export default About;
