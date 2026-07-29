import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import apiClient, { tokenStorage, setOnUnauthorized } from "../lib/apiClient";

// Ajustar según cómo esté montado el router en el backend
const LOGIN_PATH = "/loginPatient/login";
// Único logout del backend (app.js: app.use("/api/logout", validateAuthCookie(), ...)) —
// el mismo que usa la web, vale para cualquier rol
const LOGOUT_PATH = "/logout";

const USER_KEY = "patient_user";

// Traducción de los mensajes que devuelve el backend
const ERROR_MESSAGES = {
    "Email and password are required.": "Ingresa tu correo y tu contraseña.",
    "Invalid email or password.": "Correo o contraseña incorrectos.",
    "Wrong password": "Correo o contraseña incorrectos.",
    "User is locked": "Cuenta bloqueada por múltiples intentos fallidos. Espera 15 minutos.",
    "Internal server error": "Error en el servidor. Intenta más tarde.",
};

// atob no está disponible de forma confiable en React Native
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64UrlDecode(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    let out = "", bits = 0, value = 0;
    for (const char of normalized) {
        const index = B64.indexOf(char);
        if (index === -1) continue;
        value = (value << 6) | index;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out += String.fromCharCode((value >> bits) & 0xff);
        }
    }
    return out;
}

// Lee el "exp" del payload del JWT para descartar tokens vencidos sin llamar al servidor
function isTokenValid(token) {
    try {
        const payload = JSON.parse(base64UrlDecode(token.split(".")[1]));
        if (!payload.exp) return true;
        return payload.exp * 1000 > Date.now() + 5000; // margen de 5s
    } catch {
        return false;
    }
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // activo mientras se revisa el token guardado

    // Borra token, usuario persistido y estado en memoria
    const clearSession = useCallback(async () => {
        await tokenStorage.remove();
        await SecureStore.deleteItemAsync(USER_KEY);
        setUser(null);
        setIsLoggedIn(false);
    }, []);

    // Se engancha al apiClient: cualquier 401 saca al usuario de la sesión
    useEffect(() => {
        setOnUnauthorized(() => {
            SecureStore.deleteItemAsync(USER_KEY);
            setUser(null);
            setIsLoggedIn(false);
        });
        return () => setOnUnauthorized(null);
    }, []);

    // Restaura la sesión desde el dispositivo. En móvil no hay window.location,
    // así que se ejecuta siempre al abrir la app
    const checkSession = useCallback(async () => {
        try {
            const token = await tokenStorage.get();
            if (!token || !isTokenValid(token)) {
                await clearSession();
                return;
            }
            const savedUser = await SecureStore.getItemAsync(USER_KEY);
            if (!savedUser) {
                await clearSession();
                return;
            }
            setUser(JSON.parse(savedUser));
            setIsLoggedIn(true);
        } catch {
            await clearSession();
        }
    }, [clearSession]);

    useEffect(() => {
        const initSystem = async () => {
            try {
                await checkSession();
            } finally {
                setIsLoading(false); // apaga el splash
            }
        };
        initSystem();
    }, [checkSession]);

    // Retorna { ok, message, user }. No muestra notificaciones: eso queda del lado
    // de la pantalla para no duplicar el toast
    const login = async (email, password) => {
        if (!email?.trim() || !password?.trim()) {
            return { ok: false, message: "Por favor, completa todos los campos." };
        }
        try {
            const response = await apiClient(LOGIN_PATH, {
                method: "POST",
                // Sin toLowerCase: el backend busca el email con coincidencia exacta
                body: { email: email.trim(), password: password.trim() },
            });

            if (!response.token) throw new Error("El servidor no devolvió el token de sesión.");

            await tokenStorage.set(response.token);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));

            setUser(response.user);
            setIsLoggedIn(true);
            return { ok: true, user: response.user };
        } catch (error) {
            await clearSession();
            const message = ERROR_MESSAGES[error.message] || error.message || "No se pudo iniciar sesión.";
            return { ok: false, message };
        }
    };

    // Usa el mismo endpoint /logout que la web (único logout del backend, vale para
    // cualquier rol). En móvil no hay cookie que limpiar del lado del servidor, pero se llama
    // igual para que quede registrado ahí también. Si el dispositivo no tiene red, la sesión
    // local se cierra de todas formas — nunca dejamos a alguien atrapado como "logueado"
    // solo porque la petición falló.
    const logout = async () => {
        let backendOk = true;
        try {
            await apiClient(LOGOUT_PATH, { method: "POST" });
        } catch (error) {
            backendOk = false;
        }

        await clearSession();
        return { ok: true, backendOk };
    };

    return (
        <AuthContext.Provider
            value={{ user, setUser, isLoggedIn, isLoading, login, logout, refetchUser: checkSession }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);