import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 2 } });

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" }, loader: { flex: 1 },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0", paddingHorizontal: 10 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#111827" },
  content: { padding: 18, paddingBottom: 38 },

  hero: { backgroundColor: "#174FD6", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", flexWrap: "wrap", ...shadow },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: "rgba(255,255,255,.7)" },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#174FD6", fontWeight: "800", fontSize: 18 },
  doctorText: { flex: 1, marginLeft: 12 }, doctorName: { color: "#FFF", fontSize: 16, fontWeight: "800" }, specialty: { color: "#C9D8FF", fontSize: 11, lineHeight: 16, marginTop: 3 },
  statusBadge: { marginTop: 13, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }, statusText: { fontSize: 10, fontWeight: "800" },

  infoCard: { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E7EBF2", paddingHorizontal: 15, marginTop: 14, ...shadow },
  detailItem: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBF2" },
  detailIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  detailLabel: { width: 90, fontSize: 11, color: "#8A94A6" }, detailValue: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700", color: "#111827", textAlign: "right" },

  section: { marginTop: 22 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  sectionCard: { backgroundColor: "#FFF", borderRadius: 13, borderWidth: 1, borderColor: "#E7EBF2", padding: 14 },
  sectionText: { fontSize: 12, lineHeight: 19, color: "#64748B" },

  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalChip: { flexBasis: "47%", backgroundColor: "#F8FAFC", borderRadius: 11, borderWidth: 1, borderColor: "#E7EBF2", paddingVertical: 9, paddingHorizontal: 11 },
  vitalChipLabel: { fontSize: 10, color: "#8A94A6", marginBottom: 2 },
  vitalChipValue: { fontSize: 13, fontWeight: "800", color: "#111827" },

  examRow: { marginBottom: 10 }, examRowLast: { marginBottom: 0 },
  examLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 2 }, examValue: { fontSize: 12, lineHeight: 18, color: "#111827" },

  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBF2" }, listItemLast: { borderBottomWidth: 0 },
  listItemDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F6BFF", marginTop: 6 },
  listItemTitle: { fontSize: 12.5, fontWeight: "700", color: "#111827" }, listItemSubtitle: { fontSize: 11.5, color: "#64748B", marginTop: 2, lineHeight: 16 },

  medicationRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBF2" }, medicationRowLast: { borderBottomWidth: 0 },
  medicationName: { fontSize: 13, fontWeight: "800", color: "#111827" },
  medicationMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  medicationMeta: { fontSize: 11, color: "#64748B" },
  medicationInstructions: { fontSize: 11.5, color: "#475569", marginTop: 5, lineHeight: 16 },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 11.5, fontWeight: "700", marginLeft: 5 },

  emptySection: { alignItems: "center", padding: 24 },
  emptySectionText: { fontSize: 12, color: "#94A3B8", marginTop: 8, textAlign: "center" },

  documentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBF2" }, documentRowLast: { borderBottomWidth: 0 },
  documentIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  documentInfo: { flex: 1 }, documentTitle: { fontSize: 12.5, fontWeight: "700", color: "#111827" }, documentSubtitle: { fontSize: 11, color: "#8A94A6", marginTop: 2 },
  downloadButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9, backgroundColor: "#EEF3FF" },
  downloadButtonText: { fontSize: 11, fontWeight: "700", color: "#2F6BFF" },

  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, unavailableTitle: { fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center", marginTop: 13 }, unavailableText: { fontSize: 12, lineHeight: 18, color: "#8A94A6", textAlign: "center", marginTop: 7 },
});
