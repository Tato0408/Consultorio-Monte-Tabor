import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import FooterLogin from "../../components/Footer";

import { useStaffRecovery } from "../../hooks/useStaffRecovery";

import { showError, showSuccess } from "../../../../lib/alerts";

const VerifyCode = () => {
  //Estado donde se guarda cada uno de los 6 caracteres del código
  const [code, setCode] = useState(Array(6).fill(""));

  //Estado para mostrar mensajes de error
  const [error, setError] = useState("");

  //Hook para navegar entre pantallas
  const navigate = useNavigate();

  // Un solo endpoint atiende a los 4 roles de staff (el backend ya sabe cuál es, guardado
  // en la cookie de recuperación desde requestCode) — ver staffRecoveryController.js.
  const activeHook = useStaffRecovery();

  // El loading del hook activo solo lo activa su propio resendCode
  // interno, ni verifyCode ni requestCode lo modifican, así que no
  // sirve para bloquear este formulario. Por eso se controla con un
  // estado independiente.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convierte el arreglo del código en un solo string.
  const codeString = code.join("");

  //Reglas que debe cumplir el código antes de enviarlo
  const codeRules = [
    {
      id: "length",
      label: "El código tiene 6 caracteres",
      test: (c) => c.length === 6,
    },
    {
      id: "hex",
      label: "El código solo contiene caracteres válidos (0-9, a-f)",
      test: (c) => /^[a-fA-F0-9]*$/.test(c) && c.length > 0,
    },
  ];

  // Verifica si todas las reglas se cumplen.
  const allRulesPassed = codeRules.every((r) => r.test(codeString));

  //Se ejecuta cada vez que cambia un input del código
  const handleChange = (value, index) => {
    //Solo permite números y letras hexadecimales
    if (!/^[a-fA-F0-9]*$/.test(value)) return;

    // Copia el arreglo actual.
    const newCode = [...code];

    // Actualiza la posición correspondiente.
    newCode[index] = value;

    // Guarda el nuevo código.
    setCode(newCode);

    // Si se escribió un carácter, avanza automáticamente al
    // siguiente input.
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  //Permite regresar al input anterior al borrar con Backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  //Función para verificar el código ingresado
  const handleVerify = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Limpia errores anteriores.
    setError("");

    // Si el código no cumple las reglas, no continúa.
    if (!allRulesPassed) {
      setError("Ingresa el código completo");
      return;
    }

    setIsSubmitting(true);
    try {
      // Verifica el código utilizando el hook correspondiente.
      await activeHook.verifyCode(codeString);

      // Muestra un mensaje de éxito.
      showSuccess("Código verificado correctamente");

      // Redirige a la pantalla para cambiar la contraseña.
      navigate("/new-password");
    } catch (error) {
      console.log("Error código:", error);

      // Muestra el mensaje si el código es inválido.
      setError("Código incorrecto o expirado");
    } finally {
      setIsSubmitting(false);
    }
  };

  //Función para reenviar el código al correo
  const handleResendCode = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Limpia errores anteriores.
    setError("");

    setIsSubmitting(true);
    try {
      // Obtiene el correo guardado durante la recuperación.
      const savedEmail = localStorage.getItem("recoveryEmail");

      // Si no existe el correo no se puede reenviar.
      if (!savedEmail) {
        setError("No se encontró el correo. Vuelve a iniciar el proceso.");
        return;
      }

      // Solicita un nuevo código utilizando el mismo hook.
      await activeHook.requestCode(savedEmail);

      // Muestra un mensaje de éxito.
      showSuccess("Código reenviado correctamente");
    } catch (error) {
      console.log("Error reenviando código:", error);

      // Muestra el error correspondiente.
      setError("Error al reenviar el código");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Un último paso"
      subtitle="Hemos enviado un código de 6 dígitos a tu correo electrónico"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px]">

            {/* Título principal */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900">
                Verifica tu correo
              </h2>

              <p className="text-gray-400 text-sm mt-4">
                Ingresa el código de verificación
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">

              {/* fieldset nativo: desactiva de un solo golpe todos los inputs y botones que
                  contiene mientras se verifica el código o se reenvía uno nuevo */}
              <fieldset disabled={isSubmitting} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
                {/* Inputs donde el usuario escribe el código */}
                <div className="flex justify-center gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-12 h-12 border rounded-lg text-center text-xl outline-none focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  ))}
                </div>

                {/* Lista que muestra qué reglas ya se cumplen */}
                <div className="flex flex-col gap-2 px-1">
                  {codeRules.map((rule) => {
                    const passed = rule.test(codeString);

                    return (
                      <div key={rule.id} className="flex items-center gap-2">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}

                        <span
                          className={`text-xs transition-colors duration-200 ${
                            passed
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Mensaje de error si ocurre alguno */}
                {error && (
                  <p className="text-red-500 text-sm text-center">
                    {error}
                  </p>
                )}

                {/* Botón para verificar el código */}
                <PrimaryButton
                  loading={isSubmitting}
                  type="submit"
                  disabled={!allRulesPassed || isSubmitting}
                >
                  Verificar código
                </PrimaryButton>

                {/* Opción para solicitar un nuevo código */}
                <div className="text-sm text-gray-400 text-center">
                  ¿No recibiste el código?
                  <button
                    type="button"
                    className="text-blue-600 font-medium ml-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleResendCode}
                  >
                    Reenviar código
                  </button>
                </div>
              </fieldset>

              {/* Un <Link> no es un control de formulario: fieldset no lo alcanza, se desactiva aparte */}
              <SecondaryButton to="/login" disabled={isSubmitting}>
                Volver al inicio de sesión
              </SecondaryButton>

            </form>
          </div>
        </div>

        {/* Footer de la pantalla */}
        <FooterLogin />
      </div>
    </AuthLayout>
  );
};

export default VerifyCode;