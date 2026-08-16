const BASE = "https://clinica-monte-tabor.onrender.com/api/inventory";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error en la solicitud");
  return data;
};

const useInsumos = () => {
  const getInsumos = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${BASE}?${query}`, { credentials: "include" }).then(handleResponse);
  };

  const getInsumoById = (id) =>
    fetch(`${BASE}/${id}`, { credentials: "include" }).then(handleResponse);

  const createInsumo = (formData) =>
    fetch(BASE, { method: "POST", credentials: "include", body: formData }).then(handleResponse);

  const updateInsumo = (id, formData) =>
    fetch(`${BASE}/${id}`, { method: "PUT", credentials: "include", body: formData }).then(handleResponse);

  const deleteInsumo = (id) =>
    fetch(`${BASE}/${id}`, { method: "DELETE", credentials: "include" }).then(handleResponse);

  const getStats = () =>
    fetch(`${BASE}/stats`, { credentials: "include" }).then(handleResponse);

  // Obtiene el historial de movimientos de inventario, limitado a
  // la cantidad indicada.
  const getMovements = (limit = 10) =>
    fetch(`${BASE}/movements?limit=${limit}`, { credentials: "include" }).then(handleResponse);

  // Ajusta el stock de un insumo al valor indicado en el cuerpo de
  // la petición.
  const adjustStock = (id, body) =>
    fetch(`${BASE}/${id}/adjust`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse);

  // Registra una entrada de stock, como una compra o un
  // reabastecimiento.
  const stockEntry = (body) =>
    fetch(`${BASE}/stock-entry`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse);

  // Registra un uso manual de insumos, es decir, uno que no
  // proviene de un tratamiento.
  const manualUsage = (body) =>
    fetch(`${BASE}/manual-usage`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse);

  // Obtiene los datos agregados para los gráficos del panel de
  // inventario.
  const getCharts = () =>
    fetch(`${BASE}/charts`, { credentials: "include" }).then(handleResponse);

  return {
    getInsumos,
    getInsumoById,
    createInsumo,
    updateInsumo,
    deleteInsumo,
    getStats,
    getMovements,
    adjustStock,
    stockEntry,
    manualUsage,
    getCharts,
  };
};

export default useInsumos;
