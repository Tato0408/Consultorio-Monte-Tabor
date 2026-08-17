import { useState } from "react";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/AuthLayout";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

import InputField from "../../../../components/ui/InputField";
import FooterLogin from "../../components/Footer";

import { useRecoveryDoctor } from "../../hooks/useRecoveryDoctor";
import { useRecoveryReceptionist } from "../../hooks/useRecoveryReceptionist";
import { useRecoveryAdmin } from "../../hooks/useRecoveryAdmin";
import { useRecoveryNurse } from "../../hooks/useRecoveryNurse";
import { showSuccess } from "@/lib/alerts";

const NewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  //Saca del localStorage el rol que inicio el proceso de recuperacion
  const recoveryType = localStorage.getItem("recoveryType");

  //Inicializa todos los hooks de recuperacion segun los diferentes roles
  const doctorRecovery = useRecoveryDoctor();
  const receptionistRecovery = useRecoveryReceptionist();
  const adminRecovery = useRecoveryAdmin();
  const nurseRecovery = useRecoveryNurse();

  //Evalua cual hook usar de acuerdo al tipo de usuario guardado en el local
  let recovery;
  switch (recoveryType) {
    case "doctor":       recovery = doctorRecovery;       break;
    case "receptionist": recovery = receptionistRecovery; break;
    case "admin":        recovery = adminRecovery;        break;
    case "nurse":        recovery = nurseRecovery;        break;
    default:             recovery = doctorRecovery;       break;
  }

  //Extrae el estado de carga del hook correspondiente seleccionado en el switch
  const loading = recovery.loading;

  //Arreglo de objetos para validar la seguridad de la contraseña con regex
  const passwordRules = [
    {
      id: "length",
      label: "La contraseña tiene al menos 8 caracteres",
      test: (p) => p.length >= 8,
    },
    {
      id: "uppercase",
      label: "La contraseña contiene mayúsculas y minúsculas",
      test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p),
    },
    {
      id: "number",
      label: "La contraseña incluye números",
      test: (p) => /[0-9]/.test(p),
    },
    {
      id: "special",
      label: "La contraseña incluye caracteres especiales",
      test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    },
    {
      id: "match",
      label: "Las contraseñas coinciden",
      test: (p, c) => p.length > 0 && p === c,
    },
  ];

  //Devuelve true solo si la contraseña cumple absolutamente todas las reglas del arreglo
  const allRulesPassed = passwordRules.every((r) =>
    r.test(password, confirmPassword)
  );

  //Manejador para procesar el cambio de credenciales al enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    //Doble validacion por si acaso se intenta saltar el disabled del boton
    if (!allRulesPassed) {
      setError("Verifica que tu contraseña cumpla con todos los requisitos");
      return;
    }

    try {
      //Llama al metodo del hook correspondiente pasando los estados de las contraseñas
      const response = await recovery.newPassword(password, confirmPassword);
      console.log("RESPUESTA CAMBIO PASSWORD:", response);

      //Limpia los datos temporales del localStorage para cerrar el flujo de recuperacion
      localStorage.removeItem("recoveryType");
      localStorage.removeItem("recoveryEmail");
      
      showSuccess("Contraseña actualizada correctamente");
      //Manda al usuario a la pantalla de confirmacion de exito
      navigate("/password-updated");
    } catch (error) {
      console.log("Error cambiando contraseña:", error);
      setError("No se pudo cambiar la contraseña");
    }
  };

  return (
    <AuthLayout
      title="Restablece tu contraseña"
      subtitle="Crea una nueva contraseña segura para proteger tu cuenta"
    >
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-12 py-5">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[450px]">

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900">
                Confirma tu contraseña
              </h2>
              <p className="text-gray-400 text-sm mt-4">
                Confirma con tu nueva contraseña para completar el proceso
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* fieldset nativo: desactiva de un solo golpe todos los inputs y botones que
                  contiene mientras se guarda la nueva contraseña */}
              <fieldset disabled={loading} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
                <InputField
                  label="Contraseña"
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={100}
                  icon={<Lock className="w-4 h-4" />}
                  disabled={loading}
                />

                <InputField
                  label="Confirmación"
                  id="confirmPassword"
                  type="password"
                  placeholder="Ingresa tu contraseña de nuevo"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={100}
                  icon={<Lock className="w-4 h-4" />}
                  disabled={loading}
                />

                {/* Validaciones */}
                <div className="flex flex-col gap-2 px-1">
                  {/* Mapea las reglas para pintar los checks de forma dinamica en tiempo real */}
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password, confirmPassword);
                    return (
                      <div key={rule.id} className="flex items-center gap-2">
                        {/* Si paso la validacion muestra el icono verde, si no el circulo gris */}
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        {/* Cambia el color del texto dependiendo de si cumple la validacion o no */}
                        <span className={`text-xs transition-colors duration-200 ${passed ? "text-emerald-600" : "text-gray-400"}`}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <PrimaryButton
                  loading={loading}
                  type="submit"
                  //Se bloquea si el loading esta activo o si falta alguna regla por cumplir
                  disabled={!allRulesPassed || loading}
                >
                  Restablecer contraseña
                </PrimaryButton>
              </fieldset>

              {/* Un <Link> no es un control de formulario: fieldset no lo alcanza, se desactiva aparte */}
              <SecondaryButton to="/login" disabled={loading}>
                Volver al inicio de sesión
              </SecondaryButton>

            </form>
          </div>
        </div>

        <FooterLogin />
      </div>
    </AuthLayout>
  );
};

export default NewPassword;