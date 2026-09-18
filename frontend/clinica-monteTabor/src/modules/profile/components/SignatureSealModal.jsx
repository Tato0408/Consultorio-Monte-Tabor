import { useState, useEffect, useRef } from "react";
import SignaturePad from "signature_pad";
import { X, Loader2, PenLine, Upload, Eraser, Trash2, Stamp } from "lucide-react";
import { removeWhiteBackground } from "@/lib/removeWhiteBackground";
import { showError } from "@/lib/alerts";

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

// Sección de firma o sello dentro del modal. type distingue "signature" (admite foto o
// dibujo) de "seal" (solo foto, un sello siempre se captura, nunca se dibuja).
const AssetSection = ({
    title,
    icon: Icon,
    savedUrl,
    allowDraw,
    submitting,
    onSaveFile,
    onSaveDrawn,
    onRemove,
}) => {
    const [mode, setMode] = useState("foto");
    const [pendingBlob, setPendingBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [processing, setProcessing] = useState(false);
    const canvasRef = useRef(null);
    const padRef = useRef(null);
    const fileInputRef = useRef(null);

    // Limpia el estado pendiente al cambiar de modo o de sección, para no mezclar una foto ya
    // procesada con un dibujo a medio hacer.
    useEffect(() => {
        setPendingBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Monta el pad de dibujo solo mientras ese modo está activo. Sin backgroundColor, el
    // canvas queda transparente por defecto — el PNG exportado no necesita quitarle fondo,
    // a diferencia de una foto.
    useEffect(() => {
        if (mode !== "dibujar" || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        const pad = new SignaturePad(canvas, { penColor: "#1e293b" });
        padRef.current = pad;
        return () => pad.off();
    }, [mode]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProcessing(true);
        try {
            const blob = await removeWhiteBackground(file);
            setPendingBlob(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (err) {
            showError(err.message || "No se pudo procesar la imagen.");
        } finally {
            setProcessing(false);
            e.target.value = null;
        }
    };

    const handleUseDrawing = async () => {
        if (!padRef.current || padRef.current.isEmpty()) return;
        const dataUrl = padRef.current.toDataURL("image/png");
        const blob = await dataUrlToBlob(dataUrl);
        setPendingBlob(blob);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
    };

    const handleSave = async () => {
        if (!pendingBlob) return;
        const ok = mode === "dibujar" ? await onSaveDrawn(pendingBlob) : await onSaveFile(pendingBlob);
        if (ok) {
            setPendingBlob(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const busy = submitting || processing;

    return (
        <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-800">{title}</h3>
            </div>

            {savedUrl && !pendingBlob && (
                <div className="flex items-center gap-3 mb-3 bg-gray-50 rounded-lg p-3">
                    <img src={savedUrl} alt={title} className="h-14 object-contain" style={{ maxWidth: 160 }} />
                    <span className="text-xs text-emerald-600 font-medium flex-1">Guardada</span>
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title={`Quitar ${title.toLowerCase()}`}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {allowDraw && (
                <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-3">
                    <button
                        type="button"
                        onClick={() => setMode("foto")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "foto" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                    >
                        Subir foto
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("dibujar")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "dibujar" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                    >
                        Dibujar firma
                    </button>
                </div>
            )}

            {mode === "foto" ? (
                <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={busy} />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {processing ? "Quitando el fondo..." : `Elegir foto de ${title.toLowerCase()}`}
                    </button>
                    <p className="text-[11px] text-gray-400">
                        Toma la foto sobre una hoja blanca y con buena luz: el fondo claro se quita automáticamente.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-32 border border-gray-200 rounded-lg bg-[repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px] touch-none"
                    />
                    <button
                        type="button"
                        onClick={() => padRef.current?.clear()}
                        disabled={busy}
                        className="self-start flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                        <Eraser className="w-3.5 h-3.5" /> Borrar y repetir
                    </button>
                </div>
            )}

            {previewUrl && (
                <div className="flex items-center gap-3 mt-3 bg-blue-50/60 rounded-lg p-3">
                    <img src={previewUrl} alt="Vista previa" className="h-14 object-contain" style={{ maxWidth: 160 }} />
                    <span className="text-xs text-blue-600 flex-1">Vista previa, todavía no se guardó</span>
                </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
                {mode === "dibujar" && !pendingBlob && (
                    <button
                        type="button"
                        onClick={handleUseDrawing}
                        disabled={busy}
                        className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Usar este dibujo
                    </button>
                )}
                {pendingBlob && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy}
                        className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {`Guardar ${title.toLowerCase()}`}
                    </button>
                )}
            </div>
        </div>
    );
};

// Modal apilado encima de EditProfileModal (mismo estilo visual, z-index mayor para quedar
// arriba). Solo se abre para doctor/admin (ver el botón en EditProfileModal.jsx) — la firma
// y el sello son opcionales e independientes entre sí: guardar, reemplazar o quitar uno no
// exige tener el otro.
const SignatureSealModal = ({
    isOpen,
    onClose,
    signatureUrl,
    sealUrl,
    submitting,
    onSaveSignatureFile,
    onSaveSignatureDrawn,
    onRemoveSignature,
    onSaveSeal,
    onRemoveSeal,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    disabled={submitting}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                        <PenLine className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Firma y sello</h2>
                </div>
                <p className="text-xs text-gray-500 mb-6 ml-[52px]">
                    Se usan para completar automáticamente tus reportes. Nadie más puede verlas: solo se usan cuando tú generas un documento.
                </p>

                <div className="flex flex-col gap-4">
                    <AssetSection
                        title="Firma"
                        icon={PenLine}
                        savedUrl={signatureUrl}
                        allowDraw
                        submitting={submitting}
                        onSaveFile={onSaveSignatureFile}
                        onSaveDrawn={onSaveSignatureDrawn}
                        onRemove={onRemoveSignature}
                    />
                    <AssetSection
                        title="Sello"
                        icon={Stamp}
                        savedUrl={sealUrl}
                        allowDraw={false}
                        submitting={submitting}
                        onSaveFile={onSaveSeal}
                        onRemove={onRemoveSeal}
                    />
                </div>

                <div className="flex justify-end pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureSealModal;
