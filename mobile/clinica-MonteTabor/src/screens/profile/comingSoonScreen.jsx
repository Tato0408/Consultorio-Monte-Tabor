import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DetailHeader from "../../components/profile/DetailHeader";
import EmptyState from "../../components/profile/EmptyState";
import styles from "../../styles/profile/detailStyle";

// Pantalla simple de marcador de posición, reutilizada por las filas de "Cuenta y
// seguridad" que todavía no tienen funcionalidad real detrás (Configuración de
// notificaciones, Privacidad y datos — ver App.js, registrada dos veces con distinto
// initialParams). Antes eran botones que ni siquiera navegaban a ningún lado (solo un
// console.log); esto ya es una pantalla real, solo que su contenido llega después.
const ComingSoonScreen = ({ navigation, route }) => {
  const { title = "Próximamente", icon = "construct-outline", text = "Estamos trabajando en esta sección." } = route.params || {};

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <DetailHeader title={title} onBack={() => navigation.goBack()} />
      <EmptyState icon={icon} title="Próximamente" text={text} />
    </SafeAreaView>
  );
};

export default ComingSoonScreen;
