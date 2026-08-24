import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/documents/documentsStyle";

// Portada de "Mis documentos" (Perfil > Información personal > Mis documentos): dos
// botones grandes apilados en columna, ocupando toda la pantalla. Arriba incapacidades,
// abajo recetas — cada uno lleva a la lista completa de ese tipo, de todas las consultas.
export default function DocumentsHubScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis documentos</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.hubContent}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.hubButton, { backgroundColor: "#2F6BFF" }]}
          onPress={() => navigation.navigate("DocumentsList", { tipo: "incapacidad" })}
        >
          <View style={styles.hubButtonIconWrap}>
            <Ionicons name="id-card-outline" size={26} color="#FFF" />
          </View>
          <Text style={styles.hubButtonTitle}>Incapacidades</Text>
          <Text style={styles.hubButtonSubtitle}>Todas tus constancias de incapacidad médica</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.hubButton, { backgroundColor: "#16836B" }]}
          onPress={() => navigation.navigate("DocumentsList", { tipo: "receta" })}
        >
          <View style={styles.hubButtonIconWrap}>
            <Ionicons name="document-text-outline" size={26} color="#FFF" />
          </View>
          <Text style={styles.hubButtonTitle}>Recetas</Text>
          <Text style={styles.hubButtonSubtitle}>Todas tus recetas médicas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
