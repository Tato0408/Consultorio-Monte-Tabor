import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, User, Gift, CreditCard, Phone, Mail, Clock } from "lucide-react";

import NurseTable from "../components/NurseTable";
import NurseStatCards from "../components/NurseStatCards";
import useNurse from "../hooks/useNurse";
// --- COMPONENTE DEL PANEL LATERAL (PERFIL) ---
const NurseProfilePanel = ({ nurse }) => {
  if (!nurse) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      {/* Cabecera Azul */}
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white relative">
        <div className="w-16 h-16 rounded-full border border-white/40 flex items-center justify-center mb-3">
          <User className="w-8 h-8 text-white/90" strokeWidth={1.5} />
        </div>
        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {nurse.name} {nurse.last_name}
        </h3>
      </div>

      {/* Cuerpo del Perfil */}
      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Acerca</h4>

        <div className="flex items-center gap-3">
          <User className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Género</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.gender || "Femenino"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Gift className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Edad</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.age || "18"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreditCard className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">DUI</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.dui || "1238198-7"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Teléfono</span>
            <span className="text-[13px] font-medium text-gray-800">{nurse.phone || "8594-8174"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Email</span>
            <span className="text-[13px] font-medium text-gray-800 truncate max-w-[200px]">
              {nurse.email || "ejemplo@gmail.com"}
            </span>
          </div>
        </div>

        {/* Tarjeta de Próximo Procedimiento */}
        <div className="mt-2 border border-blue-100 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[13px] font-semibold text-blue-600">Próximo procedimineto</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">17 Mayo, 2026</p>
          <p className="text-[13px] text-blue-600 font-medium">10:30 AM - Max Jiménez</p>
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
  } = useNurse();

  // Autoseleccionar la primera enfermera al cargar los datos de la API (Igual que en la imagen image_17c1e1.png)
  useEffect(() => {
    if (nurses && nurses.length > 0 && !selectedNurse) {
      selectNurse(nurses[0]);
    }
  }, [nurses, selectedNurse, selectNurse]);

  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC] flex flex-col gap-6">
      
      {/* cabecera principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Enfermeras</h1>
          <p className="text-sm text-gray-500 font-medium">
            Gestiona y administra a los las diferentes enfermeras
          </p>
        </div>

        {/* Control de rango de fechas fijo */}
        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors self-start sm:self-auto">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          Ene 12, 2026 - May 05, 2026
        </button>
      </div>

      {/* Alerta de Error Global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Sección de Tarjetas de Estadísticas Dinámicas */}
      {/* NOTA: Si tu componente StatsCards ya recibe las props internas, puedes usarlo así: */}
      {/* <StatsCards stats={stats} /> */}
      <NurseStatCards stats={stats} />

      {/* Grid Principal: Tabla + Panel Detalle */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Componente Tabla Conectado */}
        <div className="flex-1 w-full min-w-0">
          <NurseTable
            nurses={nurses}
            loading={loading}
            selectedNurse={selectedNurse}
            onSelect={selectNurse}
            onAdd={() => console.log("Abrir modal de registro")}
          />
        </div>

        {/* Sidebar Derecho: Detalle de Perfil */}
        <div className="w-full xl:w-[320px] shrink-0">
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
    </div>
  );
};

export default NursesPage;