import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../lib/apiClient";
import { showWarning } from "../lib/alerts";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [patient, setPatient] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Copia siempre actualizada de isLoggedIn para leer dentro del listener de
    // "session-expired" (ver más abajo), que se suscribe una sola vez al montar.
    const isLoggedInRef = useRef(false);

    const checkSession = useCallback(async () => {
        try {
            const response = await apiClient("/auth/me");
            setPatient(response.user);
            setIsLoggedIn(true);
        } catch {
            setPatient(null);
            setIsLoggedIn(false);
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

    // apiClient dispara "session-expired" ante cualquier 401. Solo se actúa si había
    // una sesión activa: así no interfiere con el 401 de /auth/me en visitantes sin
    // sesión, ni con un intento de login fallido por credenciales inválidas. Al poner
    // isLoggedIn en false, ProtectedRoute (que ya observa ese estado) redirige a
    // /login por su cuenta, sin necesidad de navegar manualmente desde aquí.
    useEffect(() => {
        const handleSessionExpired = () => {
            if (!isLoggedInRef.current) return;
            setPatient(null);
            setIsLoggedIn(false);
            showWarning("Tu sesión expiró. Inicia sesión de nuevo.");
        };
        window.addEventListener("session-expired", handleSessionExpired);
        return () => window.removeEventListener("session-expired", handleSessionExpired);
    }, []);

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
