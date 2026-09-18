import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import apiClient, { WS_URL } from "../lib/apiClient";
import { showWarning } from "../lib/alerts";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [patient, setPatient] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Copia siempre actualizada de isLoggedIn para leer dentro del listener de
    // "session-expired" (ver más abajo), que se suscribe una sola vez al montar.
    const isLoggedInRef = useRef(false);
    // Evita que la revalidación de handleSessionExpired (que también llama a /auth/me y
    // puede volver a disparar "session-expired" con su propio 401) entre en bucle.
    const revalidatingRef = useRef(false);

    // Devuelve true si al terminar hay una sesión de paciente válida, false si no.
    // Un fallo de red (backend caído, reiniciándose, sin conexión) NO cierra la sesión:
    // el token puede seguir vivo, solo no se pudo confirmar ahora. Se reintenta un par de
    // veces (cubre la ventana de reinicio del backend) y únicamente un rechazo real de
    // autenticación (401/403) limpia la sesión.
    const checkSession = useCallback(async (retries = 2) => {
        try {
            const response = await apiClient("/auth/me");
            // /auth/me es compartido con el panel privado y valida "cualquier
            // usuario autenticado" (admin, doctor, enfermera, recepcionista o
            // paciente), sin importar el tipo. Si en el mismo navegador hay una
            // cookie de sesión del panel privado (userType distinto de
            // "patient"), esta llamada igual responde 200, pero el resto del
            // portal (/patient-portal/*) exige específicamente rol "patient" y
            // la rechazaría con 401. Sin este chequeo, isLoggedIn quedaba en
            // true con una sesión que no sirve para el portal del paciente:
            // ProtectedRoute dejaba pasar, el dashboard fallaba con 401, y
            // Login.jsx rebotaba de vuelta al dashboard en bucle porque
            // también veía isLoggedIn en true.
            if (response.userType !== "patient") {
                setPatient(null);
                setIsLoggedIn(false);
                return false;
            }
            setPatient(response.user);
            setIsLoggedIn(true);
            return true;
        } catch (err) {
            // 401 = token vencido/ausente; 403 = cookie de otro rol (staff). Solo en esos
            // casos se cierra la sesión.
            if (err?.status === 401 || err?.status === 403) {
                setPatient(null);
                setIsLoggedIn(false);
                return false;
            }
            // Falla de red / backend reiniciándose: reintenta antes de rendirse.
            if (retries > 0) {
                await new Promise((r) => setTimeout(r, 800));
                return checkSession(retries - 1);
            }
            // Sin poder confirmar: no se toca el estado (si había sesión, se conserva).
            return isLoggedInRef.current;
        }
    }, []);

    useEffect(() => {
        const initSession = async () => {
            const pathname = window.location.pathname;
            // "/" no necesita saber si hay sesión, y "/register/verify" usa una cookie
            // temporal aparte (no la de sesión), así que ninguna de las dos la revisa.
            // Login y Register SÍ la revisan, para poder mandar directo al dashboard
            // a quien ya tenga sesión iniciada en vez de mostrarle el formulario de nuevo.
            if (pathname === "/" || pathname === "/register/verify") {
                setIsLoading(false);
                return;
            }
            await checkSession();
            setIsLoading(false);
        };

        initSession();
    }, [checkSession]);

    useEffect(() => {
        isLoggedInRef.current = isLoggedIn;
    }, [isLoggedIn]);

    // WebSocket de tiempo real, mismo canal que ya usa el panel privado
    // (roleSocket.js en el backend hace broadcast a cualquier rol, incluido
    // "patient": ver broadcastNotification). Antes el portal público solo
    // hacía polling cada 30s (NotificationsMenu.jsx), hasta 30s de atraso
    // para algo que el backend ya empuja al instante. No se maneja
    // "role-updated" acá: un paciente no tiene permisos configurables.
    useEffect(() => {
        if (!isLoggedIn) return;

        let socket = null;
        let reconnectTimer = null;
        let cerradoPorNosotros = false;

        const conectar = () => {
            socket = new WebSocket(WS_URL);

            socket.onmessage = (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (data.type === "notification" && data.notification) {
                    window.dispatchEvent(
                        new CustomEvent("app:notification", { detail: data.notification })
                    );
                }
            };

            socket.onclose = () => {
                if (cerradoPorNosotros) return;
                // Render corta conexiones ociosas: se reintenta con espera.
                reconnectTimer = setTimeout(conectar, 3000);
            };

            socket.onerror = () => {
                socket.close();
            };
        };

        conectar();

        return () => {
            cerradoPorNosotros = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (socket) socket.close();
        };
    }, [isLoggedIn]);

    // apiClient dispara "session-expired" ante cualquier 401. Solo se actúa si había
    // una sesión activa: así no interfiere con el 401 de /auth/me en visitantes sin
    // sesión, ni con un intento de login fallido por credenciales inválidas.
    //
    // Antes de cerrar sesión se revalida contra /auth/me: un 401 puede venir de un
    // endpoint no relacionado o ser transitorio, y no debe tumbar una sesión que sigue
    // siendo válida (con la sesión deslizante de 2 h del backend esto pasaba seguido).
    // Solo si la revalidación también falla se cierra la sesión — y ahí ProtectedRoute,
    // que ya observa isLoggedIn, redirige a /login por su cuenta.
    useEffect(() => {
        const handleSessionExpired = async () => {
            if (!isLoggedInRef.current || revalidatingRef.current) return;
            revalidatingRef.current = true;
            let stillValid = false;
            try {
                stillValid = await checkSession();
            } finally {
                revalidatingRef.current = false;
            }
            if (!stillValid) {
                isLoggedInRef.current = false;
                showWarning("Tu sesión expiró. Inicia sesión de nuevo.");
            }
        };
        window.addEventListener("session-expired", handleSessionExpired);
        return () => window.removeEventListener("session-expired", handleSessionExpired);
    }, [checkSession]);

    // Inicia sesión de un paciente contra /api/loginPatient/login
    const login = async (email, password) => {
        const response = await apiClient("/loginPatient/login", {
            method: "POST",
            body: { email, password },
        });

        setPatient(response.user);
        setIsLoggedIn(true);
        return response;
    };

    const logout = async () => {
        try {
            await apiClient("/logout", { method: "POST" });
        } finally {
            setPatient(null);
            setIsLoggedIn(false);
        }
    };

    // Registro de un nuevo paciente contra /api/registerPatient (envía código por correo)
    const registerPatient = async (formData) => {
        return apiClient("/registerPatient", {
            method: "POST",
            body: formData,
        });
    };

    // Verificación del código de 6 dígitos enviado al correo del paciente
    const verifyPatientCode = async (verificationCodeRequest) => {
        return apiClient("/registerPatient/verifyCodeEmail", {
            method: "POST",
            body: { verificationCodeRequest },
        });
    };

    return (
        <AuthContext.Provider
            value={{
                patient,
                isLoggedIn,
                isLoading,
                login,
                logout,
                registerPatient,
                verifyPatientCode,
                refetchSession: checkSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
