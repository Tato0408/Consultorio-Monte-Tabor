import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../lib/apiClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [patient, setPatient] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
            if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
                setIsLoading(false);
                return;
            }
            await checkSession();
            setIsLoading(false);
        };

        initSession();
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
