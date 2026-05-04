import { motion } from "framer-motion";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const Section = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <div className="mt-12 first:mt-0">
    <h2 className="font-cinzel text-3xl font-bold sm:text-5xl mb-8" style={{ color: "#E8E4DF" }}>
      {heading}
    </h2>
    <div className="font-garamond text-xl leading-relaxed space-y-6" style={{ color: "#E8E4DF" }}>
      {children}
    </div>
  </div>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-cinzel tracking-[0.1em] uppercase text-lg mt-6" style={{ color: "#C9976B" }}>
    {children}
  </h3>
);

const LegalDisclosures = () => (
  <div className="min-h-screen" style={{ backgroundColor: "#141414" }}>
    <PublicNavbar />

    {/* Hero */}
    <section className="px-6 py-24 sm:py-32 text-center" style={{ backgroundColor: "#141414" }}>
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
        <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mb-6" style={{ color: "#E8E4DF" }}>
          Legal Disclosures
        </h1>
        <p className="font-garamond text-xl sm:text-2xl italic" style={{ color: "#6B6B6B" }}>
          Version 1.0 — Effective May 3, 2026
        </p>
      </motion.div>
    </section>

    {/* Body */}
    <section className="px-6 py-20 sm:py-28" style={{ backgroundColor: "#2C2C2C" }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">

        <Section heading="Terms of Service">
          <p>
            These Terms of Service govern all services provided by Grave Detail Cleaning &amp; Preservation LLC ("Grave Detail," "we," "us"), a Missouri limited liability company, to the customer ("you"). By booking a service you agree to these terms in full.
          </p>
          <SubHeading>Services</SubHeading>
          <p>
            Grave Detail provides cemetery monument cleaning, preservation, and flower placement services within our designated service area. All work is performed personally by the business owner. We reserve the right to refuse, reschedule, or discontinue any job at our discretion, including but not limited to conditions that pose a safety risk, access restrictions, or monument condition that makes safe cleaning impossible.
          </p>
          <SubHeading>Scheduling &amp; Access</SubHeading>
          <p>
            You are responsible for ensuring that the cemetery or site is accessible on the scheduled date and that no permits or permissions are required beyond those you have already obtained. Grave Detail is not responsible for delays caused by cemetery closures, weather, or restricted access.
          </p>
          <SubHeading>Photo Documentation</SubHeading>
          <p>
            All jobs are documented with before and after photographs for quality assurance purposes. By booking a service you consent to Grave Detail using these photographs for portfolio, marketing, and social media purposes. Photographs will not identify living persons without separate consent.
          </p>
          <SubHeading>Accuracy of Information</SubHeading>
          <p>
            You agree to provide accurate information about the monument, its location, and its condition at the time of booking. Inaccurate descriptions that result in additional labor, travel, or materials may result in adjusted pricing prior to work beginning.
          </p>
          <SubHeading>Governing Law</SubHeading>
          <p>
            These terms are governed by the laws of the State of Missouri.
          </p>
        </Section>

        <Section heading="Liability Waiver & Limitation of Liability">
          <SubHeading>Pre-Existing Conditions</SubHeading>
          <p>
            Cemetery monuments are subject to years or decades of weathering, biological growth, structural stress, and environmental damage. Pre-existing cracks, spalling, flaking, deterioration, instability, or fragility may not be visible prior to cleaning. Grave Detail performs a visual assessment before beginning work, but cannot guarantee detection of all subsurface or hidden damage.
          </p>
          <SubHeading>Assumption of Risk</SubHeading>
          <p>
            You acknowledge that cleaning, preservation, and restoration work on deteriorated stone carries inherent risk. Grave Detail is not liable for damage to monuments that results from or is revealed by the cleaning process where such damage is attributable to pre-existing conditions, material failure, or deterioration beyond the scope of normal wear.
          </p>
          <SubHeading>Limitation of Liability</SubHeading>
          <p>
            In no event shall Grave Detail's total liability to you exceed the amount paid for the specific service performed on the affected monument. Grave Detail is not liable for indirect, incidental, or consequential damages of any kind.
          </p>
          <SubHeading>Insurance</SubHeading>
          <p>
            Grave Detail carries $1,000,000 in general liability insurance. This coverage exists for legitimate claims arising from our negligence, not for pre-existing monument conditions.
          </p>
          <SubHeading>Your Acknowledgment</SubHeading>
          <p>
            By proceeding with booking you confirm that you have the legal right to authorize services on the monument in question, that you understand the risks described above, and that you release Grave Detail from liability for damage attributable to pre-existing conditions.
          </p>
        </Section>

        <Section heading="Cancellation & Refund Policy">
          <SubHeading>Customer Cancellations</SubHeading>
          <p>
            Cancellations made more than 48 hours before the scheduled service date are eligible for a full refund. Cancellations made within 48 hours of the scheduled service date are subject to a $50 cancellation fee to cover scheduling and travel planning costs. Cancellations made after we have departed for the job site are non-refundable.
          </p>
          <SubHeading>Same-Day Cancellations &amp; No Access</SubHeading>
          <p>
            If we arrive at the job site and are unable to perform the service due to reasons within your control — including incorrect location information, cemetery access restrictions you were aware of, or monument condition materially different from what was described — the full service fee is non-refundable.
          </p>
          <SubHeading>Grave Detail Cancellations</SubHeading>
          <p>
            If we cancel a scheduled service for any reason, you will receive a full refund or the option to reschedule at no penalty. We will notify you as early as possible.
          </p>
          <SubHeading>Annual Plan Cancellations</SubHeading>
          <p>
            Annual plans represent a commitment for the full plan term. Once purchased, annual plans may only be cancelled within 60 days of the original purchase date or renewal date. Cancellation requests submitted outside of this window will not be accepted and no refund will be issued for the remaining term. To cancel, contact us directly at info@gravedetail.net before the 60-day window closes. Plans not cancelled within the window will renew automatically at the then-current rate.
          </p>
          <SubHeading>Flower Placement Services</SubHeading>
          <p>
            Flower orders that have been sourced and prepared for delivery are non-refundable. Cancellations prior to sourcing are eligible for a full refund.
          </p>
        </Section>

      </motion.div>
    </section>

    <PublicFooter />
  </div>
);

export default LegalDisclosures;
