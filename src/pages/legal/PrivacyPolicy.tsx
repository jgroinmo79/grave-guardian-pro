import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background px-6 py-16 sm:py-24">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="font-cinzel tracking-[0.15em] uppercase text-sm text-bronze hover:text-bronze-light">
        ← Back
      </Link>
      <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mt-8 mb-10 text-foreground">
        Privacy Policy
      </h1>
      <div className="font-garamond text-lg sm:text-xl leading-relaxed text-foreground space-y-6">
        <p>
          Grave Detail Cleaning &amp; Preservation ("I," "me," "my") respects your privacy. This policy explains what information I collect and how I use it.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Information I collect</span>
          Name, phone number, email address, mailing/service address, and payment information when you request a quote, book a service, or make a payment. If you submit photos of a monument or gravesite, I retain those for documentation and quality purposes.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">How I use it</span>
          To schedule and perform services, process payments, communicate with you about your job, and maintain photo documentation of work performed. I do not sell or share your personal information with third parties, except as required to process payments (e.g., Stripe) or as required by law.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Photo documentation</span>
          Before/after photos taken during service may be used for internal records and, with discretion, for portfolio or marketing purposes. Contact me directly if you'd prefer your photos not be used publicly.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Data security</span>
          Payment processing is handled by Stripe; I do not store your full payment card details.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Contact</span>
          Questions about this policy can be directed to <a href="mailto:info@gravedetail.net" className="text-bronze underline">info@gravedetail.net</a> or <a href="tel:5735455759" className="text-bronze underline">573-545-5759</a>.
        </p>
        <p className="italic text-granite">Last updated: July 2026</p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
