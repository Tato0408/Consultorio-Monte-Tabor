import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, User, Gift, CreditCard, Phone, Mail, Clock, Loader2 } from "lucide-react";

import NurseTable from "../components/NurseTable";
import NurseStatCards from "../components/NurseStatCards";
import useNurse from "../hooks/useNurse";
import NurseFormModal from "../components/NurseFormModal";

const NurseProfilePanel = ({ nurse, nextProcedure, loadingDetail }) => {
  if (!nurse) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center mb-3 bg-blue-500">
          {nurse.img_url ? (
            <img
              src={nurse.img_url}
              alt={`${nurse.name} ${nurse.last_name}`}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <User className="w-8 h-8 text-white/90" strokeWidth={1.5} />
          )}
        </div>

        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {nurse.name} {nurse.last_name}
        </h3>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Acerca</h4>

        <div className="flex items-center gap-3">
          <Gift className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Edad</span>
            <span className="text-[13px] font-medium text-gray-800">
              {nurse.birth_date
                ? `${new Date().getFullYear() - new Date(nurse.birth_date).getFullYear()} años`
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreditCard className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">DUI</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.dui || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Teléfono</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.phone || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Email</span>
            <span className="text-[13px] font-medium text-gray-800 truncate max-w-[200px]">
              {nurse.email || "—"}
            </span>
          </div>
        </div>

        <div className="mt-2 border border-blue-100 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[13px] font-semibold text-blue-600">Próximo procedimiento</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>

          {loadingDetail ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : nextProcedure ? (
            <>
              <p className="text-xl font-bold text-gray-900 mb-1">
                {new Date(nextProcedure.date).toLocaleDateString("es-ES", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <p className="text-[13px] text-blue-600 font-medium">
                {nextProcedure.start_time} — {nextProcedure.description || "Sin descripción"}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 font-medium">No hay procedimientos próximos</p>
          )}
        </div>
      </div>
    </div>
  );
};

const NursesPage = () => {
  const {
    nurses,
    selectedNurse,
    nextProcedure,
    stats,
    loading,
    loadingDetail,
    error,
    selectNurse,
    createNurse,
    updateNurse,
    deleteNurse,
  } = useNurse();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nurseToEdit, setNurseToEdit] = useState(null);

  // Selección automática de la primera fila al cargar
  useEffect(() => {
    if (nurses && nurses.length > 0 && !selectedNurse) {
      selectNurse(nurses[0]);
    }
  }, [nurses, selectedNurse, selectNurse]);

  const handleOpenCreate = () => {
    setNurseToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nurse) => {
    setNurseToEdit(nurse);
    setIsModalOpen(true);
  };

  const handleSaveNurse = async (formData) => {
    if (nurseToEdit?._id) {
      return await updateNurse(nurseToEdit._id, formData);
    } else {
      return await createNurse(formData);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      {/* SECCIÓN DEL ENCABEZADO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Enfermeras</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a las diferentes enfermeras
        </p>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Renderiza las tarjetas de estadísticas */}
      <NurseStatCards stats={stats} loading={loading} />

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS (SIMETRÍA EXACTA) */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        
        {/* COLUMNA DE LA IZQUIERDA (TABLA DE ENFERMERAS) */}
        <div className="col-span-9">
          <NurseTable
            nurses={nurses}
            loading={loading}
            selectedNurse={selectedNurse}
            onSelect={selectNurse}
            onAdd={handleOpenCreate}
            onEdit={handleOpenEdit}
            onDelete={deleteNurse}
          />
        </div>

        {/* COLUMNA DE LA DERECHA (TARJETA DE PERFIL) */}
        <div className="col-span-3">
          {selectedNurse ? (
            <NurseProfilePanel
              nurse={selectedNurse}
              nextProcedure={nextProcedure}
              loadingDetail={loadingDetail}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs font-medium h-[400px] flex items-center justify-center shadow-sm">
              {!loading && "Selecciona una enfermera de la lista para inspeccionar sus datos."}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DEL FORMULARIO */}
      <NurseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNurse}
        nurse={nurseToEdit}
        isEditMode={!!nurseToEdit}
      />
    </div>
  );
};

export default NursesPage;