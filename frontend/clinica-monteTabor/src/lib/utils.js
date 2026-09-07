import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Ordena una lista de personas alfabéticamente por su campo "name", sin
// distinguir mayúsculas ni acentos y respetando el español (ñ, tildes).
// Devuelve un arreglo nuevo, no muta el recibido, y tolera valores que no
// sean arreglo devolviendo una lista vacía.
export function sortByName(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "es", { sensitivity: "base" })
  );
}
