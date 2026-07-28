import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import apiClient from "../lib/apiClient";

//Declaracion del contexto
const AuthContext = createContext();

//Envuelve todo el sistema para dar el estado global de autenticacion con metodos de inicio y cierre de sesion y los estados al inciar el sistema
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // datos del usuario actual
    const [userType, setUserType] = useState(null); // rol (admin, doctor, nurse, receptionist)
    const [isLoggedIn, setIsLoggedIn] = useState(false); //indica si hay una sesión activa
    const [isLoading, setIsLoading] = useState(true); // estado de carga inicial de la app
    const [hasAdmins, setHasAdmins] = useState(true); //verificar si existen administradores en el sistema
    const [permissions, setPermissions] = useState([]); // matriz de permisos del rol actual

    //obtiene la matriz de permisos del rol autenticado (una sola vez por sesión)
    const fetchPermissions = useCallback(async () => {
        try {
            const response = await apiClient("/permissions/me");
            setPermissions(response.permissions || []);
        } catch {
            setPermissions([]);
        }
    }, []);

    //consulta si el rol actual tiene una acción (view/create/update/delete) habilitada para un moduleKey
    const hasPermission = useCallback((moduleKey, action = "view") => {
        if (!moduleKey) return false;
        const permission = permissions.find((p) => p.moduleKey === moduleKey);
        return permission ? !!permission[action] : false;
    }, [permissions]);

    //verifica  si hay administradores registrados en la base de datos
    const checkAdminExistence = useCallback(async () => {
        try {
            const response = await apiClient("/admin/check", { method: "GET" });
            setHasAdmins(response.exists);
        } catch (error) {
            setHasAdmins(true);
        }
    }, []);

    //* valida el estado de la sesión actual consultando las cookies del navegador si el token es válido, restaura el estado del usuario en memoria global
    const checkSession = useCallback(async () => {
        try {
            const response = await apiClient("/auth/me");
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            await fetchPermissions();
        } catch {
            //Si el backend rechaza el token limpiamos los estados
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
            setPermissions([]);
        }
    }, [fetchPermissions]);

    //Metodo de inicialización  ejecutando los estaods iniciales del sistema
    useEffect(() => {
        const initSystem = async () => {
            try {
                // 1. Verificar si el sistema ya cuenta con administradores creados
                await checkAdminExistence();

                //2.si el usuario está en Login o Registro no es necesario validar sesión al cargar las paginas
                const pathname = window.location.pathname;
                if (pathname === "/login" || pathname === "/register") {
                    return;
                }
                // 3. si está en una ruta interna, valida el estado de la sesión
                await checkSession();
            } finally {
                //apaga la pantalla de carga
                setIsLoading(false);
            }
        };

        initSystem();
    }, [checkSession, checkAdminExistence]);

    //Método para iniciar sesión en el sistema que envía las credenciales al backend, guarda el estado si es exitoso y muestra notificacion
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

            // Seteo del estado global tras la respuesta exitosa del backend
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            await fetchPermissions();
            // El toast de bienvenida ya lo muestra Login.jsx (personalizado);
            // mostrarlo también aquí duplicaba la notificación de éxito.
            return true;
        } catch (error) {
            toast.error(error.message || "Credenciales incorrectas. Por favor, intenta de nuevo.");
            setIsLoggedIn(false);
            return false;
        }
    };

    //método para cerrar sesión  borrando la sesión en el backend limpiando la cookie y resetea todos los estados en el frontend.
    const logout = async () => {
        try {
            await apiClient("/logout", { method: "POST" });
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
            setPermissions([]);
            toast.success("Sesión cerrada.");
            return true;
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            toast.error("Error al cerrar sesión.");
            return false;
        }
    };

    return (
        //Envio de estados y metodos para que puedan acceder desde cualquier componente del sistema
        <AuthContext.Provider
            value={{
                user,
                setUser,
                userType,
                isLoggedIn,
                isLoading,
                hasAdmins,
                permissions,
                hasPermission,
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