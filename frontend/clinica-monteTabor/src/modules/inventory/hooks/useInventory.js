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

        apiClient("/inventory")
            .then((res) => {
                if (isMounted) setInventory(res.data);
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