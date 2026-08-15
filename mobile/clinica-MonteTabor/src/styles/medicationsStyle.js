import { StyleSheet } from "react-native";
import { colors } from "./profile/profileStyle";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: "center" },
});

export default styles;
