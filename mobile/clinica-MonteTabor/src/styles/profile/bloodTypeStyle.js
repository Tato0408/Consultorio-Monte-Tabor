import { Platform, StyleSheet } from "react-native";
import { colors } from "./profileStyle";

const shadow = Platform.select({
  ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

const BLOOD = "#DC2626";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSide: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: colors.text },

  content: { paddingHorizontal: 20, paddingBottom: 32 },

  // ---------- Encabezado con la gota ----------
  hero: { alignItems: "center", paddingVertical: 18 },
  dropCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "#FEE8E8",
    alignItems: "center", justifyContent: "center",
  },
  heroLabel: { marginTop: 14, fontSize: 12, color: colors.muted },
  heroValue: { marginTop: 4, fontSize: 34, fontWeight: "800", color: BLOOD },

  // ---------- Tarjetas ----------
  card: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7EBF2",
    padding: 15,
    marginTop: 14,
    ...shadow,
  },
  cardTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  cardText: { marginTop: 7, fontSize: 12, lineHeight: 18, color: colors.muted },

  groupLabel: { marginTop: 14, fontSize: 11, fontWeight: "700", color: "#64748B" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.text },

  registeredLabel: { fontSize: 11, color: colors.muted, marginTop: 6 },
  registeredValue: { marginTop: 3, fontSize: 14, fontWeight: "800", color: colors.text },

  // ---------- Selección (pantalla de registro) ----------
  sectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: "700", color: colors.text },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeOption: {
    width: "31%",
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  typeOptionActive: { borderColor: colors.primary, backgroundColor: "#EEF3FF" },
  typeOptionText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  typeOptionTextActive: { color: colors.primary },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EEF3FF",
    borderRadius: 12,
    padding: 13,
    marginTop: 18,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: "#334155" },

  errorText: { marginTop: 8, fontSize: 11, color: "#C43B3B" },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#F4F6FA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7EBF2",
  },
  primaryButton: {
    height: 50,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  // ---------- Estado vacío ----------
  empty: { alignItems: "center", paddingHorizontal: 20, marginTop: 10 },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: "800", color: colors.text },
  emptyText: { marginTop: 7, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center" },
});

export default styles;