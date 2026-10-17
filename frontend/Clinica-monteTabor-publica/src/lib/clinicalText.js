// Máscara de texto de historia clínica (enfermedades, antecedentes, hábitos): permite
// letras con tildes, ñ y ü, números (hay diagnósticos que los llevan, como Diabetes tipo 2,
// COVID-19 o VIH-1), espacios, saltos de línea y la puntuación de una oración
// (. , ; : ' " ( ) [ ] - / ¿ ? ¡ ! %). Bloquea símbolos que no se usan al redactar, como
// + * = # @ $ & _ < > { } | \ ^ ~ × ÷. Misma regla que el backend, el panel y la app móvil.
export const maskClinicalText = (text) =>
  String(text ?? "").replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,;:'"()[\]\-/¿?¡!%]/g, "");
