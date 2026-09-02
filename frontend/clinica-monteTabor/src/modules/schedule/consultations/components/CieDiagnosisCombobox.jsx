import { useEffect, useMemo, useState } from "react";
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { loadCie10Catalog, cie10Filter } from "../data/cie10";

// Selector CIE-10: mismo Combobox con buscador que el resto del sistema, pero
// alimentado con el catálogo hardcodeado (~14.5k registros). El filtrado y el
// tope de resultados los hace base-ui (props `filter` + `limit`), así que solo
// se pintan las coincidencias, nunca los 14.5k a la vez.
//
// El valor hacia afuera es siempre { code, name } resuelto desde la lista: no se
// puede teclear un código o diagnóstico que no exista.
const CieDiagnosisCombobox = ({ code, name, onChange, disabled, error }) => {
    const [catalog, setCatalog] = useState(null);

    useEffect(() => {
        // En solo lectura no hay búsqueda: la etiqueta se arma con el valor ya
        // guardado, así que no vale la pena descargar el catálogo (~1 MB).
        if (disabled) return undefined;
        let alive = true;
        loadCie10Catalog().then((data) => {
            if (alive) setCatalog(data);
        });
        return () => {
            alive = false;
        };
    }, [disabled]);

    // base-ui necesita el ítem completo como value para poder mostrar su etiqueta
    // y marcar el seleccionado. Si el código guardado ya no está en el catálogo
    // (consultas viejas con texto escrito a mano), igual se reconstruye con lo
    // que haya para no perder el dato.
    const value = useMemo(() => (code ? { c: code, d: name || "" } : null), [code, name]);

    return (
        <Combobox
            items={catalog || []}
            value={value}
            onValueChange={(item) =>
                onChange(item ? { code: item.c, name: item.d } : { code: "", name: "" })
            }
            filter={cie10Filter}
            limit={50}
            itemToStringLabel={(item) => (item ? `${item.c} — ${item.d}` : "")}
            itemToStringValue={(item) => (item ? item.c : "")}
            isItemEqualToValue={(a, b) => (a?.c ?? "") === (b?.c ?? "")}
            disabled={disabled || !catalog}
        >
            <ComboboxTrigger
                size="lg"
                placeholder={catalog ? "Busca por código o nombre del diagnóstico" : "Cargando catálogo CIE-10…"}
                className={cn(
                    "h-[38px] rounded-lg bg-white px-2.5",
                    error ? "border-red-400" : "border-slate-200",
                )}
            />
            <ComboboxContent className="max-h-72">
                {(item) => (
                    <ComboboxItem key={item.c} value={item}>
                        <span className="mr-1.5 font-mono text-xs font-semibold text-[#0b66d6]">{item.c}</span>
                        <span className="text-slate-600">{item.d}</span>
                    </ComboboxItem>
                )}
            </ComboboxContent>
        </Combobox>
    );
};

export default CieDiagnosisCombobox;
