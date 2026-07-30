import { StyleSheet, Platform } from "react-native";
import { colors } from "./profile/profileStyle";

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flexGrow: 1, paddingBottom: 40 },

  /* ---------- Decoración superior: manchas azules, igual identidad visual que la web ---------- */
  heroLogin: { height: 150, overflow: "hidden" },
  heroRegister: { height: 90, overflow: "hidden" },

  blobLoginBig: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#2D5BB5",
    top: -150,
    left: -70,
  },
  blobLoginSoft: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#4C82FF",
    top: -110,
    left: 90,
  },
  blobRegisterBig: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#2D5BB5",
    top: -95,
    left: -80,
  },
  blobRegisterSoft: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4C82FF",
    top: -30,
    left: -40,
  },

  /* ---------- Contenido central ---------- */
  body: { paddingHorizontal: 24 },
  logoBlock: { alignItems: "center", marginBottom: 22 },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...shadow,
  },
  logoLetter: { color: "#fff", fontSize: 19, fontWeight: "800" },
  title: { fontSize: 21, fontWeight: "800", color: colors.text },

  /* ---------- Formulario ---------- */
  form: {},
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },

  forgotWrap: { alignItems: "flex-end", marginTop: -8, marginBottom: 18 },
  forgotText: { fontSize: 12, fontWeight: "600", color: colors.primary },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
    ...shadow,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  /* ---------- Pie: divisor + link cruzado entre Login/Registro ---------- */
  footerDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.muted, marginHorizontal: 10 },
  footerLinkWrap: { alignItems: "center" },
  footerLink: { fontSize: 13, fontWeight: "700", color: colors.primary },
});

export default styles;
