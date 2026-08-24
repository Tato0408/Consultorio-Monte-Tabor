import { useState } from "react";
import toast from "react-hot-toast";

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

// Nota: "onAutoClose"/"onDismiss" no son opciones reales de react-hot-toast (se ignoran),
// así que no hay forma de saber cuándo se cierra el toast. Como el Toaster vive en App.jsx
// por encima de las rutas, el toast sigue visible aunque se navegue a otra página, así que
// no hace falta esperarlo: se muestra y la función resuelve de inmediato.
export const showSuccess = (message) => {
  toast.custom(
    t => <ToastCard t={t} message={message}
      borderColor="border-emerald-100" iconBg="bg-emerald-500" shadowColor="shadow-emerald-50/60"
      icon={<CheckIcon />} />,
    { duration: 2500 }
  );
  return Promise.resolve();
};

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

const ConfirmCard = ({ t, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) => (
  <div
    style={{
      opacity: t.visible ? 1 : 0,
      transform: t.visible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
      transition: "all 0.2s cubic-bezier(.34,1.56,.64,1)",
    }}
    className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-gray-200/60 p-4 max-w-sm w-full"
  >
    <p className="text-sm font-semibold text-gray-800 leading-snug">{message}</p>
    <div className="flex justify-end gap-2 mt-4">
      <button
        onClick={onCancel}
        className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors ${
          danger ? "bg-red-500 hover:bg-red-600" : "bg-[#3B6FCA] hover:bg-[#2d5ab5]"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  </div>
);

// Confirmación en el mismo estilo del sistema de notificaciones, en vez del cuadro nativo
// del navegador (window.confirm, que no respeta el diseño del sistema). Devuelve una
// promesa que resuelve true si se confirma y false si se cancela o se cierra sin elegir.
export const confirmAction = (message, { confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false } = {}) =>
  new Promise((resolve) => {
    toast.custom(
      (t) => (
        <ConfirmCard
          t={t}
          message={message}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          danger={danger}
          onConfirm={() => { toast.dismiss(t.id); resolve(true); }}
          onCancel={() => { toast.dismiss(t.id); resolve(false); }}
        />
      ),
      { duration: Infinity }
    );
  });

const ReasonConfirmCard = ({ t, message, confirmLabel, cancelLabel, placeholder, minLength, onConfirm, onCancel }) => {
  const [valor, setValor] = useState("");
  const valido = valor.trim().length >= minLength;

  return (
    <div
      style={{
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
        transition: "all 0.2s cubic-bezier(.34,1.56,.64,1)",
      }}
      className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-gray-200/60 p-4 max-w-sm w-full"
    >
      <p className="text-sm font-semibold text-gray-800 leading-snug">{message}</p>
      <textarea
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        rows={3}
        className="w-full mt-3 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-red-400 focus:bg-white resize-none"
      />
      <div className="flex justify-between items-center mt-1">
        <span className="text-[11px] text-gray-400">{valor.trim().length < minLength ? `Mínimo ${minLength} caracteres` : ""}</span>
        <span className="text-[11px] text-gray-400">{valor.length}/500</span>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => valido && onConfirm(valor.trim())}
          disabled={!valido}
          className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

// Igual que confirmAction, pero además pide un motivo en un textarea — el paciente
// escribe el texto real que se guarda tal cual (ver cancelMyAppointment en el backend),
// en vez de un motivo fijo que no reflejaba lo que realmente pasó. Devuelve el texto
// escrito (trim) si se confirma, o null si se cancela.
export const confirmActionWithReason = (message, { confirmLabel = "Confirmar", cancelLabel = "Cancelar", placeholder = "Escribe el motivo...", minLength = 3 } = {}) =>
  new Promise((resolve) => {
    toast.custom(
      (t) => (
        <ReasonConfirmCard
          t={t}
          message={message}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          placeholder={placeholder}
          minLength={minLength}
          onConfirm={(reason) => { toast.dismiss(t.id); resolve(reason); }}
          onCancel={() => { toast.dismiss(t.id); resolve(null); }}
        />
      ),
      { duration: Infinity }
    );
  });
