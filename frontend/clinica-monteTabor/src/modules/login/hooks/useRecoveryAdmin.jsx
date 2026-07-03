import { useState } from "react";

const API_URL =
  "http://localhost:4000/api/recoveryAdminPassword";

export const useRecoveryAdmin = () => {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  //ENVIAR CORREO
  const requestCode = async (
    email
  ) => {
    try {
      //Activa el loading para congelar botones y limpia errores viejos
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/requestCode`,
        {
          method: "POST",
          credentials: "include", //Obligatorio para que mande las cookies de sesion
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data =
        await response.json();

      //Si el backend devuelve un error truena la peticion para que caiga en el catch
      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Error enviando código:",
        error
      );

      setError(error.message);
      throw error;
    } finally {
      //Apaga el loading pase lo que pase al terminar todo
      setLoading(false);
    }
  };

  // VERIFICAR CÓDIGO
  const verifyCode = async (
    code
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/verifyCode`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Error verificando código:",
        error
      );

      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  
  //REENVIAR CÓDIGO
  const resendCode = 
  async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/resendCode`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Error HTTP: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Error reenviando código:",
        error
      );

      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  // CAMBIAR CONTRASEÑA
  const newPassword =
    async (
      newPassword,
      confirmNewPassword
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            `${API_URL}/newPassword`,
            {
              method: "POST",
              credentials:
                "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                newPassword,
                confirmNewPassword,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              `Error HTTP: ${response.status}`
          );
        }

        return data;
      } catch (error) {
        console.error(
          "Error cambiando contraseña:",
          error
        );

        setError(
          error.message
        );

        throw error;
      } finally {
        setLoading(false);
      }
    };

  return {
    loading,
    error,
    requestCode,
    verifyCode,
    newPassword,
  };
};