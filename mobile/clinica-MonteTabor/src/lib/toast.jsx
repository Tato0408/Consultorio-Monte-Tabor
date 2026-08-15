import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

// ── Paleta equivalente a las clases de Tailwind de la versión web ────────────
const VARIANTS = {
    success: { border: "#d1fae5", iconBg: "#10b981", icon: "checkmark" },      // emerald
    error: { border: "#fee2e2", iconBg: "#ef4444", icon: "alert" },            // red
    warning: { border: "#fef3c7", iconBg: "#fbbf24", icon: "warning-outline" },// amber
};

const ToastCard = ({ variant, text1 }) => {
    const v = VARIANTS[variant];
    return (
        <View style={[styles.card, { borderColor: v.border }]}>
            <View style={[styles.iconBox, { backgroundColor: v.iconBg }]}>
                <Ionicons name={v.icon} size={18} color="#fff" />
            </View>
            <Text style={styles.message} numberOfLines={3}>{text1}</Text>
            <TouchableOpacity onPress={() => Toast.hide()} hitSlop={10} style={styles.close}>
                <Ionicons name="close" size={16} color="#cbd5e1" />
            </TouchableOpacity>
        </View>
    );
};

// Este objeto se le pasa al componente <Toast /> montado en App.js
export const toastConfig = {
    success: (props) => <ToastCard variant="success" {...props} />,
    error: (props) => <ToastCard variant="error" {...props} />,
    warning: (props) => <ToastCard variant="warning" {...props} />,
};

// ── Helpers exportados: misma firma que en la web ────────────────────────────

// Devuelve una promesa que resuelve al cerrarse, igual que tu showSuccess web
export const showSuccess = (message) =>
    new Promise((resolve) => {
        Toast.show({ type: "success", text1: message, visibilityTime: 2500, onHide: resolve });
    });

export const showError = (message) =>
    Toast.show({ type: "error", text1: message, visibilityTime: 4000 });

export const showWarning = (message) =>
    Toast.show({ type: "warning", text1: message, visibilityTime: 3500 });

// ── Confirmaciones: reemplazo de SweetAlert2 ─────────────────────────────────
// En RN se usa el diálogo nativo del sistema. Lo envolvemos en una promesa
// para conservar el patrón `if (await confirmDelete()) { ... }` de la web.
const confirm = ({ title, text, confirmText, cancelText = "Cancelar", destructive = false }) =>
    new Promise((resolve) => {
        Alert.alert(
            title,
            text,
            [
                { text: cancelText, style: "cancel", onPress: () => resolve(false) },
                { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) } // onDismiss solo aplica en Android
        );
    });

export const confirmDelete = ({
    title = "¿Eliminar este registro?",
    text = "Esta acción no se puede deshacer.",
} = {}) => confirm({ title, text, confirmText: "Sí, eliminar", destructive: true });

export const confirmCancelAppointment = () =>
    confirm({
        title: "¿Cancelar esta cita?",
        text: "El estado de la cita cambiará a Cancelada.",
        confirmText: "Sí, cancelar cita",
        cancelText: "Volver",
        destructive: true,
    });

export const confirmLogout = () =>
    confirm({
        title: "¿Cerrar sesión?",
        text: "Tendrás que iniciar sesión de nuevo para volver a entrar.",
        confirmText: "Cerrar sesión",
        destructive: true,
    });

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginHorizontal: 16,
        width: "92%",
        gap: 12,
        // Sombra suave equivalente a shadow-lg
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4, // Android
    },
    iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    message: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1e293b", lineHeight: 19 },
    close: { paddingLeft: 2 },
});