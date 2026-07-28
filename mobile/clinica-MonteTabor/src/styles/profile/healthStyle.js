import { StyleSheet, Platform, StatusBar } from "react-native";
import { colors } from "./profileStyle";

export const tint = {
  red:    { bg: "#FDECEC", fg: "#E5484D" },
  pink:   { bg: "#FDEAF2", fg: "#E5399B" },
  blue:   { bg: "#E9F0FF", fg: "#2F6BFF" },
  purple: { bg: "#F1ECFE", fg: "#7C4DFF" },
  green:  { bg: "#E7F7EE", fg: "#16A34A" },
  amber:  { bg: "#FEF4E2", fg: "#E9A100" },
};

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
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  content: { padding: 16, paddingBottom: 40 },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
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

  /* ---------- Secciones ---------- */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 22,
    ...shadow,
  },

  /* ---------- Filas ---------- */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTexts: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 11, color: colors.muted, marginBottom: 3 },
  rowValue: { fontSize: 13, fontWeight: "700", color: colors.text },

  /* ---------- Aviso de seguridad ---------- */
  notice: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 24,
    ...shadow,
  },
  noticeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCE7FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  noticeLink: {
    marginTop: 16,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
});

export default styles;