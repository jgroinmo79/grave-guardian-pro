import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Cinzel",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/cinzel/static/Cinzel-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/cinzel/static/Cinzel-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: "Cormorant Garamond",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/cormorantgaramond/CormorantGaramond-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/cormorantgaramond/CormorantGaramond-Bold.ttf",
      fontWeight: 700,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/cormorantgaramond/CormorantGaramond-Italic.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

export interface ReceiptDocumentProps {
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceDate: string;
  cemetery: string;
  cityState: string;
  decedent?: string;
  sectionLot?: string;
  lineItems: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  travelFee?: number;
  discount?: number;
  total: number;
  paymentMethod?: "cash" | "check" | "card" | "online";
  notes?: string;
}

const POLISHED_BLACK = "#141414";
const RAW_GRANITE = "#2C2C2C";
const GREY_GRANITE = "#6B6B6B";
const BRIGHT_BRONZE = "#C9976B";
const AGED_BRONZE = "#7A5C3E";
const BONE_WHITE = "#FAF8F5";

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const s = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingBottom: 130 },
  topBar: { width: "100%", height: 13, backgroundColor: BRIGHT_BRONZE },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 12,
  },
  brand: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 26,
    color: POLISHED_BLACK,
    letterSpacing: 1,
  },
  tagSmall: {
    fontFamily: "Cinzel",
    fontSize: 9,
    color: AGED_BRONZE,
    letterSpacing: 2,
    marginTop: 4,
  },
  tagItalic: {
    fontFamily: "Cormorant Garamond",
    fontStyle: "italic",
    fontSize: 11,
    color: GREY_GRANITE,
    marginTop: 6,
  },
  receiptTitle: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 18,
    color: POLISHED_BLACK,
    letterSpacing: 1,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 14,
  },
  metaCell: { minWidth: 90 },
  metaLabel: {
    fontFamily: "Cinzel",
    fontSize: 8,
    color: GREY_GRANITE,
    letterSpacing: 1,
  },
  metaValue: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 700,
    fontSize: 11,
    color: POLISHED_BLACK,
    borderBottomWidth: 0.7,
    borderBottomColor: POLISHED_BLACK,
    paddingBottom: 2,
    marginTop: 2,
  },

  dividerWrap: { paddingHorizontal: 36, marginTop: 4 },
  dividerTop: { height: 2, backgroundColor: BRIGHT_BRONZE },
  dividerGap: { height: 4 },
  dividerBottom: { height: 0.4, backgroundColor: AGED_BRONZE },

  infoGrid: { paddingHorizontal: 36, marginTop: 16 },
  infoRow: { flexDirection: "row", marginBottom: 14, gap: 20 },
  infoCell: { flex: 1 },
  infoLabel: {
    fontFamily: "Cinzel",
    fontSize: 8,
    color: GREY_GRANITE,
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: "Cormorant Garamond",
    fontSize: 12,
    color: POLISHED_BLACK,
    borderBottomWidth: 0.6,
    borderBottomColor: RAW_GRANITE,
    paddingBottom: 3,
    marginTop: 3,
  },

  table: {
    marginHorizontal: 36,
    marginTop: 18,
    borderWidth: 0.9,
    borderColor: POLISHED_BLACK,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: POLISHED_BLACK,
    height: 22,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  th: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 9,
    color: BRIGHT_BRONZE,
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    height: 24,
    alignItems: "center",
    paddingHorizontal: 10,
    borderTopWidth: 0.3,
    borderTopColor: GREY_GRANITE,
  },
  td: {
    fontFamily: "Cormorant Garamond",
    fontSize: 11,
    color: POLISHED_BLACK,
  },
  colDesc: { width: "52%" },
  colQty: { width: "10%", textAlign: "center" },
  colRate: { width: "19%", textAlign: "right" },
  colAmt: { width: "19%", textAlign: "right" },
  vDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0.3,
    backgroundColor: GREY_GRANITE,
  },

  bottomSection: {
    flexDirection: "row",
    marginTop: 16,
    paddingHorizontal: 36,
  },
  notesCol: { flex: 1 },
  notesLabel: {
    fontFamily: "Cinzel",
    fontSize: 8,
    color: GREY_GRANITE,
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesBox: {
    borderWidth: 0.5,
    borderColor: GREY_GRANITE,
    height: 90,
    padding: 8,
  },
  notesText: {
    fontFamily: "Cormorant Garamond",
    fontSize: 10,
    color: POLISHED_BLACK,
  },

  totalsCol: { width: 200, marginLeft: 20 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  totalLabel: {
    fontFamily: "Cinzel",
    fontSize: 9,
    color: GREY_GRANITE,
    letterSpacing: 1,
  },
  totalValue: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 700,
    fontSize: 11,
    color: POLISHED_BLACK,
    borderBottomWidth: 0.6,
    borderBottomColor: RAW_GRANITE,
    paddingBottom: 2,
    minWidth: 80,
    textAlign: "right",
  },
  totalDueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: POLISHED_BLACK,
    padding: 8,
    marginTop: 10,
  },
  totalDueLabel: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 11,
    color: BRIGHT_BRONZE,
    letterSpacing: 1,
  },
  totalDueValue: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 700,
    fontSize: 14,
    color: BONE_WHITE,
    textAlign: "right",
  },

  payRow: {
    marginTop: 18,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  payLabel: {
    fontFamily: "Cinzel",
    fontSize: 8.5,
    color: GREY_GRANITE,
    letterSpacing: 1,
  },
  payOpt: { flexDirection: "row", alignItems: "center", gap: 6 },
  payBox: {
    width: 10,
    height: 10,
    borderWidth: 0.7,
    borderColor: POLISHED_BLACK,
  },
  payBoxFilled: { backgroundColor: POLISHED_BLACK },
  payOptLabel: {
    fontFamily: "Cinzel",
    fontSize: 8.5,
    color: POLISHED_BLACK,
    letterSpacing: 1,
  },

  sigRow: {
    marginTop: 30,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBlock: { width: 230 },
  sigLine: { height: 1, borderTopWidth: 0.7, borderTopColor: POLISHED_BLACK },
  sigLabel: {
    fontFamily: "Cinzel",
    fontSize: 7.5,
    color: GREY_GRANITE,
    letterSpacing: 1,
    marginTop: 4,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerThanks: {
    fontFamily: "Cormorant Garamond",
    fontStyle: "italic",
    fontSize: 12,
    color: AGED_BRONZE,
    textAlign: "center",
    paddingHorizontal: 36,
    marginBottom: 8,
  },
  badgeBar: {
    width: "100%",
    height: 22,
    backgroundColor: POLISHED_BLACK,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  badge: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 9,
    color: BRIGHT_BRONZE,
    letterSpacing: 1,
  },
  contactStrip: {
    paddingHorizontal: 36,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactBold: {
    fontFamily: "Cinzel",
    fontWeight: 700,
    fontSize: 9,
    color: POLISHED_BLACK,
  },
  contactReg: {
    fontFamily: "Cinzel",
    fontSize: 9,
    color: POLISHED_BLACK,
  },
  addrStrip: {
    paddingHorizontal: 36,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addrText: {
    fontFamily: "Cormorant Garamond",
    fontSize: 9.5,
    color: GREY_GRANITE,
  },
  bottomBronze: {
    width: "100%",
    height: 13,
    backgroundColor: BRIGHT_BRONZE,
    marginTop: 6,
  },
});

const PaymentOption = ({
  label,
  filled,
}: {
  label: string;
  filled: boolean;
}) => (
  <View style={s.payOpt}>
    <View style={[s.payBox, filled ? s.payBoxFilled : {}]} />
    <Text style={s.payOptLabel}>{label}</Text>
  </View>
);

const ReceiptDocument = (props: ReceiptDocumentProps) => {
  const {
    receiptNumber,
    receiptDate,
    customerName,
    customerPhone,
    customerEmail,
    serviceDate,
    cemetery,
    cityState,
    decedent,
    sectionLot,
    lineItems,
    subtotal,
    travelFee,
    discount,
    total,
    paymentMethod,
    notes,
  } = props;

  const padded = [...lineItems];
  while (padded.length < 8) {
    padded.push({ description: "", qty: 0, rate: 0, amount: 0 });
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.topBar} />

        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>GRAVE DETAIL</Text>
            <Text style={s.tagSmall}>
              CLEANING  ·  PRESERVATION  ·  REMEMBRANCE
            </Text>
            <Text style={s.tagItalic}>
              Time Takes a Toll. We Take It Back.
            </Text>
          </View>
          <View>
            <Text style={s.receiptTitle}>SERVICE RECEIPT</Text>
            <View style={s.metaRow}>
              <View style={s.metaCell}>
                <Text style={s.metaLabel}>RECEIPT #</Text>
                <Text style={s.metaValue}>{receiptNumber}</Text>
              </View>
              <View style={s.metaCell}>
                <Text style={s.metaLabel}>DATE</Text>
                <Text style={s.metaValue}>{receiptDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.dividerWrap}>
          <View style={s.dividerTop} />
          <View style={s.dividerGap} />
          <View style={s.dividerBottom} />
        </View>

        <View style={s.infoGrid}>
          {[
            [
              ["CUSTOMER NAME", customerName],
              ["PHONE", customerPhone || ""],
            ],
            [
              ["EMAIL", customerEmail || ""],
              ["SERVICE DATE", serviceDate],
            ],
            [
              ["CEMETERY", cemetery],
              ["CITY / STATE", cityState],
            ],
            [
              ["DECEDENT / MONUMENT", decedent || ""],
              ["SECTION / LOT", sectionLot || ""],
            ],
          ].map((row, i) => (
            <View key={i} style={s.infoRow}>
              {row.map(([label, value]) => (
                <View key={label} style={s.infoCell}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoValue}>{value || " "}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colDesc]}>DESCRIPTION OF SERVICE</Text>
            <Text style={[s.th, s.colQty]}>QTY</Text>
            <Text style={[s.th, s.colRate]}>RATE</Text>
            <Text style={[s.th, s.colAmt]}>AMOUNT</Text>
          </View>
          {padded.map((item, i) => (
            <View
              key={i}
              style={[
                s.tableRow,
                i % 2 === 1 ? { backgroundColor: BONE_WHITE } : {},
              ]}
            >
              <Text style={[s.td, s.colDesc]}>{item.description}</Text>
              <Text style={[s.td, s.colQty]}>
                {item.description ? item.qty : ""}
              </Text>
              <Text style={[s.td, s.colRate]}>
                {item.description ? fmt(item.rate) : ""}
              </Text>
              <Text style={[s.td, s.colAmt]}>
                {item.description ? fmt(item.amount) : ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.bottomSection}>
          <View style={s.notesCol}>
            <Text style={s.notesLabel}>NOTES  /  PHOTOS  ON  FILE</Text>
            <View style={s.notesBox}>
              {notes ? <Text style={s.notesText}>{notes}</Text> : null}
            </View>
          </View>
          <View style={s.totalsCol}>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>SUBTOTAL</Text>
              <Text style={s.totalValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>TRAVEL FEE</Text>
              <Text style={s.totalValue}>{fmt(travelFee || 0)}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>DISCOUNT</Text>
              <Text style={s.totalValue}>{fmt(discount || 0)}</Text>
            </View>
            <View style={s.totalDueBox}>
              <Text style={s.totalDueLabel}>TOTAL  DUE</Text>
              <Text style={s.totalDueValue}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        <View style={s.payRow}>
          <Text style={s.payLabel}>PAYMENT  METHOD</Text>
          <PaymentOption label="CASH" filled={paymentMethod === "cash"} />
          <PaymentOption label="CHECK" filled={paymentMethod === "check"} />
          <PaymentOption label="CARD" filled={paymentMethod === "card"} />
          <PaymentOption
            label="ONLINE / STRIPE"
            filled={paymentMethod === "online"}
          />
        </View>

        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>CUSTOMER  SIGNATURE</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>GRAVE DETAIL  CCUS  ·  OWNER</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerThanks}>
            Thank you for trusting us to honor what time has tried to take away.
          </Text>
          <View style={s.badgeBar}>
            <Text style={s.badge}>CCUS  CERTIFIED</Text>
            <Text style={s.badge}>$1,000,000  LIABILITY  INSURED</Text>
            <Text style={s.badge}>OWNER - OPERATED</Text>
          </View>
          <View style={s.contactStrip}>
            <Text style={s.contactBold}>GRAVEDETAIL.NET</Text>
            <Text style={s.contactReg}>573 · 545 · 5759</Text>
            <Text style={s.contactBold}>INFO@GRAVEDETAIL.NET</Text>
          </View>
          <View style={s.addrStrip}>
            <Text style={s.addrText}>
              Benton, Missouri  ·  Serving MO · IL · AR · TN · KY
            </Text>
            <Text style={s.addrText}>
              @Grave_Detail   ·   facebook.com/GraveDetail
            </Text>
          </View>
          <View style={s.bottomBronze} />
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptDocument;
