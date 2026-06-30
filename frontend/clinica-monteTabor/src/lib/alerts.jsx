import toast from "react-hot-toast";
import Swal from "sweetalert2";

// ── Custom toast renderers ──────────────────────────────────────────────────

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

// ── Exported helpers ────────────────────────────────────────────────────────

export const showSuccess = (message) =>
  new Promise(resolve =>
    toast.custom(
      t => <ToastCard t={t} message={message}
        borderColor="border-emerald-100" iconBg="bg-emerald-500" shadowColor="shadow-emerald-50/60"
        icon={<CheckIcon />} />,
      { duration: 2500, onAutoClose: resolve, onDismiss: resolve }
    )
  );

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

export const confirmDelete = async () => {
  const result = await Swal.fire({
    title: "¿Eliminar este registro?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
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
