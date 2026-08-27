import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2, Clock, Package, Activity, FileText, Info, Tag } from "lucide-react";
import useInsumos from "@/modules/inventory/hooks/useInsumos";
import useAppointmentTypes from "@/modules/schedule/appointments/hooks/useAppointmentTypes";
import { Combobox, ComboboxTrigger, ComboboxContent, ComboboxItem } from "@/components/ui/combobox";

// Prefijo para distinguir, dentro del mismo <select>, un material "legacy" (guardado antes con
// solo un nombre libre, o cuyo insumo ya no existe en el inventario) de un insumo real elegido
// del catálogo. Nunca choca con un ObjectId real de Mongo.
const LEGACY_PREFIX = "legacy:";

// Normaliza los materiales que vienen del backend (edicion) al shape que usa
// el formulario. "insumo" siempre es un string, el _id real del insumo o un
// sentinel "legacy:<nombre>" cuando el material no esta vinculado a ningun
// insumo del catalogo (nunca lo estuvo, o el insumo se eliminó). Así el
// <select> siempre tiene una opcion que calza con el valor actual y nunca
// cae en blanco por si solo.
const normalizeMaterials = (materials) =>
  (materials && materials.length ? materials : [{ quantity: 1 }]).map((m) => {
    const insumoId = m.insumo && typeof m.insumo === "object" ? m.insumo._id : m.insumo;
    const denormalizedName = m.name || (m.insumo && typeof m.insumo === "object" ? m.insumo.name : "") || "";
    return {
      quantity: m.quantity ?? 1,
      insumo: insumoId || (denormalizedName ? `${LEGACY_PREFIX}${denormalizedName}` : ""),
      name: denormalizedName,
    };
  });

// Normaliza appointment_type_ids (edicion) al shape que usa el field array del
// formulario: cada fila guarda solo el id (string), venga populado ({_id,name,...})
// o ya como id plano. Siempre queda al menos una fila para que el usuario tenga
// donde elegir, dado que el campo es obligatorio (mínimo un tipo de cita).
const normalizeAppointmentTypeIds = (ids) =>
  (ids && ids.length ? ids : [{}]).map((t) => ({
    id: (t && typeof t === "object" ? t._id : t) || "",
  }));

const ProcedureForm = ({ onSubmit, initialData = null, isSubmitting = false, formId }) => {
  const { getInsumos } = useInsumos();
  const { getAppointmentTypes } = useAppointmentTypes();
  const [insumos, setInsumos] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);

  useEffect(() => {
    getInsumos({ limit: 500 })
      .then((data) => setInsumos(data.insumos || []))
      .catch(() => setInsumos([]));
    getAppointmentTypes()
      .then((data) => setAppointmentTypes(data || []))
      .catch(() => setAppointmentTypes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyValues = {
    name: "",
    description: "",
    estimated_duration: "",
    price: "",
    requires_nurse: false,
    // Es raro que un doctor no participe, así que por defecto sí requiere. Solo importa
    // cuando requires_nurse es true (ver el checkbox más abajo); el backend igual lo fuerza
    // a true si requires_nurse termina en false, para que un procedimiento nunca quede sin
    // nadie que lo atienda.
    requires_doctor: true,
    is_active: true,
    pre_care_instructions: "",
    post_operative_instructions: "",
    materials: [{ insumo: "", quantity: 1, name: "" }],
    appointment_type_ids: [{ id: "" }],
  };

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: initialData
      ? {
          ...initialData,
          materials: normalizeMaterials(initialData.materials),
          appointment_type_ids: normalizeAppointmentTypeIds(initialData.appointment_type_ids),
        }
      : emptyValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "materials" });
  const {
    fields: appointmentTypeFields,
    append: appendAppointmentType,
    remove: removeAppointmentType,
  } = useFieldArray({ control, name: "appointment_type_ids" });
  const watchedValues = watch();

  // Los materiales que llegan aqui (insumo y quantity, con "insumo" siendo un
  // id real o un sentinel legacy) se traducen al shape que espera el backend
  // (insumo opcional y name), resolviendo el nombre real desde el catalogo
  // cargado en vez de dejarlo vacio.
  const handleFormSubmit = (data) => {
    const materials = (data.materials || [])
      .filter((m) => m.insumo)
      .map((m) => {
        const raw = m.insumo;
        if (raw.startsWith(LEGACY_PREFIX)) {
          return { quantity: m.quantity, name: raw.slice(LEGACY_PREFIX.length) };
        }
        const product = insumos.find((i) => i._id === raw);
        return { quantity: m.quantity, insumo: raw, name: product?.name || m.name || "" };
      });
    const appointment_type_ids = (data.appointment_type_ids || []).map((t) => t.id).filter(Boolean);
    onSubmit({ ...data, materials, appointment_type_ids });
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(handleFormSubmit)}

      className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start"
    >
      {/* El fieldset usa display:contents para desactivar de un solo golpe
          todos los inputs, selects y botones que contiene durante el envio,
          sin alterar el layout de grid. */}
      <fieldset disabled={isSubmitting} className="contents">
      <div className="lg:col-span-2 space-y-4 md:space-y-6">

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Información del procedimiento</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del procedimiento *</label>
            <input
              type="text"
              placeholder="Ej. Apendicectomía laparoscópica"
              maxLength={100}
              {...register("name", { required: "El campo tiene que llenarse" })}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                errors.name
                  ? "border border-red-500 bg-red-50/30 focus:border-red-500"
                  : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
              }`}
            />
            <div className="flex justify-between items-start mt-1">
              {errors.name && <span className="text-xs text-red-500 font-medium">{errors.name.message}</span>}
              <span className="text-[10px] text-gray-400 ml-auto">{(watchedValues.name || "").length}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descripción *</label>
            <textarea
              placeholder="Describa el procedimiento, su objetivo, alcance..."
              rows={4}
              maxLength={1000}
              {...register("description", { required: "El campo tiene que llenarse" })}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors resize-none ${
                errors.description
                  ? "border border-red-500 bg-red-50/30 focus:border-red-500"
                  : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
              }`}
            />
            <div className="flex justify-between items-start mt-1">
              {errors.description && <span className="text-xs text-red-500 font-medium">{errors.description.message}</span>}
              <span className="text-[10px] text-gray-400 ml-auto">{(watchedValues.description || "").length}/1000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duración estimada (minutos) *</label>
              <div className="relative">
                <Clock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${errors.estimated_duration ? "text-red-400" : "text-gray-400"}`} />
                <input
                  type="number"
                  min="1"
                  max="480"
                  placeholder="Ej. 45"
                  onKeyDown={(e) => { if (["-", "e", "E", "+", "."].includes(e.key)) e.preventDefault(); }}
                  {...register("estimated_duration", {
                    required: "El campo tiene que llenarse",
                    valueAsNumber: true,
                    min: { value: 1, message: "Debe ser mayor a 0" },
                    max: { value: 480, message: "No puede superar 480 minutos (8 horas)" },
                  })}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                    errors.estimated_duration
                      ? "border border-red-500 bg-red-50/30 focus:border-red-500"
                      : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.estimated_duration && <span className="text-xs text-red-500 font-medium mt-1 block">{errors.estimated_duration.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Precio (USD) *</label>
              <div className="relative">
                <span className={`text-sm font-medium absolute left-3 top-1/2 -translate-y-1/2 ${errors.price ? "text-red-400" : "text-gray-400"}`}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999"
                  placeholder="Ej. 120.00"
                  onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                  {...register("price", {
                    required: "El campo tiene que llenarse",
                    valueAsNumber: true,
                    min: { value: 0, message: "No puede ser negativo" },
                    max: { value: 999999, message: "El precio es demasiado alto" },
                  })}
                  className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                    errors.price
                      ? "border border-red-500 bg-red-50/30 focus:border-red-500"
                      : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.price && <span className="text-xs text-red-500 font-medium mt-1 block">{errors.price.message}</span>}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Materiales necesarios</h3>
          </div>
          <p className="text-xs text-gray-500">Agregue los materiales que se utilizan en este procedimiento y la cantidad estimada.</p>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 md:gap-3 text-xs font-semibold text-gray-500 px-1">
              <div className="col-span-7">Material</div>
              <div className="col-span-3">Cantidad</div>
              <div className="col-span-2 text-right">Acc.</div>
            </div>

            {fields.map((item, index) => {
              const insumoError = errors.materials?.[index]?.insumo;
              const quantityError = errors.materials?.[index]?.quantity;

              const rawInsumo = watchedValues.materials?.[index]?.insumo || "";
              const isLegacySentinel = rawInsumo.startsWith(LEGACY_PREFIX);
              const legacyName = isLegacySentinel ? rawInsumo.slice(LEGACY_PREFIX.length) : "";
              // Insumo real (no legacy) que ya no aparece en el catalogo
              // cargado (por ejemplo, fue eliminado del inventario despues
              // de asignarse a este procedimiento). Es el mismo problema que
              // un material legacy: sin esta opcion de respaldo, el <select>
              // caeria en blanco y se perderia el nombre al guardar.
              const isOrphanedRealInsumo = rawInsumo && !isLegacySentinel && !insumos.some((i) => i._id === rawInsumo);

              return (
                <div key={item.id} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 md:gap-3 items-center">
                    <div className="col-span-7">
                      <Controller
                        control={control}
                        name={`materials.${index}.insumo`}
                        rules={{ required: "Selecciona un material" }}
                        render={({ field }) => (
                          <Combobox value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                            <ComboboxTrigger
                              placeholder="Buscar material del inventario..."
                              className={`text-sm ${
                                insumoError
                                  ? "border-red-500 bg-red-50/30 focus-within:border-red-500"
                                  : "bg-gray-50 border-gray-200 focus-within:border-blue-500"
                              }`}
                            />
                            <ComboboxContent>
                              {isLegacySentinel && (
                                <ComboboxItem value={rawInsumo}>{legacyName} (no vinculado al inventario)</ComboboxItem>
                              )}
                              {isOrphanedRealInsumo && (
                                <ComboboxItem value={rawInsumo}>{item.name || "Material eliminado del inventario"} (ya no está en el inventario)</ComboboxItem>
                              )}
                              {insumos.map((i) => (
                                <ComboboxItem key={i._id} value={i._id}>{i.name}</ComboboxItem>
                              ))}
                            </ComboboxContent>
                          </Combobox>
                        )}
                      />
                      {(isLegacySentinel || isOrphanedRealInsumo) && (
                        <p className="text-[11px] text-amber-600 mt-1">Este material no está vinculado a un insumo real del inventario — selecciona uno para vincularlo.</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        onKeyDown={(e) => { if (["-", "e", "E", "+", "."].includes(e.key)) e.preventDefault(); }}
                        {...register(`materials.${index}.quantity`, {
                          required: "Requerido",
                          valueAsNumber: true,
                          min: { value: 1, message: "Debe ser al menos 1" },
                          max: { value: 100000, message: "Cantidad demasiado alta" },
                        })}
                        className={`w-full px-2 md:px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                          quantityError
                            ? "border border-red-500 bg-red-50/30 focus:border-red-500"
                            : "bg-gray-50 border border-gray-200 focus:border-blue-500"
                        }`}
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button type="button" onClick={() => remove(index)} className="p-1.5 md:p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {(insumoError || quantityError) && (
                    <div className="grid grid-cols-12 gap-2 md:gap-3 px-1">
                      <div className="col-span-7">{insumoError && <span className="text-[11px] text-red-500 font-medium">{insumoError.message}</span>}</div>
                      <div className="col-span-3">{quantityError && <span className="text-[11px] text-red-500 font-medium">{quantityError.message}</span>}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => append({ insumo: "", quantity: 1, name: "" })}
            className="w-full mt-2 py-2.5 border border-dashed border-gray-200 hover:border-blue-500 rounded-lg text-sm text-blue-600 font-medium flex items-center justify-center gap-2 hover:bg-blue-50/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar material
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Tag className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Tipos de cita *</h3>
          </div>
          <p className="text-xs text-gray-500">
            Elige a cuál (o cuáles) tipos de cita apunta este procedimiento. Determina las opciones
            disponibles al agendarlo.
          </p>

          <div className="space-y-2">
            {appointmentTypeFields.map((item, index) => {
              const typeError = errors.appointment_type_ids?.[index]?.id;
              const rawId = watchedValues.appointment_type_ids?.[index]?.id || "";
              const selectedType = appointmentTypes.find((t) => t._id === rawId);
              // Un mismo tipo de cita no puede repetirse en dos filas: se excluye de las
              // opciones el que ya se eligió en cualquier otra fila (la propia sigue
              // disponible, para no perder la selección actual al reabrir el combobox).
              const idsElsewhere = new Set(
                (watchedValues.appointment_type_ids || [])
                  .filter((_, i) => i !== index)
                  .map((a) => a.id)
                  .filter(Boolean)
              );
              const availableTypes = appointmentTypes.filter((t) => !idsElsewhere.has(t._id));

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Controller
                        control={control}
                        name={`appointment_type_ids.${index}.id`}
                        rules={{ required: "Selecciona un tipo de cita" }}
                        render={({ field }) => (
                          <Combobox value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                            <ComboboxTrigger
                              placeholder="Buscar tipo de cita..."
                              className={`text-sm ${
                                typeError
                                  ? "border-red-500 bg-red-50/30 focus-within:border-red-500"
                                  : "bg-gray-50 border-gray-200 focus-within:border-blue-500"
                              }`}
                            />
                            <ComboboxContent>
                              {availableTypes.map((t) => (
                                <ComboboxItem key={t._id} value={t._id}>{t.name}</ComboboxItem>
                              ))}
                            </ComboboxContent>
                          </Combobox>
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAppointmentType(index)}
                      disabled={appointmentTypeFields.length === 1}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {typeError && <span className="text-[11px] text-red-500 font-medium">{typeError.message}</span>}
                  {!typeError && selectedType && (
                    <span className="text-[11px] text-gray-400 capitalize">{selectedType.category}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* No tiene sentido agregar más filas que tipos de cita existentes en el
              catálogo: a partir de ahí, cualquier fila nueva forzosamente repetiría uno
              ya elegido. */}
          {appointmentTypes.length > 0 && appointmentTypeFields.length >= appointmentTypes.length ? (
            <p className="text-[11px] text-gray-400 text-center">
              Ya agregaste todos los tipos de cita disponibles ({appointmentTypes.length}).
            </p>
          ) : (
            <button
              type="button"
              onClick={() => appendAppointmentType({ id: "" })}
              className="w-full mt-2 py-2.5 border border-dashed border-gray-200 hover:border-blue-500 rounded-lg text-sm text-blue-600 font-medium flex items-center justify-center gap-2 hover:bg-blue-50/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Agregar tipo de cita
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Indicaciones previas</h3>
          </div>
          {/* Se le muestran al paciente al confirmar su cita desde el portal
              (patientPortalController.bookAppointment). */}
          <p className="text-xs text-gray-500">Instrucciones que el paciente debe leer antes de la cita: ayuno, documentos que debe traer, medicamentos a suspender, etc.</p>
          <div>
            <textarea
              placeholder="Describa las indicaciones previas al procedimiento..."
              rows={4}
              maxLength={1000}
              {...register("pre_care_instructions")}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
            />
            <span className="text-[10px] text-gray-400 float-right mt-1">
              {(watchedValues.pre_care_instructions || "").length}/1000
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Indicaciones post-operatorias</h3>
          </div>
          <p className="text-xs text-gray-500">Instrucciones y cuidados que debe seguir el paciente después del procedimiento.</p>
          <div>
            <textarea
              placeholder="Describa las indicaciones post-operatorias..."
              rows={4}
              maxLength={1000}
              {...register("post_operative_instructions")}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
            />
            <span className="text-[10px] text-gray-400 float-right mt-1">
              {(watchedValues.post_operative_instructions || "").length}/1000
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Configuración del procedimiento</h3>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-900">¿Requiere enfermera?</label>
              <span className="text-[11px] text-gray-400 block leading-tight mt-0.5">Asistencia de una enfermera.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" {...register("requires_nurse")} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Solo tiene sentido preguntar si aparece cuando ya se dijo que sí requiere
              enfermera: sin enfermera, el doctor es obligatorio sin excepción (lo fuerza el
              backend), así que no hay nada que elegir. */}
          {watchedValues.requires_nurse && (
            <div className="flex items-center justify-between gap-4 border-t border-gray-50 pt-4">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-gray-900">¿Requiere doctor?</label>
                <span className="text-[11px] text-gray-400 block leading-tight mt-0.5">
                  Desactívalo si lo atiende solo la enfermera, sin doctor.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" {...register("requires_doctor")} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-gray-50 pt-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-900">Estado del procedimiento</label>
              <span className="text-[11px] text-gray-400 block leading-tight mt-0.5">Activo y disponible para asignar.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" {...register("is_active")} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm">Resumen del procedimiento</h3>
          </div>
          <div className="space-y-3 text-xs">
            {[
              { label: "Duración estimada", value: watchedValues.estimated_duration ? `${watchedValues.estimated_duration} minutos` : "-- minutos" },
              { label: "Precio", value: watchedValues.price ? `$ ${Number(watchedValues.price).toFixed(2)}` : "$ --.--" },
              { label: "Materiales", value: `${(watchedValues.materials || []).filter(m => m.insumo).length} materiales` },
              { label: "Tipos de cita", value: `${(watchedValues.appointment_type_ids || []).filter(t => t.id).length} seleccionados` },
              { label: "Requiere enfermera", value: watchedValues.requires_nurse ? "Sí" : "No especificado" },
              { label: "Requiere doctor", value: (!watchedValues.requires_nurse || watchedValues.requires_doctor) ? "Sí" : "No, solo enfermera" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">{label}</span>
                <span className="font-bold text-gray-900 text-right ml-2">{value}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-gray-400">Estado</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${watchedValues.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {watchedValues.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-green-50/40 border border-green-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
            <Info className="w-4 h-4 text-green-600 flex-shrink-0" />
            Información importante
          </div>
          <ul className="text-[11px] text-green-700 space-y-1.5">
            <li className="flex items-start gap-1.5">✓ Asegúrese de ingresar información necesaria</li>
            <li className="flex items-start gap-1.5">✓ Los materiales serán descontados del inventario al asignar el procedimiento.</li>
            <li className="flex items-start gap-1.5">✓ Puede editar esta información en cualquier momento.</li>
          </ul>
        </div>

        {!initialData && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => reset(emptyValues)}
              className="px-4 md:px-5 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar campos
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 md:px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>
      </fieldset>
    </form>
  );
};

export default ProcedureForm;