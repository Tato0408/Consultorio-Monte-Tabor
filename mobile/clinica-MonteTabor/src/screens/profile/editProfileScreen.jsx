import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AvatarPicker from "../../components/profile/AvatarPicker";
import FormInput from "../../components/profile/FormInput";
import FormSelect from "../../components/profile/FormSelect";
import FormDateInput from "../../components/profile/FormDateInput";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

const GENEROS = ["Masculino", "Femenino", "Otro", "Prefiero no decirlo"];
const ESTADOS_CIVILES = ["Soltero", "Casado", "Divorciado", "Viudo", "Unión libre"];
const CIUDADES = ["San Salvador", "Santa Ana", "San Miguel", "Sonsonate", "La Libertad"];
const RELACIONES = ["Madre", "Padre", "Hermano/a", "Cónyuge", "Hijo/a", "Amigo/a"];

const initialForm = {
  photo: "https://i.pravatar.cc/150",
  nombres: "Carlos Andrés",
  apellidos: "Rodríguez Gómez",
  fechaNacimiento: "12/03/1996",
  genero: "Masculino",
  estadoCivil: "Soltero",
  telefono: "+503 7777 7777",
  correo: "carlos.rodriguez@email.com",
  direccion: "Calle 123 #45-67, San Salvador, El Salvador",
  ciudad: "San Salvador",
  emergenciaNombre: "María Rodríguez",
  emergenciaTelefono: "+503 4444 4444",
  emergenciaRelacion: "Madre",
};

const EditProfileScreen = ({ navigation }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.nombres.trim()) next.nombres = "Ingresa tus nombres";
    if (!form.apellidos.trim()) next.apellidos = "Ingresa tus apellidos";
    if (!/^\S+@\S+\.\S+$/.test(form.correo)) next.correo = "Correo no válido";
    if (!form.telefono.trim()) next.telefono = "Ingresa un teléfono";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Aquí iría la llamada a tu API
    console.log("Guardando:", form);
    Alert.alert("Listo", "Tus cambios se guardaron correctamente", [
      { text: "OK", onPress: () => navigation?.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Editar Perfil</Text>

        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={handleSave}
        >
          <Text style={styles.headerAction}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
     <AvatarPicker
            photo={form.photo}
            onChange={setField("photo")}
          />

          <Text style={styles.sectionTitle}>Información personal</Text>

          <FormInput
            label="Nombres"
            value={form.nombres}
            onChangeText={setField("nombres")}
            error={errors.nombres}
          />
          <FormInput
            label="Apellidos"
            value={form.apellidos}
            onChangeText={setField("apellidos")}
            error={errors.apellidos}
          />
<FormDateInput
            label="Fecha de nacimiento"
            value={form.fechaNacimiento}
            onChange={setField("fechaNacimiento")}
          />
          <FormSelect
            label="Género"
            value={form.genero}
            options={GENEROS}
            onChange={setField("genero")}
          />
          <FormSelect
            label="Estado civil"
            value={form.estadoCivil}
            options={ESTADOS_CIVILES}
            onChange={setField("estadoCivil")}
          />

          <Text style={styles.sectionTitle}>Información de contacto</Text>

          <FormInput
            label="Teléfono"
            value={form.telefono}
            onChangeText={setField("telefono")}
            keyboardType="phone-pad"
            error={errors.telefono}
          />
          <FormInput
            label="Correo electrónico"
            value={form.correo}
            onChangeText={setField("correo")}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.correo}
          />
          <FormInput
            label="Dirección"
            value={form.direccion}
            onChangeText={setField("direccion")}
            multiline
          />
          <FormSelect
            label="Ciudad"
            value={form.ciudad}
            options={CIUDADES}
            onChange={setField("ciudad")}
          />

          <Text style={styles.sectionTitle}>Contacto de emergencia</Text>

          <FormInput
            label="Nombre"
            value={form.emergenciaNombre}
            onChangeText={setField("emergenciaNombre")}
          />
          <FormInput
            label="Teléfono"
            value={form.emergenciaTelefono}
            onChangeText={setField("emergenciaTelefono")}
            keyboardType="phone-pad"
          />
          <FormSelect
            label="Relación"
            value={form.emergenciaRelacion}
            options={RELACIONES}
            onChange={setField("emergenciaRelacion")}
          />

          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.85}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;