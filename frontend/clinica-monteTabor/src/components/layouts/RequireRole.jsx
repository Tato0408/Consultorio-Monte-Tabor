import { useAuth } from "@/context/AuthContext";
import Forbidden from "@/modules/notFound/pages/Forbidden";

// Guardián de rutas por rol exacto, para los pocos casos donde el sistema de permisos por
// moduleKey no alcanza a distinguir el matiz (ej. "calendar.schedule.view" lo necesita
// recepción para consultar disponibilidad al agendar, pero eso no significa que recepción
// deba poder abrir la pantalla de "Horarios", ver ScheduleConfig.jsx). Se usa junto a
// RequirePermission, no en su lugar.
const RequireRole = ({ roles, children }) => {
  const { userType } = useAuth();

  if (!roles.includes(userType)) {
    return <Forbidden />;
  }

  return children;
};

export default RequireRole;
