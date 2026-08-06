import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
const InputField = ({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  rightSlot,
  error,
  disabled = false,
  className = "",
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

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

        {/* Elemento opcional a la derecha (ej. marca de tarjeta detectada, tooltip) */}
        {rightSlot && <span className="flex-shrink-0 flex items-center">{rightSlot}</span>}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
};

export default InputField;
