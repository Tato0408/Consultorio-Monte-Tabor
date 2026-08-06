import apiClient from "@/lib/apiClient";

// Proxy hacia la API real de Wompi (el backend nunca guarda la tarjeta, solo la reenvía)

export const generarTokenWompi = () => apiClient("/wompi/token", { method: "POST" });

export const tokenizarTarjeta = (token, formData) =>
  apiClient("/wompi/tokenizar", { method: "POST", body: { token, formData } });

export const cobrarTarjeta = (token, formData) =>
  apiClient("/wompi/paymentTest", { method: "POST", body: { token, formData } });