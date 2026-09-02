import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import PdfLetterhead from "./PdfLetterhead";
import PdfSignature from "./PdfSignature";
import { LAB_ORDER_CATALOG, testKey } from "@/lib/labOrderCatalog";

// Copia de frontend/clinica-monteTabor/src/modules/schedule/consultations/pdf/LabOrderDocument.jsx
// (panel privado) — dos builds de Vite separados, sin paquete compartido. Membrete y
// firma de Clínica Monte Tabor, igual que la receta y la incapacidad. La hoja de la
// Dra. Marcia Farías solo inspira el layout de casillas.
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
    column: { width: "20%", paddingRight: 4, marginBottom: 6 },
    panelTitle: {
        fontSize: 7.5,
        fontWeight: 700,
        color: "#3B6FCA",
        backgroundColor: "#eef3ff",
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
    boxChecked: { backgroundColor: "#3B6FCA", borderColor: "#3B6FCA" },
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

const LabOrderDocument = ({
    title,
    patientName,
    age,
    gender,
    dui,
    doctorName,
    date,
    weight,
    height,
    pregnancy,
    antibioticTreatment,
    tests = [],
    otherTests,
}) => {
    const selected = new Set(tests);

    return (
        <Document title={title}>
            <Page size="LETTER" style={styles.page} wrap>
                <PdfLetterhead />
                <Text style={styles.title}>ORDEN DE LABORATORIO</Text>

                <View style={styles.headerBox}>
                    <HeaderItem label="Fecha" value={date} />
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

                <View style={styles.columns}>
                    {LAB_ORDER_CATALOG.map((panel) => (
                        <View key={panel.key} style={styles.column} wrap={false}>
                            <Text style={styles.panelTitle}>{panel.title.toUpperCase()}</Text>
                            {panel.tests.map((test) => {
                                const checked = selected.has(testKey(panel.key, test.key));
                                return (
                                    <View key={test.key} style={styles.testRow}>
                                        <View style={[styles.box, checked && styles.boxChecked]} />
                                        <Text style={[styles.testLabel, checked && styles.testLabelChecked]}>
                                            {test.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>

                <Text style={styles.otros}>
                    <Text style={{ fontWeight: 700 }}>OTROS: </Text>
                    {otherTests || "________________________________________________"}
                </Text>

                <PdfSignature doctorName={doctorName} />
            </Page>
        </Document>
    );
};

export default LabOrderDocument;
