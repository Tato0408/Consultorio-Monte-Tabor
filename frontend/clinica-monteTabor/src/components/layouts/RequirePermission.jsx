import { useAuth } from "@/context/AuthContext";
import Forbidden from "@/modules/notFound/pages/Forbidden";

// Guardián de rutas por permiso. Se usa dentro de <Route element={<MainLayout />}>, que ya
// garantiza que hay sesión iniciada, envolviendo el elemento de cada ruta ligada a un
// moduleKey del sistema de roles. Si el rol autenticado no tiene "view" sobre ese módulo, se
// muestra la pantalla 403 en vez del contenido real, de modo que una URL escrita a mano no
// llega a disparar peticiones que el backend rechazaría de todas formas, ni deja ver un
// reporte o listado roto o vacío. El admin siempre tiene view:true para todo (sembrado así en
// la base de datos), así que nunca ve esta pantalla.
const RequirePermission = ({ moduleKey, action = "view", children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(moduleKey, action)) {
    return <Forbidden />;
  }

  return children;
};

export default RequirePermission;
