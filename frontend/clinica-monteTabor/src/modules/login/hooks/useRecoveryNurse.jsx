import { useState } from "react";

const API_URL =
    "http://localhost:4000/api/recoveryNursePassword";

export const useRecoveryNurse = () => {

    const [loading, setLoading] = useState(false);

    const requestCode = async (email) => {

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
    };

    const verifyCode = async (code) => {
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
    };
    const newPassword =
        async (password, confirmPassword) => {
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
        };
    return {
        loading,
        requestCode,
        verifyCode,
        newPassword

    };


};