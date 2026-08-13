import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Tipos para los que tiene sentido mostrar un contador de caracteres — solo campos de texto
// libre que "agregan/editan algo". Se excluyen a propósito password/email (y cualquier tipo no
// textual como date/time/number): son del tipo de entrada "estilo login" que el usuario pidió
// dejar fuera, sin importar en qué formulario vivan (ej. el campo de correo dentro de
// DoctorsForm sí es para "editar un doctor", pero sigue siendo un input de correo).
const COUNT_ELIGIBLE_TYPES = ["text", "tel", "search"];

const InputField = ({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  error,
  disabled = false,
  className = "",
  maxLength,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const showCount = maxLength != null && COUNT_ELIGIBLE_TYPES.includes(type);
  const currentLength = String(value ?? "").length;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>

      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        className={`
          flex items-center gap-2.5 px-3.5 py-2.5
          bg-white border rounded-lg
          transition-all duration-200
          ${error
            ? "border-red-400 focus-within:ring-2 focus-within:ring-red-200"
            : "border-gray-200 focus-within:border-[#3B6FCA] focus-within:ring-2 focus-within:ring-[#3B6FCA]/20"
          }
          ${disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : ""}
        `}
      >
        {/* Ícono izquierdo */}
        {icon && (
          <span className="text-gray-400 flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          maxLength={maxLength}
          className="
            flex-1 text-sm text-gray-800 bg-transparent outline-none
            placeholder:text-gray-400
            disabled:cursor-not-allowed
          "
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Error a la izquierda, contador de caracteres a la derecha — mismo renglón para no
          agregar alto extra al formulario cuando ambos aplican. */}
      {(error || showCount) && (
        <div className="flex items-start justify-between gap-2">
          {error ? <p className="text-xs text-red-500">{error}</p> : <span />}
          {showCount && (
            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default InputField;