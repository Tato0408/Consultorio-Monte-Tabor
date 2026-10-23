import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import apiClient, { WS_URL } from "../lib/apiClient";
import { requestNotificationPermission, showBrowserNotification } from "../lib/browserNotifications";

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

    // WebSocket de tiempo real del panel privado. Una sola conexión atiende
    // dos casos:
    //   1) role-updated: un admin cambió los permisos del rol de este
    //      usuario. Se recarga para tomar la matriz nueva sin esperar a un
    //      403 (el frontend guarda los permisos en memoria y no los repide).
    //   2) notification: llegó una notificación nueva para este usuario. Se
    //      reemite como evento del navegador ("app:notification") para que la
    //      campana (useNotifications) la agregue al instante sin recargar,
    //      mismo patrón desacoplado que "session-expired".
    // Pide permiso de notificaciones del sistema una sola vez por sesión (si ya se concedió o
    // se rechazó antes, el navegador no vuelve a preguntar).
    useEffect(() => {
        if (!isLoggedIn) return;
        requestNotificationPermission();
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;

        let socket = null;
        let reconnectTimer = null;
        let cerradoPorNosotros = false;

        // Este socket siempre conecta directo a Render (el proxy de vercel.json no sabe
        // hacer el upgrade de WebSocket), así que la cookie de sesión viajaría ahí como
        // cross-site — lo que Chrome en incógnito y Safari/iOS bloquean. Por eso primero
        // se pide un "boleto" de un solo uso por /api/auth/ws-ticket (esa sí pasa por el
        // proxy de Vercel, mismo origen, cookie confiable en cualquier navegador) y se
        // manda como ?token= al abrir el socket — mismo mecanismo que ya usa la app móvil
        // y el portal público (ver getWsTicket en el backend). Se pide justo antes de
        // cada conexión/reconexión en vez de guardarlo (dura 60s).
        const conectar = async () => {
            let ticket;
            try {
                const data = await apiClient("/auth/ws-ticket");
                ticket = data?.ticket;
            } catch {
                // Sin ticket no hay forma de abrir el socket (red caída, sesión vencida,
                // etc.): se reintenta con la misma espera que un cierre inesperado.
                if (!cerradoPorNosotros) reconnectTimer = setTimeout(conectar, 3000);
                return;
            }
            // Nos desmontamos/deslogueamos mientras el ticket viajaba: no abrir nada.
            if (cerradoPorNosotros || !ticket) return;

            socket = new WebSocket(`${WS_URL}?token=${ticket}`);

            socket.onmessage = (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (data.type === "role-updated" && data.roleKey === userTypeRef.current) {
                    window.location.reload();
                    return;
                }
                if (data.type === "notification" && data.notification) {
                    window.dispatchEvent(
                        new CustomEvent("app:notification", { detail: data.notification })
                    );
                    showBrowserNotification(data.notification);
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
        if (!email?.trim() || !password?.trim()) {
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
            // Reemplaza el usuario con el perfil completo de /auth/me, que
            // incluye firma, sello y teléfono. Así la firma y el sello
            // guardados aparecen en el perfil y en los PDF desde el login.
            try {
                const current = await apiClient("/auth/me");
                if (current?.user) setUser(current.user);
            } catch {
                // Si falla se conserva el usuario que devolvió el login.
            }
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
            } else if (error.message === "Usuario bloqueado") {
                // Bloqueo de 5 intentos fallidos (15 min, ver loginController.js).
                // A diferencia de "usuario no encontrado" vs "contraseña
                // incorrecta" (que sí se ocultan detrás del mensaje genérico de
                // abajo para no ayudar a adivinar cuál de las dos falló), decirle
                // al usuario que su cuenta está bloqueada no revela nada que un
                // atacante no supiera ya. Antes esto cambiaba de vuelta al genérico
                // y el usuario no se enteraba de que debía esperar.
                toast.error("Cuenta bloqueada temporalmente por varios intentos fallidos. Espera 15 minutos e inténtalo de nuevo.");
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