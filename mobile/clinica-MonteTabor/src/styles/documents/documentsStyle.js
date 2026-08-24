import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } }, android: { elevation: 3 } });

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0", paddingHorizontal: 10 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#111827" },

  // ── Hub: dos cards pastel apiladas, mismo lenguaje visual que el resto de la app
  // (fondo tenue + insignia de ícono a color + link con chevron, ver appointmentsStyle.js) ──
  hubContent: { flex: 1, padding: 18, gap: 14 },
  docTypeCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 20, justifyContent: "center", ...shadow },
  docTypeIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  docTypeTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  docTypeSubtitle: { fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 17 },

  docTypeStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(15,23,42,0.08)" },
  docTypeStatsLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  docTypeStatsValue: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 2 },
  docTypeStatsIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },

  docTypeLinkRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 14 },
  docTypeLinkText: { fontSize: 12.5, fontWeight: "700" },

  // ── Lista de documentos ──
  listContent: { padding: 18, paddingBottom: 38, flexGrow: 1 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  filterButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#DDE2EA", backgroundColor: "#FFF", paddingHorizontal: 13 },
  filterButtonText: { fontSize: 13, color: "#111827", fontWeight: "600" }, filterButtonPlaceholder: { color: "#94A3B8", fontWeight: "500" },
  clearFilterButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#DDE2EA", backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },

  docCard: { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E7EBF2", padding: 15, marginBottom: 12, ...shadow },
  docCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  docCardDate: { fontSize: 13, fontWeight: "800", color: "#111827" },
  docCardDoctor: { fontSize: 11.5, color: "#8A94A6", marginTop: 2 },
  docCardBody: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E7EBF2" },
  docCardLabel: { fontSize: 10.5, color: "#8A94A6" }, docCardValue: { fontSize: 12.5, color: "#111827", fontWeight: "600", marginTop: 2, lineHeight: 17 },
  downloadPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#EEF3FF", flexShrink: 0 },
  downloadPillText: { fontSize: 11, fontWeight: "700", color: "#2F6BFF" },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, flexGrow: 1 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 12 },
  emptyText: { fontSize: 12, color: "#94A3B8", marginTop: 4, textAlign: "center" },
  loader: { flex: 1 },
});
