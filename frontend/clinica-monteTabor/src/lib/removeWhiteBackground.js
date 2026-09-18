// Vuelve transparentes los tonos claros/blancos de una foto (firma o sello capturados sobre
// papel blanco), para que el resultado se pueda estampar sobre un PDF sin dejar un recuadro
// blanco encima del texto. Se hace en el navegador, sin depender del add-on pago de
// Cloudinary "Background Removal": el color de referencia se toma promediando las 4 esquinas
// (más robusto que solo la esquina superior izquierda si la iluminación no es pareja), y se
// aplica un pequeño degradado cerca del umbral en vez de un corte abrupto, para suavizar el
// borde en vez de dejarlo dentado.
const THRESHOLD = 60;
const FEATHER = 40;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });

const colorDistance = (r1, g1, b1, r2, g2, b2) =>
  Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

export async function removeWhiteBackground(file) {
  const img = await loadImage(file);

  // Limita el lado más largo a 1000px: una foto de celular de varios MB no aporta nada más
  // de nitidez sobre un sello o una firma, y aligera tanto el procesamiento como la subida.
  const MAX_SIZE = 1000;
  const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Color de referencia: promedio de un bloque pequeño en cada una de las 4 esquinas.
  const sampleCorner = (x0, y0) => {
    let r = 0, g = 0, b = 0, count = 0;
    const size = Math.max(1, Math.round(Math.min(width, height) * 0.05));
    for (let y = y0; y < y0 + size; y++) {
      for (let x = x0; x < x0 + size; x++) {
        const i = (y * width + x) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
        count++;
      }
    }
    return { r: r / count, g: g / count, b: b / count };
  };
  const size = Math.max(1, Math.round(Math.min(width, height) * 0.05));
  const corners = [
    sampleCorner(0, 0),
    sampleCorner(width - size, 0),
    sampleCorner(0, height - size),
    sampleCorner(width - size, height - size),
  ];
  const bg = {
    r: corners.reduce((s, c) => s + c.r, 0) / corners.length,
    g: corners.reduce((s, c) => s + c.g, 0) / corners.length,
    b: corners.reduce((s, c) => s + c.b, 0) / corners.length,
  };

  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    if (dist <= THRESHOLD) {
      data[i + 3] = 0;
    } else if (dist <= THRESHOLD + FEATHER) {
      // Degradado lineal entre totalmente transparente y totalmente opaco.
      const alpha = ((dist - THRESHOLD) / FEATHER) * 255;
      data[i + 3] = Math.min(data[i + 3], Math.round(alpha));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo procesar la imagen"));
    }, "image/png");
  });
}

export default removeWhiteBackground;
