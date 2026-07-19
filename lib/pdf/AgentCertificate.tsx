import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  PageOrientation,
} from "@react-pdf/renderer";
import type { AgentAgreement, AgreementParticulars } from "@/lib/admin/agreements-shared";

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
Font.registerHyphenationCallback((word) => [word]);

const CRIMSON = "#a8242e";
const GOLD = "#a8842e";
const INK = "#1b1612";
const SOFT = "#4a4239";
const MUTED = "#7d7468";
const LINE = "#d9ccb8";
const CREAM = "#faf6ef";

const PECSB = {
  name: "PREMIUM ENTREPRENEUR CONSULTANT SDN. BHD.",
  operating: "Operating Premium Language Centre",
  regNo: "201501011794 (1137129-X)",
  signatoryName: "Norhawaty binti Mansor",
  signatoryTitle: "President · Founder",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    fontFamily: "Inter",
    color: INK,
    padding: 22,
  },
  // concentric decorative borders
  outer: { flex: 1, borderWidth: 2, borderColor: CRIMSON, padding: 6 },
  inner: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: GOLD,
    paddingVertical: 26,
    paddingHorizontal: 44,
    alignItems: "center",
  },
  // corner flourishes
  corner: { position: "absolute", width: 20, height: 20, borderColor: CRIMSON },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  logo: { width: 40, height: 40 },
  company: { fontFamily: "Inter", fontWeight: 700, fontSize: 10, letterSpacing: 1.4, color: CRIMSON },
  operating: { fontSize: 7.5, letterSpacing: 1, color: MUTED, marginTop: 1 },

  kicker: { fontSize: 9, letterSpacing: 5, color: GOLD, fontWeight: 700, marginTop: 16 },
  title: {
    fontFamily: "Playfair",
    fontWeight: 700,
    fontSize: 34,
    color: INK,
    marginTop: 4,
    textAlign: "center",
  },
  titleRule: { width: 120, height: 2, backgroundColor: CRIMSON, marginTop: 8, marginBottom: 4 },

  lead: { fontSize: 10.5, color: SOFT, marginTop: 14 },
  name: {
    fontFamily: "Playfair",
    fontWeight: 700,
    fontSize: 26,
    color: CRIMSON,
    marginTop: 8,
    textAlign: "center",
  },
  nameRule: { width: 320, height: 0.75, backgroundColor: LINE, marginTop: 6 },
  meta: { fontSize: 8.5, letterSpacing: 1, color: MUTED, marginTop: 6 },

  body: {
    fontSize: 10.5,
    color: SOFT,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 620,
  },
  strong: { color: INK, fontWeight: 700 },

  footRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
    marginTop: 30,
    paddingHorizontal: 8,
  },
  footCol: { alignItems: "center", width: 200 },
  sigName: { fontFamily: "Playfair", fontWeight: 600, fontSize: 15, color: CRIMSON },
  sigLine: { width: 170, height: 0.75, backgroundColor: INK, marginTop: 2, marginBottom: 3 },
  sigLabel: { fontSize: 8, color: SOFT },
  sigSub: { fontSize: 7.5, color: MUTED },

  seal: { alignItems: "center", justifyContent: "center", width: 78 },
  sealRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: CRIMSON,
    alignItems: "center",
    justifyContent: "center",
  },
  sealInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  sealText: { fontSize: 6, letterSpacing: 1, color: CRIMSON, fontWeight: 700, textAlign: "center" },
  sealYear: { fontFamily: "Playfair", fontWeight: 700, fontSize: 11, color: CRIMSON },

  refline: { fontSize: 7.5, letterSpacing: 0.8, color: MUTED, marginTop: 18 },
});

const dash = "—";
const fmtDate = (iso?: string | null) => {
  if (!iso) return dash;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);
};

function scopeText(p: AgreementParticulars): string {
  const map: Record<string, string> = {
    english: "English programmes",
    university: "University placement",
    special: "Special programmes",
    corporate: "Corporate / group programmes",
  };
  const list = (p.scope ?? []).map((x) => map[x] ?? x);
  return list.length ? list.join(", ") : "student recruitment";
}

export interface CertificateData {
  agreement: AgentAgreement;
  logoSrc?: string;
}

/** "Authorised Recruitment Representative" certificate — landscape, in the
 *  house crimson/cream + Playfair scheme, issued once an agreement is active. */
export function AgentCertificate({ data }: { data: CertificateData }) {
  const a = data.agreement;
  const p: AgreementParticulars = a.particulars ?? {};
  const name = p.legal_name || a.agent_name || "the RECRUITER";
  const certNo = `PECSB-CERT-${a.id.slice(0, 8).toUpperCase()}`;
  const issued = a.certificate_issued_at ?? a.pecsb_signed_at ?? a.updated_at;
  const year = fmtDate(issued).split(" ").pop() ?? "";

  return (
    <Document title={`Authorised Agent Certificate — ${name}`} author="PECSB">
      <Page size="A4" orientation={PageOrientation.LANDSCAPE} style={s.page}>
        <View style={s.outer}>
          <View style={s.inner}>
            {/* corner flourishes */}
            <View style={[s.corner, { top: 2, left: 2, borderTopWidth: 2, borderLeftWidth: 2 }]} />
            <View style={[s.corner, { top: 2, right: 2, borderTopWidth: 2, borderRightWidth: 2 }]} />
            <View style={[s.corner, { bottom: 2, left: 2, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
            <View style={[s.corner, { bottom: 2, right: 2, borderBottomWidth: 2, borderRightWidth: 2 }]} />

            <View style={s.header}>
              {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : null}
              <View>
                <Text style={s.company}>{PECSB.name}</Text>
                <Text style={s.operating}>
                  {PECSB.operating} · Reg. No. {PECSB.regNo}
                </Text>
              </View>
            </View>

            <Text style={s.kicker}>CERTIFICATE OF APPOINTMENT</Text>
            <Text style={s.title}>Authorised Recruitment</Text>
            <Text style={[s.title, { fontSize: 30, marginTop: -2 }]}>Representative</Text>
            <View style={s.titleRule} />

            <Text style={s.lead}>This is to certify that</Text>
            <Text style={s.name}>{name}</Text>
            <View style={s.nameRule} />
            {(p.reg_no || a.agent_code) && (
              <Text style={s.meta}>
                {p.reg_no ? `REG. NO. ${p.reg_no}` : ""}
                {p.reg_no && a.agent_code ? "   ·   " : ""}
                {a.agent_code ? `AGENT CODE ${a.agent_code}` : ""}
              </Text>
            )}

            <Text style={s.body}>
              is a duly appointed <Text style={s.strong}>Student Recruitment Representative</Text> of
              Premium Entrepreneur Consultant Sdn. Bhd., operating Premium Language Centre,
              authorised to source and refer prospective students for {scopeText(p)}
              {p.territory ? ` within ${p.territory}` : ""}, pursuant to a Student Recruitment
              Representative Agreement {p.agreement_date ? `dated ${fmtDate(p.agreement_date)}` : ""}
              {a.valid_until ? `, valid until ${fmtDate(a.valid_until)}` : ""}.
            </Text>

            <View style={s.footRow}>
              <View style={s.footCol}>
                <Text style={s.sigName}>{a.pecsb_signed_name || PECSB.signatoryName}</Text>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>{a.pecsb_signed_designation || PECSB.signatoryTitle}</Text>
                <Text style={s.sigSub}>For and on behalf of PECSB</Text>
              </View>

              <View style={s.seal}>
                <View style={s.sealRing}>
                  <View style={s.sealInner}>
                    <Text style={s.sealText}>PECSB</Text>
                    <Text style={s.sealYear}>{year}</Text>
                    <Text style={s.sealText}>OFFICIAL</Text>
                  </View>
                </View>
              </View>

              <View style={s.footCol}>
                <Text style={s.sigLabel}>{fmtDate(issued)}</Text>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Date of issue</Text>
                <Text style={s.sigSub}>Kuala Lumpur, Malaysia</Text>
              </View>
            </View>

            <Text style={s.refline}>
              {certNo}   ·   This certificate is issued subject to the terms of the Agreement and is
              valid only while that Agreement remains in force.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
