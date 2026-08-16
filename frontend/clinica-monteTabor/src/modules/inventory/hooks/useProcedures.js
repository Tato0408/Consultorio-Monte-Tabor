const BASE = "https://clinica-monte-tabor.onrender.com/api/procedures";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error en la solicitud");
  return data;
};

const useProcedures = () => {
  const getProcedures = () =>
    fetch(BASE, { credentials: "include" }).then(handleResponse);

  const createProcedure = (body) =>
    fetch(BASE, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse);

  const updateProcedure = (id, body) =>
    fetch(`${BASE}/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse);

  const deleteProcedure = (id) =>
    fetch(`${BASE}/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then(handleResponse);

  return { getProcedures, createProcedure, updateProcedure, deleteProcedure };
};

export default useProcedures;
