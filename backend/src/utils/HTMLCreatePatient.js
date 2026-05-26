// utils/HTMLCreatePatient.js
const HTMLCreatePatient = (name, code) => {
    return `
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
        <table cellspacing="0" cellpadding="0" width="100%" bgcolor="#f3f4f6" style="padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table cellspacing="0" cellpadding="0" width="100%" style="max-width: 550px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); text-align: center;">
                        
                        <tr>
                            <td align="center" style="padding-bottom: 20px;">
                                <table cellspacing="0" cellpadding="0" style="background-color: #1d4ed8; border-radius: 6px; width: 36px; height: 36px;">
                                    <tr>
                                        <td align="center" style="vertical-align: middle; font-size: 16px; color: #ffffff; font-weight: bold; font-family: sans-serif;">
                                            T
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom: 8px;">
                                <h1 style="color: #000000; margin: 0; font-size: 26px; font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif;">Confirmación de Cuenta</h1>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom: 32px;">
                                <p style="color: #4b5563; margin: 0; font-size: 15px;">Tu solicitud de registro ha sido recibida correctamente.</p>
                            </td>
                        </tr>

                        <tr>
                            <td align="center" style="padding-bottom: 32px;">
                                <table cellspacing="0" cellpadding="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px 20px;">
                                    <tr>
                                        <td align="center" style="padding-bottom: 8px;">
                                            <h2 style="color: #1f2937; margin: 0; font-size: 16px; font-weight: 600;">Código de Verificación</h2>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <p style="color: #64748b; margin: 0; font-size: 14px;">Ingresa este código en el sistema para activar tu cuenta de paciente.</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <div style="background-color: #ffffff; border: 2px solid #1d4ed8; color: #1d4ed8; font-size: 34px; font-weight: 700; letter-spacing: 6px; padding: 12px 28px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                                ${code}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="border-top: 1px solid #e5e7eb; padding-bottom: 24px;"></td>
                        </tr>

                        <tr>
                            <td align="left" style="padding-bottom: 16px; text-align: left;">
                                <p style="color: #1f2937; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin: 0; text-transform: uppercase;">¿Qué sigue ahora ${name} ?</p>
                            </td>
                        </tr>

                        <tr>
                            <td align="left" style="padding-bottom: 24px;">
                                <table cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                        <td style="vertical-align: top; width: 28px; padding-bottom: 12px;">
                                            <div style="background-color: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 600; width: 18px; height: 18px; line-height: 18px; border-radius: 50%; text-align: center;">1</div>
                                        </td>
                                        <td style="color: #4b5563; font-size: 14px; line-height: 1.4; padding-bottom: 12px; padding-left: 4px;">
                                            Introduce el código alfanumérico en el formulario de validación (vence en 15 minutos).
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="vertical-align: top; width: 28px; padding-bottom: 12px;">
                                            <div style="background-color: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 600; width: 18px; height: 18px; line-height: 18px; border-radius: 50%; text-align: center;">2</div>
                                        </td>
                                        <td style="color: #4b5563; font-size: 14px; line-height: 1.4; padding-bottom: 12px; padding-left: 4px;">
                                            Inicia sesión en tu nuevo perfil para comprobar que tus accesos están activos.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="vertical-align: top; width: 28px;">
                                            <div style="background-color: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 600; width: 18px; height: 18px; line-height: 18px; border-radius: 50%; text-align: center;">3</div>
                                        </td>
                                        <td style="color: #4b5563; font-size: 14px; line-height: 1.4; padding-left: 4px;">
                                            Tus datos médicos e historial se registrarán en el sistema en tu próxima cita presencial.
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom: 12px;">
                                <p style="color: #b91c1c; font-size: 13px; margin: 0; background-color: #fef2f2; padding: 8px; border-radius: 6px; border: 1px solid #fca5a5;">
                                    El código de seguridad proporcionado expirará en un lapso de 15 minutos.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; 2026 Clínica Médica Monte Tabor. Todos los derechos reservados.</p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    `;
}
export default HTMLCreatePatient;