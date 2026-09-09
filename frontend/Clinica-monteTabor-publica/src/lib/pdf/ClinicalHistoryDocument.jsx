import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";

// Copia del documento del panel privado
// (frontend/clinica-monteTabor/src/modules/schedule/consultations/pdf/ClinicalHistoryDocument.jsx),
// duplicada porque son dos builds de Vite separados. El acento azul es el del
// portal (#3B6FCA), igual que el resto de PDFs de esta carpeta.
const ACCENT = "#3B6FCA";
const EMPTY = "—";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
  title: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    textDecoration: "underline",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  idBand: {
    borderTop: "1 solid #cbd5e1",
    borderBottom: "1 solid #cbd5e1",
    paddingVertical: 8,
    marginBottom: 2,
  },
  idRow: { flexDirection: "row", marginTop: 6 },
  idItem: { flexGrow: 1, paddingRight: 6 },
  idLabel: {
    fontSize: 6.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#64748b",
    marginBottom: 1,
  },
  idValue: { fontSize: 9.5, fontWeight: 700, color: "#1e293b" },
  secHead: {
    flexDirection: "row",
    borderBottom: `1 solid ${ACCENT}`,
    paddingBottom: 3,
    marginTop: 18,
    marginBottom: 3,
  },
  secTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  secNote: { fontSize: 7, color: "#94a3b8", marginBottom: 6, lineHeight: 1.4 },
  subHead: {
    fontSize: 8,
    fontWeight: 700,
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  ledHead: {
    flexDirection: "row",
    backgroundColor: "#f4f7fb",
    borderTop: "1 solid #c9d8ea",
    borderBottom: "1 solid #c9d8ea",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  ledHeadCell: {
    fontSize: 6.5,
    fontWeight: 700,
    color: "#5b6b7d",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ledRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottom: "1 solid #e8edf3",
  },
  ledRowAlt: { backgroundColor: "#fbfcfe" },
  ledFirst: { fontSize: 8.5, fontWeight: 700, color: "#0f2942" },
  ledCell: { fontSize: 8.5, color: "#334155", textAlign: "center" },
  prose: { fontSize: 9, lineHeight: 1.5, color: "#334155" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1 solid #cbd5e1",
    paddingTop: 6,
    marginTop: 22,
  },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text || EMPTY;
};

const IdItem = ({ label, value }) => (
  <View style={styles.idItem}>
    <Text style={styles.idLabel}>{label}</Text>
    <Text style={styles.idValue}>{clean(value)}</Text>
  </View>
);

const SectionHead = ({ number, title }) => (
  <View style={styles.secHead}>
    <Text style={styles.secTitle}>{number}. {title}</Text>
  </View>
);

const LedgerRow = ({ cells, alt }) => (
  <View style={[styles.ledRow, alt && styles.ledRowAlt]} wrap={false}>
    {cells.map((cell, index) => (
      <Text
        key={index}
        style={[
          cell.first ? styles.ledFirst : styles.ledCell,
          cell.width ? { width: cell.width } : { flexGrow: cell.flex ?? 1, flexBasis: 0 },
          cell.align ? { textAlign: cell.align } : null,
        ]}
      >
        {clean(cell.text)}
      </Text>
    ))}
  </View>
);

const LedgerHead = ({ cells }) => (
  <View style={styles.ledHead}>
    {cells.map((cell, index) => (
      <Text
        key={index}
        style={[
          styles.ledHeadCell,
          cell.width ? { width: cell.width } : { flexGrow: cell.flex ?? 1, flexBasis: 0 },
          cell.align ? { textAlign: cell.align } : null,
        ]}
      >
        {cell.text}
      </Text>
    ))}
  </View>
);

const ClinicalHistoryDocument = ({
  title,
  patientName,
  age,
  gender,
  dui,
  bloodType,
  birthDate,
  date,
  time,
  vitals = [],
  hereditary = [],
  pathological = [],
  nonPathological,
  ecologicalSocial,
  procedures = [],
}) => {
  const vitalsHeadCells = [
    { text: "Fecha", width: 62 },
    { text: "Presión (mmHg)" },
    { text: "Glucosa (mg/dL)" },
    { text: "Peso (kg)" },
    { text: "Talla (m)" },
    { text: "Temp. (°C)" },
    { text: "SpO2 (%)" },
  ];
  const hereditaryHeadCells = [
    { text: "Parentesco", flex: 1.1 },
    { text: "Condición", flex: 1.7 },
    { text: "Tipo", flex: 0.9 },
  ];
  const pathologicalHeadCells = [
    { text: "Enfermedad", flex: 1.3 },
    { text: "Diagnóstico", flex: 1.3 },
    { text: "Tipo", flex: 0.9 },
  ];
  const proceduresHeadCells = [
    { text: "Procedimiento", flex: 1 },
    { text: "Fecha", width: 96, align: "right" },
  ];

  return (
    <Document title={title}>
      <Page size="LETTER" style={styles.page} wrap>
        <PdfLetterhead />
        <Text style={styles.title}>HISTORIAL CLÍNICO DEL PACIENTE</Text>

        <View style={styles.idBand}>
          <IdItem label="Paciente" value={patientName} />
          <View style={styles.idRow}>
            <IdItem label="Edad" value={age} />
            <IdItem label="Sexo" value={gender} />
            <IdItem label="DUI" value={dui} />
            <IdItem label="Tipo de sangre" value={bloodType} />
            <IdItem label="Fecha de nacimiento" value={birthDate} />
          </View>
        </View>

        <SectionHead number={1} title="Signos vitales" />
        <Text style={styles.secNote}>
          Todas las tomas registradas, de la más reciente a la más antigua. El IMC y su categoría se consultan en tu perfil.
        </Text>
        <LedgerHead cells={vitalsHeadCells} />
        {vitals.length > 0 ? (
          vitals.map((v, index) => (
            <LedgerRow
              key={index}
              alt={index % 2 === 1}
              cells={[
                { text: v.fecha, width: 62, first: true },
                { text: v.presion },
                { text: v.glucosa },
                { text: v.peso },
                { text: v.altura },
                { text: v.temp },
                { text: v.spo2 },
              ]}
            />
          ))
        ) : (
          <LedgerRow cells={[{ text: "Sin tomas de signos vitales registradas.", flex: 1, first: true }]} />
        )}

        <SectionHead number={2} title="Antecedentes" />
        <Text style={styles.secNote}>Antecedentes registrados, de todos los tipos.</Text>

        <Text style={styles.subHead}>Hereditarios</Text>
        <LedgerHead cells={hereditaryHeadCells} />
        {hereditary.length > 0 ? (
          hereditary.map((h, index) => (
            <LedgerRow
              key={index}
              alt={index % 2 === 1}
              cells={[
                { text: h.parentesco, flex: 1.1, first: true },
                { text: h.condicion, flex: 1.7, align: "left" },
                { text: h.tipo, flex: 0.9, align: "left" },
              ]}
            />
          ))
        ) : (
          <LedgerRow cells={[{ text: EMPTY, flex: 1, first: true }]} />
        )}

        <Text style={styles.subHead}>Patológicos</Text>
        <LedgerHead cells={pathologicalHeadCells} />
        {pathological.length > 0 ? (
          pathological.map((p, index) => (
            <LedgerRow
              key={index}
              alt={index % 2 === 1}
              cells={[
                { text: p.enfermedad, flex: 1.3, first: true },
                { text: p.diagnostico, flex: 1.3, align: "left" },
                { text: p.tipo, flex: 0.9, align: "left" },
              ]}
            />
          ))
        ) : (
          <LedgerRow cells={[{ text: EMPTY, flex: 1, first: true }]} />
        )}

        <Text style={styles.subHead}>No patológicos</Text>
        <Text style={styles.prose}>{clean(nonPathological)}</Text>

        <Text style={styles.subHead}>Ecológico-sociales</Text>
        <Text style={styles.prose}>{clean(ecologicalSocial)}</Text>

        <SectionHead number={3} title="Procedimientos realizados" />
        <Text style={styles.secNote}>Procedimientos con respaldo en una consulta atendida.</Text>
        <LedgerHead cells={proceduresHeadCells} />
        {procedures.length > 0 ? (
          procedures.map((proc, index) => (
            <LedgerRow
              key={index}
              alt={index % 2 === 1}
              cells={[
                { text: proc.nombre, flex: 1, first: true },
                { text: proc.fecha, width: 96, align: "right" },
              ]}
            />
          ))
        ) : (
          <LedgerRow cells={[{ text: EMPTY, flex: 1, first: true }]} />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Clínica Familiar Monte Tabor · Expediente clínico</Text>
          <Text style={styles.footerText}>
            Documento generado el {date}{time ? `, ${time}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ClinicalHistoryDocument;
