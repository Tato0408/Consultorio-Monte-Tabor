import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";

// Media carta (mitad de LETTER: 612 x 396pt): una receta no necesita una hoja completa,
// y así se puede imprimir dos en una misma hoja si se quiere. Mismo formato que ya usa
// el portal del paciente (ver Clinica-monteTabor-publica/src/lib/pdf/RecetaDocument.jsx),
// para que el mismo documento se vea igual sin importar desde dónde se genere.
const HALF_LETTER = [612, 396];

const styles = StyleSheet.create({
  page: { padding: 26, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 11.5, fontWeight: 700, textAlign: "center", marginBottom: 10, textDecoration: "underline" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontWeight: 700 },
  sectionTitle: { fontSize: 9.5, fontWeight: 700, color: "#0b66d6", marginTop: 8, marginBottom: 3 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 3 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 3 },
  cellName: { flex: 1.4, fontSize: 8 },
  cell: { flex: 1, fontSize: 8 },
  cellHeader: { flex: 1, fontSize: 7.5, fontWeight: 700, color: "#475569" },
  cellHeaderName: { flex: 1.4, fontSize: 7.5, fontWeight: 700, color: "#475569" },
  instructions: { fontSize: 7.5, color: "#64748b", marginTop: 1 },
  paragraph: { fontSize: 8, lineHeight: 1.4 },
});

// Receta médica, formato compacto de media página. medications viene tal
// cual lo guardó el doctor en la consulta (prescriptionsModel).
const RecetaDocument = ({
  title,
  patientName,
  dui,
  age,
  doctorName,
  signatureUrl,
  sealUrl,
  date,
  time,
  medications = [],
  instructions,
}) => (
  <Document title={title}>
    <Page size={HALF_LETTER} style={styles.page}>
      <PdfLetterhead compact />
      <Text style={styles.title}>RECETA MÉDICA</Text>

      <View style={styles.row}>
        <Text>Paciente: <Text style={styles.label}>{patientName}</Text></Text>
        <Text>Fecha: {date}{time ? `   Hora: ${time}` : ""}</Text>
      </View>
      <View style={styles.row}>
        <Text>Edad: {age ?? "—"}</Text>
        {dui ? <Text>DUI: {dui}</Text> : null}
      </View>

      {medications.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Medicamentos</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cellHeaderName}>Medicamento</Text>
            <Text style={styles.cellHeader}>Dosis</Text>
            <Text style={styles.cellHeader}>Frecuencia</Text>
            <Text style={styles.cellHeader}>Duración</Text>
          </View>
          {medications.map((m, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.cellName}>
                <Text>{m.name || "—"}</Text>
                {m.instructions && <Text style={styles.instructions}>{m.instructions}</Text>}
              </View>
              <Text style={styles.cell}>{m.dose || "—"}</Text>
              <Text style={styles.cell}>{m.frequency || "—"}</Text>
              <Text style={styles.cell}>{m.duration || "—"}</Text>
            </View>
          ))}
        </>
      )}

      {instructions && (
        <>
          <Text style={styles.sectionTitle}>Indicaciones</Text>
          <Text style={styles.paragraph}>{instructions}</Text>
        </>
      )}

      <PdfSignature doctorName={doctorName} signatureUrl={signatureUrl} sealUrl={sealUrl} compact />
    </Page>
  </Document>
);

export default RecetaDocument;
