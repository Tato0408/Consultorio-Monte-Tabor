import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Download, Eraser, Save } from "lucide-react";

import useLabOrder from "../hooks/useLabOrder";
import LabOrderDocument from "../pdf/LabOrderDocument";
import { downloadPdf } from "../pdf/downloadPdf";
import { pdfDateTime } from "../pdf/pdfDate";
import {
    LAB_ORDER_CATALOG,
    testKey,
    countSelectedTests,
    PREGNANCY_OPTIONS,
    ANTIBIOTIC_OPTIONS,
} from "../lab/labOrderCatalog";
import { showSuccess, showError } from "@/lib/alerts";
import { calculateAge } from "@/lib/validators";
import { maskClinicalText } from "@/lib/inputMasks";
import { useDocumentSignature } from "@/lib/useDocumentSignature";

const OTHER_TESTS_MAX = 300;

const LabOrderForm = () => {
    const { appointmentId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const readOnly = searchParams.get("mode") === "view";
    // Reenvía el mismo location.state con el que se llegó acá (ver
    // ConsultationForm.jsx), así la consulta a la que se vuelve conserva de
    // dónde se abrió originalmente (lista de consultas o expediente del
    // paciente) y su propio botón de volver también acierta.
    const backToConsultation = () =>
        navigate(`/calendar/consultations/${appointmentId}${readOnly ? "?mode=view" : ""}`, { state: location.state });

    const { appointment, labOrder, triageWeight, triageHeight, save, isLoading, isSaving, error } =
        useLabOrder(appointmentId);

    // La orden sale a nombre del doctor asignado a la cita, con su firma y
    // sello solo si quien descarga es ese doctor o el admin.
    const { signatureUrl, sealUrl } = useDocumentSignature(
        appointment?.doctor_id?._id || appointment?.doctor_id
    );

    // Exámenes marcados como Set de claves "panel:test".
    const [selected, setSelected] = useState(() => new Set());
    const [pregnancy, setPregnancy] = useState("");
    const [antibioticTreatment, setAntibioticTreatment] = useState("");
    const [otherTests, setOtherTests] = useState("");

    // Precarga los campos cuando llega la orden ya guardada.
    useEffect(() => {
        if (!labOrder) return;
        setSelected(new Set(labOrder.tests || []));
        setPregnancy(labOrder.pregnancy || "");
        setAntibioticTreatment(labOrder.antibiotic_treatment || "");
        setOtherTests(labOrder.other_tests || "");
    }, [labOrder]);

    const patient = appointment?.patient_id;
    const doctor = appointment?.doctor_id;
    const nurse = appointment?.nurse_id;
    const patientFullName = `${patient?.name || ""} ${patient?.last_name || ""}`.trim();
    const doctorFullName = doctor
        ? `${doctor.name || ""} ${doctor.last_name || ""}`.trim()
        : nurse
            ? `${nurse.name || ""} ${nurse.last_name || ""}`.trim()
            : "";
    // Fecha y hora de emisión: la orden se genera en este momento, con el
    // reloj local de ahora.
    const { date: todayFormatted, time: todayTime, fileSafe: todayFileSafe } = pdfDateTime();

    const selectedCount = countSelectedTests([...selected]);

    const toggleTest = (fullKey) => {
        if (readOnly) return;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(fullKey)) next.delete(fullKey);
            else next.add(fullKey);
            return next;
        });
    };

    const togglePanel = (panel, allChecked) => {
        if (readOnly) return;
        setSelected((prev) => {
            const next = new Set(prev);
            panel.tests.forEach((test) => {
                const fullKey = testKey(panel.key, test.key);
                if (allChecked) next.delete(fullKey);
                else next.add(fullKey);
            });
            return next;
        });
    };

    const limpiarCampos = () => {
        setSelected(new Set());
        setPregnancy("");
        setAntibioticTreatment("");
        setOtherTests("");
    };

    const buildDocument = () => (
        <LabOrderDocument
            title={`Orden de laboratorio de ${patientFullName} ${todayFileSafe}`}
            patientName={patientFullName}
            age={calculateAge(patient?.birth_date)}
            gender={patient?.gender}
            dui={patient?.dui}
            doctorName={doctorFullName}
            signatureUrl={signatureUrl}
            sealUrl={sealUrl}
            date={todayFormatted}
            time={todayTime}
            weight={triageWeight}
            height={triageHeight}
            pregnancy={pregnancy}
            antibioticTreatment={antibioticTreatment}
            tests={[...selected]}
            otherTests={otherTests}
        />
    );

    const handleDescargar = async () => {
        if (selectedCount === 0 && !otherTests.trim()) {
            showError("Marca al menos un examen (o escribe algo en «Otros») antes de descargar la orden.");
            return;
        }
        try {
            await downloadPdf(buildDocument(), `Orden de laboratorio - ${patientFullName} ${todayFileSafe}`);
        } catch (err) {
            showError(err?.message || "No se pudo generar la orden de laboratorio.");
        }
    };

    const handleGuardar = async () => {
        if (isSaving) return;
        // Misma regla que handleDescargar: una orden sin ningún examen marcado
        // ni nada en "Otros" no le sirve de nada al laboratorio. El backend
        // también la rechaza (ver labOrderController.js), esto solo evita el
        // viaje de ida y vuelta.
        if (selectedCount === 0 && !otherTests.trim()) {
            showError("Marca al menos un examen (o escribe algo en «Otros») antes de guardar la orden.");
            return;
        }
        try {
            await save({
                tests: [...selected],
                pregnancy,
                antibiotic_treatment: antibioticTreatment,
                other_tests: otherTests,
            });
            // Se guardó: se vuelve de una vez a la consulta (el toast lo renderiza
            // el <Toaster> de la raíz y sigue visible en la otra vista).
            showSuccess("La orden de laboratorio se guardó para esta consulta.");
            backToConsultation();
        } catch (err) {
            showError(err?.message || "No se pudo guardar la orden de laboratorio.");
        }
    };

    const headerData = useMemo(
        () => [
            { label: "Fecha", value: todayFormatted },
            { label: "Paciente", value: patientFullName || "—" },
            { label: "Edad", value: calculateAge(patient?.birth_date) != null ? `${calculateAge(patient?.birth_date)} años` : "—" },
            { label: "Sexo", value: patient?.gender || "—" },
            { label: "DUI", value: patient?.dui || "—" },
            { label: "Médico solicitante", value: doctorFullName || "—" },
            { label: "Peso (kg)", value: triageWeight || "—" },
            { label: "Talla (cm)", value: triageHeight || "—" },
        ],
        [todayFormatted, patientFullName, patient, doctorFullName, triageWeight, triageHeight]
    );

    if (isLoading) {
        return <div className="p-4 sm:p-8 text-slate-400">Cargando orden de laboratorio...</div>;
    }

    return (
        <div className="p-4 sm:p-8">
            <button
                type="button"
                onClick={backToConsultation}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0b66d6] mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Cancelar y volver a la consulta
            </button>

            <div className="mb-5">
                <h1 className="text-xl font-bold text-slate-800">Orden de laboratorio</h1>
                <p className="text-sm text-slate-500">
                    {patientFullName || "Paciente"} · {selectedCount} {selectedCount === 1 ? "examen marcado" : "exámenes marcados"}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}

            {/* Encabezado: datos que vienen del paciente y de la consulta (solo lectura)
                + los campos propios de la orden. */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {headerData.map((item) => (
                        <div key={item.label}>
                            <p className="text-[11px] text-slate-400">{item.label}</p>
                            <p className="text-sm font-medium text-slate-700">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Embarazo</label>
                        <select
                            value={pregnancy}
                            disabled={readOnly}
                            onChange={(e) => setPregnancy(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                        >
                            {PREGNANCY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500">Tratamiento antibiótico</label>
                        <select
                            value={antibioticTreatment}
                            disabled={readOnly}
                            onChange={(e) => setAntibioticTreatment(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                        >
                            {ANTIBIOTIC_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Paneles de exámenes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LAB_ORDER_CATALOG.map((panel) => {
                    const checkedCount = panel.tests.filter((t) => selected.has(testKey(panel.key, t.key))).length;
                    const allChecked = checkedCount === panel.tests.length;
                    return (
                        <div key={panel.key} className="bg-white border border-slate-100 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-[#0b66d6]">{panel.title}</p>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => togglePanel(panel, allChecked)}
                                        className="text-[11px] text-slate-400 hover:text-[#0b66d6]"
                                    >
                                        {allChecked ? "Quitar todos" : "Marcar todos"}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1">
                                {panel.tests.map((test) => {
                                    const fullKey = testKey(panel.key, test.key);
                                    const checked = selected.has(fullKey);
                                    return (
                                        <label
                                            key={test.key}
                                            className={`flex items-start gap-2 text-sm rounded-md px-1 py-0.5 ${
                                                readOnly ? "" : "cursor-pointer hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={readOnly}
                                                onChange={() => toggleTest(fullKey)}
                                                className="mt-0.5 accent-[#0b66d6]"
                                            />
                                            <span className={checked ? "text-slate-800 font-medium" : "text-slate-600"}>
                                                {test.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4 mt-4">
                <label className="text-xs text-slate-500 block mb-1">Otros</label>
                <textarea
                    rows={2}
                    maxLength={OTHER_TESTS_MAX}
                    disabled={readOnly}
                    value={otherTests}
                    placeholder="Otros exámenes o indicaciones para el laboratorio"
                    onChange={(e) => setOtherTests(maskClinicalText(e.target.value, OTHER_TESTS_MAX))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
                />
                <div className="flex justify-end">
                    <span className="text-[11px] text-gray-400">{otherTests.length}/{OTHER_TESTS_MAX}</span>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
                {!readOnly && (
                    <button
                        type="button"
                        onClick={limpiarCampos}
                        className="flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        <Eraser className="w-4 h-4" /> Limpiar campos
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleDescargar}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                    <Download className="w-4 h-4" /> Descargar orden de laboratorio
                </button>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-1.5 bg-[#0b66d6] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#0a59ba] disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar orden de laboratorio"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default LabOrderForm;
