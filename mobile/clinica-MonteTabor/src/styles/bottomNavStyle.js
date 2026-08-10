import { StyleSheet, Platform } from "react-native";

export const colors = {
  bg: "#FFFFFF",
  border: "#ECEFF4",
  active: "#2567F4",
  inactive: "#9AA3B2",
};

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  android: { elevation: 10 },
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: colors.inactive,
  },
  labelActive: {
    color: colors.active,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 26,
    backgroundColor: colors.active,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    ...shadow,
  },
});

export default styles;
