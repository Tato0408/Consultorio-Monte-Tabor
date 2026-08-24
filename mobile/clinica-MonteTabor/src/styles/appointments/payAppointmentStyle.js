import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FF" },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  content: { paddingHorizontal: 20, paddingBottom: 30 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  summaryCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E6ED", padding: 15, marginTop: 16, marginBottom: 16, ...shadow },
  summaryIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center", marginRight: 11 },
  summaryLabel: { fontSize: 10, color: "#8A94A6" }, summaryDoctor: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 2 }, summaryType: { fontSize: 11, color: "#64748B", marginTop: 1 },
  summaryAmount: { fontSize: 18, fontWeight: "800", color: "#111827" }, summaryAmountNote: { fontSize: 10, color: "#8A94A6" },

  panel: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E6ED", padding: 16, ...shadow },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  panelHeaderText: { fontSize: 13, fontWeight: "800", color: "#2F6BFF" },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#111827", marginBottom: 6 },
  inputBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DDE2EA", borderRadius: 10, backgroundColor: "#FFF", paddingHorizontal: 12, height: 46 },
  inputBoxError: { borderColor: "#EF4444" },
  input: { flex: 1, fontSize: 13, color: "#111827", marginLeft: 8 },
  inputBrand: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },
  errorText: { fontSize: 11, color: "#EF4444", marginTop: 4 },
  row: { flexDirection: "row", gap: 12 }, half: { flex: 1 },

  payButton: { minHeight: 50, borderRadius: 11, backgroundColor: "#2F6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  payButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" }, buttonDisabled: { opacity: 0.5 },

  secureNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  secureNoteText: { fontSize: 11, color: "#94A3B8" },

  infoBox: { flexDirection: "row", gap: 9, backgroundColor: "#EEF2FF", borderRadius: 12, padding: 13, marginTop: 16 },
  infoBoxText: { flex: 1, fontSize: 12, color: "#4338CA", lineHeight: 17 },

  warningBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 12, padding: 13, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 12, color: "#92400E" },
  warningButton: { backgroundColor: "#D97706", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  warningButtonText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  successCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#2EB785", alignItems: "center", justifyContent: "center", alignSelf: "center", borderWidth: 9, borderColor: "#DDF7ED" },
  successTitle: { marginTop: 24, fontSize: 22, lineHeight: 28, fontWeight: "800", color: "#256B59", textAlign: "center" },
  successText: { fontSize: 13, lineHeight: 19, color: "#5F8E82", textAlign: "center", marginTop: 10, marginBottom: 10 },
  referenceBox: { fontFamily: Platform.select({ ios: "Courier", android: "monospace" }), fontSize: 11, backgroundColor: "#F1F5F9", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, color: "#334155" },

  primaryButton: { minHeight: 50, borderRadius: 11, backgroundColor: "#2F6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 18 },
  primaryButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 50, borderRadius: 11, borderWidth: 1, borderColor: "#2F6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryButtonText: { color: "#2F6BFF", fontSize: 14, fontWeight: "800" },

  emptyText: { fontSize: 13, color: "#8A94A6", textAlign: "center", marginTop: 40 },
});

export default styles;
