import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import apiClient, { tokenStorage, setOnUnauthorized } from "../lib/apiClient";

// Ajustar según cómo esté montado el router en el backend
const LOGIN_PATH = "/loginPatient/login";
// Autoservicio de pacientes (backend/src/routes/patients/patientSelf.js) — /register es
// público y funciona como un "login escondido": al registrarse, la respuesta ya trae token +
// user, igual que el login, así que no hace falta pasar por la pantalla de login después
const REGISTER_PATH = "/patientAccount/register";
// Único logout del backend (app.js: app.use("/api/logout", validateAuthCookie(), ...)) —
// el mismo que usa la web, vale para cualquier rol
const LOGOUT_PATH = "/logout";
// A diferencia de la recuperación (sin sesión, verifica un código por correo), aquí el paciente
// ya está logueado y confirma su contraseña actual — por eso vive en patientAccount, no en
// recoveryPatientPassword
const CHANGE_PASSWORD_PATH = "/patientAccount/changePassword";

const USER_KEY = "patient_user";

// Traducción de los mensajes que devuelve el backend
const ERROR_MESSAGES = {
    "Email and password are required.": "Ingresa tu correo y tu contraseña.",
    "Invalid email or password.": "Correo o contraseña incorrectos.",
    "Wrong password": "Correo o contraseña incorrectos.",
    "User is locked": "Cuenta bloqueada por múltiples intentos fallidos. Espera 15 minutos.",
    "Internal server error": "Error en el servidor. Intenta más tarde.",
    "Ya existe un paciente registrado con ese correo": "Ese correo ya tiene una cuenta registrada.",
    "Ya existe un paciente registrado con ese DUI": "Ese DUI ya tiene una cuenta registrada.",
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

    // Guarda token + usuario (dispositivo y memoria) — lo comparten login() y register(),
    // ya que registrarse deja al paciente autenticado exactamente igual que iniciar sesión
    const applySession = async (response) => {
        if (!response.token) throw new Error("El servidor no devolvió el token de sesión.");
        await tokenStorage.set(response.token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
        setUser(response.user);
        setIsLoggedIn(true);
    };

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
            await applySession(response);
            return { ok: true, user: response.user };
        } catch (error) {
            await clearSession();
            const message = ERROR_MESSAGES[error.message] || error.message || "No se pudo iniciar sesión.";
            return { ok: false, message };
        }
    };

    // Registro de un paciente nuevo. patientData: { name, last_name, dui?, birth_date, gender,
    // phone, email, password } — la pantalla ya validó formato/campos requeridos antes de
    // llamar esto. Igual que login(), no muestra notificaciones (eso lo hace la pantalla).
    const register = async (patientData) => {
        try {
            const response = await apiClient(REGISTER_PATH, {
                method: "POST",
                body: patientData,
            });
            await applySession(response);
            return { ok: true, user: response.user };
        } catch (error) {
            await clearSession();
            const message = ERROR_MESSAGES[error.message] || error.message || "No se pudo completar el registro.";
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

    // Cambio de contraseña desde Perfil (paciente ya autenticado, confirma su contraseña
    // actual). A diferencia de login/register/logout, la sesión sigue activa después: el token
    // no depende de la contraseña, así que no hace falta cerrar sesión ni reautenticar.
    // El backend ya devuelve mensajes en español listos para mostrar, así que no pasa por
    // ERROR_MESSAGES.
    const changePassword = async (oldPassword, newPassword, confirmNewPassword) => {
        try {
            const response = await apiClient(CHANGE_PASSWORD_PATH, {
                method: "PUT",
                body: { oldPassword, newPassword, confirmNewPassword },
            });
            return { ok: true, message: response.message };
        } catch (error) {
            return { ok: false, message: error.message || "No se pudo cambiar la contraseña." };
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, setUser, isLoggedIn, isLoading, login, register, logout, changePassword, refetchUser: checkSession }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);