import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export interface OfferData {
  ref: string;
  date: string;
  studentName: string;
  passportNo?: string;
  program: string;
  intake?: string;
  schedule?: string;
  validUntil?: string;
  logoSrc?: string;
}

const CRIMSON = "#a8242e";
const INK = "#1b1612";
const SOFT = "#4a4239";
const MUTED = "#8a7e70";
const LINE = "#e8dfd2";

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 54,
    paddingBottom: 64,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.5,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 46, height: 46 },
  company: { flexDirection: "column" },
  companyName: { fontFamily: "Times-Bold", fontSize: 13, color: INK },
  companyMeta: { fontSize: 8, color: MUTED, marginTop: 1 },
  rule: { height: 2, backgroundColor: INK, marginTop: 14 },
  hairline: { height: 1, backgroundColor: LINE },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  metaLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },
  eyebrow: {
    fontSize: 8,
    color: CRIMSON,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 26,
  },
  title: { fontFamily: "Times-Bold", fontSize: 18, color: INK, marginTop: 6 },
  recipient: { marginTop: 20, fontSize: 10.5 },
  recipientName: { fontFamily: "Helvetica-Bold" },
  para: { marginTop: 12, color: SOFT },
  detailBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailKey: { color: MUTED, fontSize: 9.5 },
  detailVal: { color: INK, fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  closing: { marginTop: 22, color: SOFT },
  signName: { marginTop: 20, fontFamily: "Times-Bold", fontSize: 11, color: INK },
  signTitle: { fontSize: 9, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
  },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center", marginTop: 6 },
});

function Detail({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <View style={s.detailRow}>
      <Text style={s.detailKey}>{k}</Text>
      <Text style={s.detailVal}>{v}</Text>
    </View>
  );
}

export function EnglishOfferLetter({ data }: { data: OfferData }) {
  const first = data.studentName.split(" ")[0];
  return (
    <Document
      title={`Offer of a place — ${data.studentName}`}
      author="Premium Language Centre"
    >
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.header}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : null}
          <View style={s.company}>
            <Text style={s.companyName}>Premium Language Centre</Text>
            <Text style={s.companyMeta}>
              Premium Entrepreneur Consultant Sdn Bhd (1137129-X)
            </Text>
            <Text style={s.companyMeta}>Malaysia · admissions@premium.edu.my</Text>
          </View>
        </View>
        <View style={s.rule} />

        {/* Ref + date */}
        <View style={s.metaRow}>
          <View>
            <Text style={s.metaLabel}>Reference</Text>
            <Text style={s.metaValue}>{data.ref}</Text>
          </View>
          <View>
            <Text style={[s.metaLabel, { textAlign: "right" }]}>Date</Text>
            <Text style={[s.metaValue, { textAlign: "right" }]}>{data.date}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.eyebrow}>Letter of offer</Text>
        <Text style={s.title}>Offer of a place — {data.program}</Text>

        {/* Recipient */}
        <View style={s.recipient}>
          <Text style={s.recipientName}>{data.studentName}</Text>
          {data.passportNo ? <Text>Passport: {data.passportNo}</Text> : null}
        </View>

        {/* Body */}
        <Text style={[s.para, { marginTop: 16 }]}>Dear {first},</Text>
        <Text style={s.para}>
          We are delighted to offer you a place in the{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.program}</Text>{" "}
          at Premium Language Centre (PLC), operated by Premium Entrepreneur
          Consultant Sdn Bhd. Your application has been reviewed and accepted.
        </Text>
        <Text style={s.para}>
          The details of your offer are set out below. This letter also supports
          your student pass application where required.
        </Text>

        {/* Details */}
        <View style={s.detailBox}>
          <Detail k="Programme" v={data.program} />
          <Detail k="Intake" v={data.intake} />
          <Detail k="Schedule" v={data.schedule} />
          <Detail k="Reference" v={data.ref} />
          <Detail k="Offer valid until" v={data.validUntil} />
        </View>

        <Text style={s.para}>
          To accept this offer, please confirm your place and settle the
          registration fee. Our admissions team will then guide you through the
          next steps. If you have any questions, simply reply to the email that
          accompanied this letter.
        </Text>

        {/* Closing */}
        <Text style={s.closing}>
          We look forward to welcoming you to Premium Language Centre.
        </Text>
        <Text style={s.signName}>Admissions Office</Text>
        <Text style={s.signTitle}>Premium Language Centre</Text>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.hairline} />
          <Text style={s.footerText}>
            This is a computer-generated letter and does not require a signature.
          </Text>
          <Text style={s.footerText}>
            Premium Entrepreneur Consultant Sdn Bhd (1137129-X) · Malaysia
          </Text>
        </View>
      </Page>
    </Document>
  );
}
