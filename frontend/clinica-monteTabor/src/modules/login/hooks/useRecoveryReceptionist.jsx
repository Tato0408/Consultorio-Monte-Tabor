import { useState } from "react";

const API_URL =
    "https://clinica-monte-tabor.onrender.com/api/recoveryReceptionist";

export const useRecoveryReceptionist = () => {

    const [loading, setLoading] = useState(false);

    // Activa el estado de carga mientras se solicita el código de
    // recuperación al correo indicado.
    const requestCode = async (email) => {
        try {
            setLoading(true);
            const response =
                await fetch(
                    `${API_URL}/requestCode`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email
                        })

                    });
            return await response.json();
        } finally {
            setLoading(false);
        }
    };

    // Verifica el código de recuperación ingresado por el usuario.
    const verifyCode = async (code) => {
        try {
            setLoading(true);
            const response =
                await fetch(
                    `${API_URL}/verifyCode`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            code
                        })
                    });
            return await response.json();
        } finally {
            setLoading(false);
        }
    };


  // Reenvía el código de recuperación al mismo correo de la solicitud.
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

    // Envía la nueva contraseña junto con su confirmación para
    // completar el cambio de contraseña.
    const newPassword =
        async (password, confirmPassword) => {
            try {
                setLoading(true);
                const response =
                    await fetch(
                        `${API_URL}/newPassword`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json"
                            },


                            body: JSON.stringify({

                                newPassword: password,
                                confirmNewPassword: confirmPassword
                            })

                        });
                return await response.json();
            } finally {
                setLoading(false);
            }
        };
    return {
        loading,
        requestCode,
        verifyCode,
        newPassword

    };


};