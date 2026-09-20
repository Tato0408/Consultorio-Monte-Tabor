import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";
import { selectedPanelsWithAllTests } from "../lab/labOrderCatalog";

const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 8, fontFamily: "Helvetica", color: "#1e293b" },
    title: {
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 10,
        textDecoration: "underline",
    },
    headerBox: {
        borderTop: "1 solid #cbd5e1",
        borderBottom: "1 solid #cbd5e1",
        paddingVertical: 5,
        marginBottom: 8,
        flexDirection: "row",
        flexWrap: "wrap",
    },
    headerItem: { width: "25%", marginBottom: 2, paddingRight: 4 },
    headerLabel: { fontSize: 6.5, color: "#64748b" },
    headerValue: { fontSize: 8.5, fontWeight: 700 },
    columns: { flexDirection: "row", flexWrap: "wrap" },
    column: { width: "50%", paddingRight: 8, marginBottom: 8 },
    emptyNote: { fontSize: 8, color: "#64748b", marginBottom: 8 },
    panelTitle: {
        fontSize: 7.5,
        fontWeight: 700,
        color: "#0b66d6",
        backgroundColor: "#eef4fd",
        paddingVertical: 1.5,
        paddingHorizontal: 2,
        marginBottom: 2,
    },
    testRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 1.5 },
    box: {
        width: 6,
        height: 6,
        borderWidth: 0.8,
        borderColor: "#64748b",
        marginRight: 3,
        marginTop: 0.5,
    },
    boxChecked: { backgroundColor: "#0b66d6", borderColor: "#0b66d6" },
    testLabel: { fontSize: 7, flex: 1 },
    testLabelChecked: { fontWeight: 700 },
    otros: { marginTop: 6, marginBottom: 16, fontSize: 8 },
});

const HeaderItem = ({ label, value }) => (
    <View style={styles.headerItem}>
        <Text style={styles.headerLabel}>{label}</Text>
        <Text style={styles.headerValue}>{value || "—"}</Text>
    </View>
);

const yesNo = (value) => (value === "si" ? "Sí" : value === "no" ? "No" : "—");

// Orden de laboratorio. Reproduce el formato de casillas de la hoja de
// solicitud de referencia, pero con el membrete y la firma de Clínica Monte
// Tabor (los mismos que el resto de documentos).
const LabOrderDocument = ({
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
    weight,
    height,
    pregnancy,
    antibioticTreatment,
    tests = [],
    otherTests,
}) => {
    // Solo los paneles con al menos un examen marcado, pero cada uno completo
    // (con sus casillas llenas y vacías), como en la hoja original. Las
    // secciones sin nada marcado no se imprimen.
    const panels = selectedPanelsWithAllTests(tests);
    const trimmedOtherTests = (otherTests || "").trim();

    return (
        <Document title={title}>
            <Page size="LETTER" style={styles.page} wrap>
                <PdfLetterhead />
                <Text style={styles.title}>ORDEN DE LABORATORIO</Text>

                <View style={styles.headerBox}>
                    <HeaderItem label="Fecha" value={date} />
                    {time ? <HeaderItem label="Hora" value={time} /> : null}
                    <HeaderItem label="Paciente" value={patientName} />
                    <HeaderItem label="Edad" value={age != null ? `${age} años` : "—"} />
                    <HeaderItem label="Sexo" value={gender} />
                    <HeaderItem label="DUI" value={dui} />
                    <HeaderItem label="Médico solicitante" value={doctorName} />
                    <HeaderItem label="Peso (kg)" value={weight != null && weight !== "" ? String(weight) : "—"} />
                    <HeaderItem label="Talla (cm)" value={height != null && height !== "" ? String(height) : "—"} />
                    <HeaderItem label="Embarazo" value={yesNo(pregnancy)} />
                    <HeaderItem label="Tratamiento antibiótico" value={yesNo(antibioticTreatment)} />
                </View>

                {panels.length > 0 ? (
                    <View style={styles.columns}>
                        {panels.map((panel) => (
                            <View key={panel.title} style={styles.column} wrap={false}>
                                <Text style={styles.panelTitle}>{panel.title.toUpperCase()}</Text>
                                {panel.tests.map((test) => (
                                    <View key={test.label} style={styles.testRow}>
                                        <View style={[styles.box, test.checked && styles.boxChecked]} />
                                        <Text style={[styles.testLabel, test.checked && styles.testLabelChecked]}>
                                            {test.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.emptyNote}>
                        No se seleccionaron exámenes del catálogo.
                    </Text>
                )}

                {trimmedOtherTests ? (
                    <Text style={styles.otros}>
                        <Text style={{ fontWeight: 700 }}>OTROS: </Text>
                        {trimmedOtherTests}
                    </Text>
                ) : null}

                <PdfSignature doctorName={doctorName} signatureUrl={signatureUrl} sealUrl={sealUrl} />
            </Page>
        </Document>
    );
};

export default LabOrderDocument;
