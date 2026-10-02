import apiClient from "@/lib/apiClient";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error en la solicitud");
  return data;
};

const useInsumos = () => {
  // signal opcional: permite cancelar una carga en vuelo cuando el usuario cambia de
  // filtro antes de que la anterior respondiera (ver InventoryTable.jsx), mismo patrón
  // que useAppointment.js.
  const getInsumos = (params = {}, signal) =>
    apiClient("/inventory", { params, signal });

  const getInsumoById = (id) =>
    apiClient(`/inventory/${id}`);

  const createInsumo = (formData) =>
    apiClient("/inventory", { method: "POST", body: formData });

  const updateInsumo = (id, formData) =>
    apiClient(`/inventory/${id}`, { method: "PUT", body: formData });

  const deleteInsumo = (id) =>
    apiClient(`/inventory/${id}`, { method: "DELETE" });

  const getStats = () =>
    apiClient("/inventory/stats");

  // Obtiene el historial de movimientos de inventario, limitado a
  // la cantidad indicada.
  const getMovements = (limit = 10) =>
    apiClient("/inventory/movements", { params: { limit } });

  // Ajusta el stock de un insumo al valor indicado en el cuerpo de
  // la petición. apiClient detecta que es JSON y lo procesa.
  const adjustStock = (id, body) =>
    apiClient(`/inventory/${id}/adjust`, { method: "POST", body });

  // Registra una entrada de stock, como una compra o un
  // reabastecimiento.
  const stockEntry = (body) =>
    apiClient("/inventory/stock-entry", { method: "POST", body });

  // Registra un uso manual de insumos, es decir, uno que no
  // proviene de un tratamiento.
  const manualUsage = (body) =>
    apiClient("/inventory/manual-usage", { method: "POST", body });

  // Obtiene los datos agregados para los gráficos del panel de
  // inventario.
  const getCharts = () =>
    apiClient("/inventory/charts");

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
