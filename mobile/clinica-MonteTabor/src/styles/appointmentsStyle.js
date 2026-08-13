import { StyleSheet, Platform, StatusBar } from "react-native";
import { colors } from "./profile/profileStyle";

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
});

// Tonos de las insignias (Receta / Referencia / Incapacidad), en línea con los "tone" que ya
// usa la web (Badge tone="blue|green|gray" en records/global/ui) pero con su propio color acá.
export const badgeTones = {
  prescription: { bg: "#E9F0FF", fg: colors.primary, icon: "document-text-outline", label: "Receta" },
  referral: { bg: "#E6F7EE", fg: "#16A34A", icon: "swap-horizontal-outline", label: "Referencia" },
  sickLeave: { bg: "#F1EAFE", fg: "#8B5CF6", icon: "id-card-outline", label: "Incapacidad" },
};

// Tonos del pill de estado de cada tarjeta.
export const statusTones = {
  completed: { bg: "#E6F7EE", fg: "#16A34A", label: "Completada" },
  scheduled: { bg: "#E9F0FF", fg: colors.primary, label: "Programada" },
  pending: { bg: "#FFF4E5", fg: "#B45309", label: "Pendiente" },
  cancelled: { bg: "#FDECEC", fg: colors.danger, label: "Cancelada" },
  no_show: { bg: "#F1F2F6", fg: colors.muted, label: "No se presentó" },
  expired: { bg: "#F1F2F6", fg: colors.muted, label: "Vencida" },
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  content: { padding: 16, paddingBottom: 100 },

  /* ---------- Encabezado ---------- */
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 18, lineHeight: 18 },

  /* ---------- Búsqueda ---------- */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
    ...shadow,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.text, height: "100%" },

  /* ---------- Filtros ---------- */
  chipsRow: { flexDirection: "row", gap: 8, paddingRight: 8, marginBottom: 20 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: "#fff" },

  /* ---------- Sección ---------- */
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },

  /* ---------- Tarjeta de consulta ---------- */
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...shadow,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  dateTimeGroup: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  dateTimeText: { fontSize: 12, color: colors.muted, marginLeft: 5, marginRight: 12 },
  statusPill: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  doctorRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12, backgroundColor: colors.bg },
  avatarPlaceholder: {
    width: 46, height: 46, borderRadius: 23, marginRight: 12,
    backgroundColor: "#E9F0FF", alignItems: "center", justifyContent: "center",
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  doctorSpecialty: { fontSize: 12.5, color: colors.primary, fontWeight: "600", marginTop: 2 },

  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 14 },

  diagnosisHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  diagnosisLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  diagnosisText: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 11.5, fontWeight: "700", marginLeft: 5 },

  pendingNotice: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  pendingNoticeText: { fontSize: 12.5, color: colors.muted, marginLeft: 6, flex: 1 },

  /* ---------- Estado vacío ---------- */
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#E9F0FF",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 6 },
  emptyText: { fontSize: 12.5, color: colors.muted, textAlign: "center", lineHeight: 18 },
});

export default styles;
