import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: { marginTop: 30, alignItems: "center" },
  line: { borderTop: "1 solid #1e293b", width: 200, marginBottom: 4 },
  label: { fontSize: 9 },
  seal: { fontSize: 9, marginTop: 16 },
});

// Espacio para la firma y el sello físico del médico, igual que en el panel privado
// (ver PdfSignature.jsx de clinica-monteTabor) — se completan a mano sobre el documento
// ya impreso, doctorName es solo referencia de quién atendió.
const PdfSignature = ({ doctorName, compact = false }) => (
  <View style={[styles.container, compact && { marginTop: 16 }]}>
    <View style={styles.line} />
    <Text style={styles.label}>{doctorName || "Firma"}</Text>
    {!compact && <Text style={styles.seal}>Sello médico:</Text>}
  </View>
);

export default PdfSignature;
