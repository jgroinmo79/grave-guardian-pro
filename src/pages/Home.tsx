import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Award, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";

import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staticGallery = [
  { src: gallery1, alt: "Schwitz monument name detail — before and after cleaning" },
  { src: gallery2, alt: "Theodore W.A. Schwitz headstone — before and after cleaning" },
  { src: gallery3, alt: "Karen S. Davis bronze marker — before and after cleaning" },
  { src: gallery4, alt: "Harold Eugene Grogan headstone — before and after cleaning" },
];

const Home = () => {
  const { data: dbPhotos } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const galleryItems = [
    ...staticGallery,
    ...(dbPhotos || []).map((p) => ({ src: p.photo_url, alt: p.alt_text })),
  ];

  return (
    <div className="min-h-screen">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative px-6 py-28 sm:py-40 text-center">
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(20,20,20,0.65)" }} />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <h1 className="font-cinzel text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: "#E8E4DF" }}>
            Time Takes a Toll.<br />We Take It Back.
          </h1>
          <p className="font-garamond text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: "#6B6B6B" }}>
            Owner-operated cemetery monument cleaning and preservation serving Missouri, Illinois, Arkansas, Tennessee, and Kentucky.
          </p>
          <Link
            to="/auth"
            className="inline-block font-cinzel text-sm tracking-[0.15em] uppercase px-8 py-4 rounded transition-colors"
            style={{ backgroundColor: "#C9976B", color: "#141414" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}
          >
            Book a Cleaning
          </Link>
        </motion.div>
      </section>

      {/* Three-card feature section */}
      <section id="about" className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#2C2C2C" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Award className="w-8 h-8" style={{ color: "#C9976B" }} />,
              title: "CCUS-Certified Methods",
              desc: "Industry-standard preservation techniques that protect your monument.",
            },
            {
              icon: <UserCheck className="w-8 h-8" style={{ color: "#C9976B" }} />,
              title: "Owner-Operated",
              desc: "Every stone is personally cleaned by the business owner. No contractors, no shortcuts.",
            },
            {
              icon: <Shield className="w-8 h-8" style={{ color: "#C9976B" }} />,
              title: "Fully Insured",
              desc: "Protected by $1,000,000 in general liability coverage.",
            },
          ].map((card) => (
            <motion.div
              key={card.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="rounded-lg p-8 text-center space-y-4"
              style={{ backgroundColor: "#141414", border: "1px solid #3a3a3a" }}
            >
              <div className="flex justify-center">{card.icon}</div>
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

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#141414" }}>
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#E8E4DF" }}>
            How It Works
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { num: "1", title: "Book Online", desc: "Choose your service and monument type." },
            { num: "2", title: "We Confirm", desc: "You'll hear from us within 24 hours to schedule." },
            { num: "3", title: "We Deliver", desc: "Cleaned, photographed, and documented." },
          ].map((step) => (
            <motion.div
              key={step.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.6, delay: Number(step.num) * 0.15 }}
              className="text-center space-y-3"
            >
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-full font-cinzel text-lg font-bold"
                style={{ backgroundColor: "#C9976B", color: "#141414" }}
              >
                {step.num}
              </span>
              <h3 className="font-cinzel text-base tracking-[0.1em] uppercase" style={{ color: "#E8E4DF" }}>
                {step.title}
              </h3>
              <p className="font-garamond text-sm leading-relaxed" style={{ color: "#6B6B6B" }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#141414" }}>
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#E8E4DF" }}>
            Our Work
          </h2>
          <p className="font-garamond text-lg" style={{ color: "#6B6B6B" }}>
            Before &amp; after — every stone tells a story.
          </p>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((img, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.6, delay: (i % 3) * 0.15 }}
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid #3a3a3a" }}
            >
              <img src={img.src} alt={img.alt} className="w-full h-auto" loading="lazy" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#141414" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center space-y-6"
        >
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold" style={{ color: "#E8E4DF" }}>
            Get in Touch
          </h2>
          <p className="font-garamond text-lg leading-relaxed" style={{ color: "#6B6B6B" }}>
            Have questions or ready to schedule? Reach out anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="tel:+15735455759"
              className="font-garamond text-lg transition-colors"
              style={{ color: "#C9976B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7A5C3E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C9976B")}
            >
              (573) 545-5759
            </a>
            <span className="hidden sm:inline font-garamond" style={{ color: "#3a3a3a" }}>·</span>
            <a
              href="mailto:info@gravedetail.net"
              className="font-garamond text-lg transition-colors"
              style={{ color: "#C9976B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7A5C3E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C9976B")}
            >
              info@gravedetail.net
            </a>
          </div>
        </motion.div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 py-20" style={{ backgroundColor: "#2C2C2C" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center space-y-8"
        >
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold" style={{ color: "#E8E4DF" }}>
            Ready to restore what time has taken?
          </h2>
          <Link
            to="/auth"
            className="inline-block font-cinzel text-sm tracking-[0.15em] uppercase px-8 py-4 rounded transition-colors"
            style={{ backgroundColor: "#C9976B", color: "#141414" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}
          >
            Get Started
          </Link>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Home;
