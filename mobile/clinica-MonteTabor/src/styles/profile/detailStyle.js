import { StyleSheet, Platform } from "react-native";
import { colors } from "./profileStyle";

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 100 },
  flex: { flex: 1 },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4, width: 32 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginRight: 32,
  },

  /* ---------- Tarjeta resumen (contador) ---------- */
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 18,
    ...shadow,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryLabel: { fontSize: 11, color: colors.muted, marginBottom: 3 },
  summaryValue: { fontSize: 15, fontWeight: "700", color: colors.text },

  /* ---------- Item de lista ---------- */
  item: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    ...shadow,
  },
  itemRow: { flexDirection: "row", alignItems: "flex-start" },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemSubtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  itemLine: { fontSize: 12, color: colors.muted, marginTop: 3 },
  itemMenu: { padding: 4, marginLeft: 6 },

  /* ---------- Estado vacío ---------- */
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  /* ---------- Botón inferior ---------- */
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  outlineButtonText: { color: colors.primary, fontSize: 14, fontWeight: "700" },

  /* ---------- Bloques genéricos ---------- */
  panel: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...shadow,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  kvRowLast: { borderBottomWidth: 0 },
  kvLabel: { fontSize: 13, color: colors.text, flex: 1 },
  kvValue: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
    textAlign: "right",
  },

  /* ---------- Tipo de sangre ---------- */
  bloodHero: { alignItems: "center", paddingVertical: 24 },
  bloodCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bloodCaption: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  bloodValue: { fontSize: 34, fontWeight: "800", color: "#E5484D" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  chipLabel: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 10 },

  /* ---------- Donación ---------- */
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F7EE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusLabel: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: "700", color: "#15803D" },
  noticeBox: {
    backgroundColor: "#E9F0FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 6,
  },
  noticeLine: { fontSize: 12, color: colors.primary, lineHeight: 18 },
});

export default styles;