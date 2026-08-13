import { Platform, StyleSheet, StatusBar } from "react-native";
import { colors } from "./profile/profileStyle";

const shadow = Platform.select({
  ios: { shadowColor: "#0B1220", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
});

export const badgeTones = {
  prescription: { bg: "#E9F0FF", fg: colors.primary, icon: "document-text-outline", label: "Receta" },
  referral: { bg: "#E6F7EE", fg: "#16A34A", icon: "swap-horizontal-outline", label: "Referencia" },
  sickLeave: { bg: "#F1EAFE", fg: "#8B5CF6", icon: "id-card-outline", label: "Incapacidad" },
};

export const statusTones = {
  completed: { bg: "#E6F7EE", fg: "#16A34A", label: "Completada" },
  scheduled: { bg: "#E9F0FF", fg: colors.primary, label: "Programada" },
  pending: { bg: "#FFF4E5", fg: "#B45309", label: "Pendiente" },
  cancelled: { bg: "#FDECEC", fg: colors.danger, label: "Cancelada" },
  no_show: { bg: "#F1F2F6", fg: colors.muted, label: "No se presentó" },
  expired: { bg: "#F1F2F6", fg: colors.muted, label: "Vencida" },
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 18, lineHeight: 18 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 46, ...shadow },
  searchInput: { flex: 1, fontSize: 13, color: colors.text, height: "100%" },

  primaryFilters: { gap: 9, paddingVertical: 14 },
  primaryChip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16 },
  primaryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryChipText: { fontSize: 12.5, fontWeight: "700", color: "#64748B" },
  primaryChipTextActive: { color: "#FFF" },
  secondaryFilters: { gap: 8, paddingBottom: 18 },
  secondaryChip: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
  secondaryChipActive: { backgroundColor: "#E9F0FF", borderColor: "#9CB8FF" },
  secondaryChipText: { fontSize: 11.5, fontWeight: "600", color: "#64748B" },
  secondaryChipTextActive: { color: colors.primary, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  count: { marginLeft: 8, minWidth: 24, textAlign: "center", borderRadius: 12, overflow: "hidden", backgroundColor: "#E8EFFF", color: colors.primary, fontSize: 12, fontWeight: "700", paddingVertical: 3 },
  loader: { marginTop: 45 },

  /* Tarjeta para solicitudes pending/scheduled. */
  requestCard: { backgroundColor: "#FFF", borderRadius: 15, borderWidth: 1, borderColor: "#E7EBF2", padding: 14, marginBottom: 12, ...shadow },
  requestCardTop: { flexDirection: "row", alignItems: "flex-start" },
  requestDateIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  requestHeading: { flex: 1, paddingRight: 5 },
  requestDate: { fontSize: 11, color: "#8A94A6", textTransform: "capitalize" },
  requestTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginTop: 3 },
  requestDoctor: { fontSize: 12, color: "#64748B", marginTop: 4 },
  requestBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  requestBadgeText: { fontSize: 9, fontWeight: "800" },
  requestBadge_amber: { backgroundColor: "#FFF7D6" }, requestBadgeText_amber: { color: "#A16207" },
  requestBadge_blue: { backgroundColor: "#E8EFFF" }, requestBadgeText_blue: { color: "#245CE0" },
  requestBadge_green: { backgroundColor: "#DDF8F0" }, requestBadgeText_green: { color: "#16836B" },
  requestBadge_red: { backgroundColor: "#FEE8E8" }, requestBadgeText_red: { color: "#C43B3B" },
  requestBadge_gray: { backgroundColor: "#EEF2F6" }, requestBadgeText_gray: { color: "#64748B" },
  requestReasonRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E7EBF2", marginTop: 13, paddingTop: 11 },
  requestReasonLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 3 },
  requestReason: { fontSize: 12, color: "#475569", lineHeight: 17 },
  detailHint: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 10 },
  detailHintText: { fontSize: 11, fontWeight: "700", color: colors.primary },

  /* Tarjeta clínica usada por ConsultationCard. */
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14, ...shadow },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  dateTimeGroup: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  dateTimeText: { fontSize: 12, color: colors.muted, marginLeft: 5, marginRight: 12 },
  statusPill: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  doctorRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12, backgroundColor: colors.bg },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, marginRight: 12, backgroundColor: "#E9F0FF", alignItems: "center", justifyContent: "center" },
  doctorInfo: { flex: 1 }, doctorName: { fontSize: 14.5, fontWeight: "700", color: colors.text }, doctorSpecialty: { fontSize: 12.5, color: colors.primary, fontWeight: "600", marginTop: 2 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 14 },
  diagnosisHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  diagnosisLabel: { fontSize: 12, fontWeight: "700", color: colors.text }, diagnosisText: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }, badge: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 }, badgeText: { fontSize: 11.5, fontWeight: "700", marginLeft: 5 },
  pendingNotice: { flexDirection: "row", alignItems: "center", marginTop: 2 }, pendingNoticeText: { fontSize: 12.5, color: colors.muted, marginLeft: 6, flex: 1 },

  requestEmpty: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E7EBF2", padding: 28, marginTop: 8 },
  requestEmptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center" },
  requestEmptyText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#8A94A6", textAlign: "center" },
  emptyButton: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 11 },
  emptyButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
});

export default styles;
