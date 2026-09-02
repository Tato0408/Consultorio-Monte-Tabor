import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import apiClient, { WS_URL } from "../lib/apiClient";

// Declaración del contexto de autenticación.
const AuthContext = createContext();

// Envuelve todo el sistema para exponer el estado global de autenticación,
// con los métodos de inicio y cierre de sesión y los estados que se
// resuelven al iniciar la aplicación.
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Rol del usuario autenticado: admin, doctor, nurse o receptionist.
    const [userType, setUserType] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Indica si ya existe algún administrador registrado en el sistema.
    const [hasAdmins, setHasAdmins] = useState(true);
    // Matriz de permisos (por moduleKey y acción) del rol autenticado.
    const [permissions, setPermissions] = useState([]);

    // Obtiene la matriz de permisos del rol autenticado, una sola vez por sesión.
    const fetchPermissions = useCallback(async () => {
        try {
            const response = await apiClient("/permissions/me");
            setPermissions(response.permissions || []);
        } catch {
            setPermissions([]);
        }
    }, []);

    // Consulta si el rol actual tiene habilitada una acción (view, create,
    // update o delete) para un moduleKey dado.
    const hasPermission = useCallback((moduleKey, action = "view") => {
        if (!moduleKey) return false;
        const permission = permissions.find((p) => p.moduleKey === moduleKey);
        return permission ? !!permission[action] : false;
    }, [permissions]);

    // Verifica si hay administradores registrados en la base de datos.
    const checkAdminExistence = useCallback(async () => {
        try {
            const response = await apiClient("/admin/check", { method: "GET" });
            setHasAdmins(response.exists);
        } catch (error) {
            setHasAdmins(true);
        }
    }, []);

    // Valida el estado de la sesión actual consultando la cookie del
    // navegador. Si el token es válido, restaura el estado del usuario en
    // memoria global.
    const checkSession = useCallback(async () => {
        try {
            const response = await apiClient("/auth/me");
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            await fetchPermissions();
        } catch {
            // Limpia los estados si el backend rechaza el token.
            setUser(null);
            setUserType(null);
            setIsLoggedIn(false);
            setPermissions([]);
        }
    }, [fetchPermissions]);

    // Inicializa el sistema al montar el proveedor: valida si existen
    // administradores y, si corresponde, restaura la sesión.
    useEffect(() => {
        const initSystem = async () => {
            try {
                // 1. Verificar si el sistema ya cuenta con administradores creados
                await checkAdminExistence();

                // 2. Si el usuario está en Login o Registro, no hace falta
                // validar la sesión al cargar la página.
                const pathname = window.location.pathname;
                if (pathname === "/login" || pathname === "/register") {
                    return;
                }
                // 3. si está en una ruta interna, valida el estado de la sesión
                await checkSession();
            } finally {
                // Apaga la pantalla de carga.
                setIsLoading(false);
            }
        };

        initSystem();
    }, [checkSession, checkAdminExistence]);

    // Guarda el userType actual para el manejador del WebSocket sin obligar
    // a reabrir la conexión cada vez que cambia.
    const userTypeRef = useRef(userType);
    useEffect(() => {
        userTypeRef.current = userType;
    }, [userType]);

    // WebSocket de tiempo real: cuando un admin cambia los permisos de un
    // rol, el backend avisa por acá a quien tenga ese rol con sesión
    // abierta. Antes ese cambio solo se veía tras recargar a mano o al
    // toparse con un 403, porque el frontend guarda la matriz de permisos
    // en memoria y no la volvía a pedir.
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
                if (data.type === "role-updated" && data.roleKey === userTypeRef.current) {
                    window.location.reload();
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

    // Envía las credenciales al backend para iniciar sesión, guarda el
    // estado si es exitoso y muestra una notificación.
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

            // Actualiza el estado global tras la respuesta exitosa del backend.
            setUser(response.user);
            setUserType(response.userType);
            setIsLoggedIn(true);
            await fetchPermissions();
            // El toast de bienvenida lo muestra Login.jsx de forma
            // personalizada. No se repite aquí para evitar una notificación
            // de éxito duplicada.
            return true;
        } catch (error) {
            // El código 403 indica que la cuenta está desactivada (ver
            // loginController.js): se muestra un aviso específico, distinto
            // del genérico de credenciales incorrectas, para dejar claro que
            // la cuenta existe pero fue desactivada por un administrador.
            if (error.status === 403) {
                toast.error("Cuenta desactivada. Si considera que es un error, comuníquese con el administrador.");
            } else {
                // Muestra siempre el mismo mensaje genérico y amigable en vez
                // del texto crudo que envía el backend (error.message), sin
                // importar cuál credencial falló, para no filtrar detalles
                // internos al usuario.
                toast.error("Credenciales incorrectas, verifica tu correo o contraseña.");
            }
            setIsLoggedIn(false);
            return false;
        }
    };

    // Cierra la sesión en el backend, lo que limpia la cookie, y resetea
    // los estados del frontend.
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
        // Expone los estados y métodos del contexto para que cualquier
        // componente del sistema pueda acceder a ellos.
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