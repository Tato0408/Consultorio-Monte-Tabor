import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

// Hook simple de solo lectura: trae el catálogo de insumos una vez.
// Se usa para llenar el <select> de materiales en cada procedimiento.
function useInventory() {
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        // GET /inventory devuelve { insumos, total, totalPages, currentPage } (paginado, 8
        // por página si no se manda "limit"), nunca { data }. Un límite alto trae el
        // catálogo completo para llenar el <select> de materiales, en vez de solo los
        // primeros 8 insumos.
        apiClient("/inventory", { params: { limit: 1000 } })
            .then((res) => {
                if (isMounted) setInventory(res.insumos || []);
            })
            .catch((err) => {
                if (isMounted) setError(err.message);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Helper rápido para buscar el stock disponible de un insumo por id,
    // sirve para mostrar advertencias si se excede el inventario.
    const getItemById = (id) => inventory.find((item) => item._id === id);

    return { inventory, isLoading, error, getItemById };
}

export default useInventory;