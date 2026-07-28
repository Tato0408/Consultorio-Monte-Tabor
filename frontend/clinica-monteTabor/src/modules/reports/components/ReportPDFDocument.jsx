import { Document, Page, View, Text, StyleSheet, Svg, Polygon, Polyline, Rect } from "@react-pdf/renderer";
import { chartColor } from "../chartColors";

// Plantilla de PDF compartida por los 4 reportes (citas/pacientes/doctores/inventario).
// Recibe el mismo objeto `pdf` que ya devuelve cada endpoint de /api/reports/*, así que el
// PDF siempre refleja exactamente los datos que están en pantalla (mismo rango de fecha o
// modo general) en vez de recalcular nada por su cuenta.

const COLORS = {
  primary: "#3B6FCA",
  primaryLight: "#93c5fd",
  textDark: "#1f2937",
  textGray: "#64748b",
  border: "#e2e8f0",
  green: "#16a34a",
  red: "#dc2626",
  bgLight: "#f8fafc",
};

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8.5, fontFamily: "Helvetica", color: COLORS.textDark },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hexWrap: { width: 22, height: 26, position: "relative" },
  hexLetter: {
    position: "absolute",
    top: 7,
    left: 0,
    width: 22,
    textAlign: "center",
    fontSize: 9,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  clinicName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.primary, lineHeight: 1.3 },
  reportTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.primary, textAlign: "right" },
  metaText: { fontSize: 8, color: COLORS.textGray, textAlign: "right", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 8 },
  statLabel: { fontSize: 7.5, color: COLORS.textGray, marginBottom: 4 },
  statValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COLORS.textDark },
  statDiff: { fontSize: 7, marginTop: 3 },

  chartsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chartCard: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 8 },
  chartTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  chartCaption: { fontSize: 7, color: COLORS.textGray, marginTop: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  legendDot: { width: 6, height: 6, backgroundColor: COLORS.primaryLight, borderRadius: 3 },
  legendText: { fontSize: 7, color: COLORS.textDark },

  sectionCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, marginBottom: 12 },
  sectionHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  tableHeaderRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5, backgroundColor: COLORS.bgLight },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: COLORS.border },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: COLORS.textGray, textTransform: "uppercase" },
  td: { fontSize: 8 },

  financialWrap: { padding: 10, alignItems: "center" },
  financialLabel: { fontSize: 7.5, color: COLORS.textGray, marginBottom: 4 },
  financialValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.primary },

  twoColRow: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  bulletRow: { flexDirection: "row", marginBottom: 4, paddingRight: 4 },
  bulletDot: { fontSize: 8, marginRight: 4 },
  bulletText: { fontSize: 7.5, flex: 1, lineHeight: 1.3 },
  footerText: { fontSize: 7.5, color: COLORS.textGray, marginBottom: 3 },
});

// Gráfico de línea simple dibujado a mano con <Polyline>, sin depender de recharts
// (react-pdf renderiza a un motor propio, no al DOM, así que no puede usar componentes React
// pensados para SVG del navegador)
const LineChartSvg = ({ data, width = 220, height = 80, color = COLORS.primary }) => {
  if (!data || data.length === 0) {
    return <Text style={{ fontSize: 7, color: COLORS.textGray }}>Sin datos en este período</Text>;
  }
  if (data.length === 1) {
    return <Text style={{ fontSize: 7, color: COLORS.textGray }}>{data[0].label}: {data[0].total}</Text>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => `${(i * stepX).toFixed(1)},${(height - (d.total / max) * height).toFixed(1)}`).join(" ");
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
};

// Cada barra usa un color distinto de la paleta (misma que "Control de roles"), en vez de un
// único tono repetido, para que cada categoría/día se distinga a simple vista.
const BarChartSvg = ({ data, width = 220, height = 80 }) => {
  if (!data || data.length === 0) {
    return <Text style={{ fontSize: 7, color: COLORS.textGray }}>Sin datos en este período</Text>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const gap = 4;
  const barWidth = Math.max(2, (width - gap * (data.length - 1)) / data.length);
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barHeight = Math.max(1, (d.total / max) * height);
        return (
          <Rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={chartColor(i)}
          />
        );
      })}
    </Svg>
  );
};

const variationColor = (value) => {
  if (!value || value === "—") return COLORS.textGray;
  if (value.startsWith("-")) return COLORS.red;
  if (value.startsWith("+")) return COLORS.green;
  return COLORS.textGray;
};

const ReportPDFDocument = ({ data, clinicName = "Clínica Familia Monte Tabor" }) => {
  const {
    reportTitle,
    periodLabel,
    isGeneral,
    stats = [],
    dailySeries = [],
    dailySeriesLabel,
    typeSeries = [],
    typeSeriesLabel,
    serviceTableTitle,
    serviceColumnLabel,
    serviceCountLabel,
    serviceTable = [],
    avgRevenuePerConsult,
    avgRevenueLabel,
    observations = [],
  } = data;

  const generatedAt = new Date().toLocaleString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado: logo + nombre de la clínica a la izquierda, título del reporte a la derecha */}
        <View style={styles.headerRow}>
          <View style={styles.clinicRow}>
            <View style={styles.hexWrap}>
              <Svg width={22} height={26}>
                <Polygon points="11,1 21,7 21,19 11,25 1,19 1,7" fill={COLORS.primary} />
              </Svg>
              <Text style={styles.hexLetter}>T</Text>
            </View>
            <View>
              <Text style={styles.clinicName}>Clínica Familia</Text>
              <Text style={styles.clinicName}>Monte Tabor</Text>
            </View>
          </View>

          <View>
            <Text style={styles.reportTitle}>{(reportTitle || "Reporte").toUpperCase()}</Text>
            <Text style={styles.metaText}>Período: {periodLabel}</Text>
            <Text style={styles.metaText}>Fecha de generación: {generatedAt}</Text>
          </View>
        </View>

        {/* Tarjetas de estadísticas */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              {s.diff && <Text style={[styles.statDiff, { color: variationColor(s.diff) }]}>{s.diff}</Text>}
            </View>
          ))}
        </View>

        {/* Gráficos */}
        <View style={styles.chartsRow}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{dailySeriesLabel}</Text>
            <LineChartSvg data={dailySeries} />
            {dailySeries.length > 1 && (
              <Text style={styles.chartCaption}>
                {dailySeries[0].label} — {dailySeries[dailySeries.length - 1].label}
              </Text>
            )}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{typeSeriesLabel}</Text>
            <BarChartSvg data={typeSeries} />
            <View style={{ marginTop: 4 }}>
              {typeSeries.map((t, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: chartColor(i) }]} />
                  <Text style={styles.legendText}>{t.label}: {t.total}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tabla resumen (servicios / tipo de atención / categorías, según el reporte) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{serviceTableTitle}</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 2 }]}>{serviceColumnLabel}</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>{serviceCountLabel}</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>% del total</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Ingresos</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>% del total</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Variación</Text>
          </View>
          {serviceTable.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]}>{row.servicio}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{row.consultas}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{row.pctConsultas}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{row.ingresos}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{row.pctIngresos}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right", color: variationColor(row.variacion) }]}>{row.variacion}</Text>
            </View>
          ))}
        </View>

        {/* Indicadores financieros — solo si el reporte trae un promedio real que mostrar */}
        {avgRevenuePerConsult && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Indicadores financieros</Text>
            <View style={styles.financialWrap}>
              <Text style={styles.financialLabel}>{avgRevenueLabel}</Text>
              <Text style={styles.financialValue}>{avgRevenuePerConsult}</Text>
            </View>
          </View>
        )}

        {/* Observaciones + información adicional */}
        <View style={styles.twoColRow}>
          <View style={[styles.sectionCard, styles.col]}>
            <Text style={styles.sectionHeader}>Observaciones</Text>
            <View style={{ padding: 10 }}>
              {observations.map((o, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{o}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionCard, styles.col]}>
            <Text style={styles.sectionHeader}>Información adicional</Text>
            <View style={{ padding: 10 }}>
              <Text style={styles.footerText}>{clinicName}</Text>
              <Text style={styles.footerText}>Reporte generado automáticamente por el sistema.</Text>
              <Text style={styles.footerText}>
                {isGeneral
                  ? "Incluye todos los registros históricos disponibles."
                  : `Datos correspondientes al período: ${periodLabel}.`}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDFDocument;
