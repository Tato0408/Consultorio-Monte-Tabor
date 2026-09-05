import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";

// Mismo formato que genera el panel privado (ver IncapacidadDocument.jsx de
// clinica-monteTabor), para que la incapacidad que descarga el paciente sea
// idéntica a la que ya emite la clínica.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 20, textDecoration: "underline" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  label: { fontWeight: 700 },
  paragraph: { marginBottom: 12, lineHeight: 1.5 },
  diagnosis: { marginBottom: 12, lineHeight: 1.5, paddingLeft: 8 },
});

const IncapacidadDocument = ({ title, patientName, dui, age, diagnosis, restDays, doctorName, date }) => (
  <Document title={title}>
    <Page size="LETTER" style={styles.page}>
      <PdfLetterhead />
      <Text style={styles.title}>CONSTANCIA DE INCAPACIDAD MÉDICA</Text>

      <View style={styles.row}>
        <Text>Fecha: {date}</Text>
        {dui ? <Text>DUI: {dui}</Text> : null}
      </View>

      <Text style={styles.paragraph}>
        Por este medio se hace constar que <Text style={styles.label}>{patientName}</Text>,
        de {age ?? "—"} años de edad, fue atendido(a) en esta clínica y presenta:
      </Text>

      <Text style={styles.diagnosis}>{diagnosis || "Sin diagnóstico registrado"}</Text>

      <Text style={styles.paragraph}>
        Por lo anterior, se indica reposo médico por <Text style={styles.label}>{restDays}</Text> día(s) a partir de la fecha.
      </Text>

      <Text style={styles.paragraph}>
        Y para los usos que estime convenientes, se extiende la presente en San Salvador Este, Distrito de Soyapango.
      </Text>

      <PdfSignature doctorName={doctorName} />
    </Page>
  </Document>
);

export default IncapacidadDocument;
