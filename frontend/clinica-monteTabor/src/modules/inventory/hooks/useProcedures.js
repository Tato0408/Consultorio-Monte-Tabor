import apiClient from "@/lib/apiClient";

const useProcedures = () => {
  const getProcedures = () =>
    apiClient("/procedures");

  const createProcedure = (body) =>
    apiClient("/procedures", {
      method: "POST",
      body,
    });

  const updateProcedure = (id, body) =>
    apiClient(`/procedures/${id}`, {
      method: "PUT",
      body,
    });

  const deleteProcedure = (id) =>
    apiClient(`/procedures/${id}`, {
      method: "DELETE",
    });

  return { getProcedures, createProcedure, updateProcedure, deleteProcedure };
};

export default useProcedures;
