import { useState } from "react";

const API_URL =
    "http://localhost:4000/api/recoveryReceptionist";

export const useRecoveryReceptionist = () => {

    const [loading, setLoading] = useState(false);

    // "loading" antes no se activaba en requestCode/verifyCode/newPassword (solo en
    // resendCode) — así que las pantallas que lo usan para bloquear el formulario mientras
    // se envía nunca lo veían pasar a true durante la petición real. Se agrega setLoading
    // en las tres para que la protección contra doble clic funcione también con este rol.
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