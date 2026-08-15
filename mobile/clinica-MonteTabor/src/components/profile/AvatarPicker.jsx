import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import styles from "../../styles/profile/editProfileStyle";
import { colors } from "../../styles/profile/profileStyle";

const AvatarPicker = ({ photo, onChange }) => {
  const [sheet, setSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResult = (result) => {
    if (!result.canceled && result.assets?.length) {
      onChange(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    setSheet(false);
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tus fotos para cambiar el avatar."
      );
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      handleResult(result);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    setSheet(false);
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a la cámara para tomar la foto."
      );
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      handleResult(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.avatarBlock}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        activeOpacity={0.8}
        onPress={() => setSheet(true)}
      >
        <Image source={{ uri: photo }} style={styles.avatar} />

        {loading ? (
          <View style={styles.avatarLoading}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}

        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.7} onPress={() => setSheet(true)}>
        <Text style={styles.changePhoto}>Cambiar foto</Text>
      </TouchableOpacity>

      <Modal visible={sheet} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSheet(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Foto de perfil</Text>

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.6}
              onPress={takePhoto}
            >
              <Text style={styles.modalOptionText}>Tomar una foto</Text>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.6}
              onPress={pickFromLibrary}
            >
              <Text style={styles.modalOptionText}>Elegir de la galería</Text>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.6}
              onPress={() => setSheet(false)}
            >
              <Text style={[styles.modalOptionText, { color: colors.muted }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default AvatarPicker;