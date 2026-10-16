import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

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
    signatureImg: {
        width: 140,
        height: 50,
        objectFit: "contain",
        marginBottom: -6,
    },
    sealImg: {
        width: 90,
        height: 90,
        objectFit: "contain",
        marginTop: 10,
    },
});

// Espacio para la firma y el sello del doctor asignado a la cita, cuyo nombre
// recibe en doctorName. Si llegan signatureUrl y sealUrl, las imágenes se
// estampan encima del espacio. Solo llegan cuando quien descarga es ese
// doctor o el admin (ver documentSignature.js); para enfermería y recepción
// el espacio queda en blanco para firmar y sellar a mano.
const PdfSignature = ({ doctorName, signatureUrl, sealUrl }) => (
    <View style={styles.container}>
        {signatureUrl && <Image src={signatureUrl} style={styles.signatureImg} />}
        <View style={styles.line} />
        <Text style={styles.label}>{doctorName || "Firma"}</Text>
        {sealUrl ? <Image src={sealUrl} style={styles.sealImg} /> : <Text style={styles.seal}>Sello médico:</Text>}
    </View>
);

export default PdfSignature;
