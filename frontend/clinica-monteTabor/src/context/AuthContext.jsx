import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import apiClient from "../lib/apiClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAdmins, setHasAdmins] = useState(true);

    const checkAdminExistence = useCallback(async () => {
        try {
            const response = await apiClient("/admin/check", { method: "GET" });
            setHasAdmins(response.exists);
        } catch (error) {
            setHasAdmins(true);
        }
    }, []);

    const checkSession = useCallback(async () => {
        try {
            const response = await apiClient("/auth/me");
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
        } catch {
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
        }
    }, []);

    useEffect(() => {
        const initSystem = async () => {
            try {
                await checkAdminExistence();

                const pathname = window.location.pathname;
                if (pathname === "/login" || pathname === "/register") {
                    return;
                }
                await checkSession();
            } finally {
                setIsLoading(false);
            }
        };

        initSystem();
    }, [checkSession, checkAdminExistence]);

    const login = async (email, password) => {
        if (!email || !password) {
            toast.error("Por favor, completa todos los campos.");
            return false;
        }

        try {
            const response = await apiClient("/loginCommonRole", {
                method: "POST",
                body: { email, password },
            });

            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            toast.success("Inicio de sesión exitoso.");
            return true;
        } catch (error) {
            toast.error(error.message || "Credenciales incorrectas. Por favor, intenta de nuevo.");
            setIsLoggedIn(false);
            return false;
        }
    };

    const logout = async () => {
        try {
            await apiClient("/logout", { method: "POST" });
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
            toast.success("Sesión cerrada.");
            return true;
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            toast.error("Error al cerrar sesión.");
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                userType,
                isLoggedIn,
                isLoading,
                hasAdmins,
                login,
                logout,
                refetchUser: checkSession,
                refetchAdminStatus: checkAdminExistence,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);