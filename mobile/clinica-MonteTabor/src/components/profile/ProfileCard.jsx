import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { colors } from "../../styles/profile/profileStyle";

const ProfileCard = ({
  name = "Carlos Rodríguez",
  age = 28,
  gender = "Masculino",
  patientId = "12345678",
  photo = "https://i.pravatar.cc/150",
  onEdit,
}) => {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileTop}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: photo }} style={styles.avatar} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={12} color={colors.primary} />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.info}>
            {age} años   ·   {gender}
          </Text>
          <Text style={styles.info}>ID Paciente: {patientId}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        activeOpacity={0.8}
        onPress={onEdit}
      >
        <Text style={styles.editButtonText}>Ver y editar perfil</Text>
        <Ionicons name="pencil" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default ProfileCard;