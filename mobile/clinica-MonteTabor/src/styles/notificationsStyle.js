import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({ ios: { shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 1 } });

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 }, title: { fontSize: 20, fontWeight: "800", color: "#111827" }, subtitle: { fontSize: 11, color: "#8A94A6", marginTop: 2 },
  readAllButton: { minWidth: 72, minHeight: 40, alignItems: "center", justifyContent: "center" }, readAllText: { fontSize: 12, fontWeight: "700", color: "#2F6BFF" }, readAllDisabled: { color: "#A0AEC0" },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 18, paddingBottom: 40 }, loader: { marginTop: 70 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginBottom: 9, marginTop: 7 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E7EBF2", padding: 13, marginBottom: 10, ...shadow }, cardUnread: { borderColor: "#C9D8FF", backgroundColor: "#F8FAFF" },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 11 }, iconUnread: { backgroundColor: "#E9F0FF" },
  cardText: { flex: 1 }, cardMeta: { flexDirection: "row", alignItems: "center" }, cardTitle: { flex: 1, fontSize: 12, fontWeight: "600", color: "#475569" }, cardTitleUnread: { fontWeight: "800", color: "#111827" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2F6BFF", marginLeft: 6 }, message: { fontSize: 12, lineHeight: 17, color: "#64748B", marginTop: 4 }, time: { fontSize: 10, color: "#A0AEC0", marginTop: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 90 }, emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E9EEF5", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#111827", marginTop: 16 }, emptyText: { fontSize: 12, color: "#8A94A6", marginTop: 6, textAlign: "center" },
});
