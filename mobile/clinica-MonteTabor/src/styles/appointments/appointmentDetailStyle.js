import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 2 } });

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" }, loader: { flex: 1 },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0", paddingHorizontal: 10 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#111827" },
  content: { padding: 18, paddingBottom: 38 },
  hero: { backgroundColor: "#174FD6", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", flexWrap: "wrap", ...shadow },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: "rgba(255,255,255,.7)" }, avatarFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" }, avatarInitials: { color: "#174FD6", fontWeight: "800", fontSize: 18 },
  doctorText: { flex: 1, marginLeft: 12 }, doctorName: { color: "#FFF", fontSize: 16, fontWeight: "800" }, specialty: { color: "#C9D8FF", fontSize: 11, lineHeight: 16, marginTop: 3 },
  statusBadge: { marginTop: 13, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }, statusText: { fontSize: 10, fontWeight: "800" },
  infoCard: { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E7EBF2", paddingHorizontal: 15, marginTop: 14, ...shadow },
  detailItem: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EBF2" }, detailIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  detailLabel: { width: 90, fontSize: 11, color: "#8A94A6" }, detailValue: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700", color: "#111827", textAlign: "right", textTransform: "capitalize" },
  section: { marginTop: 22 }, sectionTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 8 }, sectionText: { fontSize: 12, lineHeight: 19, color: "#64748B", backgroundColor: "#FFF", borderRadius: 13, borderWidth: 1, borderColor: "#E7EBF2", padding: 14 },
  notice: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 16, backgroundColor: "#FFF", borderRadius: 13, borderWidth: 1, borderColor: "#E7EBF2", padding: 13 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  cancelButton: { height: 48, marginTop: 18, borderRadius: 13, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  cancelButtonText: { color: "#DC2626", fontSize: 13, fontWeight: "800" },
  rescheduleButton: { height: 48, marginTop: 18, borderRadius: 13, backgroundColor: "#2F6BFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rescheduleButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  cancellationUnavailable: { marginTop: 18, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", gap: 9 }, cancellationUnavailableText: { flex: 1, color: "#64748B", fontSize: 11, lineHeight: 17, fontWeight: "600" },
  modalKeyboard: { flex: 1 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.48)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, ...shadow }, modalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  modalTitle: { marginTop: 12, color: "#111827", fontSize: 18, fontWeight: "800", textAlign: "center" }, modalText: { marginTop: 7, color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center" },
  reasonInput: { minHeight: 112, marginTop: 17, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: "#CBD5E1", color: "#111827", backgroundColor: "#F8FAFC", fontSize: 13, lineHeight: 19 }, characterCount: { marginTop: 5, color: "#94A3B8", fontSize: 10, textAlign: "right" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 17 }, keepButton: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }, keepButtonText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  confirmCancelButton: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" }, confirmCancelText: { color: "#FFF", fontSize: 12, fontWeight: "800" }, disabledButton: { opacity: 0.45 },
  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, unavailableTitle: { fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center", marginTop: 13 }, unavailableText: { fontSize: 12, lineHeight: 18, color: "#8A94A6", textAlign: "center", marginTop: 7 },
});
