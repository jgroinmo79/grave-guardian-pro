import { Link } from "react-router-dom";

const TermsOfService = () => (
  <div className="min-h-screen bg-background px-6 py-16 sm:py-24">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="font-cinzel tracking-[0.15em] uppercase text-sm text-bronze hover:text-bronze-light">
        ← Back
      </Link>
      <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mt-8 mb-10 text-foreground">
        Terms of Service
      </h1>
      <div className="font-garamond text-lg sm:text-xl leading-relaxed text-foreground space-y-6">
        <p>
          By requesting or booking services through Grave Detail Cleaning &amp; Preservation, you agree to the following:
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Services</span>
          I provide cemetery monument cleaning and preservation services, performed personally, using methods aligned with NPS Preservation Brief 48 and the Secretary of the Interior's Standards for the Treatment of Historic Properties.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Quotes and pricing</span>
          Pricing is determined per monument based on size, condition, and required treatment. Quotes are provided before work begins and are valid for 30 days unless otherwise stated.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Scheduling</span>
          Services are scheduled in advance. Weather or site access issues may require rescheduling; I'll communicate any changes as soon as possible.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Condition of monuments</span>
          Many monuments show wear, prior damage, or structural issues unrelated to cleaning. I document monument condition with photos before beginning work. Some conditions (cracking, prior repairs, loose elements) may limit what cleaning can safely achieve; I'll always communicate this before proceeding.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Insurance</span>
          Grave Detail Cleaning &amp; Preservation carries $2,000,000 in general liability coverage.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Payment</span>
          Payment is due as agreed at booking or upon completion of work, processed securely through Stripe.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Limitation of liability</span>
          While I take every precaution using preservation-first methods, monument materials can be fragile or previously compromised in ways not visible before cleaning begins. I am not liable for pre-existing damage or conditions revealed during the cleaning process.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Contact</span>
          <a href="mailto:info@gravedetail.net" className="text-bronze underline">info@gravedetail.net</a> or <a href="tel:5735455759" className="text-bronze underline">573-545-5759</a>.
        </p>
        <p className="italic text-granite">Last updated: July 2026</p>
      </div>
    </div>
  </div>
);

export default TermsOfService;
