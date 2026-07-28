import { StyleSheet, Platform, StatusBar } from "react-native";

export const colors = {
  bg: "#F4F6FA",
  primary: "#2F6BFF",
  primarySoft: "#4C82FF",
  card: "#FFFFFF",
  border: "#ECEFF4",
  text: "#111827",
  muted: "#8A94A6",
  danger: "#E5484D",
};

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  bellButton: { padding: 4 },

  /* ---------- Tarjeta de perfil ---------- */
  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  profileTop: { flexDirection: "row", alignItems: "center" },
  avatarWrapper: { marginRight: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
  },
  name: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  info: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },

  editButton: {
    marginTop: 16,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },

  /* ---------- Atajos ---------- */
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  shortcuts: { flexDirection: "row", gap: 10, marginBottom: 24 },
  shortcut: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...shadow,
  },
  shortcutText: {
    marginTop: 8,
    fontSize: 11,
    textAlign: "center",
    color: colors.muted,
  },

  /* ---------- Tarjetas de información ---------- */
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
    ...shadow,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 28 },
  rowTexts: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowValue: { fontSize: 13, color: colors.muted, marginTop: 3 },
  rowValueRight: { fontSize: 14, color: colors.muted, textAlign: "right" },

  footerLink: { paddingVertical: 14, alignItems: "center" },
  footerLinkText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
});

export default styles;