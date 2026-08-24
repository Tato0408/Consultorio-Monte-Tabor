import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, DollarSign, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import useProcedures from "@/modules/procedures/hooks/useProcedures";

// Valores iniciales del formulario, reutilizados también al hacer reset().
const defaultValues = {
    name: "",
    description: "",
    estimated_duration: 30,
    price: 0,
    requires_nurse: false,
    pre_care_instructions: "",
    post_operative_instructions: "",
};

// Modal de creación rápida de un procedimiento, abierto desde el
// botón de agregar junto al selector de tipo de procedimiento en
// AppointmentsForm.
export default function ProcedureModal({ isOpen, onClose, onProcedureCreated }) {
    const { saveProcedure, submitting } = useProcedures();

    // Se usa Controller en todos los campos porque Input y Textarea no
    // reenvían el ref (sin forwardRef). Controller maneja value y
    // onChange de forma controlada sin depender de esa referencia.
    const { control, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

    // Envía el procedimiento y notifica al formulario padre si se creó bien.
    const onSubmit = async (data) => {
        if (submitting) return;
        const result = await saveProcedure(null, {
            ...data,
            estimated_duration: Number(data.estimated_duration),
            price: Number(data.price),
            // Se manda vacío por defecto, el CRUD de materiales se
            // gestiona por separado.
            materials: []
        });

        // saveProcedure ya muestra su propio mensaje de éxito o error.
        if (result) {
            if (onProcedureCreated) {
                // Si el backend retorna el id real, se incluye en el objeto.
                const backendId = result?.data?._id || result?._id || result?.id;

                const procedimientofinal = {
                    ...data,
                    _id: backendId,
                };

                onProcedureCreated(procedimientofinal);
            }

            reset(defaultValues);
            onClose();
        }
    };

    return (
        // Sin este guard, hacer clic en el backdrop o presionar Escape mientras se envía
        // cerraría el diálogo (y perdería el estado) a medio envío.
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && submitting) return; onClose(); }}>
            <DialogContent closeDisabled={submitting} className="sm:max-w-[480px] rounded-2xl bg-white p-6 shadow-xl border-0">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-gray-900">
                        Creación rápida de procedimiento
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                {/* fieldset con display:contents. Desactiva todos los inputs y
                    botones que contiene de un solo golpe durante el envío, sin
                    alterar el layout */}
                <fieldset disabled={submitting} className="contents">
                    {/* Nombre: obligatorio, mínimo 3 caracteres. */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Nombre del procedimiento *</Label>
                        <Controller
                            name="name"
                            control={control}
                            rules={{
                                required: "El nombre del procedimiento es obligatorio.",
                                validate: (value) => value.trim().length >= 3 || "El nombre debe tener al menos 3 caracteres.",
                            }}
                            render={({ field }) => (
                                <>
                                    <Input
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Ej. Limpieza dental profunda"
                                        maxLength={100}
                                        className="bg-gray-50 border-gray-200 rounded-lg h-10 focus-visible:ring-[#0b66d6]"
                                    />
                                    <div className="flex items-start justify-between gap-2">
                                        {errors.name ? (
                                            <p className="text-xs text-rose-500">{errors.name.message}</p>
                                        ) : <span />}
                                        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">
                                            {String(field.value ?? "").length}/100
                                        </span>
                                    </div>
                                </>
                            )}
                        />
                    </div>

                    {/* Duración y precio: no se aceptan valores en 0, negativos ni NaN. */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-600">Duración (min)</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Controller
                                    name="estimated_duration"
                                    control={control}
                                    rules={{
                                        validate: (value) => {
                                            const num = Number(value);
                                            if (Number.isNaN(num) || num <= 0) return "La duración debe ser mayor a 0.";
                                            if (num > 480) return "La duración no puede superar 480 minutos (8 horas).";
                                            return true;
                                        },
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            min={1}
                                            max={480}
                                            onKeyDown={(e) => { if (["-", "e", "E", "+", "."].includes(e.key)) e.preventDefault(); }}
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="bg-gray-50 border-gray-200 rounded-lg h-10 pl-9 focus-visible:ring-[#0b66d6]"
                                        />
                                    )}
                                />
                            </div>
                            {errors.estimated_duration && (
                                <p className="text-xs text-rose-500">{errors.estimated_duration.message}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-600">Precio (USD)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Controller
                                    name="price"
                                    control={control}
                                    rules={{
                                        validate: (value) => {
                                            const num = Number(value);
                                            if (Number.isNaN(num) || num < 0) return "Ingrese un precio válido.";
                                            return true;
                                        },
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            min={0}
                                            max={999999}
                                            step="0.01"
                                            onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="bg-gray-50 border-gray-200 rounded-lg h-10 pl-9 focus-visible:ring-[#0b66d6]"
                                        />
                                    )}
                                />
                            </div>
                            {errors.price && (
                                <p className="text-xs text-rose-500">{errors.price.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Switch de requiere enfermera, hecho con un checkbox oculto (sr-only). */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div>
                            <label htmlFor="requires_nurse" className="text-xs font-semibold text-gray-900 cursor-pointer">
                                ¿Requiere enfermera?
                            </label>
                            <p className="text-[10px] text-gray-400 leading-tight">Asigna personal de apoyo en la cita automáticamente.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <Controller
                                name="requires_nurse"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        type="checkbox"
                                        id="requires_nurse"
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                )}
                            />
                            <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Descripción: opcional. */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Descripción breve</Label>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Objetivos o notas del procedimiento..."
                                    maxLength={500}
                                    className="bg-gray-50 border-gray-200 rounded-lg min-h-[50px] resize-none focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                    </div>

                    {/* Indicaciones previas: opcional. Se le muestran al paciente al
                        confirmar su cita desde el portal (patientPortalController.js). */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Indicaciones previas</Label>
                        <Controller
                            name="pre_care_instructions"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Ej. Llegar en ayunas, traer documento de identidad..."
                                    maxLength={500}
                                    className="bg-gray-50 border-gray-200 rounded-lg min-h-[50px] resize-none focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                    </div>

                    {/* Indicaciones post-operatorias: opcional. */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Indicaciones post-operatorias</Label>
                        <Controller
                            name="post_operative_instructions"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Ej. No ingerir alimentos sólidos por 2 horas..."
                                    maxLength={500}
                                    className="bg-gray-50 border-gray-200 rounded-lg min-h-[50px] resize-none focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                    </div>

                    {/* Botones de acción. */}
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-lg" disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {submitting ? "Guardando..." : "Registrar"}
                        </Button>
                    </DialogFooter>
                </fieldset>
                </form>
            </DialogContent>
        </Dialog>
    );
}
