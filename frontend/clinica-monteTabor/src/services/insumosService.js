const BASE = "http://localhost:4000/api/inventory";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error en la solicitud");
  return data;
};

export const getInsumos = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${BASE}?${query}`, { credentials: "include" }).then(handleResponse);
};

export const getInsumoById = (id) =>
  fetch(`${BASE}/${id}`, { credentials: "include" }).then(handleResponse);

export const createInsumo = (formData) =>
  fetch(BASE, { method: "POST", credentials: "include", body: formData }).then(handleResponse);

export const updateInsumo = (id, formData) =>
  fetch(`${BASE}/${id}`, { method: "PUT", credentials: "include", body: formData }).then(handleResponse);

export const deleteInsumo = (id) =>
  fetch(`${BASE}/${id}`, { method: "DELETE", credentials: "include" }).then(handleResponse);

export const getStats = () =>
  fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

export const getMovements = (limit = 10) =>
  fetch(`${BASE}/movements?limit=${limit}`, { credentials: "include" }).then(handleResponse);

export const adjustStock = (id, body) =>
  fetch(`${BASE}/${id}/adjust`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const stockEntry = (body) =>
  fetch(`${BASE}/stock-entry`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const manualUsage = (body) =>
  fetch(`${BASE}/manual-usage`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handleResponse);

export const getCharts = () =>
  fetch(`${BASE}/charts`, { credentials: "include" }).then(handleResponse);
