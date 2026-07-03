import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, DollarSign, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import useProcedures from "@/modules/procedures/hooks/useProcedures";

// Valores iniciales del formulario. Los saco afuera del componente para no
// estar creando el mismo objeto en cada render y para poder reusarlos tanto
// en useForm como al hacer reset() después de guardar.
const defaultValues = {
    name: "",
    description: "",
    estimated_duration: 30,
    price: 0,
    requires_nurse: false,
    post_operative_instructions: "",
};

// Modal de "creación rápida" de procedimiento. Se abre desde el botón "+"
// que está al lado del selector de "Tipo de Procedimiento" en
// AppointmentsForm, para no tener que salir del formulario de la cita si el
// procedimiento que se necesita todavía no existe en el catálogo.
export default function ProcedureModal({ isOpen, onClose, onProcedureCreated }) {
    const { saveProcedure, submitting } = useProcedures();

    // Uso react-hook-form + Controller para todos los campos (en vez de
    // register directo) porque los componentes Input/Textarea de la UI no
    // reenvían el ref con forwardRef, entonces si usara register() los
    // setValue/reset no actualizarían lo que se ve en pantalla. Controller
    // evita ese problema porque maneja el value/onChange directo (controlado).
    const { control, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

    const onSubmit = async (data) => {
        const result = await saveProcedure(null, {
            ...data,
            estimated_duration: Number(data.estimated_duration),
            price: Number(data.price),
            materials: [] // Se manda vacío por defecto para el CRUD de tu amiga
        });

        // saveProcedure ya muestra su propio mensaje de éxito/error (con
        // Swal) adentro del hook useProcedures, así que aquí solo nos toca
        // reaccionar si salió bien.
        if (result) {
            if (onProcedureCreated) {
                // Si el backend nos devuelve el procedimiento creado, guardamos
                // su _id real para poder seleccionarlo de una vez en el
                // formulario de la cita sin que el usuario tenga que buscarlo.
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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl bg-white p-6 shadow-xl border-0">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-gray-900">
                        Creación Rápida de Procedimiento
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    {/* NOMBRE (obligatorio, mínimo 3 caracteres) */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Nombre del Procedimiento *</Label>
                        <Controller
                            name="name"
                            control={control}
                            rules={{
                                required: "El nombre del procedimiento es obligatorio.",
                                validate: (value) => value.trim().length >= 3 || "El nombre debe tener al menos 3 caracteres.",
                            }}
                            render={({ field }) => (
                                <Input
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Ej. Limpieza Dental Profunda"
                                    className="bg-gray-50 border-gray-200 rounded-lg h-10 focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                        {errors.name && (
                            <p className="text-xs text-rose-500">{errors.name.message}</p>
                        )}
                    </div>

                    {/* DURACIÓN Y PRECIO (no se aceptan valores en 0/negativos/NaN) */}
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
                                            return true;
                                        },
                                    }}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
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

                    {/* REQUIERE ENFERMERA: es un switch/checkbox custom hecho con
                        Tailwind (el input real está oculto con sr-only, lo que se
                        ve es el div de al lado que cambia de posición con peer-*). */}
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

                    {/* DESCRIPCIÓN (opcional) */}
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
                                    className="bg-gray-50 border-gray-200 rounded-lg min-h-[50px] resize-none focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                    </div>

                    {/* NUEVO: INSTRUCCIONES POST-OPERATORIAS (opcional) */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-600">Indicaciones Post-Operatorias</Label>
                        <Controller
                            name="post_operative_instructions"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Ej. No ingerir alimentos sólidos por 2 horas..."
                                    className="bg-gray-50 border-gray-200 rounded-lg min-h-[50px] resize-none focus-visible:ring-[#0b66d6]"
                                />
                            )}
                        />
                    </div>

                    {/* BOTONES */}
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-lg" disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {submitting ? "Guardando..." : "Registrar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
