import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../styles/profile/profileStyle";

// Pantalla de carga inicial: se muestra apenas React Native toma control (después del
// loading nativo de Expo Go), mientras AuthContext revisa si hay una sesión guardada.
// Ver useSplashTimer para el tiempo mínimo que permanece en pantalla.
export default function SplashScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.blobTopWrap}>
                <View style={styles.blobBig} />
                <View style={styles.blobSoft} />
            </View>

            <View style={styles.body}>
                <Image
                    source={require("../../assets/logoConsultorioSInFondo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.slogan}>Tu salud es lo más importante</Text>
            </View>

            <View style={styles.blobBottomWrap}>
                <View style={styles.blobBottom} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },

    /* ---------- Decoración: mismas "manchas" azules que el login ---------- */
    blobTopWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 220, overflow: "hidden" },
    blobBig: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "#2D5BB5",
        top: -150,
        left: -70,
    },
    blobSoft: {
        position: "absolute",
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: "#4C82FF",
        top: -110,
        left: 90,
    },
    blobBottomWrap: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 160,
        overflow: "hidden",
    },
    blobBottom: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#4C82FF",
        bottom: -110,
        right: -60,
    },

    /* ---------- Contenido central ---------- */
    body: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    logo: {
        width: 140,
        height: 140,
        marginBottom: 18,
    },
    slogan: {
        fontSize: 13,
        color: colors.muted,
        textAlign: "center",
        marginTop: 6,
    },
});
