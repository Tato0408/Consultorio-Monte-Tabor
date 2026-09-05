import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
    title: {
        fontSize: 13,
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 20,
        textDecoration: "underline",
    },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
    label: { fontWeight: 700 },
    paragraph: { marginBottom: 12, lineHeight: 1.5 },
    body: { marginBottom: 12, lineHeight: 1.5, paddingLeft: 8 },
});

// Referencia médica a otro especialista. Mismo formato de constancia que
// IncapacidadDocument (encabezado con membrete, cuerpo y firma), adaptado al
// motivo y destino de la referencia.
const ReferenciaDocument = ({ title, patientName, dui, age, reason, referredTo, doctorName, date }) => (
    <Document title={title}>
        <Page size="LETTER" style={styles.page}>
            <PdfLetterhead />
            <Text style={styles.title}>REFERENCIA MÉDICA</Text>

            <View style={styles.row}>
                <Text>Fecha: {date}</Text>
                {dui ? <Text>DUI: {dui}</Text> : null}
            </View>

            <Text style={styles.paragraph}>
                Por este medio se refiere al paciente <Text style={styles.label}>{patientName}</Text>,
                de {age ?? "—"} años de edad, a:
            </Text>

            <Text style={styles.body}>{referredTo || "Especialista no especificado"}</Text>

            <Text style={styles.paragraph}>Motivo de la referencia:</Text>
            <Text style={styles.body}>{reason || "Sin motivo registrado"}</Text>

            <PdfSignature doctorName={doctorName} />
        </Page>
    </Document>
);

export default ReferenciaDocument;
