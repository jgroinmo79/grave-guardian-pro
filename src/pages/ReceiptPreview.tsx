import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import ReceiptDocument, {
  ReceiptDocumentProps,
} from "@/components/receipt/ReceiptDocument";

const sample: ReceiptDocumentProps = {
  receiptNumber: "GD-0247",
  receiptDate: "May 6, 2026",
  customerName: "Margaret Hollister",
  customerPhone: "(573) 555-0182",
  customerEmail: "m.hollister@email.com",
  serviceDate: "May 4, 2026",
  cemetery: "Mount Olive Cemetery",
  cityState: "Cape Girardeau, MO",
  decedent: "Walter J. Hollister  (1924–1998)",
  sectionLot: "Section 4 / Lot 17",
  lineItems: [
    {
      description:
        "Single Upright Monument Cleaning — Endurance Restoration",
      qty: 1,
      rate: 175.0,
      amount: 175.0,
    },
    {
      description: "The Finer Detail Sympathy Arrangement Placement",
      qty: 1,
      rate: 129.99,
      amount: 129.99,
    },
    {
      description: "Photo Documentation — Before / After",
      qty: 1,
      rate: 0.0,
      amount: 0.0,
    },
  ],
  subtotal: 304.99,
  travelFee: 35.0,
  discount: 0,
  total: 339.99,
  paymentMethod: "card",
  notes:
    "Family requested early-morning service for Memorial Day visitation. Photos delivered via email and SMS.",
};

const ReceiptPreview = () => {
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#141414",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <PDFDownloadLink
          document={<ReceiptDocument {...sample} />}
          fileName="GraveDetail_Receipt_GD-0247.pdf"
          style={{
            backgroundColor: "#C9976B",
            color: "#FAF8F5",
            padding: "8px 16px",
            borderRadius: 4,
            textDecoration: "none",
            fontFamily: "sans-serif",
            fontSize: 14,
          }}
        >
          {({ loading }) =>
            loading ? "Preparing PDF…" : "Download Sample Receipt PDF"
          }
        </PDFDownloadLink>
      </div>
      <PDFViewer style={{ width: "100%", flex: 1, border: "none" }}>
        <ReceiptDocument {...sample} />
      </PDFViewer>
    </div>
  );
};

export default ReceiptPreview;
