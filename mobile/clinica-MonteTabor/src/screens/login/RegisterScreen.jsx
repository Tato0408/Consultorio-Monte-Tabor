import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import FormInput from "../../components/profile/FormInput";
import FormSelect from "../../components/profile/FormSelect";
import FormDateInput from "../../components/profile/FormDateInput";
import styles from "../../styles/loginStyle";

const GENDER_OPTIONS = ["Masculino", "Femenino"];

// Pantalla de registro (alta del primer/nuevo usuario). Igual que LoginScreen, por ahora es
// solo interfaz: los campos guardan su valor localmente pero el botón "Regístrate" no envía
// nada todavía.
const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dui, setDui] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("Masculino");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRegister}>
          <View style={styles.blobRegisterBig} />
          <View style={styles.blobRegisterSoft} />
        </View>

        <View style={styles.body}>
          <View style={styles.logoBlock}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.title}>Regístrate</Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Nombres"
              placeholder="Ingresa tus nombres"
              value={name}
              onChangeText={setName}
            />

            <FormInput
              label="Apellidos"
              placeholder="Ingresa tus apellidos"
              value={lastName}
              onChangeText={setLastName}
            />

            <View style={styles.row}>
              <View style={styles.rowField}>
                <FormInput
                  label="DUI"
                  placeholder="01234567-8"
                  value={dui}
                  onChangeText={setDui}
                />
              </View>
              <View style={styles.rowField}>
                <FormDateInput label="Nacimiento" value={birthDate} onChange={setBirthDate} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowField}>
                <FormSelect
                  label="Género"
                  value={gender}
                  options={GENDER_OPTIONS}
                  onChange={setGender}
                />
              </View>
              <View style={styles.rowField}>
                <FormInput
                  label="Teléfono"
                  placeholder="7890-7890"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <FormInput
              label="Correo"
              placeholder="ejemplo@mail.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.footerLinkWrap}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
