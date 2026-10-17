import { Platform, StyleSheet, StatusBar } from "react-native";
import { colors } from "./profile/profileStyle";

export { colors };

const shadow = Platform.select({
  ios: { shadowColor: "#0B1220", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },
  loader: { marginTop: 60 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  /* Accesos rápidos */
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 12, ...shadow },
  quickCardActive: { borderColor: colors.primary },
  quickIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#E9F0FF", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  quickLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  quickSub: { fontSize: 10, color: colors.muted, marginTop: 2 },

  /* Card de bienvenida para quien nunca ha agendado */
  onboardingCard: { backgroundColor: colors.primary, borderRadius: 18, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 14, ...shadow },
  onboardingTexts: { flex: 1 },
  onboardingTitle: { fontSize: 15, fontWeight: "800", color: "#FFF", lineHeight: 20 },
  onboardingText: { fontSize: 12, color: "#DCE6FF", marginTop: 6, lineHeight: 17 },
  onboardingButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14, alignSelf: "flex-start" },
  onboardingButtonText: { color: colors.primary, fontSize: 12.5, fontWeight: "800" },
  onboardingIllustration: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

  /* Cards genéricas de sección (pasos, beneficios) */
  sectionCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 14, ...shadow },
  sectionTitle: { fontSize: 14.5, fontWeight: "800", color: colors.text, marginBottom: 16 },

  stepsRow: { flexDirection: "row" },
  stepCol: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  stepCircleWrap: { position: "relative", marginBottom: 8 },
  stepCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" },
  stepNumberBadge: { position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  stepTitle: { fontSize: 10.5, fontWeight: "800", color: colors.text, textAlign: "center" },
  stepText: { fontSize: 9, color: colors.muted, textAlign: "center", marginTop: 3, lineHeight: 12.5 },

  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  benefitCol: { width: "44%", alignItems: "flex-start" },
  benefitIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  benefitTitle: { fontSize: 11.5, fontWeight: "800", color: colors.text },
  benefitText: { fontSize: 10, color: colors.muted, marginTop: 2, lineHeight: 14 },

  /* Próxima cita / Última consulta */
  appointmentCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 16, ...shadow },
  rescheduleBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 16, padding: 14, marginBottom: 14 },
  rescheduleBannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  rescheduleBannerTitle: { fontSize: 13, fontWeight: "800", color: "#9A3412" },
  rescheduleBannerText: { fontSize: 11, color: "#C2410C", marginTop: 2 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardHeaderTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  cardHeaderLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  cardHeaderLinkText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  statusPill: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  doctorRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: colors.bg },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: "#E9F0FF", alignItems: "center", justifyContent: "center" },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  doctorSpecialty: { fontSize: 12.5, color: colors.primary, fontWeight: "600", marginTop: 2 },

  consultDateTime: { flexDirection: "row", alignItems: "center", marginLeft: 60, marginTop: 6, marginBottom: 14 },
  consultDateTimeText: { fontSize: 11.5, color: colors.muted, marginLeft: 5, marginRight: 12 },

  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 14 },

  /* Fecha/Hora repartidas en dos mitades exactamente iguales */
  dateTimeRow: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 12, padding: 12, marginBottom: 14 },
  // minWidth 0 deja que cada mitad se encoja a su ancho real; sin él, una fecha larga
  // empujaba el texto por encima del ícono de la otra mitad.
  dateTimeCol: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  dateTimeDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 10 },
  dateTimeIconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  // El texto ocupa solo lo que queda de su mitad y baja de línea si no cabe.
  dateTimeTextWrap: { flex: 1, minWidth: 0 },
  dateTimeColLabel: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  dateTimeColValue: { fontSize: 12.5, color: colors.text, fontWeight: "700", marginTop: 1 },

  actionsRow: { flexDirection: "row", gap: 10 },
  outlineButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 11 },
  outlineButtonText: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  primaryButtonSmall: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11 },
  primaryButtonSmallText: { fontSize: 12.5, fontWeight: "700", color: "#FFF" },

  emptyState: { alignItems: "center", paddingVertical: 8 },
  emptyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyStateText: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  emptyStateButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyStateButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  diagnosisBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
  diagnosisLabel: { fontSize: 11, fontWeight: "700", color: colors.text, marginBottom: 4 },
  diagnosisText: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  moreLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
  moreLinkText: { fontSize: 11.5, fontWeight: "700", color: colors.primary },
});

export default styles;
