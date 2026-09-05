// Barra de acciones de la derecha. En modo de solo lectura (readOnly)
// solo se muestra el botón de vista previa e impresión.

const ConsultationActions = ({ readOnly, isSaving, onFinish, onPreview, onGenerateIncapacidad, onGenerateLabOrder, onGenerateReceta }) => {
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
                en solo lectura para revisar/descargar el recetario de una
                consulta ya atendida. */}
            <button
                type="button"
                onClick={onGenerateReceta}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Generar receta
            </button>

            {/* La orden de laboratorio es opcional y se llena en una pantalla
                aparte. Disponible también en solo lectura para revisarla/descargarla. */}
            <button
                type="button"
                onClick={onGenerateLabOrder}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Generar orden de laboratorio
            </button>

            <button
                type="button"
                onClick={onPreview}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Vista previa e imprimir
            </button>

            {!readOnly && (
                // type="submit" porque dispara el handleSubmit del <form> padre
                <button
                    type="submit"
                    disabled={isSaving}
                    onClick={onFinish}
                    className="w-full bg-[#0b66d6] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0a59ba] disabled:opacity-50"
                >
                    {isSaving ? "Guardando..." : "Finalizar y guardar"}
                </button>
            )}
        </div>
    );
};

export default ConsultationActions;