import { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";

// Mismo patrón que showHandler de toast.jsx: un solo diálogo montado una vez en App.js
// (ver ConfirmDialog más abajo), controlado desde cualquier pantalla vía confirmDialog(),
// sin tener que agregar el <Modal> en cada screen que necesite confirmar algo.
let showHandler = null;

export function confirmDialog({ title, text, confirmText = "Confirmar", cancelText = "Cancelar", destructive = false } = {}) {
    return new Promise((resolve) => {
        if (!showHandler) {
            resolve(false);
            return;
        }
        showHandler({ title, text, confirmText, cancelText, destructive, resolve });
    });
}

// Tarjeta blanca centrada con overlay oscuro, mismo lenguaje visual que ConfirmCard del
// portal web/público (lib/alerts.jsx): reemplaza el Alert.alert nativo del sistema, que se
// veía inconsistente con el resto de la UI de la app.
export default function ConfirmDialog() {
    const [state, setState] = useState(null);

    useEffect(() => {
        showHandler = (payload) => setState(payload);
        return () => { showHandler = null; };
    }, []);

    const close = (result) => {
        state?.resolve?.(result);
        setState(null);
    };

    return (
        <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => close(false)}>
            <TouchableWithoutFeedback onPress={() => close(false)}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={styles.card}>
                            {state?.title ? <Text style={styles.title}>{state.title}</Text> : null}
                            {state?.text ? <Text style={styles.text}>{state.text}</Text> : null}
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => close(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelText}>{state?.cancelText}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => close(true)}
                                    style={[styles.confirmBtn, state?.destructive && styles.confirmBtnDanger]}
                                >
                                    <Text style={styles.confirmText}>{state?.confirmText}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 20,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 8,
    },
    title: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 6, lineHeight: 21 },
    text: { fontSize: 14, fontWeight: "500", color: "#475569", lineHeight: 20 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 18 },
    cancelBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
    cancelText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
    confirmBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: "#3B6FCA" },
    confirmBtnDanger: { backgroundColor: "#EF4444" },
    confirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
