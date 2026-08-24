import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";

// Mismos datos que frontend/clinica-monteTabor/src/modules/schedule/consultations/pdf/PdfLetterhead.jsx
// (panel privado) — se duplica acá porque son dos builds de Vite separados, sin paquete
// compartido entre ambos frontends.
const CLINIC_INFO = {
  name: "Clínica Familiar Monte Tabor",
  address: "Barrio Concepción, Pasaje San Antonio, casa N.° 6, Distrito de Soyapango, Municipio de San Salvador Este",
  whatsapp: "7548-6791",
  logoUrl: "/logoMonteTabor.png",
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: "2 solid #3B6FCA",
    paddingBottom: 8,
    marginBottom: 14,
  },
  logo: { width: 44, height: 44, marginRight: 10 },
  name: { fontSize: 14, fontWeight: 700, color: "#3B6FCA" },
  detail: { fontSize: 8, color: "#475569" },
});

const PdfLetterhead = ({ compact = false }) => (
  <View style={[styles.container, compact && { paddingBottom: 5, marginBottom: 8 }]}>
    <Image style={compact ? { width: 32, height: 32, marginRight: 8 } : styles.logo} src={CLINIC_INFO.logoUrl} />
    <View>
      <Text style={compact ? { fontSize: 11, fontWeight: 700, color: "#3B6FCA" } : styles.name}>{CLINIC_INFO.name}</Text>
      <Text style={styles.detail}>{CLINIC_INFO.address}</Text>
      <Text style={styles.detail}>WhatsApp {CLINIC_INFO.whatsapp}</Text>
    </View>
  </View>
);

export default PdfLetterhead;
