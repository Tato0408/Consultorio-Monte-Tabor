// Barra de acciones de la derecha. En modo de solo lectura (readOnly) se
// ocultan las acciones de escritura y el botón inferior pasa a ser
// "Finalizar", que solo cierra el formulario (onClose) sin guardar nada.
const ConsultationActions = ({ readOnly, isSaving, onClose, onPreview, onGenerateIncapacidad, onGenerateLabOrder, onGenerateReceta, onGenerateReferencia }) => {
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
            {!readOnly && (
                <button
                    type="button"
                    onClick={onGenerateIncapacidad}
                    className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                    Generar incapacidad
                </button>
            )}

            {/* Solo lee lo que ya está cargado en la tarjeta Receta y
                seguimiento (no guarda nada), así que también queda disponible
                en solo lectura para revisar o descargar el recetario de una
                consulta ya atendida. */}
            <button
                type="button"
                onClick={onGenerateReceta}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Generar receta
            </button>

            {/* La orden de laboratorio es opcional y se llena en una pantalla
                aparte. Disponible también en solo lectura para revisarla o
                descargarla. */}
            <button
                type="button"
                onClick={onGenerateLabOrder}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Generar orden de laboratorio
            </button>

            {/* Referencia a otro nivel de atención. Lee lo que el doctor cargó
                en la tarjeta "Referencia" y datos de la consulta, también
                disponible en solo lectura para reimprimirla. */}
            <button
                type="button"
                onClick={onGenerateReferencia}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Generar referencia
            </button>

            <button
                type="button"
                onClick={onPreview}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Vista previa e imprimir
            </button>

            {readOnly ? (
                // Solo lectura: no guarda, solo cierra el formulario y vuelve a
                // la lista de la que se abrió (consultas o expediente).
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-[#0b66d6] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0a59ba]"
                >
                    Finalizar
                </button>
            ) : (
                // Envía el <form> padre, cuyo onSubmit ejecuta el guardado una
                // sola vez.
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-[#0b66d6] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0a59ba] disabled:opacity-50"
                >
                    {isSaving ? "Guardando..." : "Finalizar y guardar"}
                </button>
            )}
        </div>
    );
};

export default ConsultationActions;
