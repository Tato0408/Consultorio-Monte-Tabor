// Genera y descarga un archivo de texto plano en el navegador, sin depender de
// ninguna librería de PDF (mantiene el sitio público liviano y simple)
export const downloadTextFile = (filename, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};