import { Link } from "react-router-dom";

const RefundPolicy = () => (
  <div className="min-h-screen bg-background px-6 py-16 sm:py-24">
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="font-cinzel tracking-[0.15em] uppercase text-sm text-bronze hover:text-bronze-light">
        ← Back
      </Link>
      <h1 className="font-cinzel text-4xl sm:text-5xl font-bold mt-8 mb-10 text-foreground">
        Refund &amp; Cancellation Policy
      </h1>
      <div className="font-garamond text-lg sm:text-xl leading-relaxed text-foreground space-y-6">
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Cancellations by you</span>
          If you need to cancel or reschedule, contact me as soon as possible. Cancellations made before work has begun are not charged.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Cancellations by me</span>
          If I need to cancel a scheduled job before work begins (weather, emergency, etc.), you will receive a full refund of any deposit or payment made, or the option to reschedule.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Once work has begun</span>
          Because monument cleaning is a manual, on-site service, no refunds are issued once work has been performed. If you have concerns about the work performed, contact me directly and I will address them.
        </p>
        <p>
          <span className="font-cinzel tracking-[0.1em] uppercase text-bronze block mb-2">Deposits</span>
          If a deposit is required to hold a scheduling slot, it will be applied to the final invoice.
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

export default RefundPolicy;
