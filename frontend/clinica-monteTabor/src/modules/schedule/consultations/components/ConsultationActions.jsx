// Barra de acciones de la derecha. En modo de solo lectura (readOnly)
// solo se muestra el botón de vista previa e impresión.

const ConsultationActions = ({ readOnly, isSaving, onFinish, onPreview }) => {
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
            {!readOnly && (
                <button
                    type="button"
                    className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                    Generar incapacidad
                </button>
            )}

            <button
                type="button"
                onClick={onPreview}
                className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                Vista previa e imprimir
            </button>

            {!readOnly && (
                <>
                    <button
                        type="button"
                        className="w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Prescribir examen
                    </button>

                    {/* type="submit" porque dispara el handleSubmit del <form> padre */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        onClick={onFinish}
                        className="w-full bg-[#0b66d6] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#0a59ba] disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : "Finalizar y guardar"}
                    </button>
                </>
            )}
        </div>
    );
};

export default ConsultationActions;