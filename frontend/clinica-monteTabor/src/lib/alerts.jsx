import toast from "react-hot-toast";
import Swal from "sweetalert2";

// Renderizadores de toast personalizados

const CloseBtn = ({ id }) => (
  <button onClick={() => toast.dismiss(id)} className="text-slate-300 hover:text-slate-500 transition-colors ml-1 flex-shrink-0">
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
);

const ToastCard = ({ t, message, borderColor, iconBg, shadowColor, icon }) => (
  <div
    style={{
      opacity: t.visible ? 1 : 0,
      transform: t.visible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
      transition: "all 0.2s cubic-bezier(.34,1.56,.64,1)",
    }}
    className={`flex items-center gap-3 bg-white ${borderColor} rounded-2xl shadow-lg ${shadowColor} px-4 py-3 max-w-xs w-full border`}
  >
    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <p className="flex-1 text-sm font-semibold text-slate-800 leading-snug">{message}</p>
    <CloseBtn id={t.id} />
  </div>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
  </svg>
);

const WarnIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

// Funciones exportadas

export const showSuccess = (message) =>
  new Promise(resolve => {
    toast.custom(
      t => <ToastCard t={t} message={message}
        borderColor="border-emerald-100" iconBg="bg-emerald-500" shadowColor="shadow-emerald-50/60"
        icon={<CheckIcon />} />,
      { duration: 2500 }
    );
    // react-hot-toast (2.x) no expone callback de cierre del toast. Antes se le
    // pasaban onAutoClose/onDismiss (que la librería ignora) y la promesa
    // quedaba colgada para siempre: quien hiciera `await showSuccess()` para
    // navegar tras guardar nunca navegaba. Se resuelve enseguida — el toast lo
    // renderiza el <Toaster> de la raíz y sigue visible aunque se cambie de vista.
    resolve();
  });

export const showError = (message) =>
  toast.custom(
    t => <ToastCard t={t} message={message}
      borderColor="border-red-100" iconBg="bg-red-500" shadowColor="shadow-red-50/60"
      icon={<AlertIcon />} />,
    { duration: 4000 }
  );

export const showWarning = (message) =>
  toast.custom(
    t => <ToastCard t={t} message={message}
      borderColor="border-amber-100" iconBg="bg-amber-400" shadowColor="shadow-amber-50/60"
      icon={<WarnIcon />} />,
    { duration: 3500 }
  );

// Usa los mismos colores que WarnIcon y AlertIcon del toast (amber 400, red 500), para que
// la ventana de confirmación se sienta parte del mismo sistema visual aunque sea un modal de
// SweetAlert2 y no un toast. SweetAlert2 no permite clonar el diseño de tarjeta del toast tal
// cual.
export const confirmDelete = async ({
  title = "¿Eliminar este registro?",
  text = "Esta acción no se puede deshacer.",
} = {}) => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    iconColor: "#fbbf24",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

// Confirmacion reforzada para el borrado en cascada de un paciente o un
// doctor que tiene citas o consultas relacionadas. El backend responde 409
// con el conteo de esos registros y la gestion de usuarios llama aqui antes
// de reintentar el borrado con cascade. subject es "paciente" o "doctor",
// name es el nombre completo para el mensaje, y related trae los conteos
// { appointments, consultations, treatments }. treatments solo lo manda el
// borrado de paciente (un doctor/enfermera no tiene tratamientos propios),
// por eso se muestra aparte y solo si viene informado.
export const confirmCascadeDelete = async ({ subject, name, related = {} }) => {
  const appointments = related.appointments || 0;
  const consultations = related.consultations || 0;
  const treatments = related.treatments || 0;
  const cita = appointments === 1 ? "cita" : "citas";
  const consulta = consultations === 1 ? "consulta" : "consultas";
  const tratamiento = treatments === 1 ? "tratamiento" : "tratamientos";

  const result = await Swal.fire({
    title: `¿Eliminar a ${name} y todo lo relacionado?`,
    html:
      `Este ${subject} tiene <b>${appointments}</b> ${cita} y <b>${consultations}</b> ${consulta} registradas` +
      (treatments > 0 ? ` y <b>${treatments}</b> ${tratamiento} de seguimiento` : "") +
      `. Si continúas, también se eliminarán todas sus citas, consultas, recetas, órdenes de laboratorio, ` +
      `incapacidades y demás información relacionada. Esta acción no se puede deshacer.`,
    icon: "warning",
    iconColor: "#fbbf24",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar todo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

// Se muestra cuando se intenta eliminar un paciente que se registró hace
// menos de un año: el backend bloquea el borrado (ver deletePatient), la
// información clínica se protege ese primer año. La única acción disponible
// mientras tanto es marcarlo como inactivo, y solo se ofrece si todavía está
// activo. Devuelve true solo si el usuario confirmó "Marcar como inactivo".
export const confirmDeleteLocked = async ({ name, unlockDate, isActive = true }) => {
  const fecha = unlockDate
    ? new Date(unlockDate).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })
    : "un año después de su registro";

  const result = await Swal.fire({
    title: "Todavía no se puede eliminar",
    html:
      `<b>${name}</b> se registró hace menos de un año. Para proteger la información clínica, el paciente podrá eliminarse a partir del <b>${fecha}</b>.` +
      (isActive
        ? "<br/><br/>Si no deseas que se muestre su información mientras tanto, puedes marcarlo como <b>inactivo</b>."
        : "<br/><br/>Este paciente ya está inactivo, así que su información no aparece en las vistas clínicas."),
    icon: "info",
    iconColor: "#3B82F6",
    showCancelButton: isActive,
    confirmButtonText: isActive ? "Marcar como inactivo" : "Entendido",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#3B6FCA",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return isActive && result.isConfirmed;
};

export const confirmResetPermissions = async (roleName) => {
  const result = await Swal.fire({
    title: `¿Restablecer permisos de ${roleName}?`,
    text: "Se sobrescribirán todos los permisos actuales de este rol con los valores predeterminados.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, restablecer",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#3B6FCA",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

export const confirmDischarge = async () => {
  const result = await Swal.fire({
    title: "¿Dar de alta este tratamiento?",
    text: "Se quitará el control pendiente y el paciente pasará a \"Finalizado\".",
    icon: "warning",
    iconColor: "#fbbf24",
    showCancelButton: true,
    confirmButtonText: "Sí, dar de alta",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

// Se muestra cuando un doctor distinto al ya asignado le da clic a
// Continuar sobre una consulta agendada sin confirmar (ver
// AppointmentTable.jsx). Solo es un aviso de coordinación: continuar
// no reasigna la cita, simplemente permite seguir con la acción ya
// enterado de que otro médico la solicitó o la está atendiendo.
export const confirmTakeOverAppointment = async (doctorName) => {
  const result = await Swal.fire({
    title: "Cita con médico asignado",
    text: `Este paciente solicitó ser atendido por el Dr(a). ${doctorName}, o ya está siendo atendido por este médico. Por favor, coordine con el médico y el paciente antes de continuar con esta acción.`,
    icon: "warning",
    iconColor: "#fbbf24",
    showCancelButton: true,
    confirmButtonText: "Continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#0b66d6",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

export const confirmNoShow = async () => {
  const result = await Swal.fire({
    title: "¿Marcar como no presentado?",
    text: "El paciente no llegó a esta cita. El estado cambiará a No se presentó y ya no se podrá continuar una consulta desde ella.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, no se presentó",
    cancelButtonText: "Volver",
    confirmButtonColor: "#f59e0b",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

// Se muestra cuando un procedimiento requiere enfermera de apoyo pero no hay ninguna
// disponible para el horario elegido (ver acceptAppointment/assignDoctor/insertAppointment/
// updateAppointment en el backend, que exigen confirm_no_nurse en ese caso): permite
// continuar sin enfermera solo si quien acepta/agenda lo confirma explícitamente, en vez de
// dejar el flujo bloqueado sin ninguna salida más que cancelar y reagendar a mano.
export const confirmProceedWithoutNurse = async () => {
  const result = await Swal.fire({
    title: "No hay enfermeras disponibles",
    text: "Ninguna enfermera tiene ese horario libre. ¿Estás seguro de continuar con este procedimiento sin asignar una enfermera?",
    icon: "warning",
    iconColor: "#fbbf24",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar sin enfermera",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#f59e0b",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};

export const confirmCancelAppointment = async () => {
  const result = await Swal.fire({
    title: "¿Cancelar esta cita?",
    text: "El estado de la cita cambiará a Cancelada.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, cancelar cita",
    cancelButtonText: "Volver",
    confirmButtonColor: "#f59e0b",
    cancelButtonColor: "#94a3b8",
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 text-sm",
      title: "text-slate-800 font-bold text-lg",
      htmlContainer: "text-slate-500",
      confirmButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
      cancelButton: "rounded-xl font-semibold text-sm px-5 py-2.5",
    },
    buttonsStyling: true,
  });
  return result.isConfirmed;
};
