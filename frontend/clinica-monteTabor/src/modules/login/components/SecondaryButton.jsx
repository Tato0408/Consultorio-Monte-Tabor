import { Link } from "react-router-dom";

// A diferencia de un botón, un enlace no cuenta con un estado
// disabled nativo. Sin este control, el usuario podía navegar fuera
// del formulario o reiniciar el flujo mientras una petición seguía
// en curso. El evento onClick con preventDefault bloquea la
// navegación, y la clase pointer events none actúa como refuerzo a
// nivel CSS por si el evento se disparara de otra forma, como el
// teclado.
const SecondaryButton = ({ to, children, disabled }) => {
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={`flex items-center justify-center w-full py-4 border rounded-lg text-[#3B6FCA] ${
        disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
      }`}
    >
      {children}
    </Link>
  );
};

export default SecondaryButton;