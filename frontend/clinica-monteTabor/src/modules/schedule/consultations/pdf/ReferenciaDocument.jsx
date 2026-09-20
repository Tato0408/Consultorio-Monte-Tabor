import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
    title: {
        fontSize: 13,
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 22,
        textDecoration: "underline",
    },
    field: { flexDirection: "row", marginBottom: 12, lineHeight: 1.4 },
    fieldLabel: { fontWeight: 700, marginRight: 6 },
    fieldValue: { flex: 1 },
    twoCol: { flexDirection: "row", marginBottom: 12 },
    colItem: { flexDirection: "row", marginRight: 24 },
    sectionLabel: { fontWeight: 700, marginTop: 4, marginBottom: 6 },
    vitalsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    vitalItem: { flexDirection: "row", marginRight: 22, marginBottom: 4 },
    vitalLabel: { fontWeight: 700, marginRight: 4 },
    block: { marginBottom: 12, lineHeight: 1.5, paddingLeft: 6 },
});

const val = (v) => (v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—");

// Referencia médica a otro nivel de atención. Reproduce el formato de la hoja
// de "CONSULTORIO MEDICO FAMILIAR" (campos: fecha, datos del paciente, referido
// a, motivo, examen físico e impresión diagnóstica), pero con el membrete y la
// firma de Clínica Monte Tabor (los mismos que el resto de documentos). Los
// datos salen de la consulta; el teléfono del paciente, la dirección y el
// teléfono del médico referido, FC y FR los llena el doctor en el panel
// "Referencia".
const ReferenciaDocument = ({
    title,
    patientName,
    age,
    patientPhone,
    phone,
    referredDoctorAddress,
    referredDoctorPhone,
    date,
    time,
    referredTo,
    reason,
    bloodPressure,
    heartRate,
    respiratoryRate,
    spo2,
    physicalExam,
    icdCode,
    diagnosis,
    diagnosisDescription,
    doctorName,
    signatureUrl,
    sealUrl,
}) => {
    // phone se mantiene por compatibilidad con llamadores viejos que pasaban
    // el teléfono del paciente con ese nombre.
    const patientPhoneValue = patientPhone ?? phone;
    // La hoja de referencia no incluye DUI; si algún llamador lo pasa, React lo
    // ignora sin problema.
    const impresion = [icdCode, diagnosis].filter(Boolean).join(" - ")
        + (diagnosisDescription ? `${icdCode || diagnosis ? ". " : ""}${diagnosisDescription}` : "");

    return (
        <Document title={title}>
            <Page size="LETTER" style={styles.page}>
                <PdfLetterhead />
                <Text style={styles.title}>REFERENCIA</Text>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>FECHA:</Text>
                    <Text style={styles.fieldValue}>{val(date)}{time ? `   Hora: ${time}` : ""}</Text>
                </View>

                <View style={styles.twoCol}>
                    <View style={styles.colItem}>
                        <Text style={styles.fieldLabel}>NOMBRE:</Text>
                        <Text>{val(patientName)}</Text>
                    </View>
                    <View style={styles.colItem}>
                        <Text style={styles.fieldLabel}>EDAD:</Text>
                        <Text>{age !== undefined && age !== null ? `${age} años` : "—"}</Text>
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>TELÉFONO DEL PACIENTE:</Text>
                    <Text style={styles.fieldValue}>{val(patientPhoneValue)}</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>REFERIDO A:</Text>
                    <Text style={styles.fieldValue}>{val(referredTo)}</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>DIRECCIÓN DEL DOCTOR REFERIDO:</Text>
                    <Text style={styles.fieldValue}>{val(referredDoctorAddress)}</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>TELÉFONO DEL DOCTOR REFERIDO:</Text>
                    <Text style={styles.fieldValue}>{val(referredDoctorPhone)}</Text>
                </View>

                <Text style={styles.sectionLabel}>MOTIVO DE REFERENCIA:</Text>
                <Text style={styles.block}>{val(reason)}</Text>

                <Text style={styles.sectionLabel}>EXAMEN FÍSICO:</Text>
                <View style={styles.vitalsRow}>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>PA:</Text>
                        <Text>{val(bloodPressure)}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>FC:</Text>
                        <Text>{val(heartRate)}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>FR:</Text>
                        <Text>{val(respiratoryRate)}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>SPO2%:</Text>
                        <Text>{val(spo2)}</Text>
                    </View>
                </View>
                <Text style={styles.block}>{val(physicalExam)}</Text>

                <Text style={styles.sectionLabel}>IMPRESIÓN DIAGNOSTICADA:</Text>
                <Text style={styles.block}>{impresion.trim() || "—"}</Text>

                <PdfSignature doctorName={doctorName} signatureUrl={signatureUrl} sealUrl={sealUrl} />
            </Page>
        </Document>
    );
};

export default ReferenciaDocument;
