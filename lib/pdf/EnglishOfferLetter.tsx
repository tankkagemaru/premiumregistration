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

export interface OfferFeeLine {
  label: string;
  amount: number | null;
  currency: string;
}

export interface OfferData {
  ref: string;
  date: string;
  studentName: string;
  passportNo?: string;
  nationality?: string;
  program: string;
  level?: string;
  intake?: string;
  schedule?: string;
  classStart?: string;
  classEnd?: string;
  validUntil?: string;
  isInternational?: boolean;
  fees?: OfferFeeLine[];
  logoSrc?: string;
}

const LETTERHEAD = {
  company: "PREMIUM ENTREPRENEUR CONSULTANT",
  suffix: "SDN BHD · 1137129-X",
  operating: "Operating Premium Language Centre",
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
const CREAM = "#faf6ef";

const s = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingLeft: 56,
    paddingRight: 50,
    paddingBottom: 76,
    fontSize: 10,
    fontFamily: "Inter",
    color: INK,
    lineHeight: 1.5,
  },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 6, backgroundColor: CRIMSON },

  header: { flexDirection: "row", alignItems: "center" },
  logo: { width: 46, height: 46, marginRight: 12 },
  company: { flexGrow: 1 },
  companyName: { fontFamily: "Inter", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, color: CRIMSON },
  companySuffix: { fontSize: 7.5, letterSpacing: 1.5, color: CRIMSON, marginTop: 2 },
  companyOperating: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  contact: { alignItems: "flex-end" },
  contactLine: { fontSize: 8, color: MUTED },
  rule: { height: 1.5, backgroundColor: INK, marginTop: 12 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  recipient: {},
  recipientName: { fontFamily: "Inter", fontWeight: 700, fontSize: 11 },
  recipientLine: { color: MUTED, fontSize: 9, marginTop: 1 },
  refBlock: { alignItems: "flex-end" },
  refLine: { fontSize: 8.5, color: SOFT },
  refStrong: { fontFamily: "Inter", fontWeight: 700, color: INK },

  subject: {
    marginTop: 20,
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 11,
    color: INK,
    textDecoration: "underline",
  },

  para: { marginTop: 10, color: SOFT, textAlign: "justify" },
  strong: { fontFamily: "Inter", fontWeight: 700, color: INK },

  sectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 8.5,
    letterSpacing: 1.5,
    fontWeight: 700,
    color: CRIMSON,
  },

  box: { borderWidth: 1, borderColor: LINE, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  key: { color: MUTED, fontSize: 9.5, width: "42%" },
  val: { color: INK, fontFamily: "Inter", fontWeight: 500, fontSize: 9.5, width: "58%", textAlign: "right" },

  feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  feeRowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  feeLabel: { color: SOFT, fontSize: 9.5 },
  feeAmount: { color: INK, fontFamily: "Inter", fontWeight: 500, fontSize: 9.5 },
  feeTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: INK },
  feeTotalLabel: { fontFamily: "Inter", fontWeight: 700, fontSize: 10, color: INK },
  feeTotalAmount: { fontFamily: "Inter", fontWeight: 700, fontSize: 10, color: CRIMSON },
  feeNote: { marginTop: 5, fontSize: 8, color: MUTED },

  cond: { flexDirection: "row", marginTop: 5, color: SOFT },
  condNo: { width: 16, color: CRIMSON, fontFamily: "Inter", fontWeight: 700 },
  condText: { flex: 1, textAlign: "justify" },

  sincerely: { marginTop: 20, color: SOFT },
  signName: { fontFamily: "Playfair", fontWeight: 700, fontSize: 16, color: INK, marginTop: 12 },
  signTitle: { fontSize: 8, letterSpacing: 1.5, color: CRIMSON, fontWeight: 700, marginTop: 3 },
  signFor: { fontSize: 8, color: MUTED, marginTop: 2 },

  acceptBox: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: CRIMSON,
    borderRadius: 6,
    backgroundColor: CREAM,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  acceptTitle: { fontSize: 8.5, letterSpacing: 1.5, fontWeight: 700, color: CRIMSON },
  acceptText: { marginTop: 6, color: SOFT, fontSize: 9.5, textAlign: "justify" },
  acceptGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  acceptField: { width: "46%" },
  acceptLine: { borderBottomWidth: 0.75, borderBottomColor: INK, height: 20 },
  acceptCaption: { fontSize: 7.5, letterSpacing: 1, color: MUTED, marginTop: 3 },

  footer: { position: "absolute", left: 56, right: 50, bottom: 34 },
  footerRule: { height: 1, backgroundColor: LINE, marginBottom: 8 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footerAddr: { fontSize: 7.5, color: MUTED, maxWidth: "70%" },
  footerTag: { fontFamily: "Playfair", fontWeight: 600, fontSize: 10.5, color: CRIMSON },
});

function Detail({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <View style={s.row}>
      <Text style={s.key}>{k}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

function Condition({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={s.cond}>
      <Text style={s.condNo}>{n}.</Text>
      <Text style={s.condText}>{children}</Text>
    </View>
  );
}

const money = (n: number | null, currency: string) =>
  n == null ? "To be advised" : `${currency} ${n.toLocaleString("en-MY")}`;

export function EnglishOfferLetter({ data }: { data: OfferData }) {
  const first = data.studentName.split(" ")[0];
  const fees = (data.fees ?? []).filter((f) => f.amount != null && f.amount > 0);
  const currency = fees[0]?.currency ?? "MYR";
  const total = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);

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
            <Text style={s.companyOperating}>{LETTERHEAD.operating}</Text>
          </View>
          <View style={s.contact}>
            <Text style={s.contactLine}>{LETTERHEAD.phone}</Text>
            <Text style={s.contactLine}>{LETTERHEAD.email}</Text>
            <Text style={s.contactLine}>{LETTERHEAD.web}</Text>
          </View>
        </View>
        <View style={s.rule} />

        {/* Recipient + reference */}
        <View style={s.metaRow}>
          <View style={s.recipient}>
            <Text style={s.recipientName}>{data.studentName}</Text>
            {data.passportNo ? <Text style={s.recipientLine}>Passport / ID: {data.passportNo}</Text> : null}
            {data.nationality ? <Text style={s.recipientLine}>Nationality: {data.nationality}</Text> : null}
          </View>
          <View style={s.refBlock}>
            <Text style={s.refLine}>
              Ref: <Text style={s.refStrong}>{data.ref}</Text>
            </Text>
            <Text style={s.refLine}>Date: {data.date}</Text>
          </View>
        </View>

        {/* Subject */}
        <Text style={s.subject}>RE: LETTER OF OFFER — {data.program.toUpperCase()}</Text>

        {/* Body */}
        <Text style={[s.para, { marginTop: 12 }]}>Dear {first},</Text>
        <Text style={s.para}>
          We are pleased to inform you that, following the assessment of your application, you have
          been offered a place in the <Text style={s.strong}>{data.program}</Text> conducted by
          Premium Language Centre, operated by Premium Entrepreneur Consultant Sdn. Bhd. (Company No.
          1137129-X). On behalf of the Centre, it is our pleasure to extend this offer of admission.
        </Text>

        {/* Programme particulars */}
        <Text style={s.sectionLabel}>PROGRAMME DETAILS</Text>
        <View style={s.box}>
          <Detail k="Programme" v={data.program} />
          <Detail k="Level" v={data.level} />
          <Detail k="Intake" v={data.intake} />
          <Detail k="Commencement date" v={data.classStart} />
          <Detail k="Expected completion" v={data.classEnd} />
          <Detail k="Class schedule" v={data.schedule} />
          <Detail k="Medium of instruction" v="English" />
          <Detail k="Reference number" v={data.ref} />
        </View>

        {/* Fees */}
        <Text style={s.sectionLabel}>SCHEDULE OF FEES</Text>
        <View style={s.box}>
          {fees.length === 0 ? (
            <Text style={s.feeLabel}>
              The applicable fees are set out in the invoice accompanying this letter.
            </Text>
          ) : (
            <>
              {fees.map((f, i) => (
                <View key={i} style={i === fees.length - 1 ? s.feeRowLast : s.feeRow}>
                  <Text style={s.feeLabel}>{f.label}</Text>
                  <Text style={s.feeAmount}>{money(f.amount, f.currency)}</Text>
                </View>
              ))}
              <View style={s.feeTotalRow}>
                <Text style={s.feeTotalLabel}>Total</Text>
                <Text style={s.feeTotalAmount}>{currency} {total.toLocaleString("en-MY")}</Text>
              </View>
            </>
          )}
          <Text style={s.feeNote}>
            All fees are quoted in {currency} and are payable in accordance with the Centre&apos;s
            payment terms. Fees paid are subject to the Centre&apos;s refund policy.
          </Text>
        </View>

        {/* Conditions */}
        <Text style={s.sectionLabel}>CONDITIONS OF OFFER</Text>
        <Condition n={1}>
          This offer is made on the basis of the information provided in your application and is
          subject to verification of your original supporting documents.
        </Condition>
        <Condition n={2}>
          To accept this offer, please sign and return the Acceptance of Offer below and settle the
          registration fee on or before the expiry date stated in this letter.
        </Condition>
        <Condition n={3}>
          Your place is confirmed only upon the Centre&apos;s receipt of the registration fee and all
          required documents.
        </Condition>
        {data.isInternational ? (
          <Condition n={4}>
            As an international student, your enrolment and Student Pass are subject to the approval of
            the Malaysian immigration authorities through EMGS. This letter may be used to support
            that application; the Centre does not guarantee the outcome of any immigration decision.
          </Condition>
        ) : null}
        <Condition n={data.isInternational ? 5 : 4}>
          Students are expected to maintain satisfactory attendance and academic progress and to
          comply with the Centre&apos;s rules, policies and code of conduct throughout the programme.
        </Condition>

        {/* Validity + next steps */}
        <Text style={s.para}>
          This offer is valid until <Text style={s.strong}>{data.validUntil ?? "the date stated above"}</Text>.
          If your acceptance and the registration fee are not received by this date, this offer will
          lapse. Upon confirmation, our team will arrange your class placement and orientation and
          share your commencement details.
        </Text>
        <Text style={s.para}>
          Should you have any questions regarding this offer, please contact us at{" "}
          <Text style={s.strong}>{LETTERHEAD.email}</Text> or reply to the email accompanying this
          letter. We look forward to welcoming you to Premium Language Centre.
        </Text>

        {/* Signatory */}
        <Text style={s.sincerely}>Yours sincerely,</Text>
        <Text style={s.signName}>{LETTERHEAD.signatoryName}</Text>
        <Text style={s.signTitle}>{LETTERHEAD.signatoryTitle}</Text>
        <Text style={s.signFor}>For and on behalf of Premium Language Centre</Text>

        {/* Acceptance slip */}
        <View style={s.acceptBox} wrap={false}>
          <Text style={s.acceptTitle}>ACCEPTANCE OF OFFER</Text>
          <Text style={s.acceptText}>
            I, {data.studentName}, accept the offer of a place in the {data.program} and agree to the
            conditions set out in this Letter of Offer.
          </Text>
          <View style={s.acceptGrid}>
            <View style={s.acceptField}>
              <View style={s.acceptLine} />
              <Text style={s.acceptCaption}>SIGNATURE</Text>
            </View>
            <View style={s.acceptField}>
              <View style={s.acceptLine} />
              <Text style={s.acceptCaption}>DATE</Text>
            </View>
          </View>
          <View style={[s.acceptGrid, { marginTop: 14 }]}>
            <View style={s.acceptField}>
              <View style={s.acceptLine} />
              <Text style={s.acceptCaption}>NAME (BLOCK LETTERS)</Text>
            </View>
            <View style={s.acceptField}>
              <View style={s.acceptLine} />
              <Text style={s.acceptCaption}>PASSPORT / ID NO.</Text>
            </View>
          </View>
        </View>

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
