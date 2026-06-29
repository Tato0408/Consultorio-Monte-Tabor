import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Clock, Package, Activity, FileText, Info } from "lucide-react";

/*
  formId — prop opcional que se pone en el <form id={formId}>.
  Cuando viene desde el modal de edición, el botón de submit
  del footer usa form="edit-procedure-form" para vincularse a este form.
*/
const ProcedureForm = ({ onSubmit, initialData = null, isSubmitting = false, formId }) => {
  // Extraemos 'formState: { errors }' para manejar los estados de error visuales
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      name: "",
      description: "",
      estimated_duration: "",
      price: "",
      requires_nurse: false,
      is_active: true,
      post_operative_instructions: "",
      materials: [{ name: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "materials" });
  const watchedValues = watch();

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
    >
      {/* COLUMNA IZQUIERDA */}
      <div className="lg:col-span-2 space-y-6">

        {/* Tarjeta 1: Información básica */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Información del procedimiento</h3>
          </div>

          {/* CAMPO: NOMBRE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del procedimiento *</label>
            <input
              type="text"
              placeholder="Ej. Apendicectomía laparoscópica"
              {...register("name", { required: "El campo tiene que llenarse" })}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                errors.name 
                  ? "border border-red-500 bg-red-50/30 focus:border-red-500" 
                  : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
              }`}
            />
            {errors.name && (
              <span className="text-xs text-red-500 font-medium mt-1 block">{errors.name.message}</span>
            )}
          </div>

          {/* CAMPO: DESCRIPCIÓN */}
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
              <div>
                {errors.description && (
                  <span className="text-xs text-red-500 font-medium">{errors.description.message}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">
                {(watchedValues.description || "").length}/1000
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* CAMPO: DURACIÓN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duración estimada (minutos) *</label>
              <div className="relative">
                <Clock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${errors.estimated_duration ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  type="number"
                  placeholder="Ej. 45"
                  {...register("estimated_duration", { required: "El campo tiene que llenarse", valueAsNumber: true })}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                    errors.estimated_duration 
                      ? "border border-red-500 bg-red-50/30 focus:border-red-500" 
                      : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.estimated_duration && (
                <span className="text-xs text-red-500 font-medium mt-1 block">{errors.estimated_duration.message}</span>
              )}
            </div>

            {/* CAMPO: PRECIO */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Precio (USD) *</label>
              <div className="relative">
                <span className={`text-sm font-medium absolute left-3 top-1/2 -translate-y-1/2 ${errors.price ? 'text-red-400' : 'text-gray-400'}`}>$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 120.00"
                  {...register("price", { required: "El campo tiene que llenarse", valueAsNumber: true })}
                  className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                    errors.price 
                      ? "border border-red-500 bg-red-50/30 focus:border-red-500" 
                      : "bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.price && (
                <span className="text-xs text-red-500 font-medium mt-1 block">{errors.price.message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Materiales */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Materiales necesarios</h3>
          </div>
          <p className="text-xs text-gray-500">Agregue los materiales que se utilizan en este procedimiento y la cantidad estimada.</p>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 px-1">
              <div className="col-span-7">MATERIAL</div>
              <div className="col-span-3">CANTIDAD</div>
              <div className="col-span-2 text-right">ACCIONES</div>
            </div>

            {fields.map((item, index) => {
              const nameError = errors.materials?.[index]?.name;
              const quantityError = errors.materials?.[index]?.quantity;

              return (
                <div key={item.id} className="space-y-1">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* SELECT MATERIAL */}
                    <div className="col-span-7">
                      <select
                        {...register(`materials.${index}.name`, { required: "Seleccione un material" })}
                        className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                          nameError 
                            ? "border border-red-500 bg-red-50/30 focus:border-red-500 text-red-900" 
                            : "bg-gray-50 border border-gray-200 focus:border-blue-500"
                        }`}
                      >
                        <option value="">Buscar material...</option>
                        <option value="Gasa estéril 10x10">Gasa estéril 10x10</option>
                        <option value="Guantes quirúrgicos N° 7">Guantes quirúrgicos N° 7</option>
                        <option value="Jeringa descartable 5ml">Jeringa descartable 5ml</option>
                      </select>
                    </div>

                    {/* INPUT CANTIDAD */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        {...register(`materials.${index}.quantity`, { required: "Requerido", valueAsNumber: true })}
                        className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${
                          quantityError 
                            ? "border border-red-500 bg-red-50/30 focus:border-red-500" 
                            : "bg-gray-50 border border-gray-200 focus:border-blue-500"
                        }`}
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* MENSAJES DE ERROR PARA FILA DE MATERIAL */}
                  {(nameError || quantityError) && (
                    <div className="grid grid-cols-12 gap-3 px-1">
                      <div className="col-span-7">
                        {nameError && <span className="text-[11px] text-red-500 font-medium">{nameError.message}</span>}
                      </div>
                      <div className="col-span-3">
                        {quantityError && <span className="text-[11px] text-red-500 font-medium">{quantityError.message}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => append({ name: "", quantity: 1 })}
            className="w-full mt-2 py-2.5 border border-dashed border-gray-200 hover:border-blue-500 rounded-lg text-sm text-blue-600 font-medium flex items-center justify-center gap-2 hover:bg-blue-50/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar material
          </button>
        </div>

        {/* Tarjeta 3: Post-operatorias */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText className="w-5 h-5 text-blue-600" />
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

      {/* COLUMNA DERECHA */}
      <div className="space-y-6">

        {/* Configuración */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Configuración del procedimiento</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="max-w-[80%]">
              <label className="block text-xs font-semibold text-gray-900">¿Requiere enfermera?</label>
              <span className="text-[11px] text-gray-400 block leading-tight mt-0.5">Indique si este procedimiento requiere la asistencia de una enfermera.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...register("requires_nurse")} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-gray-50 pt-4">
            <div className="max-w-[80%]">
              <label className="block text-xs font-semibold text-gray-900">Estado del procedimiento</label>
              <span className="text-[11px] text-gray-400 block leading-tight mt-0.5">Defina si el procedimiento está activo y disponible para asignar.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...register("is_active")} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Resumen en vivo */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Resumen del procedimiento</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Duración estimada</span>
              <span className="font-bold text-gray-900">{watchedValues.estimated_duration ? `${watchedValues.estimated_duration} minutos` : "-- minutos"}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Precio</span>
              <span className="font-bold text-gray-900">{watchedValues.price ? `$ ${Number(watchedValues.price).toFixed(2)}` : "$ --.--"}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Materiales</span>
              <span className="font-bold text-gray-900">{(watchedValues.materials || []).filter(m => m.name).length} materiales</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400">Requiere enfermera</span>
              <span className="font-bold text-gray-900">{watchedValues.requires_nurse ? "Sí" : "No especificado"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Estado</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${watchedValues.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {watchedValues.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-green-50/40 border border-green-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
            <Info className="w-4 h-4 text-green-600" />
            Información importante
          </div>
          <ul className="text-[11px] text-green-700 space-y-1.5 list-none pl-0">
            <li className="flex items-start gap-1.5">✓ Asegúrese de ingresar información necesaria</li>
            <li className="flex items-start gap-1.5">✓ Los materiales serán descontados del inventario al asignar el procedimiento.</li>
            <li className="flex items-start gap-1.5">✓ Puede editar esta información en cualquier momento.</li>
          </ul>
        </div>

        {/* Botones — solo cuando es creación (no edición desde modal) */}
        {!initialData && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="px-5 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default ProcedureForm;