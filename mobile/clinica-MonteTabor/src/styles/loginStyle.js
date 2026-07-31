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

  // Hero de las pantallas de recuperación: dos manchas ancladas en esquinas opuestas, que
  // entre ambas dejan un "valle" ondulado al centro (igual que en los diseños de referencia)
  heroRecovery: { height: 165, overflow: "hidden" },
  blobRecoveryLeft: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#2D5BB5",
    top: -145,
    left: -60,
  },
  blobRecoveryRight: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#4C82FF",
    top: -145,
    right: -60,
  },

  // Mancha decorativa inferior — anclada a la esquina inferior izquierda de la PANTALLA
  // (no del contenido), igual que en los diseños de referencia
  blobBottomWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 140,
    overflow: "hidden",
  },
  blobBottom: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#4C82FF",
    bottom: -95,
    left: -55,
  },

  /* ---------- Contenido central ---------- */
  body: { paddingHorizontal: 24 },
  logoBlock: { alignItems: "center", marginBottom: 22 },
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

  /* ---------- Pantallas de recuperación de contraseña ---------- */
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backText: { fontSize: 14, fontWeight: "600", color: colors.primary, marginLeft: 2 },

  recoveryTitle: { fontSize: 21, fontWeight: "800", color: colors.text, textAlign: "center" },
  recoverySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
  },

  // Casillas del código de verificación (6 dígitos)
  codeRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 22 },
  codeBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },

  // Pantalla "Listo" (contraseña actualizada)
  successIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E6F6EF",
    alignItems: "center",
    justifyContent: "center",
  },

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
