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

// Espacio para la firma y el sello del médico. Por defecto se completan a mano sobre el
// documento ya impreso (comportamiento de siempre). Si quien genera el PDF es un doctor o
// admin que guardó su propia firma/sello (ver EditProfileModal.jsx > SignatureSealModal,
// y useMySignatureAssets.js para cómo se resuelven), esas imágenes se estampan encima del
// espacio correspondiente — nunca las de otro doctor, siempre las de quien genera el
// documento en este momento, sin importar de qué consulta se trate. doctorName sigue
// saliendo de donde ya salía (la cita/consulta), esto no cambia esa lógica.
const PdfSignature = ({ doctorName, signatureUrl, sealUrl }) => (
    <View style={styles.container}>
        {signatureUrl && <Image src={signatureUrl} style={styles.signatureImg} />}
        <View style={styles.line} />
        <Text style={styles.label}>{doctorName || "Firma"}</Text>
        {sealUrl ? <Image src={sealUrl} style={styles.sealImg} /> : <Text style={styles.seal}>Sello médico:</Text>}
    </View>
);

export default PdfSignature;
