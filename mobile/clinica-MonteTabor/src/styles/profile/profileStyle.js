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

  // El modelo no guarda foto: se muestran las iniciales sobre el azul de la tarjeta
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },

  profileTexts: { flex: 1 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  info: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },

  // Chips traslúcidos: tipo de sangre y estado de la cuenta
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

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