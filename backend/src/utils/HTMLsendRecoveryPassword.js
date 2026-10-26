// Genera el HTML del correo de recuperación de contraseña. Recibe el
// código de verificación, arma una casilla visual por cada dígito y
// devuelve el string HTML completo del cuerpo del correo.
const HTMLRecoveryEmail = (code) => {
  const digits = String(code).split('');
  const boxes = digits.map(d => `
    <td style="padding: 0 4px;">
      <div style="
        width: 44px;
        height: 52px;
        background-color: #4A6CF7;
        border-radius: 10px;
        font-size: 24px;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
        line-height: 52px;
        font-family: 'Courier New', monospace;
      ">${d}</div>
    </td>
  `).join('');

  return `
    <div style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="420" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;background-color:#ffffff;border-radius:20px;border:1px solid #dce4ff;overflow:hidden;">

              <tr>
                <td style="padding:36px 40px 20px;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#4A6CF7;">
                    Recuperación de contraseña
                  </p>
                  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a2340;line-height:1.2;">
                    Tu código de verificación
                  </h1>
                  <p style="margin:0;font-size:14px;color:#8a93b2;line-height:1.6;">
                    Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código para continuar.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 40px 6px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>${boxes}</tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 32px;">
                  <p style="margin:8px 0 0;font-size:12px;color:#b0b8d4;">
                    &#9679;&nbsp; Válido por 15 minutos &nbsp;·&nbsp; No lo compartas con nadie
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px;">
                  <hr style="border:none;border-top:1px solid #f0f4ff;margin:0;">
                </td>
              </tr>

              <tr>
                <td style="padding:20px 40px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#c0c8e0;">
                        &#9675;&nbsp; Todos tus datos están protegidos
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

export default HTMLRecoveryEmail;