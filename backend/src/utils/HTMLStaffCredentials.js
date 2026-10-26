// Genera el HTML del correo con las credenciales de acceso que se envía a
// cualquier usuario recién creado por un administrador desde el sitio web
// privado (doctor, recepcionista, enfermera o paciente). Recibe su nombre
// completo, la etiqueta del rol (ej. "doctor", "recepcionista", "enfermera",
// "paciente"), el correo y la contraseña en texto plano que el admin definió,
// y devuelve el string HTML completo del correo. Además de las credenciales,
// recomienda de forma explícita que el usuario cambie su contraseña desde el
// apartado de su perfil la primera vez que entre al sistema.
const HTMLStaffCredentials = (fullName, roleLabel, email, password) => {
  return `
    <div style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;border:1px solid #dce4ff;overflow:hidden;">

              <tr>
                <td style="padding:36px 40px 20px;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#4A6CF7;">
                    Cuenta creada
                  </p>
                  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a2340;line-height:1.2;">
                    Bienvenido(a), ${fullName}
                  </h1>
                  <p style="margin:0;font-size:14px;color:#8a93b2;line-height:1.6;">
                    Un administrador creó tu cuenta de <strong>${roleLabel}</strong> en el sistema del Consultorio Médico Familiar Monte Tabor. Estas son tus credenciales de acceso.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 40px 6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #dce4ff;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;border-bottom:1px solid #eef1fb;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#8a93b2;">Correo</p>
                        <p style="margin:0;font-size:15px;font-weight:600;color:#1a2340;">${email}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#8a93b2;">Contraseña</p>
                        <p style="margin:0;font-size:15px;font-weight:700;color:#4A6CF7;font-family:'Courier New',monospace;">${password}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 40px 6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#c2410c;">
                          Recomendación de seguridad
                        </p>
                        <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                          Apenas inicies sesión, entra al apartado <strong>&laquo;Mi perfil&raquo;</strong> del sistema y actualiza tu propia contraseña por una que solo tú conozcas. No compartas este correo con nadie.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 40px 0;">
                  <hr style="border:none;border-top:1px solid #f0f4ff;margin:0;">
                </td>
              </tr>

              <tr>
                <td style="padding:20px 40px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#c0c8e0;">
                        &#9675;&nbsp; Si no esperabas este correo, contacta a la clínica
                      </td>
                      <td align="right" style="font-size:12px;color:#4A6CF7;font-weight:600;">
                        Consultorio Médico Familiar Monte Tabor
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

export default HTMLStaffCredentials;
