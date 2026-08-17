import { StyleSheet, Platform } from "react-native";
import { colors } from "../profile/profileStyle";

export const pillTint = {
  blue:   { bg: "#E9F0FF", fg: "#2F6BFF" },
  green:  { bg: "#E7F7EE", fg: "#16A34A" },
  purple: { bg: "#F1ECFE", fg: "#7C4DFF" },
  amber:  { bg: "#FEF4E2", fg: "#E9A100" },
  pink:   { bg: "#FDEAF2", fg: "#E5399B" },
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
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSide: { width: 32 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  headerHighlight: { backgroundColor: "#FDE68A", borderRadius: 4 },

  /* ---------- Banner ---------- */
  banner: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  bannerTexts: { flex: 1, paddingRight: 12 },
  bannerTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  bannerText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    lineHeight: 16,
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------- Botón principal ---------- */
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    ...shadow,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "700", marginLeft: 8 },

  /* ---------- Secciones ---------- */
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },

  /* ---------- Tarjeta de medicamento ---------- */
  medCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    ...shadow,
  },
  medTop: { flexDirection: "row", alignItems: "flex-start" },
  medIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  medBody: { flex: 1 },
  medTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  medName: { fontSize: 14, fontWeight: "700", color: colors.text, marginRight: 8 },
  medForm: { fontSize: 11, color: colors.muted, marginTop: 2 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  medMenu: { padding: 4 },

  medMeta: { marginTop: 10, gap: 5 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, color: colors.muted, marginLeft: 6 },
  metaDot: { fontSize: 11, color: colors.muted, marginHorizontal: 5 },

  /* ---------- Estado vacío ---------- */
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 30 },
  emptyCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  /* ---------- Stepper ---------- */
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stepItem: { alignItems: "center", width: 56 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E9F0",
  },
  stepCircleActive: { backgroundColor: colors.primary },
  stepNumber: { fontSize: 12, fontWeight: "700", color: colors.muted },
  stepNumberActive: { color: "#fff" },
  stepLabel: { fontSize: 9, color: colors.muted, marginTop: 6, textAlign: "center" },
  stepLabelActive: { color: colors.text, fontWeight: "600" },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#E5E9F0",
    marginTop: 13,
  },
  stepLineActive: { backgroundColor: colors.primary },

  /* ---------- Formulario ---------- */
  formSection: { marginBottom: 26 },
  formTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  formSubtitle: { fontSize: 11, color: colors.muted, marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 11, color: colors.danger, marginTop: 4 },

  /* fila con selector de ícono a la derecha */
  rowWithIcon: { flexDirection: "row", alignItems: "flex-start" },
  rowFields: { flex: 1, marginRight: 12 },
  iconPicker: {
    width: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 18,
  },
  iconPickerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconPickerText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },

  /* ---------- Radios ---------- */
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD2DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  radioLabel: { fontSize: 13, color: colors.text },

  /* ---------- Horas ---------- */
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  timeText: { fontSize: 13, fontWeight: "600", color: colors.text },
  timeActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  addTime: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  addTimeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 6,
  },

  /* ---------- Duración ---------- */
  durationRow: { flexDirection: "row", alignItems: "center" },
  durationInput: { flex: 1 },
  durationSuffix: {
    fontSize: 12,
    color: colors.muted,
    position: "absolute",
    right: 14,
  },

  /* ---------- Footer ---------- */
  footer: {
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
    alignItems: "center",
  },
  primaryButtonDisabled: { backgroundColor: "#A9C0FF" },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  /* ---------- Modal genérico ---------- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingTop: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  modalOptionText: { fontSize: 14, color: colors.text },
  modalOptionTextActive: { color: colors.primary, fontWeight: "600" },

  /* grid de íconos */
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionActive: { borderColor: colors.primary },
});

export default styles;