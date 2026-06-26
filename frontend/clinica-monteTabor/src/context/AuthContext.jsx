import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import apiClient from "../lib/apiClient";
 
//Inicializamos el contexto
const AuthContext = createContext();
 
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // guarda datos basicos del usuario { id, email, name, last_name }
    const [userType, setUserType] = useState(null); // guarda el rol "admin" | "doctor" | "nurse" | "receptionist"
    const [isLoggedIn, setIsLoggedIn] = useState(false); //verifica si el usuario paso el login con exito
 
    // protege a las rutas y el sidebar de no mostrarse si no hay una cookie valida
    const [isLoading, setIsLoading] = useState(true);
 
    // Verifica la sesión contra el backend Envuelto en 'useCallback' para memorizar la función y prevenir bucles infinitos en los 'useEffect'
    const checkSession = useCallback(async () => {
        try {
            //Hacemos la peticion al endpoint de autenticacion
            const response = await apiClient("/auth/me");
            //Si el backend responde con un 200, cargamos los datos
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
        } catch {
            // Si no hay sesión o expiro, limpiamos los datos
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    }, []);
 
    useEffect(() => {
        const pathname = window.location.pathname;

        //Si el usuario esta en el login o en el register no se carga la autenticacion para poder acceder a estas vistas publicas
        if(pathname === "/login" || pathname === "/register"){
            setIsLoading(false);
            return;
        }

        //Si esta en otra vista, pedira su verificacion para acceder a su informacion
        checkSession();
    }, [checkSession]);
 
    const login = async (email, password) => {
        //Validacion para completar los campos
        if (!email || !password) {
            toast.error("Por favor, completa todos los campos.");
            return false;
        }
 
        try {
            //Envio la peticion con mis datos
            const response = await apiClient("/loginCommonRole", {
                method: "POST",
                body: { email, password },
            });
 
            //Guardamos la repuesta exitosa en nuestro sistema
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            toast.success("Inicio de sesión exitoso.");
            return true;
        } catch (error) {
            // apiClient ya extrae el message real del backend
            // ("User not found", "Wrong password", "User is locked", etc.)
            toast.error(error.message || "Credenciales incorrectas. Por favor, intenta de nuevo.");
            setIsLoggedIn(false);
            return false;
        }
    };
 
    const logout = async () => {
        try {
            //Enviamos la peticion para cerrar sesion
            await apiClient("/logout", { method: "POST" });
            //Reseteamos los valores guardados a sus valores iniciales
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
            value={{ user, userType, isLoggedIn, isLoading, login, logout, refetchUser: checkSession }}
        >
            {children}
        </AuthContext.Provider>
    );
};
// Custom Hook que actúa como llave para extraer el estado actual (usuario, rol y funciones) específicamente de 'AuthContext'
export const useAuth = () => useContext(AuthContext);