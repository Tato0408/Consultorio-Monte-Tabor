import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";

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
        borderBottom: "2 solid #0b66d6",
        paddingBottom: 8,
        marginBottom: 14,
    },
    logo: {
        width: 44,
        height: 44,
        marginRight: 10,
    },
    name: {
        fontSize: 14,
        fontWeight: 700,
        color: "#0b66d6",
    },
    detail: {
        fontSize: 8,
        color: "#475569",
    },
});

// Membrete reutilizado por todos los documentos generados desde
// Consultas (incapacidad y consulta completa), con los datos reales
// de la clínica en vez de los del formato de papel de referencia.
const PdfLetterhead = () => (
    <View style={styles.container}>
        <Image style={styles.logo} src={CLINIC_INFO.logoUrl} />
        <View>
            <Text style={styles.name}>{CLINIC_INFO.name}</Text>
            <Text style={styles.detail}>{CLINIC_INFO.address}</Text>
            <Text style={styles.detail}>WhatsApp {CLINIC_INFO.whatsapp}</Text>
        </View>
    </View>
);

export default PdfLetterhead;
