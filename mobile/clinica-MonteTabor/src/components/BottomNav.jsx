import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import styles, { colors } from "../styles/bottomNavStyle";
import { showWarning } from "../lib/toast";

// Rutas ya registradas en App.js. Las que faltan muestran un aviso en vez de navegar.
const IMPLEMENTED_ROUTES = ["Dashboard", "Appointments", "Medications", "Profile"];

const TABS_LEFT = [
  { route: "Dashboard", label: "Inicio", icon: "home", iconOutline: "home-outline" },
  { route: "Appointments", label: "Consultas", icon: "calendar", iconOutline: "calendar-outline" },
];

const TABS_RIGHT = [
  { route: "Medications", label: "Medicamentos", icon: "pill", iconOutline: "pill", library: "material" },
  { route: "Profile", label: "Perfil", icon: "person", iconOutline: "person-outline" },
];

const TabButton = ({ tab, focused, onPress }) => {
  const color = focused ? colors.active : colors.inactive;
  const iconName = focused ? tab.icon : tab.iconOutline;

  return (
    <TouchableOpacity style={styles.tab} activeOpacity={0.7} onPress={onPress}>
      {tab.library === "material" ? (
        <MaterialCommunityIcons name={iconName} size={24} color={color} />
      ) : (
        <Ionicons name={iconName} size={24} color={color} />
      )}
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

// Componente global: se monta en cada pantalla pasándole `navigation` y la
// ruta activa (`active`), igual que ya se hace en el resto de las pantallas.
const BottomNav = ({ navigation, active, onAddPress }) => {
  const insets = useSafeAreaInsets();

  const goTo = (route) => {
    if (route === active) return;
    if (!IMPLEMENTED_ROUTES.includes(route)) {
      showWarning("Próximamente disponible.");
      return;
    }
    navigation?.navigate(route);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {TABS_LEFT.map((tab) => (
          <TabButton
            key={tab.route}
            tab={tab}
            focused={active === tab.route}
            onPress={() => goTo(tab.route)}
          />
        ))}

        <View style={styles.tab}>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={onAddPress || (() => showWarning("Próximamente disponible."))}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {TABS_RIGHT.map((tab) => (
          <TabButton
            key={tab.route}
            tab={tab}
            focused={active === tab.route}
            onPress={() => goTo(tab.route)}
          />
        ))}
      </View>
    </View>
  );
};

export default BottomNav;
