import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ProfileCard from "../../components/profile/ProfileCard";
import ShortcutCard from "../../components/profile/ShortcutCard";
import InfoCard from "../../components/profile/InfoCard";
import styles, { colors } from "../../styles/profile/profileStyle";

const shortcuts = [
  { icon: "person-outline", title: "Mis datos" },
  { icon: "calendar-outline", title: "Mis consultas" },
  { icon: "document-text-outline", title: "Mis documentos" },
  { icon: "notifications-outline", title: "Recordatorios" },
];

const personalInfo = [
  { icon: "calendar-outline", label: "Fecha de nacimiento", value: "12 Mar 1996", chevron: true },
  { icon: "call-outline", label: "Teléfono", value: "+503 7777 7777", chevron: true },
  { icon: "mail-outline", label: "Correo electrónico", value: "carlos.rodriguez@email.com", chevron: true },
  { icon: "location-outline", label: "Dirección", value: "Calle 123 #45-67, San Salvador", chevron: true },
  { icon: "people-outline", label: "Contacto de emergencia", value: "María Rodríguez (Madre) · +503 4444 4444", chevron: true },
];

const healthInfo = [
  { label: "Tipo de sangre", value: "O+" },
  { label: "Alergias", value: "Polen, Penicilina" },
  { label: "Enfermedades crónicas", value: "Ninguna" },
  { label: "Medicamentos actuales", value: "2 medicamentos" },
];

const accountInfo = [
  { icon: "lock-closed-outline", label: "Cambiar contraseña", chevron: true },
  { icon: "notifications-outline", label: "Configuración de notificaciones", chevron: true },
  { icon: "shield-checkmark-outline", label: "Privacidad y datos", chevron: true },
  { icon: "log-out-outline", label: "Cerrar sesión", chevron: true, danger: true },
];

const ProfileScreen = ({ navigation }) => {
  const handlePress = (item) => console.log("Pressed:", item);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ProfileCard onEdit={() => navigation.navigate("EditProfile")} />

        <Text style={styles.sectionTitle}>Atajos rápidos</Text>
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <ShortcutCard
              key={s.title}
              icon={s.icon}
              title={s.title}
              onPress={() => handlePress(s.title)}
            />
          ))}
        </View>

        <InfoCard
          title="Información personal"
          items={personalInfo.map((i) => ({ ...i, onPress: () => handlePress(i.label) }))}
        />

        <InfoCard
          title="Resumen de salud"
          layout="inline"
          items={healthInfo}
          footer={{
            label: "Ver información completa",
            onPress: () => navigation.navigate("HealthInfo"),
          }}
        />

        <InfoCard
          title="Cuenta y seguridad"
          items={accountInfo.map((i) => ({ ...i, onPress: () => handlePress(i.label) }))}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;