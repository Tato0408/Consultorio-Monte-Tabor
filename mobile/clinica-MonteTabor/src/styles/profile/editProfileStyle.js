import { StyleSheet, Platform } from "react-native";
import { colors } from "./profileStyle";

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
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    backgroundColor: "rgba(11,18,32,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pickerCancel: { fontSize: 14, color: colors.muted },
  pickerDone: { fontSize: 14, fontWeight: "700", color: colors.primary },
  
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40 },

  /* ---------- Header ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerSide: { width: 60 },
  // Variante más ancha para el encabezado de Editar Perfil: con 60 px,
  // "Guardar" se partía en dos líneas cuando el teléfono usa letra grande.
  headerSideWide: { width: 90 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  headerAction: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "right",
  },
  headerActionDisabled: { color: colors.muted },

  /* ---------- Avatar ---------- */
  avatarBlock: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  avatarWrapper: { marginBottom: 10 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.border,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    backgroundColor: colors.primary,
    borderRadius: 13,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  changePhoto: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  /* ---------- Secciones y campos ---------- */
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 14,
    marginTop: 8,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: "#fff",
  },
  inputFocused: { borderColor: colors.primary },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputValue: { fontSize: 13, color: colors.text, flex: 1 },
  inputPlaceholder: { color: colors.muted },
  errorText: { fontSize: 11, color: colors.danger, marginTop: 4 },

  /* ---------- Botón guardar ---------- */
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    ...shadow,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  /* ---------- Modal de opciones ---------- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,18,32,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
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
});

export default styles;