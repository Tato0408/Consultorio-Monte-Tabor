import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Gesto de "deslizar a la izquierda para eliminar", con Animated + PanResponder (ambos ya
// vienen con react-native core, sin agregar ninguna librería nueva ni requerir un build
// nativo distinto). Pasado el umbral, la tarjeta termina de deslizarse fuera de pantalla y
// recién ahí se llama a onDelete — quien decide qué hacer (borrar directo, o primero pedir
// confirmación y, si se rechaza, permitir que vuelva a su lugar con reset()).
const SWIPE_THRESHOLD = -80;
const MAX_SWIPE = -96;
const OFFSCREEN = -420;

const SwipeToDelete = ({ children, onDelete, disabled = false, style }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const reset = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      // Solo toma el gesto si el movimiento es claramente horizontal (evita robarle el
      // scroll vertical al ScrollView que envuelve la lista).
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.max(MAX_SWIPE, Math.min(0, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: OFFSCREEN, duration: 180, useNativeDriver: true }).start(() => {
            onDelete?.(reset);
          });
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.deleteBackground}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </View>
      <Animated.View style={[{ transform: [{ translateX }] }, style]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 96,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SwipeToDelete;
