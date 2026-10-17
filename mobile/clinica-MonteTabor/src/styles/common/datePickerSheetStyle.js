import { StyleSheet } from "react-native";
import { colors } from "../profile/profileStyle";

// Estilos del selector de fecha (DatePickerSheet.jsx). Usa la misma paleta
// del perfil (colors) para verse igual que el resto de formularios.
export default StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,18,32,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D7DCE5", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cancel: { fontSize: 14, color: colors.muted },
  done: { fontSize: 14, fontWeight: "700", color: colors.primary },
  title: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "700", color: colors.text, marginHorizontal: 8 },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF3FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  summaryText: { fontSize: 15, fontWeight: "700", color: colors.text },

  tabs: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: colors.card, shadowColor: "#0B1220", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.primary },

  body: { minHeight: 330 },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  navButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" },
  navButtonDisabled: { opacity: 0.35 },
  navTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  navTitle: { fontSize: 16, fontWeight: "700", color: colors.text, paddingHorizontal: 4, paddingVertical: 4 },
  navTitleYear: { color: colors.primary },

  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.muted },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dayToday: { borderWidth: 1.5, borderColor: colors.primarySoft },
  daySelected: { backgroundColor: colors.primary, borderWidth: 0 },
  dayText: { fontSize: 14, fontWeight: "600", color: colors.text },
  dayTextDisabled: { color: "#C7CDD8", fontWeight: "500" },
  dayTextSelected: { color: "#FFFFFF" },

  quickRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 10 },
  quickChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6E2FF",
    backgroundColor: "#F7F9FF",
  },
  quickChipToday: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  quickTextToday: { color: "#FFFFFF" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  gridCell: {
    width: "31%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  yearCell: { width: "23%", height: 42, paddingVertical: 0, justifyContent: "center" },
  gridCellSelected: { backgroundColor: colors.primary },
  gridCellDisabled: { opacity: 0.5 },
  gridText: { fontSize: 14, fontWeight: "600", color: colors.text },
  gridTextSelected: { color: "#FFFFFF" },
  yearsScroll: { maxHeight: 330 },
});
