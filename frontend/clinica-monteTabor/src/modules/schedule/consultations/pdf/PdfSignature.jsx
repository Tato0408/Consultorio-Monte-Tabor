import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        alignItems: "center",
    },
    line: {
        borderTop: "1 solid #1e293b",
        width: 220,
        marginBottom: 4,
    },
    label: {
        fontSize: 9,
    },
    seal: {
        fontSize: 9,
        marginTop: 24,
    },
});

// Espacio para la firma y el sello físico del médico, se completan a
// mano sobre el documento ya impreso. doctorName se imprime sobre la
// línea como referencia de quién atendió, no reemplaza la firma
// manuscrita ni el sello.
const PdfSignature = ({ doctorName }) => (
    <View style={styles.container}>
        <View style={styles.line} />
        <Text style={styles.label}>{doctorName || "Firma"}</Text>
        <Text style={styles.seal}>Sello médico:</Text>
    </View>
);

export default PdfSignature;
