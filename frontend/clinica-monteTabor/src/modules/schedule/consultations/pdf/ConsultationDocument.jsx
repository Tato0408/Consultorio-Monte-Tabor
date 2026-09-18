import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b" },
    title: {
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 14,
        textDecoration: "underline",
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    vitalsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        borderTop: "1 solid #cbd5e1",
        borderBottom: "1 solid #cbd5e1",
        paddingVertical: 6,
        marginBottom: 10,
    },
    vitalItem: { width: "16%", marginBottom: 2 },
    vitalLabel: { fontSize: 7.5, color: "#64748b" },
    vitalValue: { fontSize: 9.5, fontWeight: 700 },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: "#0b66d6",
        marginTop: 12,
        marginBottom: 4,
        borderBottom: "1 solid #dbeafe",
        paddingBottom: 2,
    },
    paragraph: { lineHeight: 1.5, marginBottom: 4 },
    row: { flexDirection: "row", marginBottom: 3 },
    rowLabel: { fontWeight: 700, marginRight: 4 },
    tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 4 },
    tableRow: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 4 },
    tableCell: { flex: 1, fontSize: 8.5 },
    tableCellHeader: { flex: 1, fontSize: 8, fontWeight: 700, color: "#475569" },
});

const Field = ({ label, value }) => (
    <Text style={styles.paragraph}>
        <Text style={styles.rowLabel}>{label}:</Text> {value || "—"}
    </Text>
);

// Documento de la consulta completa, botón "Vista previa e
// imprimir". Toma como base el formato de consulta del consultorio
// de referencia (encabezado con signos vitales, diagnóstico y
// tratamiento) y agrega, solo si tienen datos, las secciones de
// receta, referencia y antecedentes, que ese formato de una sola
// página no contempla.
const ConsultationDocument = ({
    title,
    patientName,
    age,
    gender,
    dui,
    doctorName,
    signatureUrl,
    sealUrl,
    date,
    time,
    vitals,
    icdCode,
    historial,
    diagnosis,
    diagnosisDescription,
    tratamiento,
    medications = [],
    referral,
    antecedents,
}) => {
    const hasReceta = medications.length > 0;
    const hasReferral = !!(referral?.referred_to || referral?.reason);
    const hasAntecedents =
        (antecedents?.hereditary?.length || 0) > 0 ||
        (antecedents?.pathological?.length || 0) > 0 ||
        (antecedents?.non_pathological?.length || 0) > 0 ||
        (antecedents?.socio_ecological?.length || 0) > 0;

    return (
        <Document title={title}>
            <Page size="LETTER" style={styles.page}>
                <PdfLetterhead />
                <Text style={styles.title}>REGISTRO DE CONSULTA MÉDICA</Text>

                <View style={styles.headerRow}>
                    <Text>Paciente: {patientName}</Text>
                    <Text>Fecha: {date}{time ? `   Hora: ${time}` : ""}</Text>
                </View>
                <View style={styles.headerRow}>
                    <Text>Edad: {age ?? "—"}</Text>
                    <Text>Sexo: {gender || "—"}</Text>
                    <Text>DUI: {dui || "—"}</Text>
                    <Text>Dgx (CIE-10): {icdCode || "—"}</Text>
                </View>

                <View style={styles.vitalsRow}>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Peso (kg)</Text>
                        <Text style={styles.vitalValue}>{vitals?.weight || "—"}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Talla (cm)</Text>
                        <Text style={styles.vitalValue}>{vitals?.height || "—"}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>SPO2%</Text>
                        <Text style={styles.vitalValue}>{vitals?.oxygenSaturation || "—"}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>T°</Text>
                        <Text style={styles.vitalValue}>{vitals?.temperature || "—"}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>P.A.</Text>
                        <Text style={styles.vitalValue}>{vitals?.bloodPressure || "—"}</Text>
                    </View>
                    <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Glucosa</Text>
                        <Text style={styles.vitalValue}>{vitals?.glucose || "—"}</Text>
                    </View>
                    {vitals?.heartRate ? (
                        <View style={styles.vitalItem}>
                            <Text style={styles.vitalLabel}>F.C.</Text>
                            <Text style={styles.vitalValue}>{vitals.heartRate}</Text>
                        </View>
                    ) : null}
                    {vitals?.respiratoryRate ? (
                        <View style={styles.vitalItem}>
                            <Text style={styles.vitalLabel}>F.R.</Text>
                            <Text style={styles.vitalValue}>{vitals.respiratoryRate}</Text>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.sectionTitle}>Historial médico</Text>
                <Text style={styles.paragraph}>{historial || "Sin evolución registrada."}</Text>

                <Text style={styles.sectionTitle}>Diagnóstico</Text>
                <Field label="Diagnóstico" value={diagnosis} />
                <Field label="Descripción" value={diagnosisDescription} />

                <Text style={styles.sectionTitle}>Tratamiento</Text>
                <Text style={styles.paragraph}>{tratamiento || "Sin indicaciones registradas."}</Text>

                {hasReceta && (
                    <>
                        <Text style={styles.sectionTitle}>Receta</Text>
                        {medications.length > 0 && (
                            <View style={{ marginBottom: 6 }}>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableCellHeader}>Medicamento</Text>
                                    <Text style={styles.tableCellHeader}>Dosis</Text>
                                    <Text style={styles.tableCellHeader}>Frecuencia</Text>
                                    <Text style={styles.tableCellHeader}>Duración</Text>
                                </View>
                                {medications.map((m, i) => (
                                    <View key={i} style={styles.tableRow}>
                                        <Text style={styles.tableCell}>{m.name || "—"}</Text>
                                        <Text style={styles.tableCell}>{m.dose || "—"}</Text>
                                        <Text style={styles.tableCell}>{m.frequency || "—"}</Text>
                                        <Text style={styles.tableCell}>{m.duration || "—"}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {hasReferral && (
                    <>
                        <Text style={styles.sectionTitle}>Referencia</Text>
                        <Field label="Referido a" value={referral.referred_to} />
                        <Field label="Motivo" value={referral.reason} />
                    </>
                )}

                {hasAntecedents && (
                    <>
                        <Text style={styles.sectionTitle}>Antecedentes</Text>
                        {antecedents.hereditary?.map((a, i) => (
                            <Text key={`h-${i}`} style={styles.paragraph}>
                                Heredofamiliar: {a.relative || "—"}, {a.condition || "—"}
                            </Text>
                        ))}
                        {antecedents.pathological?.map((a, i) => (
                            <Text key={`p-${i}`} style={styles.paragraph}>
                                Patológico: {a.disease || "—"}, {a.type || "—"}
                            </Text>
                        ))}
                        {antecedents.non_pathological?.map((a, i) => (
                            <Text key={`np-${i}`} style={styles.paragraph}>
                                No patológico: {a.description || "—"}
                            </Text>
                        ))}
                        {antecedents.socio_ecological?.map((a, i) => (
                            <Text key={`se-${i}`} style={styles.paragraph}>
                                Ecológico-social: {a.description || "—"}
                            </Text>
                        ))}
                    </>
                )}

                <PdfSignature doctorName={doctorName} signatureUrl={signatureUrl} sealUrl={sealUrl} />
            </Page>
        </Document>
    );
};

export default ConsultationDocument;
