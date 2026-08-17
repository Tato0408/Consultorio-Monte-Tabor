import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FF" },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  stepper: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 24, paddingBottom: 20 },
  stepItem: { width: 76, alignItems: "center" },
  stepCircle: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D7DCE5", alignItems: "center", justifyContent: "center" },
  stepCircleActive: { backgroundColor: "#2F6BFF", borderColor: "#2F6BFF" },
  stepNumber: { fontSize: 11, fontWeight: "700", color: "#64748B" }, stepNumberActive: { color: "#FFF" },
  stepLabel: { fontSize: 9, color: "#64748B", marginTop: 6, textAlign: "center" }, stepLabelActive: { color: "#2F6BFF", fontWeight: "700" },
  stepLine: { flex: 1, height: 1, backgroundColor: "#D7DCE5", marginTop: 13, marginHorizontal: -13 }, stepLineActive: { backgroundColor: "#2F6BFF" },
  content: { paddingHorizontal: 20, paddingBottom: 25 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "800", color: "#111827", marginTop: 8 },
  subtitle: { fontSize: 13, color: "#8A94A6", marginTop: 5, marginBottom: 20, lineHeight: 18 },
  searchBox: { height: 48, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DDE2EA", borderRadius: 12, backgroundColor: "#FFF", paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, color: "#111827" }, loader: { marginVertical: 25 },
  serviceCard: { minHeight: 66, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E2E6ED", borderRadius: 12, backgroundColor: "#FFF", paddingHorizontal: 13, marginBottom: 10, ...shadow },
  serviceCardSelected: { borderColor: "#2F6BFF", backgroundColor: "#F8FAFF" },
  serviceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0F3FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  serviceText: { flex: 1 }, serviceName: { fontSize: 13, fontWeight: "700", color: "#111827" }, serviceMeta: { fontSize: 11, color: "#8A94A6", marginTop: 3 },
  panel: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E6ED", padding: 16, ...shadow },
  panelTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 12 }, days: { gap: 8 },
  day: { width: 55, height: 70, borderRadius: 12, borderWidth: 1, borderColor: "#E2E6ED", alignItems: "center", justifyContent: "center" },
  dayActive: { backgroundColor: "#2F6BFF", borderColor: "#2F6BFF" }, dayName: { fontSize: 10, color: "#64748B", textTransform: "uppercase" }, dayNumber: { fontSize: 17, fontWeight: "800", color: "#111827", marginTop: 5 }, dayTextActive: { color: "#FFF" },
  timeTitle: { marginTop: 22 }, slots: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  slot: { width: "30.5%", borderWidth: 1, borderColor: "#DDE2EA", borderRadius: 9, paddingVertical: 11, alignItems: "center" }, slotActive: { backgroundColor: "#2F6BFF", borderColor: "#2F6BFF" }, slotText: { fontSize: 12, fontWeight: "700", color: "#334155" }, slotTextActive: { color: "#FFF" },
  noSlots: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFFBEB", borderRadius: 10, padding: 13 }, noSlotsText: { flex: 1, fontSize: 12, color: "#92400E" },
  summaryCard: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E6ED", padding: 16, ...shadow },
  summaryRow: { flexDirection: "row", alignItems: "center", minHeight: 54 }, summaryIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0F3FF", alignItems: "center", justifyContent: "center", marginRight: 11 }, summaryText: { flex: 1 }, summaryLabel: { fontSize: 11, color: "#8A94A6" }, summaryValue: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 2, textTransform: "capitalize" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#111827", marginTop: 22, marginBottom: 8 }, optional: { color: "#8A94A6", fontWeight: "400" },
  textarea: { minHeight: 116, borderRadius: 12, borderWidth: 1, borderColor: "#DDE2EA", backgroundColor: "#FFF", padding: 13, fontSize: 13, color: "#111827", lineHeight: 19 }, characterCount: { fontSize: 10, color: "#94A3B8", textAlign: "right", marginTop: 5 },
  footer: { backgroundColor: "#FFF", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E2E6ED", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  primaryButton: { minHeight: 50, borderRadius: 11, backgroundColor: "#2F6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" }, buttonDisabled: { opacity: 0.45 },
  secondaryButton: { minHeight: 50, borderRadius: 11, borderWidth: 1, borderColor: "#2F6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 28, marginBottom: 12 }, secondaryButtonText: { color: "#2F6BFF", fontSize: 14, fontWeight: "800" },
  successContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 54, paddingBottom: 28, justifyContent: "center" }, successCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#2EB785", alignItems: "center", justifyContent: "center", alignSelf: "center", borderWidth: 9, borderColor: "#DDF7ED" }, successTitle: { marginTop: 24, fontSize: 23, lineHeight: 29, fontWeight: "800", color: "#256B59", textAlign: "center" }, successText: { fontSize: 13, lineHeight: 19, color: "#5F8E82", textAlign: "center", marginTop: 10, marginBottom: 24 },
});

export default styles;
