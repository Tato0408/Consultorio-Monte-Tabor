import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import FooterLogin from "../../components/Footer";

//Importamos todos los hooks de recuperación para cada tipo de usuario
import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { useRecoveryReceptionist } from "../../hooks/useRecoveryReceptionist";
import { useRecoveryAdmin } from "../../hooks/useRecoveryAdmin";
import { useRecoveryNurse } from "../../hooks/useRecoveryNurse";

import { showError, showSuccess } from "../../../../lib/alerts";

const VerifyCode = () => {
  //Estado donde se guarda cada uno de los 6 caracteres del código
  const [code, setCode] = useState(Array(6).fill(""));

  //Estado para mostrar mensajes de error
  const [error, setError] = useState("");

  //Hook para navegar entre pantallas
  const navigate = useNavigate();

  //Inicializamos todos los hooks de recuperación
  //Luego elegiremos cuál usar dependiendo del rol guardado
  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();
  const nurseRecovery = useRecoveryNurse();

  //Convertimos el arreglo del código en un solo string
  const codeString = code.join("");

  //Esta función devuelve el hook correcto según el tipo de usuario
  const getActiveRecoveryHook = () => {
    const role = localStorage.getItem("recoveryType");

    switch (role) {
      case "admin":
        return adminRecovery;

      case "receptionist":
        return receptionistRecovery;

      case "nurse":
        return nurseRecovery;

      case "doctor":
      default:
        return doctorRecovery;
    }
  };

  //Obtenemos el hook que corresponde al usuario actual
  const activeHook = getActiveRecoveryHook();

  //Tomamos el estado de carga del hook activo
  const loading = activeHook.loading;

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

  //Verificamos si todas las reglas se cumplen
  const allRulesPassed = codeRules.every((r) => r.test(codeString));

  //Se ejecuta cada vez que cambia un input del código
  const handleChange = (value, index) => {
    //Solo permite números y letras hexadecimales
    if (!/^[a-fA-F0-9]*$/.test(value)) return;

    //Copiamos el arreglo actual
    const newCode = [...code];

    //Actualizamos la posición correspondiente
    newCode[index] = value;

    //Guardamos el nuevo código
    setCode(newCode);

    //Si escribió un carácter, avanzamos automáticamente al siguiente input
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

    //Limpiamos errores anteriores
    setError("");

    //Si el código no cumple las reglas no continuamos
    if (!allRulesPassed) {
      setError("Ingresa el código completo");
      return;
    }

    try {
      //Verificamos el código utilizando el hook correspondiente
      await activeHook.verifyCode(codeString);

      //Mostramos mensaje de éxito
      showSuccess("Código verificado correctamente");

      //Redirigimos a la pantalla para cambiar la contraseña
      navigate("/new-password");
    } catch (error) {
      console.log("Error código:", error);

      //Mostramos el mensaje si el código es inválido
      setError("Código incorrecto o expirado");
    }
  };

  //Función para reenviar el código al correo
  const handleResendCode = async (e) => {
    e.preventDefault();

    //Limpiamos errores anteriores
    setError("");

    try {
      //Obtenemos el correo guardado durante la recuperación
      const savedEmail = localStorage.getItem("recoveryEmail");

      //Si no existe el correo no se puede reenviar
      if (!savedEmail) {
        setError("No se encontró el correo. Vuelve a iniciar el proceso.");
        return;
      }

      //Solicitamos un nuevo código utilizando el mismo hook
      await activeHook.requestCode(savedEmail);

      //Mostramos mensaje de éxito
      showSuccess("Código reenviado correctamente");
    } catch (error) {
      console.log("Error reenviando código:", error);

      //Mostramos el error correspondiente
      setError("Error al reenviar el código");
    }
  };

  return (
    <AuthLayout
      title="UN ÚLTIMO PASO"
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
                    className="w-12 h-12 border rounded-lg text-center text-xl outline-none focus:border-blue-500 transition-colors"
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
                loading={loading}
                type="submit"
                disabled={!allRulesPassed || loading}
              >
                Verificar código
              </PrimaryButton>

              {/* Opción para solicitar un nuevo código */}
              <div className="text-sm text-gray-400 text-center">
                ¿No recibiste el código?
                <button
                  type="button"
                  className="text-blue-600 font-medium ml-1"
                  onClick={handleResendCode}
                >
                  Reenviar código
                </button>
              </div>

              {/* Botón para volver al login */}
              <SecondaryButton to="/login">
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