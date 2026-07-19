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
import {
  normalizeScheme,
  tierLabel,
  type AgentAgreement,
  type AgreementParticulars,
  type AgreementScheme,
} from "@/lib/admin/agreements-shared";

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
// Handwriting face for the electronic signature mark.
Font.register({
  family: "Signature",
  fonts: [{ src: path.join(FONT_DIR, "GreatVibes-Regular.ttf"), fontWeight: 400 }],
});
Font.registerHyphenationCallback((word) => [word]);

const CRIMSON = "#a8242e";
const INK = "#1b1612";
const SOFT = "#4a4239";
const MUTED = "#7d7468";
const LINE = "#e2d8c9";
const CREAM = "#faf6ef";

const PECSB = {
  name: "PREMIUM ENTREPRENEUR CONSULTANT SDN. BHD.",
  regNo: "201501011794 (1137129-X)",
  address:
    "Unit 10-1-2, 3 & 3A, Level 10, Fahrenheit 88 Office Tower, No. 179 Jalan Bukit Bintang, 55100 WP Kuala Lumpur",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 54,
    paddingBottom: 64,
    fontSize: 9,
    fontFamily: "Inter",
    color: INK,
    lineHeight: 1.5,
  },
  bar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 6, backgroundColor: CRIMSON },
  kicker: { fontSize: 7.5, letterSpacing: 2, color: CRIMSON, fontWeight: 700, marginBottom: 4 },
  h1: { fontFamily: "Playfair", fontWeight: 700, fontSize: 22, lineHeight: 1.25 },
  h2: {
    fontFamily: "Playfair",
    fontWeight: 600,
    fontSize: 13,
    marginTop: 16,
    marginBottom: 6,
    color: INK,
  },
  clauseNo: { color: CRIMSON, fontWeight: 700 },
  para: { marginBottom: 4, color: SOFT, textAlign: "justify" },
  sub: { marginBottom: 3, color: SOFT, textAlign: "justify", paddingLeft: 14 },
  small: { fontSize: 7.5, color: MUTED },
  // tables
  table: { borderWidth: 1, borderColor: LINE, marginTop: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  trLast: { flexDirection: "row" },
  th: {
    backgroundColor: CREAM,
    fontWeight: 700,
    fontSize: 7,
    letterSpacing: 0.8,
    color: MUTED,
    padding: 5,
  },
  td: { padding: 5, color: INK },
  tdMuted: { padding: 5, color: MUTED },
  value: { fontWeight: 500 },
  blank: { color: MUTED },
  // compact particulars table (fits Part 1 on a single page)
  pNum: { paddingVertical: 3, paddingHorizontal: 5, color: MUTED, fontSize: 8, width: 20 },
  pLabel: { paddingVertical: 3, paddingHorizontal: 5, color: SOFT, fontSize: 8, width: 138 },
  pVal: { paddingVertical: 3, paddingHorizontal: 5, color: INK, fontFamily: "Inter", fontWeight: 500, fontSize: 8, flex: 1 },
  // cover page
  cover: { flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  coverKicker: { fontSize: 8, letterSpacing: 3, color: CRIMSON, fontWeight: 700, marginBottom: 20 },
  coverTitle: { fontFamily: "Playfair", fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.2 },
  coverRule: { width: 90, height: 2, backgroundColor: CRIMSON, marginTop: 18, marginBottom: 26 },
  coverBetween: { fontSize: 8.5, letterSpacing: 2, color: MUTED, marginTop: 14 },
  coverParty: { fontFamily: "Playfair", fontWeight: 600, fontSize: 14, color: INK, marginTop: 4 },
  coverPartySub: { fontSize: 8, color: MUTED, marginTop: 2 },
  coverDate: { fontSize: 9, color: SOFT, marginTop: 30 },
  coverOffice: { fontSize: 7.5, color: MUTED, marginTop: 4, maxWidth: 320 },
  coverConfidential: { fontSize: 7, letterSpacing: 1.5, color: CRIMSON, fontWeight: 700, marginTop: 26 },
  // signature blocks
  sigWrap: { flexDirection: "row", gap: 24, marginTop: 18 },
  sigBox: { flex: 1, borderWidth: 1, borderColor: LINE, padding: 12 },
  sigFor: { fontSize: 7, letterSpacing: 1.2, color: MUTED, marginBottom: 3 },
  sigParty: { fontWeight: 700, fontSize: 9.5, marginBottom: 10 },
  sigMark: { fontFamily: "Signature", fontSize: 30, color: "#1c3f6e", lineHeight: 1 },
  sigName: { fontFamily: "Playfair", fontWeight: 600, fontSize: 16, color: CRIMSON },
  sigLine: { borderBottomWidth: 1, borderBottomColor: INK, height: 26, marginBottom: 4 },
  sigMeta: { fontSize: 8, color: SOFT, marginTop: 2 },
  sigElec: { fontSize: 6.5, color: MUTED, marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
});

const dash = "—";
const v = (x?: string | number | null, fallback = dash) =>
  x === null || x === undefined || String(x).trim() === "" ? fallback : String(x);
const rm = (x?: number | null) => (x == null ? dash : `RM ${x.toLocaleString("en-MY")}`);
const pct = (x?: number | null) => (x == null ? dash : `${x}%`);
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
  return list.length ? list.join(" · ") : dash;
}

function Footer({ refNo }: { refNo: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{PECSB.name} · Strictly private & confidential</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${refNo} · Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function PartRow({ n, label, value, last }: { n: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? s.trLast : s.tr}>
      <Text style={s.pNum}>{n}</Text>
      <Text style={s.pLabel}>{label}</Text>
      <Text style={s.pVal}>{value}</Text>
    </View>
  );
}

function Clause({ n, title, paras, subs }: { n: string; title: string; paras?: string[]; subs?: string[] }) {
  return (
    <View wrap>
      <Text style={s.h2}>
        <Text style={s.clauseNo}>{n}</Text>
        {"   "}
        {title}
      </Text>
      {(paras ?? []).map((p, i) => (
        <Text key={`p${i}`} style={s.para}>
          {p}
        </Text>
      ))}
      {(subs ?? []).map((p, i) => (
        <Text key={`s${i}`} style={s.sub}>
          ({String.fromCharCode(97 + i)})  {p}
        </Text>
      ))}
    </View>
  );
}

function SigBlock({
  party,
  signedName,
  designation,
  date,
  kind,
}: {
  party: string;
  signedName?: string | null;
  designation?: string | null;
  date?: string | null;
  kind?: string | null;
}) {
  return (
    <View style={s.sigBox}>
      <Text style={s.sigFor}>SIGNED FOR AND ON BEHALF OF</Text>
      <Text style={s.sigParty}>{party}</Text>
      {signedName ? (
        kind === "uploaded" ? (
          <>
            <Text style={s.sigName}>{signedName}</Text>
            <Text style={s.sigMeta}>Signed copy uploaded{date ? ` · ${fmtDate(date)}` : ""}</Text>
          </>
        ) : (
          <>
            {/* Handwriting mark for the electronic signature. */}
            <Text style={s.sigMark}>{signedName}</Text>
            <Text style={s.sigElec}>
              Signed electronically{date ? ` on ${fmtDate(date)}` : ""} — a valid signature under the
              Electronic Commerce Act 2006 and Clause 23(f).
            </Text>
          </>
        )
      ) : (
        <View style={s.sigLine} />
      )}
      <Text style={s.sigMeta}>NAME: {v(signedName)}</Text>
      <Text style={s.sigMeta}>DESIGNATION: {v(designation)}</Text>
      <Text style={s.sigMeta}>DATE: {fmtDate(date)}</Text>
    </View>
  );
}

export interface AgreementPdfData {
  agreement: AgentAgreement;
  logoSrc?: string;
}

export function AgentAgreementPdf({ data }: { data: AgreementPdfData }) {
  const a = data.agreement;
  const p: AgreementParticulars = a.particulars ?? {};
  const sc: AgreementScheme = normalizeScheme(a.scheme);
  const tiers = sc.tiers ?? [{ up_to: null }];
  const refNo = `PECSB-AGR-${a.id.slice(0, 8).toUpperCase()}`;
  const recruiter = v(p.legal_name, "[RECRUITER LEGAL NAME]");

  return (
    <Document title={`Recruitment Agreement — ${recruiter}`} author="PECSB">
      {/* ------------------------------------------------ cover page */}
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <View style={{ alignItems: "center" }}>
          {data.logoSrc ? <Image src={data.logoSrc} style={{ width: 54, height: 54, marginBottom: 8 }} /> : null}
          <Text style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1.4, color: CRIMSON, textAlign: "center" }}>
            PREMIUM ENTREPRENEUR CONSULTANT SDN. BHD.
          </Text>
          <Text style={[s.small, { textAlign: "center" }]}>
            Operating Premium Language Centre · Reg. No. {PECSB.regNo}
          </Text>
        </View>

        <View style={s.cover}>
          <Text style={s.coverKicker}>STUDENT RECRUITMENT REPRESENTATIVE</Text>
          <Text style={s.coverTitle}>Student Recruitment{"\n"}Representative Agreement</Text>
          <View style={s.coverRule} />

          <Text style={s.coverBetween}>BETWEEN</Text>
          <Text style={s.coverParty}>{PECSB.name}</Text>
          <Text style={s.coverPartySub}>Company No. {PECSB.regNo}</Text>

          <Text style={s.coverBetween}>AND</Text>
          <Text style={s.coverParty}>{recruiter}</Text>
          <Text style={s.coverPartySub}>Business / Company Reg. No. {v(p.reg_no)}</Text>

          <Text style={s.coverDate}>Dated {fmtDate(p.agreement_date)}</Text>
          <Text style={s.coverOffice}>Registered office of PECSB: {PECSB.address}</Text>
          <Text style={s.coverConfidential}>STRICTLY PRIVATE & CONFIDENTIAL · {refNo}</Text>
        </View>
        <Footer refNo={refNo} />
      </Page>

      {/* ------------------------------------------------ Part 1 — Particulars */}
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Text style={[s.h2, { marginTop: 2 }]}>
          <Text style={s.clauseNo}>PART 1</Text>
          {"   "}Schedule of Particulars
        </Text>
        <Text style={s.small}>
          This Part forms part of the Agreement. Where a clause refers to “the Particulars”, it
          refers to the corresponding Item below.
        </Text>
        <View style={s.table}>
          <PartRow n="1" label="Date of Agreement" value={fmtDate(p.agreement_date)} />
          <PartRow n="2" label="RECRUITER — legal name" value={v(p.legal_name)} />
          <PartRow n="3" label="RECRUITER — registration no." value={v(p.reg_no)} />
          <PartRow n="4" label="RECRUITER — registered address" value={v(p.address)} />
          <PartRow
            n="5"
            label="RECRUITER — authorised signatory"
            value={`Name: ${v(p.signatory_name)} · NRIC/Passport: ${v(p.signatory_id)} · Designation: ${v(p.signatory_designation)}`}
          />
          <PartRow
            n="6"
            label="Notices — RECRUITER"
            value={`Attn: ${v(p.notice_attn)} · Email: ${v(p.notice_email)} · Tel: ${v(p.notice_tel)}`}
          />
          <PartRow
            n="7"
            label="Notices — PECSB"
            value={`Attn: ${v(p.pecsb_attn)} · Email: ${v(p.pecsb_email)} · Tel: ${v(p.pecsb_tel)}`}
          />
          <PartRow n="8" label="Territory / approved markets" value={v(p.territory)} />
          <PartRow n="9" label="Approved scope of recruitment" value={scopeText(p)} />
          <PartRow
            n="10"
            label="Initial term"
            value={`${v(p.term_months)} months · Renewal: ${p.renewal === "automatic" ? "automatic for successive equal periods" : "by written agreement only"}`}
          />
          <PartRow n="11" label="Sub-agents permitted" value={p.sub_agents ? "Yes, with PECSB's prior written consent" : "No"} />
          <PartRow
            n="12"
            label="Recruitment of Minors permitted"
            value={p.minors ? `Yes — minimum age ${v(p.minors_min_age)} years, Annexure B applies` : "No"}
          />
          <PartRow n="13" label="Commission Scheme" value="As set out in Schedule 1, completed and initialled by both Parties" />
          <PartRow n="14" label="Commission payment period" value={`Within ${v(p.payment_days, "14")} working days of full settlement of the relevant fees`} />
          <PartRow n="15" label="Clawback period" value={`Refunds or withdrawals occurring within ${v(p.clawback_months)} months of enrolment`} />
          <PartRow n="16" label="Non-solicitation period" value={`${v(p.non_solicit_months, "12")} months from termination`} />
          <PartRow
            n="17"
            label="RECRUITER bank details"
            value={`Bank: ${v(p.bank_name)} · Account name: ${v(p.bank_account_name)} · Account no.: ${v(p.bank_account_no)}`}
          />
          <PartRow n="18" label="Governing law and courts" value="Malaysia — Courts of Kuala Lumpur" last />
        </View>
        <Text style={[s.small, { marginTop: 4 }]}>
          Where an Item is left blank, the default stated in the corresponding clause applies.
        </Text>
        <Footer refNo={refNo} />
      </Page>

      {/* ------------------------------------------------ operative clauses */}
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Text style={s.kicker}>THIS AGREEMENT</Text>
        <Text style={s.para}>
          is made on {fmtDate(p.agreement_date)} (“Commencement Date”) BETWEEN {PECSB.name} (Company
          No. {PECSB.regNo}) of {PECSB.address} (“PECSB” and/or “Premium”) AND {recruiter} (Reg. No.{" "}
          {v(p.reg_no)}) of {v(p.address)} (“RECRUITER”). The Parties agree as follows.
        </Text>

        <Clause
          n="01"
          title="Definitions and Interpretation"
          subs={[
            "In this Agreement, unless the context otherwise requires: “Commission” means the amounts payable under Clause 9 and Schedule 1; “Enrolled Student” means a student recruited by RECRUITER who has been accepted by Premium and has paid the relevant fees in full; “Minor” means any student below eighteen (18) years of age on the date of application, or below the age of majority in the student's country of nationality or residence, whichever is the higher; “Particulars” means Part 1 of this Agreement; “Territory” means the country or countries stated in Item 8 of the Particulars.",
            "The Particulars, Schedules and Annexures form part of this Agreement. In the event of any conflict, the operative clauses prevail over the Schedules and Annexures, save that Schedule 1 prevails in respect of commission rates.",
            "Headings are for convenience only and do not affect interpretation. Words importing the singular include the plural and vice versa.",
          ]}
        />
        <Clause
          n="02"
          title="Appointment and Scope"
          subs={[
            "PECSB appoints RECRUITER as its non-exclusive Student Recruitment Representative to source, introduce and refer prospective students to Premium within the Territory and within the scope stated in Item 9 of the Particulars, and RECRUITER accepts the appointment on the terms of this Agreement.",
            "The appointment is non-exclusive. Premium may itself recruit students and may appoint other representatives, agents or channels without restriction, and without any obligation or payment to RECRUITER in respect of students not recruited by RECRUITER.",
            "RECRUITER has no authority to accept enrolments, collect fees, make representations or otherwise bind Premium, save as expressly authorised by Premium in writing.",
            "RECRUITER shall not recruit or hold itself out as recruiting outside the Territory or the approved scope without Premium's prior written consent. No Commission is payable in respect of any activity outside the Territory or scope unless Premium has consented in writing.",
          ]}
        />
        <Clause
          n="03"
          title="Term"
          subs={[
            "This Agreement takes effect on the Commencement Date and continues for the initial term stated in Item 10 of the Particulars, or, if no term is stated, until terminated in accordance with Clause 12.",
            "Where Item 10 provides for automatic renewal, this Agreement renews for successive periods of equal length unless either Party gives written notice of non-renewal at least thirty (30) days before the end of the then-current term.",
          ]}
        />
        <Clause
          n="04"
          title="Rights and Obligations of RECRUITER"
          paras={[
            "RECRUITER upholds the following responsibilities as Premium's appointed Student Recruitment Representative, including:",
          ]}
          subs={[
            "Ensuring the prospective student is made fully aware of all financial terms and conditions per the marketing material currently in practice.",
            "Ensuring the prospective student is made fully aware of all academic terms and conditions and the entry level at which the student is being accepted by Premium.",
            "Assisting prospective students in completing applications for admission and filing the specific data as proof for review.",
            "Ensuring the age of students recruited is between seventeen (17) and forty-five (45) for student-visa purposes, subject always to Clause 6.",
            "Any recruitment below seventeen (17) shall enclose a support letter from the student's embassy, in addition to the requirements of Clause 6.",
            "Any recruitment above forty-five (45) shall include a sponsorship letter from the respective embassy.",
            "Compiling all necessary documents as listed in the admission procedures (Annexure A).",
            "Making clear to all prospective students that Premium only accepts applications on Premium's terms and conditions.",
            "Providing recruitment services on behalf of Premium (exhibitions, school talks, advertisements) at its own cost.",
            "Submitting all marketing and promotional material to Premium for approval at least five (5) working days before print; failing which Premium reserves the right to disclaim such material and any obligation arising from it.",
            "Indemnifying Premium in respect of any action arising from a breach of the above.",
            "Supporting students throughout application and document submission, and advising students of their responsibility to maintain satisfactory course and attendance progress.",
            "Premium reserves the right to terminate this appointment without notice on a breach of Clauses 4(j)–4(l).",
            "Notifying Premium promptly in writing of any complaint by a prospective student.",
          ]}
        />
        <Clause
          n="05"
          title="Rights and Obligations of Premium"
          subs={[
            "Advise RECRUITER promptly of any new or additional courses or relevant amendments to Premium's prospectus.",
            "Admit and enrol all students recruited by RECRUITER who meet the academic requirements and have paid full settlement as specified in the Conditional Offer Letter.",
            "Payments for Special Programs such as Summer Camp shall be paid on a project basis, on terms agreed mutually.",
            "Premium holds all responsibility for the academic matters of students recruited by RECRUITER.",
            "All necessary programme brochures, application forms and existing marketing materials will be provided to RECRUITER.",
            "Any request by RECRUITER for material or information will be responded to within five (5) working days.",
            "Premium will keep RECRUITER informed of any rules and regulations affecting recruitment.",
            "Premium will support RECRUITER's reasonable and justified marketing activities, subject to approval and review.",
            "Premium retains absolute discretion to accept or reject any application, and shall not be liable to RECRUITER for any rejection.",
          ]}
        />
        <Clause
          n="06"
          title="Recruitment of Minors and Vulnerable Students"
          subs={[
            "RECRUITER shall not recruit, accept an application from, or hold itself out as able to place, any Minor unless Item 12 of the Particulars permits it and the minimum age stated is met.",
            "Guardian consent: before any application for a Minor is submitted, RECRUITER shall obtain written consent of the parent or legal guardian in Premium's prescribed form, with proof of identity and evidence of relationship (Annexure B).",
            "Where the Minor is below seventeen (17), an embassy or official sponsor support letter is required in addition to guardian consent.",
            "Where required by the Malaysian immigration authorities, EMGS or Premium, RECRUITER shall procure a suitable guardian resident in Malaysia and ensure accommodation, airport reception and supervision arrangements are disclosed to and approved by Premium before arrival.",
            "RECRUITER shall not communicate with a Minor other than with the knowledge and consent of the parent or legal guardian, and shall keep a record of such communications.",
            "RECRUITER shall ensure its personnel comply with Premium's child-protection and safeguarding policy, and shall notify Premium within twenty-four (24) hours of any safeguarding concern.",
            "Personal data of a Minor shall be collected, used and transferred only with the consent of the parent or legal guardian, per Clause 15.",
            "These requirements apply, with necessary modifications, to any student requiring additional care by reason of disability, medical condition or other vulnerability.",
            "Nothing in this Clause obliges Premium to accept any application from a Minor. Breach of this Clause is a material breach entitling Premium to terminate immediately under Clause 12(c).",
          ]}
        />
        <Clause
          n="07"
          title="Ethical Recruitment and Compliance"
          subs={[
            "RECRUITER shall conduct all recruitment lawfully, ethically and honestly, and shall not make any false, misleading or exaggerated representation as to Premium, its programmes, fees, accreditation, outcomes, employment prospects, visa outcomes or permanent residence.",
            "RECRUITER shall not submit, procure, assist in or condone the submission of any forged, altered or fraudulent document, whether to Premium, EMGS, the Immigration Department of Malaysia or any institution.",
            "RECRUITER shall comply with all applicable laws in the Territory and in Malaysia relating to student recruitment, education agency licensing, immigration and advertising.",
            "RECRUITER shall not charge any student any fee described as payable to or on behalf of Premium other than the published fees, and shall not retain any part of a student's fees.",
          ]}
        />
        <Clause
          n="08"
          title="Sub-Agents"
          subs={[
            "RECRUITER shall not appoint any sub-agent, sub-representative or counsellor unless Item 11 of the Particulars permits it and Premium has given prior written consent to the specific appointment.",
            "Where permitted, RECRUITER remains fully liable for the acts and omissions of the sub-agent, shall procure the sub-agent's compliance with this Agreement, and is solely responsible for the sub-agent's remuneration.",
            "Any other recruitment agency introduced by RECRUITER and approved by Premium shall be co-ordinated by RECRUITER, and Commission for students recruited through that agency shall be collected by RECRUITER only.",
          ]}
        />
        <Footer refNo={refNo} />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Clause
          n="09"
          title="Commission and Entitlement"
          subs={[
            "The Commission payable to RECRUITER shall be based on the current commission scheme in force, as set out in Schedule 1. Premium may review the Commission Scheme on reasonable written notice, save that no change shall affect Commission already accrued.",
            "Commission is payable only in respect of students, programmes or projects that RECRUITER has directly recruited, introduced, or in which RECRUITER has had genuine and demonstrable involvement.",
            "The introduction of any party by RECRUITER shall not of itself entitle RECRUITER to commission on every subsequent or related project arising with that party; each project is assessed on RECRUITER's actual involvement.",
            "Where a project is unrelated to RECRUITER, PECSB is under no obligation to pay commission; PECSB may at its sole discretion pay a goodwill amount, which shall not constitute a precedent.",
            "Special Programs (summer camps, winter camps, seminars and similar) are paid on a project basis per Part D of Schedule 1.",
            "RECRUITER shall specify clearly which intake and enrolment date apply when submitting claims.",
            "Commission is only payable where it is clearly demonstrated the student enrolled through RECRUITER's services. Where two or more representatives claim the same student, Premium's records of first registered contact are conclusive.",
            "Commission is payable per Enrolled Student who has paid the relevant fee; not on withdrawn, deferred or unpaid applications.",
            `Clawback: where a student withdraws, defers, is refused a visa, or receives a refund within ${v(p.clawback_months, "the period stated in Item 15")} months of enrolment, the Commission is reduced or reversed proportionately and any amount already paid shall be repaid within fourteen (14) days of demand or set off against future Commission.`,
            "To be eligible for Commission, RECRUITER must submit the completed Application Form with all required documents and receipts for all payments made.",
          ]}
        />
        <Clause
          n="10"
          title="Payment, Taxes and Set-Off"
          subs={[
            `Commission is payable within ${v(p.payment_days, "14")} working days after the student has paid the tuition and registration fees in full.`,
            "Payment is by bank transfer to the account stated in Item 17 of the Particulars. RECRUITER shall issue a valid invoice before payment. Bank charges outside Malaysia are borne by RECRUITER.",
            "All amounts are in Ringgit Malaysia, inclusive of any tax or levy for which RECRUITER is responsible. Premium may deduct any withholding tax required by law.",
            "Premium may set off against any Commission any amount owed by RECRUITER, including clawback amounts under Clause 9(i).",
          ]}
        />
        <Clause
          n="11"
          title="Records and Audit"
          subs={[
            "RECRUITER shall keep complete and accurate records of all applications, students, consents, guardian documentation and fees for not less than seven (7) years.",
            "Premium may, on reasonable notice and not more than twice in any twelve (12) month period, inspect or request copies of those records, and RECRUITER shall co-operate with any audit required by a regulator, EMGS or an institutional partner.",
          ]}
        />
        <Clause
          n="12"
          title="Termination"
          subs={[
            "This Agreement continues in force until terminated in accordance with this Clause or Clause 3.",
            "Either Party may terminate by thirty (30) days' written notice.",
            "Premium may terminate immediately by written notice if RECRUITER commits a material breach, misrepresents Premium, damages its reputation, becomes insolvent, or breaches Clause 6 (Minors), 7 (Ethical Recruitment), 13 (Confidentiality), 14 (Non-Circumvention) or 16 (Anti-Bribery).",
            "On termination, Commission remains payable for students enrolled and paid in full before the termination date. No Commission accrues for introductions after termination.",
            "On termination, RECRUITER shall cease all use of Premium's name, marks and materials, and return or destroy all confidential information and student data.",
            "Termination does not affect accrued rights or clauses intended to survive, including Clauses 6, 9, 10, 11, 13, 14, 15, 16, 20 and 24.",
          ]}
        />
        <Clause
          n="13"
          title="Confidentiality"
          subs={[
            "Each Party shall keep confidential all non-public information of the other obtained in connection with this Agreement — including pricing, the Commission Scheme, student data, partner relationships and processes — and use it solely for this Agreement.",
            "The Commission Scheme (Schedule 1) is strictly confidential and shall not be disclosed to any student, institution or third party.",
            "This obligation survives termination and does not apply to information that becomes public through no breach, or that must be disclosed by law.",
          ]}
        />
        <Clause
          n="14"
          title="Non-Circumvention and Non-Solicitation"
          subs={[
            `During the term and for ${v(p.non_solicit_months, "12")} months after termination, RECRUITER shall not, directly or indirectly, circumvent Premium or solicit, divert or attempt to divert any student, lead, partner, institution or counterparty of Premium to any competing centre, institution or programme.`,
            "RECRUITER shall not replicate, disclose or exploit Premium's processes, pricing, curricula, partner relationships or methods for its own or a third party's benefit.",
          ]}
        />
        <Clause
          n="15"
          title="Data Protection"
          subs={[
            "RECRUITER shall comply with the Personal Data Protection Act 2010 in handling personal data of prospective students, and obtain all necessary consents — including, for a Minor, that of the parent or legal guardian — before transferring personal data to Premium.",
            "Each Party shall implement reasonable measures to protect personal data against unauthorised access, loss, misuse or disclosure.",
            "RECRUITER shall notify Premium within seventy-two (72) hours of any actual or suspected loss of or unauthorised access to personal data of a student introduced under this Agreement.",
          ]}
        />
        <Clause
          n="16"
          title="Anti-Bribery and Anti-Corruption"
          subs={[
            "RECRUITER shall comply with the Malaysian Anti-Corruption Commission Act 2009 (including section 17A) and all applicable anti-bribery and anti-money-laundering laws, and shall not offer, give, request or accept any bribe, kickback or improper advantage.",
            "RECRUITER shall not make any payment or provide any benefit to any officer or employee of Premium, any institution, or any government body, in connection with any application, placement or approval.",
            "Breach of this Clause is a material breach entitling Premium to terminate immediately and withhold any Commission connected with the conduct in question.",
          ]}
        />
        <Clause
          n="17"
          title="Relationship of the Parties"
          subs={[
            "RECRUITER is engaged as an independent contractor. Nothing in this Agreement creates any employment, partnership, joint venture or agency relationship.",
            "RECRUITER is not entitled to any salary, EPF, SOCSO, EIS, leave or other employment benefit, and is responsible for its own statutory obligations, taxes and costs.",
          ]}
        />
        <Clause
          n="18"
          title="Intellectual Property and Use of Name"
          subs={[
            "All trademarks, names, logos, brochures and materials of Premium remain Premium's property; RECRUITER may use them solely for approved recruitment activities and shall cease all use on termination.",
            "RECRUITER shall not register or use Premium's name or marks — including domain names, social-media handles and business names — or represent any association beyond this Agreement, without prior written consent.",
          ]}
        />
        <Clause
          n="19"
          title="Representations and Warranties"
          subs={[
            "Each Party represents and warrants that it has full power and authority to enter into and perform this Agreement.",
            "RECRUITER represents and warrants that it holds all registrations and approvals necessary for its activities under this Agreement, and will conduct them lawfully and ethically.",
          ]}
        />
        <Clause
          n="20"
          title="Indemnity and Liability"
          subs={[
            "RECRUITER shall indemnify Premium against any loss, claim, liability, cost or expense arising from RECRUITER's breach, misrepresentation, negligence or unlawful conduct.",
            "Neither Party is liable for indirect or consequential loss. Premium's total aggregate liability shall not exceed the total Commission paid to RECRUITER in the twelve (12) months preceding the claim.",
            "The limitation in (b) does not apply to RECRUITER's liability under Clauses 6, 7, 13, 14 or 16, or to fraud.",
          ]}
        />
        <Clause
          n="21"
          title="Force Majeure"
          subs={[
            "Neither Party is liable for delay or failure caused by events beyond its reasonable control, including acts of God, epidemic or pandemic, government action, or changes in immigration or education regulation.",
          ]}
        />
        <Clause
          n="22"
          title="Notices"
          subs={[
            "Notices shall be in writing to the contacts stated in Items 6 and 7 of the Particulars, by hand, courier or email, and are deemed received on delivery or, for email, on transmission during business hours.",
          ]}
        />
        <Clause
          n="23"
          title="General"
          subs={[
            "Entire Agreement: this Agreement with its Particulars, Schedules and Annexures constitutes the entire agreement and supersedes all prior arrangements.",
            "Variation: no variation is effective unless in writing and signed by both Parties.",
            "Assignment: RECRUITER shall not assign or sub-contract without Premium's prior written consent.",
            "Severability: if any provision is held invalid, the remaining provisions continue in force.",
            "Waiver: no failure or delay in exercising any right operates as a waiver.",
            "Counterparts and electronic signature: this Agreement may be signed in counterparts, and a scanned or electronic signature is as valid as an original.",
            "Stamp duty: this Agreement shall be stamped per the Stamp Act 1949; the duty is borne by RECRUITER unless otherwise agreed.",
            "Language: executed in English; the English text prevails.",
            "Third parties: no non-Party may enforce any term.",
          ]}
        />
        <Clause
          n="24"
          title="Validity, Governing Law and Dispute Resolution"
          subs={[
            "This Agreement is made in duplicate and becomes effective upon signatures by both Parties. Supplementary terms agreed by both Parties have the same legal effect.",
            "This Agreement is governed by the laws of Malaysia.",
            "Disputes shall first be settled through friendly consultation within thirty (30) days, failing which they are submitted to the Courts of Kuala Lumpur.",
          ]}
        />

        <Text style={[s.para, { marginTop: 14, fontWeight: 500, color: INK }]}>
          In witness whereof the Parties have hereunto set their hands the day and year first above
          written.
        </Text>
        <View style={s.sigWrap} wrap={false}>
          <SigBlock
            party={PECSB.name}
            signedName={a.pecsb_signed_name}
            designation={a.pecsb_signed_designation}
            date={a.pecsb_signed_at}
          />
          <SigBlock
            party={recruiter}
            signedName={a.agent_signed_name}
            designation={a.agent_signed_designation ?? p.signatory_designation}
            date={a.agent_signed_at}
            kind={a.agent_signature_kind}
          />
        </View>
        <Footer refNo={refNo} />
      </Page>

      {/* ------------------------------------------------ Schedule 1 */}
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Text style={s.kicker}>SCHEDULE 1</Text>
        <Text style={[s.h1, { fontSize: 18 }]}>Commission Scheme</Text>
        <Text style={[s.small, { marginBottom: 6 }]}>
          Strictly Private & Confidential — between PECSB and RECRUITER only. Commission is payable
          per Enrolled Student in accordance with Clause 9.
          {tiers.length > 1 ? ` Volume tiers are counted per calendar year (${tiers.map((_, i) => tierLabel(tiers, i)).join("; ")}).` : ""}
        </Text>

        <Text style={s.h2}>Part A — University Placement Commission</Text>
        <Text style={s.small}>Flat amount per enrolled student.</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { flex: 2 }]}>UNIVERSITY</Text>
            <Text style={[s.th, { flex: 1 }]}>LEVEL</Text>
            {tiers.map((_, i) => (
              <Text key={i} style={[s.th, { flex: 1 }]}>{tiers.length > 1 ? tierLabel(tiers, i).toUpperCase() : "PER STUDENT"}</Text>
            ))}
          </View>
          {(sc.university ?? []).length === 0 ? (
            <View style={s.trLast}>
              <Text style={[s.tdMuted, { flex: 1 }]}>Not applicable</Text>
            </View>
          ) : (
            (sc.university ?? []).map((r, i, arr) => (
              <View key={i} style={i === arr.length - 1 ? s.trLast : s.tr}>
                <Text style={[s.td, { flex: 2 }]}>{v(r.university)}</Text>
                <Text style={[s.td, { flex: 1 }]}>{v(r.level)}</Text>
                {tiers.map((_, ti) => (
                  <Text key={ti} style={[s.td, { flex: 1 }]}>{rm(r.amounts?.[ti])}</Text>
                ))}
              </View>
            ))
          )}
        </View>

        <Text style={s.h2}>Part B — English Programme Commission</Text>
        <Text style={s.small}>
          Percentage of the English programme fee (Part C), exclusive of registration, resource and
          visa fees.
        </Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { flex: 2 }]}>PROGRAMME LENGTH</Text>
            {tiers.map((_, i) => (
              <Text key={i} style={[s.th, { flex: 1 }]}>{tiers.length > 1 ? tierLabel(tiers, i).toUpperCase() : "RATE"}</Text>
            ))}
          </View>
          {(sc.english ?? []).length === 0 ? (
            <View style={s.trLast}>
              <Text style={[s.tdMuted, { flex: 1 }]}>Not applicable</Text>
            </View>
          ) : (
            (sc.english ?? []).map((r, i, arr) => (
              <View key={i} style={i === arr.length - 1 ? s.trLast : s.tr}>
                <Text style={[s.td, { flex: 2 }]}>{v(r.length)}</Text>
                {tiers.map((_, ti) => (
                  <Text key={ti} style={[s.td, { flex: 1 }]}>{pct(r.pcts?.[ti])}</Text>
                ))}
              </View>
            ))
          )}
        </View>

        {(sc.english_prices ?? []).length > 0 && (
          <>
            <Text style={s.h2}>Part C — English Programme Prices (reference)</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.th, { flex: 2 }]}>PROGRAMME</Text>
                <Text style={[s.th, { flex: 1 }]}>FACE-TO-FACE</Text>
                <Text style={[s.th, { flex: 1 }]}>ONLINE</Text>
              </View>
              {(sc.english_prices ?? []).map((r, i, arr) => (
                <View key={i} style={i === arr.length - 1 ? s.trLast : s.tr}>
                  <Text style={[s.td, { flex: 2 }]}>{v(r.programme)}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{rm(r.f2f)}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{rm(r.online)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.h2}>Part D — Special Programmes</Text>
        <Text style={s.para}>
          Special programmes (summer camps, winter camps, seminars, corporate groups):{" "}
          {sc.special_min_pct != null || sc.special_max_pct != null
            ? `${pct(sc.special_min_pct)} – ${pct(sc.special_max_pct)}`
            : "determined on a project basis"}
          . Commission is agreed in writing before the programme is confirmed (Clause 9(e)).
        </Text>

        <View style={{ flexDirection: "row", gap: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Part E — One-Time Fees</Text>
            <Text style={s.small}>On enrolment — not commissionable.</Text>
            <View style={s.table}>
              {(sc.one_time ?? []).map((r, i, arr) => (
                <View key={i} style={i === arr.length - 1 ? s.trLast : s.tr}>
                  <Text style={[s.td, { flex: 2 }]}>{v(r.item)}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{rm(r.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Part F — Visa Fees</Text>
            <Text style={s.small}>Not commissionable.</Text>
            <View style={s.table}>
              {(sc.visa ?? []).map((r, i, arr) => (
                <View key={i} style={i === arr.length - 1 ? s.trLast : s.tr}>
                  <Text style={[s.td, { flex: 2 }]}>{v(r.item)}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{rm(r.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={[s.para, { marginTop: 12 }]}>
          This Schedule is valid from {fmtDate(a.valid_from)} until {fmtDate(a.valid_until)}, or
          until replaced by a revised Schedule signed by both Parties. Rates are confidential to
          PECSB and RECRUITER and supersede any prior verbal arrangement. Payment terms per Item 14;
          clawback per Clause 9(i).
        </Text>
        <Footer refNo={refNo} />
      </Page>

      {/* ------------------------------------------------ Annexures */}
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        <Text style={s.kicker}>ANNEXURE A</Text>
        <Text style={[s.h1, { fontSize: 18 }]}>Admission Procedure</Text>
        <Text style={s.para}>
          Applications with incomplete information and/or documents will not be processed; the time
          frame starts only when all required information and documents are complete.
        </Text>
        <Text style={s.h2}>(a) Documents required for application & visa processing</Text>
        {[
          "Completed Application Form (online — www.premium.edu.my).",
          "Copy of latest academic transcript with certified true copies.",
          "Passport-sized photograph with white background.",
          "Coloured copy of passport including all blank pages, with at least 18 months' validity.",
          "Health Declaration Form (for visa application — downloadable from the EMGS website); its date must match the visa application date.",
        ].map((t, i) => (
          <Text key={i} style={s.sub}>({["I", "II", "III", "IV", "V"][i]})  {t}</Text>
        ))}
        <Text style={s.h2}>(b) Documents required for university application</Text>
        {[
          "Passport-sized photograph with white background.",
          "Coloured copy of passport including all blank pages, with at least 18 months' validity.",
          "Copy of original and translated academic certificates with certified true copies.",
          "Copy of original and translated academic transcript with certified true copies.",
        ].map((t, i) => (
          <Text key={i} style={s.sub}>({["I", "II", "III", "IV"][i]})  {t}</Text>
        ))}

        {p.minors && (
          <>
            <Text style={[s.kicker, { marginTop: 22 }]}>ANNEXURE B</Text>
            <Text style={[s.h1, { fontSize: 18 }]}>Minor Student Requirements</Text>
            <Text style={s.para}>
              Applies where Item 12 of the Particulars permits the recruitment of Minors. It
              supplements, and does not replace, Annexure A.
            </Text>
            {[
              "Parent / legal guardian consent form in Premium's prescribed form, signed.",
              "Copy of birth certificate (original and certified English translation).",
              "Copy of parent's or legal guardian's NRIC or passport.",
              "Evidence of relationship or legal guardianship.",
              "Embassy or sponsor support letter (required where under 17).",
              "Local guardian details in Malaysia, where required by EMGS or Premium.",
            ].map((t, i) => (
              <Text key={i} style={s.sub}>{i + 1}.  {t}</Text>
            ))}
          </>
        )}
        <Footer refNo={refNo} />
      </Page>
    </Document>
  );
}
