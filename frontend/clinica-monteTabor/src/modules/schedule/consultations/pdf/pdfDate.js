// Fecha y hora de un documento PDF a partir de un instante. La hora es
// siempre la hora local (HH:MM, 24 horas), sin zona horaria: refleja el reloj
// del equipo que emite el documento, o el momento en que se finalizó la
// consulta cuando el PDF se genera desde el expediente o un portal.
const pad = (value) => String(value).padStart(2, "0");

// Recibe una fecha, un ISO o nada (usa el momento actual). Devuelve la fecha
// como dd/mm/aaaa, la hora local como HH:MM y una versión de la fecha apta
// para nombre de archivo (sin barras). Si el instante no es válido, todo
// queda como cadena vacía.
export const pdfDateTime = (source) => {
    const value = source != null && source !== "" ? new Date(source) : new Date();
    if (Number.isNaN(value.getTime())) {
        return { date: "", time: "", fileSafe: "" };
    }
    const date = `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
    const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
    return { date, time, fileSafe: date.replace(/\//g, "-") };
};
