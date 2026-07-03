import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const FONT_DIR = path.join(process.cwd(), "lib", "pdf", "fonts");

Font.register({
  family: "Playfair",
  fonts: [
    { src: path.join(FONT_DIR, "PlayfairDisplay.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "PlayfairDisplay-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "PlayfairDisplay-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "Inter.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});
// Keep long words (emails, references) from being hyphenated.
Font.registerHyphenationCallback((word) => [word]);

export interface OfferData {
  ref: string;
  date: string;
  studentName: string;
  passportNo?: string;
  program: string;
  intake?: string;
  schedule?: string;
  validUntil?: string;
  isInternational?: boolean;
  logoSrc?: string;
}

const LETTERHEAD = {
  company: "PREMIUM ENTREPRENEUR CONSULTANT",
  suffix: "SDN BHD · 1137129-X",
  phone: "+60 19-318 2282",
  email: "inquiry@premium.edu.my",
  web: "premium.edu.my",
  address:
    "Level 10, Fahrenheit Office Tower, Bukit Bintang, 55100 Kuala Lumpur, Malaysia",
  tagline: "Your Premium Path to Success",
  signatoryName: "Norhawaty binti Mansor",
  signatoryTitle: "President · Founder",
};

const CRIMSON = "#a8242e";
const INK = "#1b1612";
const SOFT = "#4a4239";
const MUTED = "#7d7468";
const LINE = "#e2d8c9";

const s = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingLeft: 56,
    paddingRight: 50,
    paddingBottom: 70,
    fontSize: 10.5,
    fontFamily: "Inter",
    color: INK,
    lineHeight: 1.55,
  },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 6, backgroundColor: CRIMSON },

  header: { flexDirection: "row", alignItems: "center" },
  logo: { width: 46, height: 46, marginRight: 12 },
  company: { flexGrow: 1 },
  companyName: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 1.5,
    color: CRIMSON,
  },
  companySuffix: { fontSize: 7.5, letterSpacing: 1.5, color: CRIMSON, marginTop: 2 },
  contact: { alignItems: "flex-end" },
  contactLine: { fontSize: 8, color: MUTED },
  rule: { height: 1.5, backgroundColor: INK, marginTop: 12 },

  date: {
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: CRIMSON,
    fontWeight: 700,
    marginTop: 26,
  },

  recipient: { marginTop: 16 },
  recipientName: { fontFamily: "Inter", fontWeight: 700, fontSize: 11 },
  recipientLine: { color: MUTED, fontSize: 9.5, marginTop: 1 },

  heading: { fontFamily: "Playfair", fontWeight: 600, fontSize: 20, color: INK, marginTop: 22 },

  para: { marginTop: 12, color: SOFT },
  strong: { fontFamily: "Inter", fontWeight: 700, color: INK },

  detailBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  detailKey: { color: MUTED, fontSize: 9.5 },
  detailVal: { color: INK, fontFamily: "Inter", fontWeight: 500, fontSize: 9.5 },

  closing: { marginTop: 20, color: SOFT },
  sincerely: { marginTop: 22, color: SOFT },
  signName: { fontFamily: "Playfair", fontWeight: 700, fontSize: 16, color: INK, marginTop: 10 },
  signTitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: CRIMSON,
    fontWeight: 700,
    marginTop: 3,
  },

  footer: { position: "absolute", left: 56, right: 50, bottom: 34 },
  footerRule: { height: 1, backgroundColor: LINE, marginBottom: 8 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footerAddr: { fontSize: 7.5, color: MUTED, maxWidth: "70%" },
  footerTag: { fontFamily: "Playfair", fontWeight: 600, fontSize: 10.5, color: CRIMSON },
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
    <Document title={`Letter of Offer — ${data.studentName}`} author="Premium Language Centre">
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />

        {/* Letterhead */}
        <View style={s.header}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : null}
          <View style={s.company}>
            <Text style={s.companyName}>{LETTERHEAD.company}</Text>
            <Text style={s.companySuffix}>{LETTERHEAD.suffix}</Text>
          </View>
          <View style={s.contact}>
            <Text style={s.contactLine}>{LETTERHEAD.phone}</Text>
            <Text style={s.contactLine}>{LETTERHEAD.email}</Text>
            <Text style={s.contactLine}>{LETTERHEAD.web}</Text>
          </View>
        </View>
        <View style={s.rule} />

        {/* Date */}
        <Text style={s.date}>{data.date.toUpperCase()}</Text>

        {/* Recipient */}
        <View style={s.recipient}>
          <Text style={s.recipientName}>{data.studentName}</Text>
          {data.passportNo ? (
            <Text style={s.recipientLine}>Passport {data.passportNo}</Text>
          ) : null}
        </View>

        {/* Heading */}
        <Text style={s.heading}>Letter of Offer</Text>

        {/* Body */}
        <Text style={[s.para, { marginTop: 14 }]}>Dear {first},</Text>
        <Text style={s.para}>
          We are pleased to offer you a place in the{" "}
          <Text style={s.strong}>{data.program}</Text> at Premium Language Centre,
          operated by Premium Entrepreneur Consultant Sdn Bhd. Following a review
          of your registration, we are delighted to confirm your acceptance into
          the programme.
        </Text>

        <View style={s.detailBox}>
          <Detail k="Programme" v={data.program} />
          <Detail k="Intake" v={data.intake} />
          <Detail k="Schedule" v={data.schedule} />
          <Detail k="Reference" v={data.ref} />
          <Detail k="Offer valid until" v={data.validUntil} />
        </View>

        {data.isInternational ? (
          <Text style={s.para}>
            This letter confirms your acceptance into the programme and may be used
            to support your Student Pass application where required.
          </Text>
        ) : null}

        <Text style={s.para}>
          To secure your place, please confirm your acceptance and settle the
          registration fee. Our team will then arrange your class placement and
          orientation. Should you have any questions, simply reply to the email
          that accompanied this letter.
        </Text>

        <Text style={s.closing}>
          We look forward to welcoming you to Premium Language Centre.
        </Text>

        <Text style={s.sincerely}>Yours sincerely,</Text>
        <Text style={s.signName}>{LETTERHEAD.signatoryName}</Text>
        <Text style={s.signTitle}>{LETTERHEAD.signatoryTitle}</Text>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerRule} />
          <View style={s.footerRow}>
            <Text style={s.footerAddr}>{LETTERHEAD.address}</Text>
            <Text style={s.footerTag}>{LETTERHEAD.tagline}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
